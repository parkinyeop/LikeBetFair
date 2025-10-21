import ExchangeOrder from '../models/exchangeOrderModel.js';
import ExchangeOrderMatch from '../models/exchangeOrderMatchModel.js';
import GameResult from '../models/gameResultModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import AdminCommission from '../models/adminCommissionModel.js';
import CommissionSettingsService from './commissionSettingsService.js';
import CommissionService from './commissionService.js';
import { Op } from 'sequelize';
import createScriptSequelize from '../config/scriptDatabase.js';
import { ADMIN_CONFIG } from '../config/centralizedConfig.js';
import PrecisionCalculation from '../utils/precisionCalculation.js';
import GameResultQuery from '../utils/gameResultQuery.js';
import { getLocationConfig } from '../config/gameResultQuery.js';
import { isGameFinished, isGameCancelledOrPostponed } from '../utils/gameStatusHelpers.js';
import settlementLogger from '../utils/settlementLogger.js';

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();
import multibetSettlementService from './multibetSettlementService.js';

/**
 * Exchange Orders 자동 정산 서비스
 * - 경기 결과 기반 승부 판정
 * - market별 정확한 정산 로직
 * - 자동 수익 배분
 */
class ExchangeSettlementService {

  /**
   * 🆕 selectionDetails에서 선택 정보 추출 헬퍼 함수
   * @param {Object} order - Exchange 주문
   * @returns {string} 선택 요약
   */
  getSelectionFromOrder(order) {
    // selectionDetails가 있으면 우선 사용
    if (order.selectionDetails?.selections) {
      const selections = order.selectionDetails.selections;
      
      if (selections.length === 1) {
        // 1개 경기: 팀명 또는 선택 반환
        return selections[0].team || selections[0].selection || order.selection || '선택 없음';
      } else if (selections.length > 1) {
        // 2개 이상: 멀티배팅 요약
        return `멀티배팅 (${selections.length}개 경기)`;
      }
    }
    
    // fallback: order.selection 사용
    return order.selection || '선택 없음';
  }

  /**
   * 🎯 [최신] 주문 ID 기반 제로썸 정산
   * @param {number} orderId - 정산할 주문 ID (백 또는 레이)
   * @param {Object} gameResult - 경기 결과
   * @param {Object} externalTransaction - 외부 트랜잭션
   * @returns {Object} 정산 결과
   */
  async settleByOrderId(orderId, gameResult, externalTransaction = null) {
    const transaction = externalTransaction || await sequelize.transaction();
    const shouldCommit = !externalTransaction;
    
    try {
      console.log(`🎯 [Order-Based] 주문 ${orderId} 정산 시작...`);
      
      // 1. 주문 조회
      const order = await ExchangeOrder.findByPk(orderId, { transaction });
      
      if (!order) {
        throw new Error(`주문 ${orderId}를 찾을 수 없습니다.`);
      }
      
      if (order.settledAt) {
        console.log(`   ⚠️  이미 정산됨 (${new Date(order.settledAt).toLocaleString('ko-KR')})`);
        if (shouldCommit) await transaction.commit();
        return { settledMatches: 0, message: 'Already settled' };
      }
      
      console.log(`   주문 정보: ${order.homeTeam} vs ${order.awayTeam}, ${order.side}`);
      
      // 2. ExchangeOrderMatch에서 매칭 조회
      const matches = await ExchangeOrderMatch.findAll({
        where: {
          [Op.or]: [
            { originalOrderId: orderId },
            { matchingOrderId: orderId }
          ],
          status: 'active'
        },
        include: [
          { model: ExchangeOrder, as: 'originalOrder' },
          { model: ExchangeOrder, as: 'matchingOrder' }
        ],
        transaction
      });
      
      console.log(`   매칭 수: ${matches.length}개`);
      
      if (matches.length === 0) {
        console.log(`   ❌ 매칭 정보 없음`);
        if (shouldCommit) await transaction.commit();
        return { settledMatches: 0, message: 'No matches found' };
      }
      
      // 3. 각 매칭별로 정산
      let settledCount = 0;
      
      for (const match of matches) {
        const backOrder = match.originalSide === 'back' ? match.originalOrder : match.matchingOrder;
        const layOrder = match.originalSide === 'lay' ? match.originalOrder : match.matchingOrder;
        
        if (!backOrder || !layOrder) {
          console.log(`   ❌ 주문 쌍을 찾을 수 없음: Match ${match.id}`);
          continue;
        }
        
        console.log(`\n   매칭 ${match.id}: 백 ${backOrder.id} vs 레이 ${layOrder.id}`);
        
        const pair = [backOrder, layOrder];
        const result = await this.settlePair(pair, gameResult, transaction, match);
        
        // 매치 상태 업데이트
        await match.update({
          status: 'settled',
          settledAt: new Date(),
          settlementResult: result
        }, { transaction });
        
        settledCount++;
        console.log(`   ✅ 매칭 ${match.id} 정산 완료`);
      }
      
      if (shouldCommit) await transaction.commit();
      
      console.log(`\n✅ 주문 ${orderId} 정산 완료: ${settledCount}개 매칭\n`);
      
      return {
        settledMatches: settledCount,
        orderId
      };
      
    } catch (error) {
      if (shouldCommit) await transaction.rollback();
      console.error(`❌ 주문 ${orderId} 정산 실패:`, error);
      throw error;
    }
  }

  /**
   * 🎯 [신규] 팀명+날짜 기반 ExchangeOrderMatch 정산
   * @param {string} homeTeam - 홈팀명
   * @param {string} awayTeam - 어웨이팀명
   * @param {string} commenceTime - 경기 시작 시간
   * @param {Object} gameResult - 경기 결과 객체
   * @returns {Object} 정산 결과
   */
  async settleMatchedOrdersByTeam(homeTeam, awayTeam, commenceTime, gameResult, externalTransaction = null) {
    const transaction = externalTransaction || await sequelize.transaction();
    const shouldCommit = !externalTransaction; // 외부 트랜잭션이 없을 때만 커밋
    try {
      console.log(`🎯 [Team-Based] 경기 ${homeTeam} vs ${awayTeam} 매치 정산 시작...`);

      // ✅ 수정: 정규화된 팀명으로 유연하게 매칭
      const { normalizeTeamNameForComparison } = await import('../utils/normalizeUtils.js');
      
      const normalizedHomeTeam = normalizeTeamNameForComparison(homeTeam);
      const normalizedAwayTeam = normalizeTeamNameForComparison(awayTeam);
      
      console.log(`   정규화: ${homeTeam} → ${normalizedHomeTeam}`);
      console.log(`   정규화: ${awayTeam} → ${normalizedAwayTeam}`);
      
      // 모든 matched/partially_matched 주문 조회 후 정규화된 팀명으로 필터링
      const allOrders = await ExchangeOrder.findAll({
        where: {
          status: { [Op.in]: ['matched', 'partially_matched'] },
          settledAt: null
        },
        transaction
      });
      
      // ✅ 멀티배팅 Back과 매칭된 Lay 주문 ID 조회 (제로썸 정산에서 처리하므로 제외)
      const multibetBackOrders = await ExchangeOrder.findAll({
        where: {
          isMultibet: true,
          side: 'back',
          status: { [Op.in]: ['matched', 'partially_matched', 'settled'] }
        },
        attributes: ['id'],
        transaction
      });
      
      const multibetBackIds = multibetBackOrders.map(o => o.id);
      
      let excludedLayOrderIds = [];
      if (multibetBackIds.length > 0) {
        const multibetMatches = await ExchangeOrderMatch.findAll({
          where: {
            [Op.or]: [
              { originalOrderId: { [Op.in]: multibetBackIds } },
              { matchingOrderId: { [Op.in]: multibetBackIds } }
            ]
          },
          attributes: ['originalOrderId', 'matchingOrderId'],
          transaction
        });
        
        // 멀티배팅 Back과 매칭된 Lay 주문 ID 추출
        excludedLayOrderIds = multibetMatches.map(m => {
          // Back이 original이면 matching이 Lay, 반대도 마찬가지
          if (multibetBackIds.includes(m.originalOrderId)) {
            return m.matchingOrderId;
          } else {
            return m.originalOrderId;
          }
        }).filter(id => !multibetBackIds.includes(id)); // Back ID는 제외
        
        console.log(`   🚫 멀티배팅 제로썸 정산 대상 Lay 주문 제외: ${excludedLayOrderIds.length}개`);
      }
      
      // 정규화된 팀명으로 매칭
      const orders = allOrders.filter(order => {
        // ✅ 멀티배팅 주문은 모두 제외 (멀티배팅 정산에서 처리)
        if (order.isMultibet) {
          console.log(`   ⏭️  주문 ${order.id} 건너뜀 (멀티배팅은 multibetSettlementService에서 처리)`);
          return false;
        }
        
        // ✅ 멀티배팅 Back과 매칭된 Lay도 제외
        if (excludedLayOrderIds.includes(order.id)) {
          console.log(`   ⏭️  주문 ${order.id} 건너뜀 (멀티배팅 제로썸 정산 대상)`);
          return false;
        }
        
        const orderHomeNorm = normalizeTeamNameForComparison(order.homeTeam);
        const orderAwayNorm = normalizeTeamNameForComparison(order.awayTeam);
        
        // 양방향 매칭 (홈/어웨이 뒤바뀔 수 있음)
        const match1 = orderHomeNorm === normalizedHomeTeam && orderAwayNorm === normalizedAwayTeam;
        const match2 = orderHomeNorm === normalizedAwayTeam && orderAwayNorm === normalizedHomeTeam;
        
        // 시간도 확인 (±3시간)
        const timeMatch = Math.abs(new Date(order.commenceTime) - new Date(commenceTime)) < 3 * 60 * 60 * 1000;
        
        return (match1 || match2) && timeMatch;
      });
      
      console.log(`[Team-Based] 정규화 매칭 결과: ${orders.length}개 주문`);
      
      if (orders.length === 0) {
        if (shouldCommit) await transaction.commit();
        return { settledMatches: 0, totalWinnings: 0, results: [] };
      }
      
      // ExchangeOrderMatch 조회
      const orderIds = orders.map(o => o.id);
      const matches = await ExchangeOrderMatch.findAll({
        where: {
          [Op.or]: [
            { originalOrderId: { [Op.in]: orderIds } },
            { matchingOrderId: { [Op.in]: orderIds } }
          ],
          status: 'active'
        },
        include: [
          { model: ExchangeOrder, as: 'originalOrder' },
          { model: ExchangeOrder, as: 'matchingOrder' }
        ],
        transaction
      });

      console.log(`[Team-Based] 정산 대상 매치 수: ${matches.length}`);
      
      // matched 주문 중 매치 정보가 없으면 건너뜀
      if (matches.length === 0) {
        console.log(`[Team-Based] 매치 정보 없음 - 주문만 있고 매칭 안됨`);
        if (shouldCommit) await transaction.commit();
        return { settledMatches: 0, totalWinnings: 0, results: [] };
      }

      let settledCount = 0;
      let totalWinnings = 0;
      const settlementResults = [];

      for (const match of matches) {
        const backOrder = match.originalSide === 'back' ? match.originalOrder : match.matchingOrder;
        const layOrder = match.originalSide === 'lay' ? match.originalOrder : match.matchingOrder;

        if (!backOrder || !layOrder) {
          console.error(`[Team-Based] 주문 쌍을 찾을 수 없습니다: Match ID ${match.id}`);
          continue;
        }

        // ✅ 멀티배팅 주문 제외 (multibetSettlementService에서 처리)
        if (backOrder.isMultibet || layOrder.isMultibet) {
          console.log(`   🔄 [Team-Based] Match ${match.id}: 멀티배팅 주문 포함 -> 건너뜀 (Back: #${backOrder.id}${backOrder.isMultibet ? ' [멀티]' : ''}, Lay: #${layOrder.id}${layOrder.isMultibet ? ' [멀티]' : ''})`);
          continue;
        }

        const pair = [backOrder, layOrder];

        console.log(`\n  📝 Match 정보:`, {
          matchId: match.id,
          matchedAmount: match.matchedAmount,
          matchedPrice: match.matchedPrice,
          originalSide: match.originalSide
        });

        // ✅ 핵심 수정: match 객체를 settlePair에 전달 (순서: pair, gameResult, transaction, match)
        const result = await this.settlePair(pair, gameResult, transaction, match);

        // 매치 상태 업데이트
        await match.update({
          status: 'settled',
          settledAt: new Date(),
          settlementResult: result
        }, { transaction });

        settlementResults.push(result);
        settledCount++;
        totalWinnings += result.totalWinnings;
      }

      if (shouldCommit) await transaction.commit();
      console.log(`[Team-Based] 경기 ${homeTeam} vs ${awayTeam} 정산 완료: ${settledCount}개 매치 정산됨.`);
      return { settledMatches: settledCount, totalWinnings, results: settlementResults };

    } catch (error) {
      if (shouldCommit) await transaction.rollback();
      console.error(`[Team-Based] 경기 ${homeTeam} vs ${awayTeam} 정산 실패:`, error);
      throw error;
    }
  }

  /**
   * 🆕 경기 식별자 기반 주문 정산 (gameResultId 방식 대체)
   * @param {string} homeTeam - 홈팀
   * @param {string} awayTeam - 어웨이팀
   * @param {string} commenceTime - 경기 시작 시간
   * @returns {Object} 정산 결과
   */
  async settleGameOrdersByMatch(homeTeam, awayTeam, commenceTime) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🎯 경기 ${homeTeam} vs ${awayTeam} 자동 정산 시작...`);

      const gameResult = await this.findGameResultByMatch(homeTeam, awayTeam, commenceTime);
      if (!gameResult || !isGameFinished(gameResult)) {
        // gameResult.id가 없으면 gameId를 생성할 수 없으므로 gameResult.id를 사용하도록 수정
        const gameKey = gameResult ? `${gameResult.homeTeam}|${gameResult.awayTeam}|${gameResult.commenceTime}` : `${homeTeam}|${awayTeam}|${commenceTime}`;
        console.log(`[Main Settlement] 경기 결과를 찾을 수 없거나 경기가 아직 끝나지 않았습니다: ${gameKey}`);
        // 오류를 던지는 대신 빈 결과를 반환하여 다른 경기 정산에 영향을 주지 않도록 처리
        return {
          gameKey: gameKey,
          settledMatches: 0,
          totalWinnings: 0,
          results: [],
          message: 'Game result not found or not finished.'
        };
      }

      console.log(`🏟️ 경기 정보:${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
      console.log(`📊 경기 결과: ${gameResult.status}, 스코어:`, gameResult.score);

      // 🎯 팀명+날짜 기반 ExchangeOrderMatch 정산 (외부 트랜잭션 전달)
      const matchSettlementResult = await this.settleMatchedOrdersByTeam(homeTeam, awayTeam, commenceTime, gameResult, transaction);

      // 🆕 정산 대상 주문들 조회 (매칭된 상태 + 부분 매칭된 상태의 주문들)
      // 🔴 CRITICAL: settledAt: null 조건 필수 (중복 정산 방지)
      const orders = await ExchangeOrder.findAll({
        where: {
          homeTeam,
          awayTeam,
          commenceTime,
          status: { [Op.in]: ['matched', 'partially_matched', 'active'] },
          settledAt: null  // 🔴 아직 정산되지 않은 주문만
        },
        transaction
      });
      
      console.log(`📋 정산 대상 주문 수: ${orders.length}`);
      
      // 🆕 멀티배팅 주문과 일반 주문 분리
      const multibetOrders = orders.filter(order => order.isMultibet);
      const regularOrders = orders.filter(order => !order.isMultibet);
      
      console.log(`🎯 멀티배팅 주문: ${multibetOrders.length}개, 일반 주문: ${regularOrders.length}개`);
      
      // 🆕 멀티배팅 주문들은 별도 처리
      if (multibetOrders.length > 0) {
        console.log(`🔄 멀티배팅 주문들 별도 정산 처리 시작...`);
        for (const multibetOrder of multibetOrders) {
          try {
            await multibetSettlementService.settleMultibetOrder(multibetOrder);
            console.log(`✅ 멀티배팅 주문 ${multibetOrder.id} 정산 완료`);
          } catch (error) {
            console.error(`❌ 멀티배팅 주문 ${multibetOrder.id} 정산 실패:`, error.message);
          }
        }
      }
      
      // 일반 주문들만 기존 로직으로 처리
      orders = regularOrders;
      
      // 🆕 연결된 주문들도 함께 조회 (matchedOrderId가 있는 주문들 + 부분 매칭된 주문들)
      // 🔴 CRITICAL: settledAt: null 조건 필수 (중복 정산 방지)
      const connectedOrders = await ExchangeOrder.findAll({
        where: {
          homeTeam,
          awayTeam,
          commenceTime,
          status: { [Op.in]: ['matched', 'partially_matched', 'active'] },
          settledAt: null  // 🔴 아직 정산되지 않은 주문만
        },
        transaction
      });
      
      // 🆕 상대방이 이미 정산된 주문들을 별도 조회 (확장된 범위)
      // ✅ FIX: connectedOrders를 사용하여 모든 연결된 주문 확인
      const potentialOrphanedOrders = connectedOrders.filter(order => order.matchedOrderId !== null);
      const orphanedOrders = [];
      
      console.log(`🔍 고아 주문 탐지 시작: ${potentialOrphanedOrders.length}개 후보 주문 확인`);
      
      for (const order of potentialOrphanedOrders) {
        const matchedOrder = await ExchangeOrder.findByPk(order.matchedOrderId, { transaction });
        if (matchedOrder && matchedOrder.settledAt !== null) {
          orphanedOrders.push(order);
          console.log(`🔄 고아 주문 발견: ${order.id} (타입: ${order.side}, 금액: ${order.amount}, 상대방 ${order.matchedOrderId}은 이미 정산됨)`);
        }
      }
      
      console.log(`🔄 상대방이 이미 정산된 고아 주문: ${orphanedOrders.length}개`);
      
      // matchedOrderId가 null이 아닌 주문들만 필터링
      const filteredConnectedOrders = connectedOrders.filter(order => order.matchedOrderId !== null);
      
      console.log(`🔗 연결된 주문 수: ${filteredConnectedOrders.length}`);
      
      // 모든 정산 대상 주문들을 합침 (중복 제거)
      const allOrders = [...orders];
      filteredConnectedOrders.forEach(connectedOrder => {
        if (!allOrders.find(order => order.id === connectedOrder.id)) {
          allOrders.push(connectedOrder);
        }
      });
      
      console.log(`📊 총 정산 대상 주문 수: ${allOrders.length}`);
      
      let settledCount = 0;
      let totalWinnings = 0;
      const settlementResults = [];
      
      // 주문을 쌍으로 그룹화 (매칭된 주문들)
      const orderPairs = this.groupMatchedOrders(allOrders);
      
      console.log(`🤝 생성된 주문 쌍 수: ${orderPairs.length}`);
      
      for (const pair of orderPairs) {
        try {
          // ✅ match 파라미터 조회
          const [backOrder, layOrder] = pair;
          const match = await ExchangeOrderMatch.findOne({
            where: {
              [Op.or]: [
                { originalOrderId: backOrder.id, matchingOrderId: layOrder.id },
                { originalOrderId: layOrder.id, matchingOrderId: backOrder.id }
              ]
            },
            transaction
          });
          
          const result = await this.settlePair(pair, gameResult, transaction, match);
          settlementResults.push(result);
          settledCount += 2; // back + lay 주문
          totalWinnings += result.totalWinnings;
          
          console.log(`✅ 주문 쌍 정산 완료: ${result.winnerSide} 승리, 수익: ${result.totalWinnings}`);
          
        } catch (error) {
          console.error(`❌ 주문 쌍 정산 실패:`, error);
        }
      }
      
      // 🆕 고아 주문들 개별 정산 (상대방이 이미 정산된 경우)
      console.log(`\n🔄 고아 주문 개별 정산 시작: ${orphanedOrders.length}개`);
      
      for (const orphanOrder of orphanedOrders) {
        try {
          // 이미 정산된 상대방 주문 정보 가져오기
          const settledMatchedOrder = await ExchangeOrder.findByPk(orphanOrder.matchedOrderId, { transaction });
          
          if (settledMatchedOrder && settledMatchedOrder.settledAt) {
            console.log(`🔄 고아 주문 ${orphanOrder.id} 개별 정산 시작`);
            
            // 개별 정산 로직 실행
            const result = await this.settleOrphanedOrder(orphanOrder, settledMatchedOrder, gameResult, transaction);
            settlementResults.push(result);
            settledCount += 1;
            totalWinnings += result.totalWinnings;
            
            console.log(`✅ 고아 주문 정산 완료: ${orphanOrder.id}, 수익: ${result.totalWinnings}`);
          }
        } catch (error) {
          console.error(`❌ 고아 주문 ${orphanOrder.id} 정산 실패:`, error);
        }
      }
      
      // 🆕 부분 매칭된 주문들 개별 정산 (matchedOrderId가 null인 경우)
      // ❌ 멀티배팅은 개별 정산 하지 않음 - 그룹 정산만 허용
      const partialMatchedOrders = allOrders.filter(order =>
        order.status === 'partially_matched' &&
        order.matchedOrderId === null &&
        !order.isMultibet  // 멀티배팅 완전 제외
      );
      
      console.log(`\n🔄 부분 매칭 주문 개별 정산 시작: ${partialMatchedOrders.length}개`);
      
      for (const partialOrder of partialMatchedOrders) {
        try {
          console.log(`🔄 부분 매칭 주문 ${partialOrder.id} 개별 정산 시작`);

          // 일반배팅만 처리 (멀티배팅은 이미 필터에서 제외됨)
          const gameWinResult = this.determineWinResult(partialOrder.selection, gameResult);
          let actualProfit = 0;
          let profitLoss = 0;

          if (gameWinResult) {
            if (partialOrder.side === 'back') {
              actualProfit = (parseFloat(partialOrder.odds) - 1) * parseFloat(partialOrder.filledAmount || partialOrder.amount);
              profitLoss = actualProfit;
            } else {
              actualProfit = -parseFloat(partialOrder.filledAmount || partialOrder.amount);
              profitLoss = actualProfit;
            }
          } else {
            if (partialOrder.side === 'back') {
              actualProfit = -parseFloat(partialOrder.filledAmount || partialOrder.amount);
              profitLoss = actualProfit;
            } else {
              actualProfit = parseFloat(partialOrder.filledAmount || partialOrder.amount);
              profitLoss = actualProfit;
            }
          }

          await partialOrder.update({
            status: 'settled',
            actualProfit: actualProfit,
            settledAt: new Date(),
            profitLoss: profitLoss
          }, { transaction });

          const user = await User.findByPk(partialOrder.userId, { transaction });
          if (user && actualProfit > 0) {
            user.balance += actualProfit;
            await user.save({ transaction });
          }

          const result = {
            orderId: partialOrder.id,
            userId: partialOrder.userId,
            side: partialOrder.side,
            isWin: gameWinResult,
            totalWinnings: actualProfit,
            isPartialMatched: true
          };

          settlementResults.push(result);
          settledCount += 1;
          totalWinnings += actualProfit;

          console.log(`✅ 부분 매칭 일반배팅 정산 완료: ${partialOrder.id}, 수익: ${actualProfit}`);
        } catch (error) {
          console.error(`❌ 부분 매칭 주문 ${partialOrder.id} 정산 실패:`, error);
        }
      }
      
      await transaction.commit();
      
      const summary = {
        gameKey: `${homeTeam}|${awayTeam}|${commenceTime}`,
        settledOrders: settledCount,
        totalWinnings,
        results: settlementResults,
        // 🆕 부분 매칭 통계 추가
        partialMatchStats: {
          totalPartialMatches: settlementResults.filter(r => r.isPartialMatch).length,
          partialMatchOrders: settlementResults.filter(r => r.isPartialMatch).length * 2
        }
      };
      
      // 🆕 개선된 정산 완료 요약 로그
      console.log('\n🎉 정산 완료 요약:');
      console.log(`   🏟️ 경기: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
      console.log(`   📊 정산된 주문: ${settledCount}개`);
      console.log(`   💰 총 수익: ${totalWinnings}원`);
      console.log(`   🔄 부분 매칭: ${summary.partialMatchStats.totalPartialMatches}개 쌍`);
      
      if (summary.partialMatchStats.totalPartialMatches > 0) {
        console.log('\n   📋 부분 매칭 정산 상세:');
        settlementResults.forEach((result, index) => {
          if (result.isPartialMatch) {
            console.log(`     ${index + 1}. Back: ${result.backResult.userId} (${result.backResult.isPartial ? '부분' : '완전'})`);
            console.log(`        Lay: ${result.layResult.userId} (${result.layResult.isPartial ? '부분' : '완전'})`);
            console.log(`        결과: ${result.winnerSide} 승리, 수익: ${result.totalWinnings}원`);
          }
        });
      }
      
      return summary;
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 정산 중 오류:', error);
      throw error;
    }
  }

  /**
   * 매칭된 주문 쌍으로 그룹화 (개선된 버전)
   * @param {Array} orders - 주문 목록
   * @returns {Array} 주문 쌍 배열
   */
  groupMatchedOrders(orders) {
    const pairs = [];
    const processedIds = new Set();
    
    console.log(`\n🔍 주문 쌍 그룹화 시작: ${orders.length}개 주문`);
    
    // 1. matchedOrderId가 있는 주문들 먼저 처리 (이미 정산된 주문과 매칭된 주문도 포함)
    for (const order of orders) {
      if (processedIds.has(order.id)) continue;
      
      if (order.matchedOrderId) {
        // 매칭된 상대 주문 찾기 (상태에 관계없이 찾기)
        const matchedOrder = orders.find(o => 
          o.id === order.matchedOrderId && !processedIds.has(o.id)
        );
        
        if (matchedOrder) {
          pairs.push([order, matchedOrder]);
          processedIds.add(order.id);
          processedIds.add(matchedOrder.id);
          console.log(`   ✅ 쌍 생성: ${order.id} ↔ ${matchedOrder.id} (${order.side} ↔ ${matchedOrder.side}) [${order.status} ↔ ${matchedOrder.status}]`);
        } else {
          // 매칭된 상대 주문이 orders 배열에 없는 경우, 데이터베이스에서 직접 조회
          console.log(`   🔍 주문 ${order.id}의 매칭된 주문 ${order.matchedOrderId}를 데이터베이스에서 조회 중...`);
        }
      }
    }
    
    // 2. 아직 처리되지 않은 주문들을 Back/Lay로 쌍 만들기
    const remainingOrders = orders.filter(order => !processedIds.has(order.id));
    console.log(`   📝 남은 주문 수: ${remainingOrders.length}개`);
    
    if (remainingOrders.length >= 2) {
      // Back과 Lay 주문 분리
      const backOrders = remainingOrders.filter(order => order.side === 'back');
      const layOrders = remainingOrders.filter(order => order.side === 'lay');
      
      console.log(`   🎯 Back 주문: ${backOrders.length}개, Lay 주문: ${layOrders.length}개`);
      
      // 같은 선택(selection)을 가진 Back/Lay 주문들을 쌍으로 만들기
      const ordersBySelection = {};
      remainingOrders.forEach(order => {
        const selection = this.getSelectionFromOrder(order);  // ✅ selectionDetails 우선 사용
        if (!ordersBySelection[selection]) {
          ordersBySelection[selection] = { back: [], lay: [] };
        }
        ordersBySelection[selection][order.side].push(order);
      });
      
      for (const [selection, sideOrders] of Object.entries(ordersBySelection)) {
        if (sideOrders.back.length > 0 && sideOrders.lay.length > 0) {
          const maxPairs = Math.min(sideOrders.back.length, sideOrders.lay.length);
          
          for (let i = 0; i < maxPairs; i++) {
            const backOrder = sideOrders.back[i];
            const layOrder = sideOrders.lay[i];
            
            if (!processedIds.has(backOrder.id) && !processedIds.has(layOrder.id)) {
              pairs.push([backOrder, layOrder]);
              processedIds.add(backOrder.id);
              processedIds.add(layOrder.id);
              console.log(`   ✅ 자동 쌍 생성: ${backOrder.id} ↔ ${layOrder.id} (${selection})`);
            }
          }
        }
      }
    }
    
    console.log(`   🎉 총 생성된 쌍: ${pairs.length}개`);
    return pairs;
  }

  /**
   * 🆕 매칭된 주문 쌍 정산 (부분 매칭 포함)
   * @param {Array} pair - [backOrder, layOrder] 쌍
   * @param {Object} gameResult - 경기 결과
   * @param {Object} transaction - DB 트랜잭션
   * @param {Object} match - ExchangeOrderMatch 객체 (선택)
   * @returns {Object} 정산 결과
   */
  async settlePair(pair, gameResult, transaction, match = null) {
    const [order1, order2] = pair;
    
    // 🛡️ CRITICAL GUARD CLAUSE (제미나이 제안)
    if (!gameResult || gameResult.status !== 'finished' || !gameResult.score) {
      const errorMessage = `🚨 치명적 오류: 유효한 경기 결과 없이 정산 시도. ` +
        `GameResult Status: ${gameResult?.status}, Score: ${gameResult?.score ? 'exists' : 'null'}`;
      console.error(errorMessage, { 
        orderIds: pair.map(o => o.id),
        homeTeam: gameResult?.homeTeam,
        awayTeam: gameResult?.awayTeam
      });
      throw new Error(errorMessage);
    }
    
    // back과 lay 주문 구분
    const backOrder = order1.side === 'back' ? order1 : order2;
    const layOrder = order1.side === 'lay' ? order1 : order2;
    
    console.log(`\n🔍 주문 쌍 분석:`);
    const backSelection = this.getSelectionFromOrder(backOrder);  // ✅ selectionDetails 우선 사용
    const laySelection = this.getSelectionFromOrder(layOrder);    // ✅ selectionDetails 우선 사용
    console.log(`  Back 주문: ID ${backOrder.id}, ${backSelection}, 배당 ${backOrder.price}`);
    console.log(`  Lay 주문: ID ${layOrder.id}, ${laySelection}, 배당 ${layOrder.price}`);
    
    // 🆕 부분 매칭 정보 로깅
    if (backOrder.partiallyFilled || layOrder.partiallyFilled) {
      console.log(`  🔄 부분 매칭 정보:`);
      if (backOrder.partiallyFilled) {
        console.log(`    Back: 원래 ${backOrder.originalAmount}원, 체결 ${backOrder.filledAmount}원, 남음 ${backOrder.remainingAmount}원`);
      }
      if (layOrder.partiallyFilled) {
        console.log(`    Lay: 원래 ${layOrder.originalAmount}원, 체결 ${layOrder.filledAmount}원, 남음 ${layOrder.remainingAmount}원`);
      }
    }
    
    // 승부 판정
    const isBackWin = this.determineWinner(backOrder, gameResult);
    
    console.log(`  🎲 승부 판정: Back ${isBackWin ? '승리' : '패배'}`);
    
    // ✅ 수정: match 객체가 있으면 matchedAmount 사용, 없으면 기존 로직
    let backStakeAmount, layStakeAmount;
    
    if (match) {
      // ExchangeOrderMatch 기반 정산: matchedAmount 사용
      console.log(`  🔍 Match 필드:`, {
        matchedAmount: match.matchedAmount,
        matchedPrice: match.matchedPrice,
        hasDataValues: !!match.dataValues,
        keys: Object.keys(match)
      });

      // Sequelize 인스턴스면 dataValues 사용
      const matchedAmountValue = match.dataValues?.matchedAmount || match.matchedAmount;
      const matchedPriceValue = match.dataValues?.matchedPrice || match.matchedPrice;

      backStakeAmount = Number(matchedAmountValue);
      const matchedPrice = Number(matchedPriceValue);

      // ✅ 원 단위 계산: 정수 연산으로 부동소수점 오차 방지
      // Math.floor(backStake * (price - 1)) 대신 Math.floor(backStake * price) - backStake 사용
      // 이유: (price - 1) 연산에서 부동소수점 오차 발생 가능
      layStakeAmount = Math.floor(backStakeAmount * matchedPrice) - backStakeAmount;

      console.log(`  ✅ Match 기반 정산: matchedAmount=${backStakeAmount.toLocaleString()}원, price=${matchedPrice}, layStake=${layStakeAmount}원`);
    } else {
      // ✅ Fallback: match 파라미터가 없을 때 zero-sum 계산
      backStakeAmount = backOrder.partiallyFilled ? (backOrder.filledAmount || 0) : backOrder.stakeAmount;

      // ✅ layLiability 계산 (zero-sum 원칙) - 정수 연산으로 부동소수점 오차 방지
      const matchedPrice = Number(backOrder.price || layOrder.price);
      layStakeAmount = Math.floor(backStakeAmount * matchedPrice) - backStakeAmount;

      console.log(`  ⚠️  Fallback 로직 정산 (match 파라미터 없음): backStake=${backStakeAmount.toLocaleString()}원, layLiability=${layStakeAmount.toLocaleString()}원, price=${matchedPrice}`);
    }
    
    // ✅ 정밀 계산 유틸리티를 사용한 Exchange 정산 (부동 소수점 오차 방지)

    // 1. Back 매치금액 계산
    const backMatchAmount = PrecisionCalculation.calculateBackMatchAmount(backStakeAmount, backOrder.price);

    // 2. Lay 지분비율 계산
    const layShareRatio = PrecisionCalculation.calculateLayShareRatio(layStakeAmount, backMatchAmount);

    // 3. 디버그 정보 생성
    const debugInfo = PrecisionCalculation.getDebugInfo('exchange_settlement', {
      backStake: backStakeAmount,
      layStake: layStakeAmount,
      price: backOrder.price,
      backMatchAmount,
      layShareRatio
    });

    console.log(`  💰 Exchange 정산 계산 (정밀 연산):`);
    console.log(`    Back 매치금액: ${backMatchAmount}원 (배당률 ${backOrder.price})`);
    console.log(`    Lay 지분비율: ${(layShareRatio * 100).toFixed(1)}%`);
    console.log(`    디버그 정보:`, debugInfo);

    let backWinAmount, layWinAmount;

    // 🔑 핵심: 담보금은 이미 차감되었으므로, 정산 시에는 승자에게만 총 담보금 지급
    if (isBackWin) {
      // Back 승리: 총 담보금 지급 (Back담보 + Lay담보)
      // ✅ 정수 연산 보장: Number() 명시적 변환
      backWinAmount = Number(backStakeAmount) + Number(layStakeAmount);
      layWinAmount = 0; // Lay 패배: 담보금 이미 차감됨
      console.log(`  🏆 Back 승리: Back +${backWinAmount}원 (Back담보 ${backStakeAmount} + Lay담보 ${layStakeAmount}), Lay 0원 (이미 차감)`);
    } else {
      // Lay 승리: 총 담보금 지급 (Lay담보 + Back담보)
      backWinAmount = 0; // Back 패배: 담보금 이미 차감됨
      // ✅ 정수 연산 보장: Number() 명시적 변환
      layWinAmount = Number(layStakeAmount) + Number(backStakeAmount);
      console.log(`  🏆 Lay 승리: Lay +${layWinAmount}원 (Lay담보 ${layStakeAmount} + Back담보 ${backStakeAmount}), Back 0원 (이미 차감)`);
    }
    
    console.log(`  💰 수익 계산 (올바른 Exchange 로직):`);
    console.log(`    Back 주문: ${backWinAmount > 0 ? '+' : ''}${backWinAmount}원 (체결: ${backStakeAmount}원)`);
    console.log(`    Lay 주문: ${layWinAmount > 0 ? '+' : ''}${layWinAmount}원 (체결: ${layStakeAmount}원, 지분비율: ${(layShareRatio * 100).toFixed(1)}%)`);
    
    // 사용자 잔고 업데이트
    await this.updateUserBalance(backOrder, backWinAmount, gameResult, isBackWin, transaction);
    await this.updateUserBalance(layOrder, layWinAmount, gameResult, isBackWin, transaction);
    
    // 🆕 주문 상태 업데이트 (부분 매칭 고려)
    const settledAt = new Date();
    
    // Back 주문 정산
    // ✅ match 객체가 있으면 actualProfit 누적 (1:N 매칭 지원)
    if (match) {
      // ExchangeOrderMatch 기반 정산: SQL INCREMENT로 동시성 안전하게 누적
      const updateFields = {
        status: 'settled',
        settledAt
      };
      
      // actualProfit이 NULL이면 0으로 초기화 후 더하기 (SQL 레벨 INCREMENT)
      await ExchangeOrder.update(
        {
          ...updateFields,
          actualProfit: sequelize.literal(`COALESCE("actualProfit", 0) + ${backWinAmount}`)
        },
        {
          where: { id: backOrder.id },
          transaction
        }
      );
      
      console.log(`  ✅ 백 주문 ${backOrder.id} actualProfit 누적: +${backWinAmount}원 (SQL INCREMENT)`);
      
      // 부분 매칭 처리
      if (backOrder.partiallyFilled && backOrder.remainingAmount > 0) {
        await this.cancelRemainingAmount(backOrder, transaction);
      }
    } else {
      // 기존 로직 (1:1 쌍 정산): 덮어쓰기
      if (backOrder.partiallyFilled) {
        const backSettlementNote = this.generateDetailedPartialMatchingSettlementNote(backOrder, gameResult, isBackWin, backStakeAmount);
        await backOrder.update({
          status: 'settled',
          actualProfit: backWinAmount,
          settledAt,
          settlementNote: backSettlementNote
        }, { transaction });
        
        if (backOrder.remainingAmount > 0) {
          await this.cancelRemainingAmount(backOrder, transaction);
        }
      } else {
        await backOrder.update({
          status: 'settled',
          actualProfit: backWinAmount,
          settledAt,
          settlementNote: this.generateSettlementNote(backOrder, gameResult, isBackWin)
        }, { transaction });
      }
    }
    
    // Lay 주문 정산
    if (match) {
      // ✅ ExchangeOrderMatch 기반: SQL INCREMENT로 누적 (1:N 매칭 지원)
      await ExchangeOrder.update(
        {
          status: 'settled',
          settledAt,
          actualProfit: sequelize.literal(`COALESCE("actualProfit", 0) + ${layWinAmount}`)
        },
        {
          where: { id: layOrder.id },
          transaction
        }
      );

      console.log(`  ✅ 레이 주문 ${layOrder.id} actualProfit 누적: +${layWinAmount}원 (SQL INCREMENT)`);

      // 부분 매칭 처리
      if (layOrder.partiallyFilled && layOrder.remainingAmount > 0) {
        await this.cancelRemainingAmount(layOrder, transaction);
      }
    } else {
      // 기존 로직 (1:1 쌍 정산): 덮어쓰기
      if (layOrder.partiallyFilled) {
        const laySettlementNote = this.generateDetailedPartialMatchingSettlementNote(layOrder, gameResult, isBackWin, layStakeAmount);
        await layOrder.update({
          status: 'settled',
          actualProfit: layWinAmount,
          settledAt,
          settlementNote: laySettlementNote
        }, { transaction });

        if (layOrder.remainingAmount > 0) {
          await this.cancelRemainingAmount(layOrder, transaction);
        }
      } else {
        await layOrder.update({
          status: 'settled',
          actualProfit: layWinAmount,
          settledAt,
          settlementNote: this.generateSettlementNote(layOrder, gameResult, isBackWin)
        }, { transaction });
      }
    }
    
    return {
      backOrderId: backOrder.id,
      layOrderId: layOrder.id,
      winnerSide: isBackWin ? 'back' : 'lay',
      backResult: { userId: backOrder.userId, profit: backWinAmount, isPartial: backOrder.partiallyFilled },
      layResult: { userId: layOrder.userId, profit: layWinAmount, isPartial: layOrder.partiallyFilled },
      totalWinnings: Math.abs(backWinAmount) + Math.abs(layWinAmount),
      isPartialMatch: backOrder.partiallyFilled || layOrder.partiallyFilled
    };
  }

  /**
   * market별 승부 판정 로직
   * @param {Object} order - 베팅 주문
   * @param {Object} gameResult - 경기 결과
   * @returns {boolean} back 주문 승리 여부
   */
  determineWinner(order, gameResult) {
    const { market, line, selectionDetails } = order;
    // ✅ 정책: result 필드 사용 금지
    const { score } = gameResult;
    
    console.log(`    🎯 판정 기준: market=${market}, line=${line}, selection=${order.selection}`);
    
    // ✅ 멀티베팅 처리: selectionDetails에서 선택 정보 확인
    if (market.toLowerCase() === 'multibet' && selectionDetails?.selections?.[0]) {
      const firstSelection = selectionDetails.selections[0];
      console.log(`    🎯 멀티베팅: ${firstSelection.market} 마켓, 선택: ${firstSelection.selection}`);
      
      // 임시 order 객체 생성 (첫 번째 선택사항으로)
      const tempOrder = {
        ...order,
        market: firstSelection.market,
        selection: firstSelection.selection,
        line: firstSelection.line
      };
      
      // 재귀 호출로 실제 승부 판정
      return this.determineWinner(tempOrder, gameResult);
    }
    
    switch (market.toLowerCase()) {
      case 'h2h':
      case '승패':
        return this.determineMoneylineWinner(order, gameResult);
        
      case 'spreads':
      case 'handicap':
      case '핸디캡':
        return this.determineSpreadWinner(order, gameResult);
        
      case 'totals':
      case 'total':
      case '총점':
        return this.determineTotalWinner(order, gameResult);
        
      default:
        console.warn(`⚠️ 알 수 없는 마켓 타입: ${market}`);
        return false;
    }
  }

  /**
   * 승패(Moneyline) 베팅 판정
   */
  determineMoneylineWinner(order, gameResult) {
    const { selection } = order;
    // ✅ 정책: result 필드 사용 금지 - score로 판정
    const { homeTeam, awayTeam, score, homeScore, awayScore } = gameResult;
    
    // 스코어에서 홈/어웨이 점수 추출
    let actualHomeScore = homeScore;
    let actualAwayScore = awayScore;
    
    // score JSON에서 추출
    if ((actualHomeScore === null || actualHomeScore === undefined) && score) {
      try {
        const scoreData = typeof score === 'string' ? JSON.parse(score) : score;
        if (Array.isArray(scoreData) && scoreData.length >= 2) {
          const homeScoreEntry = scoreData.find(s => s.name === homeTeam);
          const awayScoreEntry = scoreData.find(s => s.name === awayTeam);
          
          if (homeScoreEntry && awayScoreEntry) {
            actualHomeScore = parseInt(homeScoreEntry.score);
            actualAwayScore = parseInt(awayScoreEntry.score);
          }
        }
      } catch (e) {
        console.error(`[EXCHANGE_SETTLEMENT] 스코어 파싱 오류:`, e.message);
        return false;
      }
    }
    
    // 스코어가 없으면 판정 불가
    if (actualHomeScore === null || actualHomeScore === undefined || 
        actualAwayScore === null || actualAwayScore === undefined) {
      console.log(`      선택팀: ${selection}, 스코어 없음 - 판정 불가`);
      return false;
    }
    
    // 승패 판정
    const homeWin = actualHomeScore > actualAwayScore;
    const awayWin = actualAwayScore > actualHomeScore;
    const isDraw = actualHomeScore === actualAwayScore;
    
    // ✅ Draw 선택 처리 (대소문자 무관)
    const selectionLower = selection?.toLowerCase() || '';
    const isDrawSelection = selectionLower === 'draw' || selection === '무승부' || selectionLower === 'x';
    
    // 선택한 팀이 홈팀인지 확인
    const isHomeSelection = selection.includes(homeTeam) || 
                           selection.toLowerCase().includes('home');
    
    console.log(`      선택팀: ${selection}, 홈팀여부: ${isHomeSelection}, Draw선택: ${isDrawSelection}, 스코어: ${actualHomeScore}-${actualAwayScore}`);
    
    // ✅ Draw 선택인 경우
    if (isDrawSelection) {
      return isDraw; // 무승부면 승리, 아니면 패배
    }
    
    // ✅ 무승부인데 Draw 선택이 아니면 패배
    if (isDraw) {
      return false;
    }
    
    if (isHomeSelection) {
      return homeWin;
    } else {
      return awayWin;
    }
  }

  /**
   * 스코어 데이터 정규화 (다양한 형식 처리)
   */
  normalizeScore(scoreData) {
    if (!scoreData) return null;

    // 이미 배열인 경우
    if (Array.isArray(scoreData)) {
      return scoreData;
    }

    // 문자열인 경우 파싱 시도
    if (typeof scoreData === 'string') {
      try {
        // 이중 이스케이프 처리
        let normalized = scoreData;

        // 외부 따옴표 제거 (이중 이스케이프의 경우)
        if (normalized.startsWith('"') && normalized.endsWith('"')) {
          normalized = normalized.slice(1, -1);
        }

        // 이스케이프 문자 정규화
        normalized = normalized.replace(/\\"/g, '"');

        // JSON 파싱
        const parsed = JSON.parse(normalized);

        if (Array.isArray(parsed) && parsed.length >= 2) {
          return parsed;
        }
      } catch (error) {
        console.warn('⚠️ 스코어 파싱 실패:', error.message, scoreData);
      }
    }

    return null;
  }

  /**
   * 핸디캡(Spread) 베팅 판정
   */
  determineSpreadWinner(order, gameResult) {
    const { line, selection } = order;
    const { homeTeam } = gameResult;

    const score = this.normalizeScore(gameResult.score);

    if (!score || !Array.isArray(score) || score.length < 2) {
      console.warn('⚠️ 스코어 정보가 부족하여 핸디캡 판정 불가');
      return false;
    }
    
    const homeScore = parseInt(score[0].score) || 0;
    const awayScore = parseInt(score[1].score) || 0;
    
    // 선택한 팀이 홈팀인지 확인
    const isHomeSelection = selection.includes(homeTeam);
    
    // 핸디캡 적용한 점수 차이 계산
    const scoreDiff = homeScore - awayScore;
    const adjustedDiff = isHomeSelection ? scoreDiff + line : scoreDiff - line;
    
    console.log(`      홈스코어: ${homeScore}, 원정스코어: ${awayScore}`);
    console.log(`      핸디캡: ${line}, 선택팀: ${isHomeSelection ? 'home' : 'away'}`);
    console.log(`      조정된 점수차: ${adjustedDiff}`);
    
    return adjustedDiff > 0;
  }

  /**
   * 토탈(Total) 베팅 판정
   */
  determineTotalWinner(order, gameResult) {
    const { line, selection } = order;

    const score = this.normalizeScore(gameResult.score);

    if (!score || !Array.isArray(score) || score.length < 2) {
      console.warn('⚠️ 스코어 정보가 부족하여 토탈 판정 불가');
      return false;
    }

    const homeScore = parseInt(score[0].score) || 0;
    const awayScore = parseInt(score[1].score) || 0;
    const totalScore = homeScore + awayScore;
    
    // Over/Under 판정
    const isOverSelection = selection.toLowerCase().includes('over') || 
                           selection.includes('오버');
    
    console.log(`      총점: ${totalScore}, 기준선: ${line}`);
    console.log(`      선택: ${isOverSelection ? 'Over' : 'Under'}`);
    
    // ✅ Push 조건 추가 (총점 = 기준점이면 무효)
    if (totalScore === line) {
      console.log(`      Push 조건: 총점 ${totalScore} = 기준 ${line} → 무효 (환불 처리)`);
      return false; // Push는 승패 없음 (환불)
    }
    
    if (isOverSelection) {
      return totalScore > line;
    } else {
      return totalScore < line;
    }
  }

  /**
   * 🆕 사용자 잔고 업데이트 및 결제 내역 생성 (개선된 기록)
   * @param {Object} order - 주문 정보
   * @param {number} amount - 수익/손실 금액
   * @param {Object} gameResult - 경기 결과
   * @param {boolean} isWin - 승리 여부
   * @param {Object} transaction - DB 트랜잭션
   */
  async updateUserBalance(order, amount, gameResult, isWin, transaction) {
    const userId = order.userId;
    const user = await User.findByPk(userId, { transaction });
    if (!user) throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    
    // 🔧 정밀 계산 유틸리티를 사용한 잔고 업데이트 (부동 소수점 오차 방지)
    const currentBalance = parseFloat(user.balance);

    // 🆕 수수료 계산 및 차감 (Lay 주문 승리 시에만, 상대 담보금에서만)
    let netAmount = amount;
    let commissionAmount = 0;

    // Back 주문은 승리 시에도 수수료 차감하지 않음, Lay 주문만 승리 시 수수료 차감
    if (amount > 0 && order.side === 'lay') { // Lay 주문 승리 시에만 수수료 차감
      // 🔑 핵심: 수수료는 상대 담보금(backStakeAmount)에서만 차감
      // Lay 담보금(layStakeAmount)은 전액 반환
      const backStakeAmount = amount - (order.stakeAmount || 0); // 상대 Back 담보금
      
      // 🆕 통합 수수료 계산 (상대 담보금 기준)
      const commissionCalculation = await CommissionService.calculate({
        winnings: backStakeAmount, // 상대 담보금에서만 수수료 계산
        stake: order.stakeAmount,  // 베팅금
        platform: 'exchange',
        user: user,
        bet: { id: order.id, userId: order.userId },
        policies: {}
      });

      commissionAmount = commissionCalculation.commissionAmount;

      // 수수료 계산 상세 로깅
      await CommissionService.logCommissionCalculation(user.id, commissionCalculation, {
        platform: 'exchange',
        orderId: order.id
      });

      // 정밀 계산으로 수수료 차감 (상대 담보금에서만)
      netAmount = PrecisionCalculation.subtract(amount, commissionAmount);

      console.log(`      💰 Lay 주문 수수료 (상대 담보금 기준): 총 ${amount}원 (Lay담보 ${order.stakeAmount} + Back담보 ${backStakeAmount}), 수수료 ${commissionAmount}원 (Back담보의 ${(commissionCalculation.appliedRate * 100).toFixed(2)}%), 실제 지급 ${netAmount}원`);
    } else if (amount > 0 && order.side === 'back') {
      console.log(`      💰 Back 주문 승리: 수익 ${amount}원 (수수료 없음)`);
    }

    // 정밀 계산으로 새 잔고 계산
    const newBalance = PrecisionCalculation.add(currentBalance, netAmount);

    // 디버그 정보 출력
    const balanceDebug = PrecisionCalculation.getDebugInfo('balance_update', {
      currentBalance,
      netAmount,
      newBalance
    });

    console.log(`      💳 잔고 업데이트 (정밀연산): ${currentBalance} → ${newBalance}`);
    console.log(`      디버그 정보:`, balanceDebug);
    
    await user.update({ balance: newBalance }, { transaction });
    
    // 🆕 수수료가 있는 경우 AdminCommission 기록 및 지급
    if (commissionAmount > 0) {
      // 추천인 확인
      const ReferralCode = (await import('../models/referralCodeModel.js')).default;
      const referralCode = user.referralCode ? await ReferralCode.findOne({
        where: { 
          code: user.referralCode, 
          isActive: true 
        },
        transaction
      }) : null;

      let commissionRecipientId = ADMIN_CONFIG.SYSTEM_ADMIN_ID; // 기본: 시스템 관리자
      let commissionType = 'exchange'; // 기본: exchange 수수료

      // 추천인이 있는 경우 → 추천인에게 실제 지급
      if (referralCode) {
        const findOptions = { transaction };
        if (transaction) {
          findOptions.lock = transaction.LOCK.UPDATE;
        }
        const referrerUser = await User.findByPk(referralCode.adminId, findOptions);

        if (referrerUser) {
          // 추천인 수수료 계산 (추천코드에 설정된 수수료율 사용)
          const referralCommissionRate = referralCode.commissionRate || 0;
          const referralCommissionAmount = Math.floor((amount + order.stakeAmount) * referralCommissionRate);

          if (referralCommissionAmount > 0) {
            // 추천인 잔액에 실제 입금
            const referrerNewBalance = PrecisionCalculation.add(referrerUser.balance, referralCommissionAmount);
            await referrerUser.update({ balance: referrerNewBalance }, { transaction });

            // AdminCommission 기록 (type: 'referral')
            await AdminCommission.create({
              adminId: referrerUser.id,
              userId: user.id,
              betId: null,
              exchangeOrderId: order.id,
              betAmount: order.stakeAmount,
              winAmount: amount + order.stakeAmount,
              commissionRate: referralCommissionRate,
              commissionAmount: referralCommissionAmount,
              status: 'paid',
              paidAt: new Date(),
              type: 'referral' // 추천인 수수료
            }, { transaction });

            // 추천인에게 지급된 수수료 기록
            await PaymentHistory.create({
              userId: referrerUser.id,
              betId: `EXCHANGE_${order.id}`,
              amount: referralCommissionAmount,
              memo: `익스체인지 추천인 수수료 (${user.email} 주문 승리, ${(referralCommissionRate * 100).toFixed(2)}%)`,
              paidAt: new Date(),
              balanceAfter: referrerNewBalance
            }, { transaction });

            console.log(`      💰 추천인 수수료: ${referrerUser.email}에게 ${referralCommissionAmount}원 지급 (${(referralCommissionRate * 100).toFixed(2)}%)`);

            // 추천인에게 지급했으므로 시스템 관리자에게는 기록하지 않음
            commissionRecipientId = referrerUser.id;
            commissionType = 'referral';
          }
        }
      } else {
        // 추천인이 없는 경우 → 시스템 관리자에게 기록만 (회계용)
        await AdminCommission.create({
          adminId: ADMIN_CONFIG.SYSTEM_ADMIN_ID,
          userId: user.id,
          betId: null,
          exchangeOrderId: order.id,
          betAmount: order.stakeAmount,
          winAmount: amount + order.stakeAmount,
          commissionRate: await CommissionSettingsService.getCommissionRate('exchange'),
          commissionAmount: commissionAmount,
          status: 'paid',
          paidAt: new Date(),
          type: 'exchange' // 익스체인지 수수료 (회계용)
        }, { transaction });

        console.log(`      💰 수수료 기록: ${commissionAmount}원 (시스템 회계 기록)`);
      }
      
      // 🆕 수수료 차감 기록을 PaymentHistory에 저장
      await PaymentHistory.create({
        userId: user.id,
        betId: `EXCHANGE_${order.id}`,
        amount: -commissionAmount, // 음수로 수수료 차감 표시
        memo: `익스체인지 수수료 (${((await CommissionSettingsService.getCommissionRate('exchange')) * 100).toFixed(2)}%)`,
        paidAt: new Date(),
        balanceAfter: newBalance
      }, { transaction });
    }
    
    // 🆕 개선된 결제 내역 메모 생성
    const isPartialMatch = order.partiallyFilled;
    const selection = this.getSelectionFromOrder(order);  // ✅ selectionDetails 우선 사용
    
    let memo = '';
    if (amount > 0) {
      // 승리
      if (order.side === 'back') {
        memo = isPartialMatch 
          ? `Back 수익 (부분 체결 ${order.filledAmount.toLocaleString()}원)` 
          : 'Back 수익';
      } else {
        memo = 'Lay 수익';
      }
    } else {
      // 손실
      if (order.side === 'back') {
        memo = isPartialMatch 
          ? `Back 손실 (부분 체결 ${order.filledAmount.toLocaleString()}원)` 
          : 'Back 손실';
      } else {
        memo = 'Lay 담보금 손실';
      }
    }
    
    // 경기 정보 추가 (간결하게)
    memo += ` - ${selection}, ${gameResult.homeTeam} vs ${gameResult.awayTeam}, 배당 ${order.price}배`;
    
    // 수수료 정보 (Lay 승리 시에만)
    if (amount > 0 && order.side === 'lay' && commissionAmount > 0) {
      memo += ` (수수료 ${commissionAmount.toLocaleString()}원 차감)`;
    }
    
    // 🆕 실제 상금 지급 기록
    await PaymentHistory.create({
      userId,
      betId: `EXCHANGE_${order.id}`, // Exchange 주문 ID를 betId로 사용하여 추적 가능
      amount: netAmount, // 수수료 차감 후 실제 지급 금액
      memo,
      paidAt: new Date(),
      balanceAfter: newBalance
    }, { transaction });
    
    console.log(`      💳 ${userId}: ${currentBalance} → ${newBalance} (총 ${amount > 0 ? '+' : ''}${amount}원 → 수수료 ${commissionAmount}원 차감 → 실제 ${netAmount > 0 ? '+' : ''}${netAmount}원)`);
    console.log(`      📝 메모: ${memo}`);
  }

  /**
   * 🆕 정산 메모 생성 (부분 매칭 정보 포함)
   * @param {Object} order - 주문 정보
   * @param {Object} gameResult - 경기 결과
   * @param {boolean} isWin - 승리 여부
   * @returns {string} 정산 메모
   */
  generateSettlementNote(order, gameResult, isWin) {
    const result = isWin ? '승리' : '패배';
    const market = order.market || '승패';
    const selection = this.getSelectionFromOrder(order);  // ✅ selectionDetails 우선 사용
    
    // 🆕 부분 매칭 정보 추가
    let partialMatchInfo = '';
    if (order.partiallyFilled) {
      partialMatchInfo = ` [부분 매칭: 원래 ${order.originalAmount}원, 체결 ${order.filledAmount}원, 남음 ${order.remainingAmount}원]`;
    }
    
    return `${market} 베팅 ${result}${partialMatchInfo} - 선택: ${selection}, ` +
           `경기: ${gameResult.homeTeam} vs ${gameResult.awayTeam}, ` +
           `결과: ${gameResult.status}`;
  }

  /**
   * 🆕 특정 경기의 정산 가능한 주문 조회 (부분 매칭 포함)
   */
  async getSettlableOrdersByMatch(homeTeam, awayTeam, commenceTime) {
    return await ExchangeOrder.findAll({
      where: {
        homeTeam,
        awayTeam,
        commenceTime,
        status: { [Op.in]: ['matched', 'partially_matched'] },  // 🆕 부분 매칭 포함
        settledAt: null
      }
    });
  }

  /**
   * 🆕 부분 매칭된 주문의 남은 금액 취소 처리 (개선됨)
   * @param {Object} order - 부분 매칭된 주문
   * @param {Object} transaction - DB 트랜잭션
   */
  async cancelRemainingAmount(order, transaction) {
    try {
      console.log(`  🔄 남은 금액 취소 처리: 주문 ID ${order.id}, 남은 금액 ${order.remainingAmount}원`);
      
      // 남은 금액이 0 이하면 취소 처리 불필요
      if (!order.remainingAmount || order.remainingAmount <= 0) {
        return;
      }
      
      // 🚨 수정: 환불할 금액을 미리 저장
      const refundAmount = order.remainingAmount;
      
      // 1. 남은 금액을 0으로 설정하고 상세한 정산 메모 생성
      const detailedNote = this.generateDetailedPartialMatchingNote(order);
      await order.update({
        remainingAmount: 0,
        settlementNote: detailedNote
      }, { transaction });
      
      // 2. 사용자 잔액에 남은 금액 환불
      const user = await User.findByPk(order.userId, { transaction });
      const currentBalance = parseFloat(user.balance);
      const newBalance = currentBalance + refundAmount;
      
      await user.update({ balance: newBalance }, { transaction });
      
      // 3. 환불 내역 기록 (상세한 메모 포함)
      const refundMemo = this.generateDetailedRefundMemo(order, refundAmount);
      await PaymentHistory.create({
        userId: order.userId,
        betId: `EXCHANGE_${order.id}`, // Exchange 주문 ID를 betId로 사용하여 추적 가능
        amount: refundAmount,
        type: 'refund',
        memo: refundMemo,
        status: 'completed',
        balanceAfter: newBalance,
        paidAt: new Date()
      }, { transaction });
      
      console.log(`    ✅ 남은 금액 취소 완료 - 환불: ${refundAmount}원, 새 잔액: ${newBalance}원`);
      console.log(`    📝 정산 메모: ${detailedNote}`);
      
    } catch (error) {
      console.error(`    ❌ 남은 금액 취소 처리 실패:`, error);
      throw error;
    }
  }

  /**
   * 🆕 부분 매칭 상세 정산 메모 생성
   * @param {Object} order - 부분 매칭된 주문
   * @returns {string} 상세한 정산 메모
   */
  generateDetailedPartialMatchingNote(order) {
    const baseNote = order.settlementNote || '정산 완료';
    const partialInfo = `[부분 매칭] 원래 ${(order.originalAmount || order.amount).toLocaleString()}원 중 ${(order.filledAmount || 0).toLocaleString()}원 체결, ${(order.remainingAmount || 0).toLocaleString()}원 취소`;
    
    return `${baseNote} - ${partialInfo}`;
  }

  /**
   * 🆕 부분 매칭 상세 환불 메모 생성
   * @param {Object} order - 부분 매칭된 주문
   * @param {number} refundAmount - 환불할 금액
   * @returns {string} 상세한 환불 메모
   */
  generateDetailedRefundMemo(order, refundAmount) {
    return `부분 매칭 후 남은 금액 자동 환불 - ${order.homeTeam} vs ${order.awayTeam} (${order.side} ${order.selection}) - 체결: ${(order.filledAmount || 0).toLocaleString()}원, 환불: ${refundAmount.toLocaleString()}원`;
  }

  /**
   * 🆕 부분 매칭 상세 정산 메모 생성 (정산 시)
   * @param {Object} order - 부분 매칭된 주문
   * @param {Object} gameResult - 경기 결과
   * @param {boolean} isBackWin - Back 주문 승리 여부
   * @param {number} stakeAmount - 실제 체결된 금액
   * @returns {string} 상세한 정산 메모
   */
  generateDetailedPartialMatchingSettlementNote(order, gameResult, isBackWin, stakeAmount) {
    const baseResult = isBackWin ? '승리' : '패배';
    const partialInfo = `[부분 매칭] 원래 ${(order.originalAmount || order.amount).toLocaleString()}원 중 ${stakeAmount.toLocaleString()}원 체결, ${(order.remainingAmount || 0).toLocaleString()}원 취소`;
    
    return `정산 완료 - ${baseResult} - ${partialInfo}`;
  }

  /**
   * 경기 시작 시점에 매칭되지 않은 주문 자동 취소
   * ✅ 개선: 경기 시작 시점에 즉시 자동 취소 (10분 전까지만 배팅 가능하므로)
   */
  async cancelUnmatchedOrdersAtKickoff() {
    try {
      console.log('🔄 경기 시작 시점 매칭되지 않은 주문 자동 취소 시작...');
      
      const now = new Date();
      // ✅ 수정: 경기 시작 시점 기준으로 변경 (3시간 대기 제거)
      
      // 매칭되지 않은 주문들 조회 (경기 시작 시점 이후)
      const unmatchedOrders = await ExchangeOrder.findAll({
        where: {
          status: 'open',
          matchedOrderId: null,
          commenceTime: {
            [Op.lte]: now // 경기 시작 시점
          }
        }
      });

      console.log(`📊 만료된 미매칭 주문 수: ${unmatchedOrders.length}`);

      if (unmatchedOrders.length === 0) {
        console.log('✅ 취소할 주문이 없습니다.');
        return { cancelledCount: 0, totalRefund: 0 };
      }

      let cancelledCount = 0;
      let totalRefund = 0;

      for (const order of unmatchedOrders) {
        try {
          // 🆕 매칭 상태 재확인 - 매칭된 주문이 있는지 확인
          if (order.matchedOrderId) {
            const matchedOrder = await ExchangeOrder.findByPk(order.matchedOrderId);
            if (matchedOrder && matchedOrder.status !== 'cancelled') {
              console.log(`⚠️ 주문 ${order.id}는 매칭된 상태이므로 취소하지 않음 (매칭 주문: ${matchedOrder.id})`);
              continue;
            }
          }
          
          const gameTime = new Date(order.commenceTime);
          const hoursSinceGame = (now.getTime() - gameTime.getTime()) / (1000 * 60 * 60);
          
          console.log(`\n🎯 주문 취소 처리: ID ${order.id}`);
          console.log(`   경기: ${order.homeTeam} vs ${order.awayTeam}`);
          console.log(`   경기 시간: ${gameTime.toISOString()}`);
          console.log(`   경과 시간: ${hoursSinceGame.toFixed(1)}시간`);
          console.log(`   사이드: ${order.side}, 금액: ${order.amount}원`);
          console.log(`   스테이크: ${order.stakeAmount}원`);

          const transaction = await sequelize.transaction();

          try {
            // 1. 주문 상태 업데이트
            await order.update({
              status: 'cancelled',
              settlementNote: `경기 시작으로 매칭되지 않아 자동 취소`,
              settledAt: new Date()
            }, { transaction });

            // 🆕 2. 매칭된 상대 주문이 있다면 함께 취소 처리
            if (order.matchedOrderId) {
              const matchedOrder = await ExchangeOrder.findByPk(order.matchedOrderId, { transaction });
              if (matchedOrder && matchedOrder.status === 'active') {
                console.log(`   🔄 매칭된 주문 ${matchedOrder.id}도 함께 취소 처리`);
                
                await matchedOrder.update({
                  status: 'cancelled',
                  settlementNote: `매칭된 주문 ${order.id} 취소로 인한 동반 취소`,
                  settledAt: new Date()
                }, { transaction });
                
                // 매칭된 주문의 사용자 잔액 환불
                await User.increment('balance', {
                  by: matchedOrder.stakeAmount,
                  where: { id: matchedOrder.userId }
                }, { transaction });
                
                // 매칭된 주문의 환불 내역 기록
                const matchedUser = await User.findByPk(matchedOrder.userId, { transaction });
                await PaymentHistory.create({
                  userId: matchedOrder.userId,
                  betId: `EXCHANGE_${matchedOrder.id}`,
                  amount: matchedOrder.stakeAmount,
                  type: 'refund',
                  memo: `매칭된 주문 취소로 인한 자동 환불 (경기: ${matchedOrder.homeTeam} vs ${matchedOrder.awayTeam})`,
                  status: 'completed',
                  balanceAfter: matchedUser.balance,
                  paidAt: new Date()
                }, { transaction });
                
                console.log(`   ✅ 매칭된 주문 ${matchedOrder.id} 취소 완료 - 환불: ${matchedOrder.stakeAmount}원`);
              }
            }

            // 3. 사용자 잔액 환불
            await User.increment('balance', {
              by: order.stakeAmount,
              where: { id: order.userId }
            }, { transaction });

            // 환불 후 잔액 조회
            const user = await User.findByPk(order.userId, { transaction });

            // 4. 환불 내역 기록
            await PaymentHistory.create({
              userId: order.userId,
              betId: `EXCHANGE_${order.id}`, // Exchange 주문 ID를 betId로 사용하여 추적 가능
              amount: order.stakeAmount,
              type: 'refund',
              memo: `Exchange 주문 만료로 인한 자동 환불 (경기: ${order.homeTeam} vs ${order.awayTeam})`,
              status: 'completed',
              balanceAfter: user.balance,
              paidAt: new Date()
            }, { transaction });

            await transaction.commit();

            cancelledCount++;
            totalRefund += order.stakeAmount;

            console.log(`   ✅ 취소 완료 - 환불: ${order.stakeAmount}원, 새 잔액: ${user.balance}원`);

          } catch (error) {
            await transaction.rollback();
            console.error(`   ❌ 주문 ${order.id} 취소 실패:`, error.message);
          }

        } catch (error) {
          console.error(`❌ 주문 ${order.id} 처리 중 오류:`, error.message);
        }
      }

      console.log(`\n📊 자동 취소 완료: ${cancelledCount}개 주문, 총 환불: ${totalRefund.toLocaleString()}원`);
      
      return { cancelledCount, totalRefund };
      
    } catch (error) {
      console.error('❌ 매칭되지 않은 주문 자동 취소 중 오류:', error);
      throw error;
    }
  }

  /**
   * 🆕 경기 식별자 기반 정산 (gameResultId 방식 완전 대체)
   */
  async settleAllFinishedGamesByMatch() {
    try {
      console.log('🔄 경기 식별자 기반 정산 시스템 시작...');
      
      // 완료된 경기들 조회
      const finishedGames = await GameResult.findAll({
        where: {
          status: 'finished',
          result: { [Op.ne]: 'pending' }
        }
      });
      
      console.log(`📊 완료된 경기 수: ${finishedGames.length}개`);
      
      const gamesWithOrders = [];
      for (const game of finishedGames) {
        const hasOrders = await ExchangeOrder.count({
          where: {
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            commenceTime: game.commenceTime,
            status: { [Op.in]: ['matched', 'partially_matched'] },
            settledAt: null
          }
        });
        if (hasOrders > 0) {
          gamesWithOrders.push(game);
        }
      }
      
      console.log(`📊 정산 대상 경기: ${gamesWithOrders.length}개`);
      
      const settledGames = [];
      for (const game of gamesWithOrders) {
        try {
          const result = await this.settleGameOrdersByMatch(
            game.homeTeam, 
            game.awayTeam, 
            game.commenceTime
          );
          settledGames.push(result);
        } catch (error) {
          console.error(`경기 ${game.homeTeam} vs ${game.awayTeam} 정산 실패:`, error.message);
        }
      }
      
      const totalResults = {
        settledGames: settledGames.length,
        results: settledGames,
        totalSettled: settledGames.reduce((sum, result) => sum + (result.settledOrders || 0), 0)
      };
      
      console.log('\n🎉 경기 식별자 기반 정산 완료!');
      console.log(`📊 정산된 경기: ${settledGames.length}개`);
      console.log(`✅ 총 정산된 주문: ${totalResults.totalSettled}개`);
      
      return totalResults;
      
    } catch (error) {
      console.error('❌ 경기 식별자 기반 정산 실패:', error);
      throw error;
    }
  }

  /**
   * 🆕 경기 식별자 기반 정산 (점수 입력 방식)
   * @param {string} homeTeam - 홈팀명
   * @param {string} awayTeam - 어웨이팀명  
   * @param {Date} commenceTime - 경기 시작 시간
   * @param {string} result - 정산 결과 (home_win, away_win, draw)
   * @param {Object} score - 점수 정보 { homeScore, awayScore }
   * @returns {Object} 정산 결과
   */
  async settleGameOrdersByMatchWithResult(homeTeam, awayTeam, commenceTime, result, score) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🎯 점수 기반 정산 시작: ${homeTeam} vs ${awayTeam}`);
      console.log(`📊 점수: ${score.homeScore}:${score.awayScore}, 결과: ${result}`);
      
      // 정산 대상 주문들 조회
      const orders = await this.getSettlableOrdersByMatch(homeTeam, awayTeam, commenceTime);
      console.log(`📋 정산 대상 주문 수: ${orders.length}`);
      
      if (orders.length === 0) {
        await transaction.commit();
        return { settledOrders: 0, results: [] };
      }
      
      let settledCount = 0;
      const results = [];
      
      // 각 주문별로 정산 처리
      for (const order of orders) {
        try {
          const settlementResult = await this.settleSingleOrder(order, result, transaction);
          if (settlementResult.success) {
            settledCount++;
            results.push(settlementResult);
          }
        } catch (orderError) {
          console.error(`❌ 주문 ${order.id} 정산 실패:`, orderError);
          results.push({
            orderId: order.id,
            success: false,
            error: orderError.message
          });
        }
      }
      
      await transaction.commit();
      
      console.log(`✅ 정산 완료: ${settledCount}개 주문 정산됨`);
      
      return {
        settledOrders: settledCount,
        results,
        gameResult: {
          homeTeam,
          awayTeam,
          homeScore: score.homeScore,
          awayScore: score.awayScore,
          result
        }
      };
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 점수 기반 정산 실패:', error);
      throw error;
    }
  }

  /**
   * 🆕 경기 식별자 기반 정산 (homeTeam, awayTeam, commenceTime)
   * @param {string} homeTeam - 홈팀명
   * @param {string} awayTeam - 어웨이팀명  
   * @param {string} commenceTime - 경기 시작 시간 (ISO string)
   * @returns {Object} 정산 결과
   */
  async settleGameOrdersByMatch(homeTeam, awayTeam, commenceTime) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🎯 경기 식별자 기반 정산 시작: ${homeTeam} vs ${awayTeam}`);
      console.log(`⏰ 경기 시간: ${commenceTime}`);
      
      // 경기 결과 조회 (시간 범위 고려)
      const gameResult = await this.findGameResultByMatch(homeTeam, awayTeam, commenceTime);
      if (!gameResult || gameResult.status !== 'finished') {
        // gameResult.id가 없으면 gameId를 생성할 수 없으므로 gameResult.id를 사용하도록 수정
        const gameKey = gameResult ? `${gameResult.homeTeam}|${gameResult.awayTeam}|${gameResult.commenceTime}` : `${homeTeam}|${awayTeam}|${commenceTime}`;
        console.log(`[Main Settlement] 경기 결과를 찾을 수 없거나 경기가 아직 끝나지 않았습니다: ${gameKey}`);
        // 오류를 던지는 대신 빈 결과를 반환하여 다른 경기 정산에 영향을 주지 않도록 처리
        return {
          gameKey: gameKey,
          settledMatches: 0,
          totalWinnings: 0,
          results: [],
          message: 'Game result not found or not finished.'
        };
      }
      
      console.log(`🏟️ 경기 결과: ${gameResult.status}, 스코어:`, gameResult.score);
      
      // 정산 대상 주문들 조회
      const orders = await this.getSettlableOrdersByMatch(homeTeam, awayTeam, commenceTime);
      console.log(`📋 정산 대상 주문 수: ${orders.length}`);
      
      if (orders.length === 0) {
        await transaction.commit();
        return { settledOrders: 0, results: [] };
      }
      
      let settledCount = 0;
      let totalWinnings = 0;
      const settlementResults = [];
      
      // 멀티베팅 주문과 일반 주문 분리
      const multibetOrders = orders.filter(order => order.isMultibet === true);
      const regularOrders = orders.filter(order => order.isMultibet !== true);
      
      console.log(`🎯 멀티베팅 주문: ${multibetOrders.length}개, 일반 주문: ${regularOrders.length}개`);
      
      // 멀티베팅 주문 정산 (각 주문별로 개별 처리)
      for (const order of multibetOrders) {
        try {
          // 멀티베팅 주문은 각 선택사항에 대해 개별적으로 경기 결과를 찾아야 함
          const result = await this.settleMultibetOrder(order, null, transaction);
          settlementResults.push(result);
          settledCount += 1;
          totalWinnings += result.totalWinnings || 0;
          
          console.log(`✅ 멀티베팅 정산 완료: 주문 ${order.id}, 수익: ${result.totalWinnings}`);
        } catch (error) {
          console.error(`❌ 멀티베팅 주문 ${order.id} 정산 실패:`, error);
        }
      }
      
      // 일반 주문 쌍 정산
      const orderPairs = this.groupMatchedOrders(regularOrders);
      for (const pair of orderPairs) {
        try {
          // ✅ match 파라미터 조회
          const [backOrder, layOrder] = pair;
          const match = await ExchangeOrderMatch.findOne({
            where: {
              [Op.or]: [
                { originalOrderId: backOrder.id, matchingOrderId: layOrder.id },
                { originalOrderId: layOrder.id, matchingOrderId: backOrder.id }
              ]
            },
            transaction
          });
          
          const result = await this.settlePair(pair, gameResult, transaction, match);
          settlementResults.push(result);
          settledCount += 2; // back + lay 주문
          totalWinnings += result.totalWinnings;
          
          console.log(`✅ 주문 쌍 정산 완료: ${result.winnerSide} 승리, 수익: ${result.totalWinnings}`);
        } catch (error) {
          console.error(`❌ 주문 쌍 정산 실패:`, error);
        }
      }
      
      await transaction.commit();
      
      const summary = {
        gameKey: `${homeTeam}|${awayTeam}|${commenceTime}`,
        settledOrders: settledCount,
        totalWinnings,
        results: settlementResults
      };
      
      console.log('\n🎉 경기 식별자 기반 정산 완료!');
      console.log(`📊 정산된 주문: ${settledCount}개`);
      console.log(`💰 총 수익: ${totalWinnings}원`);
      
      return summary;
      
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('롤백 실패:', rollbackError);
      }
      console.error('❌ 경기 식별자 기반 정산 실패:', error);
      throw error;
    }
  }

  /**
   * 🆕 시간대 보정 함수 (KST+09 형식과 UTC 형식 모두 처리)
   * @param {string|Date} timeValue - 시간 값
   * @returns {Date} UTC Date 객체
   */
  normalizeTimezoneToUTC(timeValue) {
    if (!timeValue) return null;
    
    // 모든 시간을 UTC로 처리 (단순화)
    const date = new Date(timeValue);
    console.log(`🔧 시간 정규화: ${timeValue} → ${date.toISOString()}`);
    return date;
  }

  /**
   * 🆕 경기 결과를 경기 식별자로 찾기 (시간대 보정 포함)
   * @param {string} homeTeam - 홈팀명
   * @param {string} awayTeam - 어웨이팀명
   * @param {string} commenceTime - 경기 시작 시간
   * @returns {Object|null} 매칭된 경기 결과
   */
  async findGameResultByMatch(homeTeam, awayTeam, commenceTime) {
    const targetTime = this.normalizeTimezoneToUTC(commenceTime);
    const timeRange = 12 * 60 * 60 * 1000; // ±12시간 범위
    
    const startTime = new Date(targetTime.getTime() - timeRange);
    const endTime = new Date(targetTime.getTime() + timeRange);
    
    console.log(`🔍 경기 결과 검색 (시간대 보정): ${homeTeam} vs ${awayTeam}`);
    console.log(`⏰ 대상 시간 (UTC): ${targetTime.toISOString()}`);
    console.log(`⏰ 검색 범위 (UTC): ${startTime.toISOString()} ~ ${endTime.toISOString()}`);
    
    const gameResults = await GameResult.findAll({
      where: {
        homeTeam: { [Op.iLike]: `%${this.normalizeTeamName(homeTeam)}%` },
        awayTeam: { [Op.iLike]: `%${this.normalizeTeamName(awayTeam)}%` },
        commenceTime: {
          [Op.between]: [startTime, endTime]
        },
        status: 'finished'
      },
      order: [['commenceTime', 'ASC']]
    });
    
    console.log(`📊 찾은 경기 결과: ${gameResults.length}개`);
    
    if (gameResults.length === 0) {
      // 🆕 시간대 차이로 인한 매칭 실패 가능성 고려해서 더 넓은 범위로 재검색 (UTC 같은 날만)
      console.log(`🔄 넓은 시간 범위로 재검색 시도 (UTC 같은 날 내)`);
      
      // UTC 기준 같은 날 범위 내에서만 검색하도록 제한
      const targetDateUTC = new Date(targetTime.getTime());
      targetDateUTC.setUTCHours(0, 0, 0, 0); // UTC 날짜 시작
      const dayStartUTC = new Date(targetDateUTC);
      const dayEndUTC = new Date(targetDateUTC.getTime() + 24 * 60 * 60 * 1000 - 1); // 23:59:59.999
      
      console.log(`🗓️ UTC 날짜 범위: ${dayStartUTC.toISOString()} ~ ${dayEndUTC.toISOString()}`);
      
      const wideStartTime = dayStartUTC;
      const wideEndTime = dayEndUTC;
      
      const wideGameResults = await GameResult.findAll({
        where: {
          homeTeam: { [Op.iLike]: `%${this.normalizeTeamName(homeTeam)}%` },
          awayTeam: { [Op.iLike]: `%${this.normalizeTeamName(awayTeam)}%` },
          commenceTime: {
            [Op.between]: [wideStartTime, wideEndTime]
          },
          status: 'finished'
        },
        order: [['commenceTime', 'ASC']]
      });
      
      console.log(`📊 같은 날 넓은 범위 검색 결과: ${wideGameResults.length}개`);
      console.log(`⏰ 검색 범위: ${wideStartTime.toISOString()} ~ ${wideEndTime.toISOString()}`);
      
      if (wideGameResults.length === 0) {
        console.log(`❌ 같은 날 내에서 매칭되는 경기를 찾을 수 없습니다.`);
        return null;
      }
      
      // 시간차가 가장 적은 경기 찾기
      let closestGame = wideGameResults[0];
      let minTimeDiff = Math.abs(this.normalizeTimezoneToUTC(closestGame.commenceTime).getTime() - targetTime.getTime());
      
      for (const game of wideGameResults) {
        const gameTime = this.normalizeTimezoneToUTC(game.commenceTime);
        const timeDiff = Math.abs(gameTime.getTime() - targetTime.getTime());
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          closestGame = game;
        }
      }
      
      const timeDiffHours = minTimeDiff / (1000 * 60 * 60);
      console.log(`✅ 같은 날 범위에서 매칭된 경기: ${closestGame.homeTeam} vs ${closestGame.awayTeam}`);
      console.log(`⏰ 시간 차이: ${timeDiffHours.toFixed(1)}시간 (같은 날 내)`);
      
      return closestGame;
    }
    
    // 시간차가 가장 적은 경기 찾기
    let closestGame = gameResults[0];
    let minTimeDiff = Math.abs(this.normalizeTimezoneToUTC(closestGame.commenceTime).getTime() - targetTime.getTime());
    
    for (const game of gameResults) {
      const gameTime = this.normalizeTimezoneToUTC(game.commenceTime);
      const timeDiff = Math.abs(gameTime.getTime() - targetTime.getTime());
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestGame = game;
      }
    }
    
    const timeDiffHours = minTimeDiff / (1000 * 60 * 60);
    console.log(`✅ 매칭된 경기: ${closestGame.homeTeam} vs ${closestGame.awayTeam}`);
    console.log(`⏰ DB 시간: ${closestGame.commenceTime}`);
    console.log(`⏰ 시간 차이: ${timeDiffHours.toFixed(1)}시간`);
    
    return closestGame;
  }

  /**
   * 🆕 경기 식별자로 정산 가능한 주문 조회 (시간대 보정 포함)
   * @param {string} homeTeam - 홈팀명
   * @param {string} awayTeam - 어웨이팀명
   * @param {string} commenceTime - 경기 시작 시간
   * @returns {Array} 정산 가능한 주문 목록
   */
  async getSettlableOrdersByMatch(homeTeam, awayTeam, commenceTime) {
    const targetTime = this.normalizeTimezoneToUTC(commenceTime);
    const timeRange = 30 * 60 * 1000; // ±30분 범위로 축소 (정확한 경기만 정산)
    
    const startTime = new Date(targetTime.getTime() - timeRange);
    const endTime = new Date(targetTime.getTime() + timeRange);
    
    console.log(`🔍 정산 가능한 주문 검색 (시간대 보정): ${homeTeam} vs ${awayTeam}`);
    console.log(`⏰ 대상 시간 (UTC): ${targetTime.toISOString()}`);
    console.log(`⏰ 검색 범위 (UTC): ${startTime.toISOString()} ~ ${endTime.toISOString()}`);
    
    const orders = await ExchangeOrder.findAll({
      where: {
        homeTeam: { [Op.iLike]: `%${this.normalizeTeamName(homeTeam)}%` },
        awayTeam: { [Op.iLike]: `%${this.normalizeTeamName(awayTeam)}%` },
        commenceTime: {
          [Op.between]: [startTime, endTime]
        },
        status: { [Op.in]: ['matched', 'partially_matched'] },
        settledAt: null
      },
      order: [['createdAt', 'ASC']]
    });
    
    console.log(`📊 찾은 정산 가능 주문: ${orders.length}개`);
    
    // 각 주문의 시간대 정보 로깅
    if (orders.length > 0) {
      console.log(`📋 주문별 시간 정보:`);
      orders.slice(0, 3).forEach((order, index) => {
        const orderTime = this.normalizeTimezoneToUTC(order.commenceTime);
        const timeDiff = Math.abs(orderTime.getTime() - targetTime.getTime()) / (1000 * 60 * 60);
        console.log(`   ${index + 1}. 주문 ${order.id}: ${order.commenceTime} → ${orderTime.toISOString()} (차이: ${timeDiff.toFixed(1)}시간)`);
      });
      if (orders.length > 3) {
        console.log(`   ... 외 ${orders.length - 3}개 주문`);
      }
    }
    
    return orders;
  }

  /**
   * 🆕 팀명 정규화 함수
   * @param {string} teamName - 원본 팀명
   * @returns {string} 정규화된 팀명
   */
  normalizeTeamName(teamName) {
    if (!teamName) return '';
    
    // 공통 팀명 매핑
    const teamMappings = {
      'Cleveland Guardians': 'Cleveland',
      'Kansas City Royals': 'Kansas City',
      'Tampa Bay Rays': 'Tampa Bay',
      'Seattle Mariners': 'Seattle',
      'Cincinnati Reds': 'Cincinnati',
      'Toronto Blue Jays': 'Toronto'
    };
    
    // 매핑된 팀명이 있으면 사용
    for (const [fullName, shortName] of Object.entries(teamMappings)) {
      if (teamName.includes(fullName) || teamName.includes(shortName)) {
        return shortName;
      }
    }
    
    // 기본적으로 원본 팀명 반환
    return teamName;
  }

  /**
   * 🆕 멀티베팅 주문 정산
   * @param {Object} order - 멀티베팅 주문
   * @param {Object} gameResult - 경기 결과 (사용하지 않음, 각 선택사항별로 개별 조회)
   * @param {Object} transaction - DB 트랜잭션
   * @returns {Object} 정산 결과
   */
  async settleMultibetOrder(order, gameResult, transaction) {
    console.log(`\n🎯 멀티베팅 주문 정산: ${order.id}`);
    
    if (!order.selectionDetails || !order.selectionDetails.selections) {
      console.log(`❌ 멀티베팅 주문 ${order.id}에 선택사항이 없습니다.`);
      return {
        orderId: order.id,
        userId: order.userId,
        type: 'multibet_error',
        totalWinnings: 0,
        isMultibet: true
      };
    }
    
    // 각 선택사항에 대해 개별적으로 경기 결과 확인
    let allSelectionsWon = true;
    let allSelectionsHaveResults = true; // 🆕 모든 선택사항이 경기 결과를 가지고 있는지 확인
    const selectionResults = [];
    let hasPush = false; // 🆕 Push 발생 여부
    let adjustedOdds = 1.0; // 🆕 조정된 배당률 계산
    
    for (const selection of order.selectionDetails.selections) {
      console.log(`🔍 선택사항 확인: ${selection.homeTeam} vs ${selection.awayTeam} - ${selection.selection}`);
      
      // 해당 선택사항의 경기 결과 조회
      const selectionGameResult = await this.findGameResultByMatch(
        selection.homeTeam, 
        selection.awayTeam, 
        selection.commenceTime
      );
      
      // 경기 결과가 없거나 진행 중인 경우
      if (!selectionGameResult) {
        console.log(`❌ 선택사항 경기 결과 없음: ${selection.homeTeam} vs ${selection.awayTeam}`);
        allSelectionsWon = false;
        allSelectionsHaveResults = false;
        selectionResults.push({
          selection: selection.selection,
          game: `${selection.homeTeam} vs ${selection.awayTeam}`,
          result: 'no_result',
          won: false,
          isPush: false,
          odds: selection.odds
        });
        continue;
      }
      
      // 경기가 완료되지 않았으면 대기
      if (selectionGameResult.status !== 'finished' && 
          selectionGameResult.status !== 'cancelled' && 
          selectionGameResult.status !== 'postponed') {
        console.log(`⏳ 선택사항 경기 진행 중: ${selection.homeTeam} vs ${selection.awayTeam} (${selectionGameResult.status})`);
        allSelectionsWon = false;
        allSelectionsHaveResults = false;
        selectionResults.push({
          selection: selection.selection,
          game: `${selection.homeTeam} vs ${selection.awayTeam}`,
          result: selectionGameResult.status,
          won: false,
          isPush: false,
          odds: selection.odds
        });
        continue;
      }
      
      // ✅ 승부 판정 (Push 감지 포함)
      const selectionResult = this.determineSelectionResult(selection, selectionGameResult);
      
      selectionResults.push({
        selection: selection.selection,
        game: `${selection.homeTeam} vs ${selection.awayTeam}`,
        result: selectionResult.result,
        score: selectionGameResult.score,
        won: selectionResult.won,
        isPush: selectionResult.isPush,
        odds: selection.odds
      });
      
      // ✅ 배당률 재계산 (Push 발생 시 1.0으로 처리)
      if (selectionResult.isPush) {
        hasPush = true;
        adjustedOdds *= 1.0; // Push는 배당률 1.0
        console.log(`   🤝 Push 발생: ${selection.homeTeam} vs ${selection.awayTeam} → 배당률 1.0 적용`);
      } else if (selectionResult.won) {
        adjustedOdds *= (selection.odds || 1.0); // 승리한 경기의 배당률
        console.log(`   ✅ 승리: ${selection.homeTeam} vs ${selection.awayTeam} → 배당률 ${selection.odds} 적용`);
      } else {
        allSelectionsWon = false;
        console.log(`   ❌ 패배: ${selection.homeTeam} vs ${selection.awayTeam}`);
      }
    }
    
    // 🆕 모든 선택사항의 경기 결과가 없으면 정산하지 않음
    if (!allSelectionsHaveResults) {
      console.log(`⚠️ 멀티베팅 주문 ${order.id}: 일부 경기 결과가 없어 정산하지 않습니다.`);
      return {
        orderId: order.id,
        userId: order.userId,
        type: 'multibet_pending',
        totalWinnings: 0,
        isMultibet: true,
        selectionResults: selectionResults,
        message: '일부 경기 결과가 없어 정산 대기 중'
      };
    }
    
    // ✅ 모든 선택이 Push인 경우 전액 환불
    const allPush = selectionResults.every(s => s.isPush);
    if (allPush) {
      console.log(`🤝 멀티베팅 전체 Push! 전액 환불`);
      const multibetStakeAmount = order.partiallyFilled ? (order.filledAmount || 0) : order.amount;
      const pushActualProfit = 0; // 환불 (본금만 돌려줌, 이미 차감되어 있으므로 0)
      
      await order.update({
        status: 'cancelled',
        actualProfit: pushActualProfit,
        settledAt: new Date(),
        settlementNote: 'Push (무승부/취소)로 인한 전액 환불'
      }, { transaction });
      
      // 잔액 환불 (stakeAmount 돌려줌)
      const user = await User.findByPk(order.userId, { transaction });
      if (user) {
        const currentBalance = parseFloat(user.balance);
        const newBalance = currentBalance + multibetStakeAmount;
        await user.update({ balance: newBalance }, { transaction });
        
        await PaymentHistory.create({
          userId: order.userId,
          betId: `EXCHANGE_${order.id}`,
          amount: multibetStakeAmount,
          memo: `Exchange 멀티베팅 Push (무승부/취소) 환불 (${selectionResults.length}개 선택사항)`,
          balanceAfter: newBalance,
          paidAt: new Date()
        }, { transaction });
      }
      
      return {
        orderId: order.id,
        userId: order.userId,
        type: 'multibet_push',
        totalWinnings: 0,
        isMultibet: true,
        selectionResults: selectionResults
      };
    }
    
    // 멀티베팅 결과 계산 (모든 선택사항이 승리해야 함)
    // 부분 매칭된 경우 실제 체결된 금액으로 계산
    const multibetStakeAmount = order.partiallyFilled ? (order.filledAmount || 0) : order.amount;
    
    let actualProfit = 0;
    if (allSelectionsWon) {
      // ✅ Push가 있으면 조정된 배당률로 재계산
      if (hasPush) {
        actualProfit = multibetStakeAmount * adjustedOdds;
        const originalTotalOdds = parseFloat(order.totalOdds);
        console.log(`🎉 멀티베팅 승리 (Push 포함)! 원래 배당: ${originalTotalOdds}배 → 조정 배당: ${adjustedOdds.toFixed(3)}배, 수익: ${actualProfit}원 (체결: ${multibetStakeAmount}원)`);
      } else {
        // Push 없으면 기존 로직 유지
        if (order.potentialWinnings) {
          const matchRatio = order.partiallyFilled ? (multibetStakeAmount / order.amount) : 1;
          actualProfit = parseFloat(order.potentialWinnings) * matchRatio;
        } else {
          actualProfit = multibetStakeAmount * parseFloat(order.totalOdds);
        }
        console.log(`🎉 멀티베팅 승리! 수익: ${actualProfit}원 (체결: ${multibetStakeAmount}원)`);
      }
    } else {
      // 하나라도 패배한 경우 - 체결된 금액만 손실
      actualProfit = -multibetStakeAmount;
      console.log(`❌ 멀티베팅 패배! 손실: ${Math.abs(actualProfit)}원 (체결: ${multibetStakeAmount}원)`);
    }
    
    // ✅ 정산 메모 생성 (Push 포함 여부 표시)
    const pushCount = selectionResults.filter(s => s.isPush).length;
    let settlementNote = allSelectionsWon ? '멀티베팅 승리' : '멀티베팅 패배';
    if (pushCount > 0 && allSelectionsWon) {
      settlementNote += ` (${pushCount}개 경기 Push, 배당률 조정)`;
    }
    
    await order.update({
      status: 'settled',
      actualProfit: actualProfit,
      settledAt: new Date(),
      profitLoss: actualProfit,
      settlementNote: settlementNote
    }, { transaction });
    
    // 사용자 잔액 업데이트
    const user = await User.findByPk(order.userId, { transaction });
    if (user) {
      const currentBalance = parseFloat(user.balance);
      const newBalance = currentBalance + actualProfit;
      
      // ✅ PaymentHistory 생성 전 로깅
      settlementLogger.log(`[EXCHANGE_SERVICE] 주문 ${order.id} PaymentHistory 생성 직전`, {
        orderId: order.id,
        currentBalance,
        actualProfit,
        newBalance,
        allSelectionsWon,
        multibetStakeAmount
      });
      
      await user.update({ balance: newBalance }, { transaction });
      
      // ✅ 결제 이력 추가 (Push 포함 여부 표시)
      const pushCount = selectionResults.filter(s => s.isPush).length;
      let memo = `Exchange 멀티베팅 정산: ${allSelectionsWon ? '승리' : '패배'} (${selectionResults.length}개 선택사항`;
      if (pushCount > 0) {
        memo += `, ${pushCount}개 Push 포함`;
      }
      memo += ')';
      
      await PaymentHistory.create({
        userId: order.userId,
        betId: `EXCHANGE_${order.id}`,
        amount: actualProfit,
        memo: memo,
        balanceAfter: newBalance,
        paidAt: new Date()
      }, { transaction });
      
      // ✅ PaymentHistory 생성 후 로깅
      settlementLogger.log(`[EXCHANGE_SERVICE] 주문 ${order.id} PaymentHistory 생성 완료`, {
        orderId: order.id,
        amount: actualProfit,
        balanceAfter: newBalance
      });
    }
    
    // 🆕 멀티베팅 부분 매칭 환불 처리
    if (order.partiallyFilled && order.remainingAmount > 0) {
      await this.cancelRemainingAmount(order, transaction);
    }
    
    // 🔥 Push 발생 시 담보금 차액 환불
    if (hasPush && allSelectionsWon) {
      if (order.side === 'back') {
        // Back 주문 승리 → 매칭된 Lay에게 담보금 차액 환불
        await this.refundLayLiabilityForPush(order, adjustedOdds, transaction, selectionResults);
      } else if (order.side === 'lay') {
        // Lay 주문 승리 → 매칭된 Back에게는 환불 없음 (Lay가 손해본 것)
        console.log(`   ℹ️ Lay 멀티베팅 승리 (Push 포함): Lay 담보금 감소는 Lay에게 유리 (환불 없음)`);
      }
    }
    
    return {
      orderId: order.id,
      userId: order.userId,
      type: allSelectionsWon ? 'multibet_win' : 'multibet_loss',
      totalWinnings: actualProfit,
      isMultibet: true,
      selectionResults: selectionResults
    };
  }

  /**
   * 🔥 Push 발생 시 Lay 담보금 차액 환불
   * Back 멀티베팅 주문에서 Push 발생 시, 매칭된 Lay 주문들에게 초과 담보금 환불
   * @param {Object} backOrder - Back 멀티베팅 주문
   * @param {number} adjustedOdds - Push 반영된 조정 배당률
   * @param {Object} transaction - DB 트랜잭션
   * @param {Array} selectionResults - 각 선택사항 결과
   */
  async refundLayLiabilityForPush(backOrder, adjustedOdds, transaction, selectionResults) {
    try {
      console.log(`\n💰 Push 발생으로 Lay 담보금 차액 환불 처리 시작`);
      console.log(`   Back 주문 ID: ${backOrder.id}`);
      console.log(`   원래 배당: ${backOrder.totalOdds}배`);
      console.log(`   조정 배당: ${adjustedOdds.toFixed(3)}배`);
      
      // 1. 이 Back 주문과 매칭된 모든 Lay 주문 찾기
      const matches = await ExchangeOrderMatch.findAll({
        where: {
          [Op.or]: [
            { originalOrderId: backOrder.id, originalSide: 'back' },
            { matchingOrderId: backOrder.id, matchingSide: 'back' }
          ],
          status: { [Op.in]: ['active', 'settled'] }
        },
        transaction
      });
      
      console.log(`   매칭 기록: ${matches.length}개 발견`);
      
      if (matches.length === 0) {
        console.log(`   ⚠️ 매칭된 Lay 주문이 없어 환불 처리 건너뜀`);
        return;
      }
      
      // 2. 각 매칭에 대해 Lay 담보금 차액 계산 및 환불
      for (const match of matches) {
        // Lay 주문 ID 찾기
        const layOrderId = match.originalSide === 'lay' 
          ? match.originalOrderId 
          : match.matchingOrderId;
        
        const layOrder = await ExchangeOrder.findByPk(layOrderId, { transaction });
        
        if (!layOrder || layOrder.side !== 'lay') {
          console.log(`   ⚠️ Lay 주문 ${layOrderId} 찾을 수 없음 또는 side 불일치`);
          continue;
        }
        
        // 3. 담보금 재계산
        const matchedAmount = match.matchedAmount || 0;
        const originalLiability = matchedAmount * (parseFloat(backOrder.totalOdds) - 1);
        const adjustedLiability = matchedAmount * (adjustedOdds - 1);
        const refundAmount = Math.floor(originalLiability - adjustedLiability);
        
        if (refundAmount <= 0) {
          console.log(`   ℹ️ Lay 주문 ${layOrder.id}: 환불 금액 없음 (${refundAmount}원)`);
          continue;
        }
        
        console.log(`   💸 Lay 주문 ${layOrder.id} 담보금 차액 환불:`);
        console.log(`      원래 담보: ${originalLiability.toLocaleString()}원 (${matchedAmount} × ${backOrder.totalOdds - 1})`);
        console.log(`      조정 담보: ${adjustedLiability.toLocaleString()}원 (${matchedAmount} × ${(adjustedOdds - 1).toFixed(3)})`);
        console.log(`      환불 금액: ${refundAmount.toLocaleString()}원`);
        
        // 4. Lay 사용자 잔액 환불
        const layUser = await User.findByPk(layOrder.userId, { 
          transaction,
          lock: transaction.LOCK.UPDATE 
        });
        
        if (!layUser) {
          console.log(`   ❌ Lay 사용자 ${layOrder.userId} 찾을 수 없음`);
          continue;
        }
        
        const layCurrentBalance = parseFloat(layUser.balance);
        const layNewBalance = layCurrentBalance + refundAmount;
        
        await layUser.update({ balance: layNewBalance }, { transaction });
        
        // 5. PaymentHistory에 상세 기록
        const pushSelections = selectionResults.filter(s => s.isPush);
        const pushGamesCount = pushSelections.length;
        const pushGames = pushSelections.map(s => s.game).join(', ');
        
        await PaymentHistory.create({
          userId: layOrder.userId,
          betId: `EXCHANGE_${layOrder.id}`,
          amount: refundAmount,
          memo: `Exchange 멀티베팅 Push 발생으로 Lay 담보금 차액 환불 - ` +
                `Back 주문 #${backOrder.id}의 ${pushGamesCount}개 경기 Push (${pushGames}) - ` +
                `원래 담보 ${originalLiability.toLocaleString()}원 → 조정 담보 ${adjustedLiability.toLocaleString()}원 = 환불 ${refundAmount.toLocaleString()}원`,
          balanceAfter: layNewBalance,
          paidAt: new Date()
        }, { transaction });
        
        console.log(`   ✅ Lay 사용자 ${layOrder.userId} 환불 완료: ${refundAmount.toLocaleString()}원`);
        console.log(`      잔액: ${layCurrentBalance.toLocaleString()}원 → ${layNewBalance.toLocaleString()}원`);
      }
      
      console.log(`✅ Lay 담보금 차액 환불 처리 완료: ${matches.length}개 매칭`);
      
    } catch (error) {
      console.error(`❌ Lay 담보금 환불 처리 실패:`, error);
      throw error;
    }
  }
  
  /**
   * 🆕 선택사항 승부 판정
   * @param {Object} selection - 선택사항
   * @param {Object} gameResult - 경기 결과
   * @returns {boolean} 승리 여부
   */
  /**
   * 선택사항 결과 판정 (Push 감지 포함)
   * @returns {Object} { won: boolean, isPush: boolean, result: string }
   */
  determineSelectionResult(selection, gameResult) {
    const selectedTeam = selection.selection;
    const homeTeam = selection.homeTeam;
    const awayTeam = selection.awayTeam;
    
    // 1. 경기 취소/연기 → Push
    if (gameResult.status === 'cancelled' || gameResult.status === 'postponed') {
      return { won: false, isPush: true, result: 'cancelled' };
    }
    
    // 2. 승패 마켓
    if (selection.market === '승패' || selection.market === 'h2h') {
      if (gameResult.status === 'home_win' && selectedTeam === homeTeam) {
        return { won: true, isPush: false, result: 'won' };
      }
      if (gameResult.status === 'away_win' && selectedTeam === awayTeam) {
        return { won: true, isPush: false, result: 'won' };
      }
      if (gameResult.status === 'draw' && selectedTeam === 'Draw') {
        return { won: true, isPush: false, result: 'won' };
      }
      // Draw인데 Draw 선택 안 했으면 패배
      return { won: false, isPush: false, result: 'lost' };
    }
    
    // 3. 핸디캡 마켓
    if (selection.market === '핸디캡' || selection.market === 'spreads') {
      const line = parseFloat(selection.line || 0);
      const score = gameResult.score;
      
      if (!score || !Array.isArray(score) || score.length < 2) {
        return { won: false, isPush: false, result: 'no_score' };
      }
      
      const homeScore = parseInt(score.find(s => s.name === gameResult.homeTeam)?.score || 0);
      const awayScore = parseInt(score.find(s => s.name === gameResult.awayTeam)?.score || 0);
      
      // 핸디캡 적용
      const adjustedHomeScore = homeScore + line;
      const adjustedAwayScore = awayScore;
      
      // Push 조건: 핸디캡 적용 후 동점
      if (adjustedHomeScore === adjustedAwayScore) {
        console.log(`   🤝 핸디캡 Push: ${homeScore}+${line} = ${awayScore} → 1.0배`);
        return { won: false, isPush: true, result: 'push' };
      }
      
      // 승부 판정
      if (selectedTeam === homeTeam && adjustedHomeScore > adjustedAwayScore) {
        return { won: true, isPush: false, result: 'won' };
      }
      if (selectedTeam === awayTeam && adjustedAwayScore > adjustedHomeScore) {
        return { won: true, isPush: false, result: 'won' };
      }
      
      return { won: false, isPush: false, result: 'lost' };
    }
    
    // 4. 오버/언더 마켓
    if (selection.market === '총점' || selection.market === 'totals') {
      const line = parseFloat(selection.line || 0);
      const score = gameResult.score;
      
      if (!score || !Array.isArray(score) || score.length < 2) {
        return { won: false, isPush: false, result: 'no_score' };
      }
      
      const homeScore = parseInt(score.find(s => s.name === gameResult.homeTeam)?.score || 0);
      const awayScore = parseInt(score.find(s => s.name === gameResult.awayTeam)?.score || 0);
      const totalScore = homeScore + awayScore;
      
      // Push 조건: 총점 = 기준점
      if (totalScore === line) {
        console.log(`   🤝 Over/Under Push: 총점 ${totalScore} = 기준 ${line} → 1.0배`);
        return { won: false, isPush: true, result: 'push' };
      }
      
      const isOverSelection = selectedTeam.toLowerCase().includes('over');
      
      if (isOverSelection && totalScore > line) {
        return { won: true, isPush: false, result: 'won' };
      }
      if (!isOverSelection && totalScore < line) {
        return { won: true, isPush: false, result: 'won' };
      }
      
      return { won: false, isPush: false, result: 'lost' };
    }
    
    // 기본적으로 패배 처리
    return { won: false, isPush: false, result: 'unknown_market' };
  }

  /**
   * 하위 호환성을 위한 기존 함수 유지
   */
  determineSelectionWinner(selection, gameResult) {
    const result = this.determineSelectionResult(selection, gameResult);
    return result.won;
  }

  /**
   * 🆕 경기 시작 후 미매칭된 오픈 주문들과 부분 매칭된 주문들을 자동 환불
   */
  async refundUnmatchedOpenOrders() {
    try {
      console.log('🔄 경기 시작 후 미매칭 오픈 주문 및 부분 매칭 주문 환불 처리 시작...');
      
      const now = new Date();
      // ✅ 수정: 경기 시작 시점 기준으로 변경 (1시간 대기 제거)
      // 경기 시작 10분 전까지만 배팅 가능하므로, 경기 시작 시점에 즉시 환불
      
      // ✅ 수정: Sequelize ORM 메서드 사용 (SQL raw query 제거)
      // 1. 완전히 미매칭된 오픈 주문들
      const openOrders = await ExchangeOrder.findAll({
        where: {
          status: 'open',
          commenceTime: { [Op.lt]: now },
          filledAmount: 0,
          [Op.or]: [
            { partiallyFilled: false },
            { partiallyFilled: null }
          ]
        },
        order: [['commenceTime', 'ASC']],
        limit: 50
      });
      
      // 2. 부분 매칭된 주문들
      const partialOrders = await ExchangeOrder.findAll({
        where: {
          status: 'partially_matched',
          commenceTime: { [Op.lt]: now },
          remainingAmount: { [Op.gt]: 0 }
        },
        order: [['commenceTime', 'ASC']],
        limit: 50
      });
      
      // 두 결과를 합치기
      const unmatchedOpenOrders = [...openOrders, ...partialOrders];
      console.log(`📋 환불 대상 오픈 주문: ${unmatchedOpenOrders.length}개`);
      
      if (unmatchedOpenOrders.length === 0) {
        return { refundedOrders: 0, totalRefundAmount: 0 };
      }
      
      let refundedCount = 0;
      let totalRefundAmount = 0;
      const refundResults = [];
      
      for (const order of unmatchedOpenOrders) {
        const transaction = await sequelize.transaction();
        
        try {
          const gameTime = new Date(order.commenceTime);
          const hoursSinceGame = (now.getTime() - gameTime.getTime()) / (1000 * 60 * 60);
          const isGameStarted = now.getTime() > gameTime.getTime();
          
          console.log(`\n🎯 주문 환불 처리: ID ${order.id}`);
          console.log(`   경기: ${order.homeTeam} vs ${order.awayTeam}`);
          console.log(`   경기 시간: ${gameTime.toISOString()}`);
          console.log(`   현재 시간: ${now.toISOString()}`);
          console.log(`   경기 시작 여부: ${isGameStarted ? '시작됨' : '시작 전'}`);
          console.log(`   경과 시간: ${Math.abs(hoursSinceGame).toFixed(1)}시간 (${isGameStarted ? '시작 후' : '시작 전'})`);
          console.log(`   사이드: ${order.side}, 금액: ${order.amount}원`);
          
          // 🚨 경기 시작 전 주문은 환불하지 않음 (환불 정책 위반 방지)
          if (!isGameStarted) {
            console.log(`   ⚠️ 경기 시작 전 주문으로 환불 제외: ${Math.abs(hoursSinceGame).toFixed(1)}시간 후 시작 예정`);
            await transaction.rollback();
            continue;
          }
          
          // 🆕 환불 금액 계산 (부분 매칭 고려)
          let refundAmount;
          if (order.status === 'partially_matched' && order.remainingAmount > 0) {
            // 부분 매칭된 주문: 남은 금액만 환불
            refundAmount = order.remainingAmount;
            console.log(`   부분 매칭 주문 - 남은 금액 환불: ${refundAmount}원`);
          } else {
            // 완전 미매칭 주문: 전체 금액 환불
            if (order.side === 'back') {
              // Back 주문: 배팅 금액 전액 환불
              refundAmount = order.amount;
            } else {
              // Lay 주문: 스테이크 금액 환불
              refundAmount = Math.floor((parseFloat(order.price) - 1) * order.amount);
            }
            console.log(`   완전 미매칭 주문 - 전체 금액 환불: ${refundAmount}원`);
          }
          
          console.log(`   환불 금액: ${refundAmount}원`);
          
          // 중복 환불 체크
          const existingRefund = await PaymentHistory.findOne({
            where: {
              userId: order.userId,
              betId: `EXCHANGE_${order.id}`,
              memo: { [Op.like]: '%환불%' }
            },
            transaction
          });
          
          if (existingRefund) {
            console.log(`   ⚠️ 이미 환불 처리된 주문입니다: ${existingRefund.id}`);
            await transaction.rollback();
            continue;
          }
          
          // 사용자 잔액 업데이트
          await User.increment('balance', {
            by: refundAmount,
            where: { id: order.userId }
          }, { transaction });
          
          // 환불 후 잔액 조회
          const user = await User.findByPk(order.userId, { transaction });
          
          // ✅ 환불 사유 및 메모 생성 (경기 시작 시점 기준)
          const timeDescription = isGameStarted 
            ? `경기 시작됨 (${Math.abs(hoursSinceGame).toFixed(1)}시간 경과)` 
            : `경기 시작 전 ${Math.abs(hoursSinceGame).toFixed(1)}시간`;
          
          let refundReason;
          if (order.status === 'partially_matched') {
            refundReason = '경기 시작으로 부분 매칭된 주문의 남은 금액 자동 환불';
          } else {
            refundReason = isGameStarted 
              ? '경기 시작으로 미매칭 주문 자동 환불' 
              : '경기 시작 전 미매칭 주문 자동 환불';
          }
          
          // 환불 내역 기록
          await PaymentHistory.create({
            userId: order.userId,
            betId: `EXCHANGE_${order.id}`,
            amount: refundAmount,
            type: 'refund',
            memo: `Exchange 주문 ${refundReason} (경기: ${order.homeTeam} vs ${order.awayTeam}, ${timeDescription})`,
            status: 'completed',
            balanceAfter: user.balance,
            paidAt: new Date()
          }, { transaction });
          
          // 🆕 주문 상태 변경 (부분 매칭 고려)
          const updateData = {
            settlementNote: `${timeDescription}로 ${order.status === 'partially_matched' ? '부분 매칭 후 남은 금액' : '미매칭'}되어 자동 환불`
            // ✅ 수정: settledAt은 설정하지 않음 (경기 결과 정산 시에만 설정)
          };
          
          if (order.status === 'partially_matched') {
            // ✅ 수정: 부분 매칭된 주문의 남은 금액이 환불되면 완전 매칭 상태로 변경
            updateData.status = 'matched';
            updateData.remainingAmount = 0; // 환불된 남은 금액을 0으로 설정
            updateData.amount = order.filledAmount; // ✅ 배팅 금액을 체결된 금액으로 변경
            console.log(`   🔄 부분 매칭 주문 상태 변경: partially_matched → matched`);
            console.log(`   💰 배팅 금액 조정: ${parseFloat(order.amount).toLocaleString()}원 → ${parseFloat(order.filledAmount).toLocaleString()}원`);
          } else {
            // 완전 미매칭 주문: 상태를 cancelled로 변경
            updateData.status = 'cancelled';
          }
          
          await order.update(updateData, { transaction });
          
          await transaction.commit();
          
          refundedCount++;
          totalRefundAmount += refundAmount;
          refundResults.push({
            orderId: order.id,
            refundAmount,
            hoursSinceGame: Math.abs(hoursSinceGame).toFixed(1),
            isGameStarted,
            timeDescription: isGameStarted ? '경기 시작 후' : '경기 시작 전'
          });
          
          console.log(`   ✅ 환불 완료: ${refundAmount}원, 새 잔액: ${user.balance}원`);
          
        } catch (error) {
          await transaction.rollback();
          console.error(`   ❌ 주문 ${order.id} 환불 실패:`, error.message);
        }
      }
      
      console.log(`\n🎉 오픈 주문 환불 처리 완료!`);
      console.log(`📊 환불 결과:`);
      console.log(`   - 환불된 주문: ${refundedCount}개`);
      console.log(`   - 총 환불 금액: ${totalRefundAmount.toLocaleString()}원`);
      
      return {
        refundedOrders: refundedCount,
        totalRefundAmount,
        results: refundResults
      };
      
    } catch (error) {
      console.error('❌ 오픈 주문 환불 처리 실패:', error);
      return { refundedOrders: 0, totalRefundAmount: 0 };
    }
  }

  /**
   * 🆕 경기 식별자로 직접 매칭 정산
   */
  async settleOrdersByDirectMatching() {
    try {
      // 미정산 주문들 조회
      const unSettledOrders = await ExchangeOrder.findAll({
        where: {
          status: { [Op.in]: ['matched', 'partially_matched'] },
          settledAt: null // 아직 정산되지 않은 주문만
        },
        order: [['createdAt', 'ASC']],
        limit: 20 // 한 번에 20개씩만 처리
      });
      
      console.log(`📋 직접 매칭 대상 주문: ${unSettledOrders.length}개`);
      
      if (unSettledOrders.length === 0) {
        return { settledOrders: 0, results: [] };
      }
      
      let settledCount = 0;
      const results = [];
      
      // 각 주문별로 경기 식별자 기반 정산 시도
      for (const order of unSettledOrders) {
        try {
          console.log(`\n🔍 주문 ${order.id} 정산 시도: ${order.homeTeam} vs ${order.awayTeam}`);
          
          // 경기 식별자 기반 정산 시도
          const result = await this.settleGameOrdersByMatch(
            order.homeTeam, 
            order.awayTeam, 
            order.commenceTime
          );
          
          if (result.settledOrders > 0) {
            settledCount += result.settledOrders;
            results.push(...result.results);
            console.log(`✅ 주문 ${order.id} 정산 완료: ${result.settledOrders}개`);
          } else {
            console.log(`❌ 주문 ${order.id} 정산 실패: 경기 결과 없음`);
          }
          
        } catch (error) {
          console.error(`❌ 주문 ${order.id} 정산 실패:`, error.message);
        }
      }
      
      return {
        processedOrders: unSettledOrders.length,
        settledOrders: settledCount,
        results
      };
      
    } catch (error) {
      console.error('❌ 직접 매칭 정산 실패:', error);
      return { settledOrders: 0, results: [] };
    }
  }

  /**
   * 연결된 모든 매칭 주문들을 경기별로 그룹화하여 정산
   * @returns {Object} 정산 결과 요약
   */
  async settleAllConnectedOrders() {
    try {
      console.log('🎯 연결된 모든 매칭 주문 정산 시작...');
      
      // 1. 경기 시작 후 미매칭된 오픈 주문들 환불 처리
      const refundResult = await this.refundUnmatchedOpenOrders();
      
      // 2. 연결된 모든 매칭 주문들 조회 (부분 매치 포함) - 정산된 주문도 포함
      const allMatchedOrders = await ExchangeOrder.findAll({
        where: {
          status: { [Op.in]: ['open', 'active', 'matched', 'partially_matched'] }
          // settledAt 조건 제거 - 정산된 주문도 포함해서 쌍을 찾기 위해
        }
      });
      
      // matchedOrderId가 null이 아닌 주문들만 필터링
      const connectedOrders = allMatchedOrders.filter(order => order.matchedOrderId !== null);
      
      console.log(`📊 매칭된 주문 총 수: ${allMatchedOrders.length}개`);
      console.log(`🔗 연결된 매칭 주문 수: ${connectedOrders.length}개`);
      
      if (connectedOrders.length === 0) {
        console.log('❌ 정산할 수 있는 연결된 주문이 없습니다.');
        return { totalSettled: 0, totalWinnings: 0, results: [] };
      }
      
      // 2. 전체 주문 목록에서 연결된 쌍들을 먼저 찾기
      console.log('\n🔍 전체 주문 목록에서 연결된 쌍 찾기...');
      const allPairs = this.groupMatchedOrders(allMatchedOrders);
      console.log(`🤝 전체에서 찾은 주문 쌍 수: ${allPairs.length}`);
      
      if (allPairs.length === 0) {
        console.log('❌ 정산할 수 있는 주문 쌍이 없습니다.');
        return { totalSettled: 0, totalWinnings: 0, results: [] };
      }
      
      // 3. 쌍들을 경기별로 그룹화
      const pairsByGame = {};
      const pairsWithoutGameResultId = [];
      
      // 모든 쌍을 경기 식별자로 그룹화
      for (const pair of allPairs) {
        const [order1, order2] = pair;
        
        // 경기 식별자 생성
        const homeTeam = order1.homeTeam || order2.homeTeam;
        const awayTeam = order1.awayTeam || order2.awayTeam;
        const commenceTime = order1.commenceTime || order2.commenceTime;
        
        if (homeTeam && awayTeam && commenceTime) {
          const gameKey = `${homeTeam}_${awayTeam}_${commenceTime}`;
          if (!pairsByGame[gameKey]) {
            pairsByGame[gameKey] = {
              homeTeam,
              awayTeam,
              commenceTime,
              pairs: []
            };
          }
          pairsByGame[gameKey].pairs.push(pair);
        } else {
          // 경기 식별자가 없는 쌍들
          pairsWithoutGameResultId.push(pair);
        }
      }
      
      console.log(`🎯 정산 대상 경기 수: ${Object.keys(pairsByGame).length}개`);
      console.log(`🎯 경기 식별자 없는 쌍 수: ${pairsWithoutGameResultId.length}개`);
      
      // 4. 각 경기별로 정산 실행
      let totalSettled = 0;
      let totalWinnings = 0;
      const allSettlementResults = [];
      
      for (const [gameKey, gameData] of Object.entries(pairsByGame)) {
        try {
          const { homeTeam, awayTeam, commenceTime, pairs } = gameData;
          
          // GameResult 정보 조회
          const gameResult = await GameResult.findOne({
            where: {
              homeTeam,
              awayTeam,
              commenceTime
            },
            order: [['createdAt', 'DESC']]
          });
          
          if (!gameResult) {
            console.log(`⚠️ 경기 결과를 찾을 수 없습니다: ${homeTeam} vs ${awayTeam}`);
            continue;
          }
          
          console.log(`\n🏟️ 경기 정산 시작: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
          console.log(`   📊 결과: ${gameResult.status}, 스코어: ${JSON.stringify(gameResult.score)}`);
          console.log(`   🤝 정산할 쌍 수: ${pairs.length}개`);
          
          // 각 쌍에 대해 정산 실행
          for (const pair of pairs) {
            try {
              const [order1, order2] = pair;
              
              // 이미 정산된 주문이 있는지 확인
              const order1Settled = order1.settledAt !== null;
              const order2Settled = order2.settledAt !== null;
              
              if (order1Settled && order2Settled) {
                console.log(`   ⚠️ 주문 쌍 ${order1.id} ↔ ${order2.id} 이미 정산됨`);
                continue;
              }
              
              if (order1Settled || order2Settled) {
                // 한쪽이 이미 정산된 경우, 상대방 주문도 자동 정산
                const settledOrder = order1Settled ? order1 : order2;
                const unsettledOrder = order1Settled ? order2 : order1;
                
                console.log(`   🔄 주문 ${settledOrder.id}는 이미 정산됨, 주문 ${unsettledOrder.id} 자동 정산 시작`);
                
                // 상대방 주문을 자동으로 정산
                const autoSettleResult = await this.autoSettleMatchedOrder(unsettledOrder, gameResult);
                
                if (autoSettleResult.success) {
                  totalSettled += 1; // 정산된 주문 1개
                  totalWinnings += autoSettleResult.winnings || 0;
                  allSettlementResults.push(autoSettleResult);
                  
                  console.log(`   ✅ 주문 ${unsettledOrder.id} 자동 정산 완료: ${autoSettleResult.winnerSide} 승리, 수익: ${autoSettleResult.winnings}`);
                } else {
                  console.log(`   ❌ 주문 ${unsettledOrder.id} 자동 정산 실패: ${autoSettleResult.error}`);
                }
              } else {
                // 둘 다 미정산인 경우 정상 정산
                // ✅ match 파라미터 조회
                const [backOrder, layOrder] = pair;
                const match = await ExchangeOrderMatch.findOne({
                  where: {
                    [Op.or]: [
                      { originalOrderId: backOrder.id, matchingOrderId: layOrder.id },
                      { originalOrderId: layOrder.id, matchingOrderId: backOrder.id }
                    ]
                  }
                });
                
                const result = await this.settlePair(pair, gameResult, null, match); // transaction 없이
                totalSettled += 2; // back + lay 주문
                totalWinnings += result.totalWinnings || 0;
                allSettlementResults.push(result);
                
                console.log(`   ✅ 주문 쌍 정산 완료: ${result.winnerSide} 승리, 수익: ${result.totalWinnings}`);
              }
              
            } catch (error) {
              console.error(`   ❌ 주문 쌍 정산 실패:`, error.message);
            }
          }
          
        } catch (error) {
          console.error(`   ❌ 경기 ${gameKey} 정산 실패:`, error.message);
        }
      }
      
      // 5. 경기 식별자가 없는 쌍들 정산 (멀티배팅 등)
      if (pairsWithoutGameResultId.length > 0) {
        console.log(`\n🎯 경기 식별자 없는 쌍들 정산 시작: ${pairsWithoutGameResultId.length}개`);
        
        for (const pair of pairsWithoutGameResultId) {
          try {
            const [order1, order2] = pair;
            console.log(`\n🔍 쌍 정산 시도: 주문 ${order1.id} ↔ ${order2.id}`);
            
            // 경기 식별자로 GameResult 찾기
            const gameResult = await this.findGameResultByOrderPair(pair);
            
            if (gameResult) {
              console.log(`   🏟️ 경기 찾음: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
              console.log(`   📊 결과: ${gameResult.status}, 스코어: ${JSON.stringify(gameResult.score)}`);
              
              const result = await this.settlePair(pair, gameResult, null);
              totalSettled += 2; // back + lay 주문
              totalWinnings += result.totalWinnings || 0;
              allSettlementResults.push(result);
              
              console.log(`   ✅ 주문 쌍 정산 완료: ${result.winnerSide} 승리, 수익: ${result.totalWinnings}`);
            } else {
              console.log(`   ⚠️ 경기 결과를 찾을 수 없습니다.`);
            }
            
          } catch (error) {
            console.error(`   ❌ 쌍 정산 실패:`, error.message);
          }
        }
      }
      
      // 5. 정산 결과 요약
      const summary = {
        refundedOrders: refundResult.refundedOrders,
        totalRefundAmount: refundResult.totalRefundAmount,
        totalSettled,
        totalWinnings,
        refundResult,
        results: allSettlementResults
      };
      
      console.log('\n🎉 모든 연결된 주문 정산 완료!');
      console.log(`📊 환불된 주문: ${refundResult.refundedOrders}개 (${refundResult.totalRefundAmount.toLocaleString()}원)`);
      console.log(`📊 총 정산된 주문: ${totalSettled}개`);
      console.log(`💰 총 수익: ${totalWinnings.toLocaleString()}원`);
      
      return summary;
      
    } catch (error) {
      console.error('❌ 모든 연결된 주문 정산 실패:', error.message);
      throw error;
    }
  }

  /**
   * 🆕 주문 쌍에서 GameResult 찾기
   * @param {Array} pair - [order1, order2] 주문 쌍
   * @returns {Object|null} GameResult 또는 null
   */
  async findGameResultByOrderPair(pair) {
    try {
      const [order1, order2] = pair;
      
      // 멀티배팅인 경우
      if (order1.isMultibet || order2.isMultibet) {
        const multibetOrder = order1.isMultibet ? order1 : order2;
        
        if (multibetOrder.selectionDetails && multibetOrder.selectionDetails.selections) {
          const selections = multibetOrder.selectionDetails.selections;
          
          // 모든 선택이 같은 경기인지 확인
          if (selections.length > 0) {
            const firstSelection = selections[0];
            const homeTeam = firstSelection.homeTeam;
            const awayTeam = firstSelection.awayTeam;
            const commenceTime = firstSelection.commenceTime;
            
            // 🚀 중앙화된 경기 결과 조회 사용
            const config = getLocationConfig('exchangeSettlement');
            
            let gameResult;
            
            if (config.FEATURE_FLAGS?.USE_CENTRALIZED_QUERY) {
              console.log(`[exchangeSettlement] Using centralized query for multibet`);
              gameResult = await GameResultQuery.findByTeamsAndTime(
                homeTeam,
                awayTeam,
                commenceTime,
                'exchangeSettlement'
              );
            } else {
              // 레거시 로직 (Feature Flag가 비활성화된 경우)
              console.log(`[exchangeSettlement] Using legacy query for multibet`);
              gameResult = await GameResult.findOne({
                where: {
                  homeTeam,
                  awayTeam,
                  commenceTime
                },
                order: [['createdAt', 'DESC']]
              });
            }
            
            return gameResult;
          }
        }
      } else {
        // 단일 배팅인 경우
        const order = order1.homeTeam ? order1 : order2;
        
        if (order.homeTeam && order.awayTeam) {
          // 🚀 중앙화된 경기 결과 조회 사용
          const config = getLocationConfig('exchangeSettlement');
          
          let gameResult;
          
          if (config.FEATURE_FLAGS?.USE_CENTRALIZED_QUERY) {
            console.log(`[exchangeSettlement] Using centralized query for single bet`);
            gameResult = await GameResultQuery.findByTeamsAndTime(
              order.homeTeam,
              order.awayTeam,
              order.commenceTime,
              'exchangeSettlement'
            );
          } else {
            // 레거시 로직 (Feature Flag가 비활성화된 경우)
            console.log(`[exchangeSettlement] Using legacy query for single bet`);
            gameResult = await GameResult.findOne({
              where: {
                homeTeam: order.homeTeam,
                awayTeam: order.awayTeam,
                commenceTime: order.commenceTime
              },
              order: [['createdAt', 'DESC']]
            });
          }
          
          return gameResult;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ GameResult 찾기 실패:', error.message);
      return null;
    }
  }

  /**
   * ❌ DEPRECATED: 레거시 고아 주문 정산 (matchedOrderId 기반)
   * 새 버전은 ExchangeOrderMatch 기반으로 작동합니다.
   * 이 함수는 하위 호환성을 위해 유지되지만 사용하지 않습니다.
   *
   * @deprecated Use settleOrphanedOrders() instead
   */
  async settleOrphanedOrder(orphanOrder, settledMatchedOrder, gameResult, transaction) {
    console.log(`\n🔍 고아 주문 ${orphanOrder.id} 분석:`);
    console.log(`   Side: ${orphanOrder.side}`);
    console.log(`   Market: ${orphanOrder.market}`);
    console.log(`   Selection: ${orphanOrder.selection}`);
    console.log(`   이미 정산된 상대방: ${settledMatchedOrder.id} (수익: ${settledMatchedOrder.actualProfit})`);
    
    // 🆕 멀티베팅 특별 처리
    if (orphanOrder.market === 'multibet') {
      console.log(`   🎯 멀티베팅 주문 - 특별 정산 처리`);
      return await this.settleMultibetOrphan(orphanOrder, settledMatchedOrder, gameResult, transaction);
    }
    
    // 경기 결과에 따른 승부 판정 (일반 베팅만)
    const isWinningBet = this.determineWinResult(orphanOrder.selection, gameResult);
    
    let actualProfit = 0;
    let profitLoss = 0;
    
    if (isWinningBet) {
      if (orphanOrder.side === 'back') {
        // Back 주문이 승리한 경우: (배당률 - 1) * 베팅액
        actualProfit = (parseFloat(orphanOrder.odds) - 1) * parseFloat(orphanOrder.amount);
        profitLoss = actualProfit;
      } else {
        // Lay 주문이 승리한 경우: 베팅액을 잃음 (이미 정산된 상대방이 수익을 가져감)
        actualProfit = -parseFloat(orphanOrder.amount);
        profitLoss = actualProfit;
      }
    } else {
      if (orphanOrder.side === 'back') {
        // Back 주문이 패배한 경우: 베팅액을 잃음
        actualProfit = -parseFloat(orphanOrder.amount);
        profitLoss = actualProfit;
      } else {
        // Lay 주문이 패배한 경우: 베팅액을 받음 (이미 정산된 상대방이 손실)
        actualProfit = parseFloat(orphanOrder.amount);
        profitLoss = actualProfit;
      }
    }
    
    // 주문 상태 업데이트
    await orphanOrder.update({
      status: 'settled',
      actualProfit: actualProfit,
      settledAt: new Date(),
      profitLoss: profitLoss
    }, { transaction });
    
    // 사용자 잔액 업데이트
    const user = await User.findByPk(orphanOrder.userId, { transaction });
    if (user) {
      const newBalance = parseFloat(user.balance) + actualProfit;
      await user.update({ balance: newBalance }, { transaction });
      
      // 결제 이력 추가
      await PaymentHistory.create({
        userId: orphanOrder.userId,
        type: actualProfit >= 0 ? 'settlement_win' : 'settlement_loss',
        amount: Math.abs(actualProfit),
        description: `Exchange 고아 주문 정산: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`,
        balanceAfter: newBalance,
        orderId: orphanOrder.id,
        paidAt: new Date()  // 🆕 paidAt 필드 추가
      }, { transaction });
    }
    
    console.log(`✅ 고아 주문 정산 완료:`);
    console.log(`   승부 결과: ${isWinningBet ? '승리' : '패배'}`);
    console.log(`   수익/손실: ${actualProfit}원`);
    
    return {
      orderId: orphanOrder.id,
      userId: orphanOrder.userId,
      side: orphanOrder.side,
      isWin: isWinningBet,
      totalWinnings: actualProfit,
      isOrphanedOrder: true
    };
  }

  /**
   * ❌ DEPRECATED: 레거시 멀티베팅 고아 주문 정산 (matchedOrderId 기반)
   * 새 버전은 ExchangeOrderMatch 기반으로 작동하며 단일/멀티 구분 없이 동일하게 처리합니다.
   * 이 함수는 하위 호환성을 위해 유지되지만 사용하지 않습니다.
   *
   * @deprecated Use settleOrphanedOrders() instead
   */
  async settleMultibetOrphan(orphanOrder, settledMatchedOrder, gameResult, transaction) {
    console.log(`\n🎯 멀티베팅 고아 주문 ${orphanOrder.id} 정산:`);
    
    // 상대방의 수익을 기반으로 이 주문의 손실 계산
    const matchedProfit = parseFloat(settledMatchedOrder.actualProfit);
    console.log(`   상대방 수익: ${matchedProfit}`);
    
    // 기본적으로 상대방 수익의 반대가 이 주문의 손실/수익
    let actualProfit = -matchedProfit;
    
    // 하지만 멀티베팅의 경우 단순히 반대가 아닐 수 있음
    // 일단 베팅한 금액을 잃는 것으로 처리
    if (orphanOrder.side === 'back') {
      actualProfit = -parseFloat(orphanOrder.amount); // back 주문은 베팅액 손실
    } else {
      actualProfit = parseFloat(orphanOrder.amount);  // lay 주문은 베팅액 수익
    }
    
    console.log(`   계산된 수익/손실: ${actualProfit}`);
    
    // 주문 상태 업데이트
    await orphanOrder.update({
      status: 'settled',
      actualProfit: actualProfit,
      settledAt: new Date(),
      profitLoss: actualProfit
    }, { transaction });
    
    // 사용자 잔액 업데이트
    const user = await User.findByPk(orphanOrder.userId, { transaction });
    if (user) {
      const newBalance = parseFloat(user.balance) + actualProfit;
      await user.update({ balance: newBalance }, { transaction });
      
      // 결제 이력 추가
      await PaymentHistory.create({
        userId: orphanOrder.userId,
        type: actualProfit >= 0 ? 'settlement_win' : 'settlement_loss',
        amount: Math.abs(actualProfit),
        description: `Exchange 멀티베팅 고아 주문 정산: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`,
        balanceAfter: newBalance,
        orderId: orphanOrder.id,
        paidAt: new Date()  // 🆕 paidAt 필드 추가
      }, { transaction });
    }
    
    console.log(`✅ 멀티베팅 고아 주문 정산 완료:`);
    console.log(`   최종 수익/손실: ${actualProfit}원`);
    console.log(`   새 잔액: ${user ? user.balance : 'N/A'}원`);
    
    return {
      orderId: orphanOrder.id,
      userId: orphanOrder.userId,
      side: orphanOrder.side,
      isWin: actualProfit > 0,
      totalWinnings: actualProfit,
      isOrphanedOrder: true,
      isMultibet: true
    };
  }

  /**
   * 🆕 매칭된 주문 자동 정산 (한쪽이 이미 정산된 경우)
   * @param {Object} order - 정산할 주문
   * @param {Object} gameResult - 경기 결과
   * @returns {Object} 정산 결과
   */
  async autoSettleMatchedOrder(order, gameResult) {
    const transaction = await sequelize.transaction();
    try {
      console.log(`🔄 주문 ${order.id} 자동 정산 시작...`);
      
      // 주문 상태 확인
      if (order.settledAt !== null) {
        return { success: false, error: '이미 정산된 주문입니다.' };
      }
      
      // 매칭된 주문 조회
      const matchedOrder = await ExchangeOrder.findByPk(order.matchedOrderId);
      if (!matchedOrder) {
        return { success: false, error: '매칭된 주문을 찾을 수 없습니다.' };
      }
      
      // 매칭된 주문이 정산되었는지 확인
      if (matchedOrder.settledAt === null) {
        return { success: false, error: '매칭된 주문이 아직 정산되지 않았습니다.' };
      }
      
      // 승부 판정
      const isWinner = this.determineSelectionWinner(order.selection, gameResult);
      const winnerSide = isWinner ? order.side : (order.side === 'back' ? 'lay' : 'back');
      
      // 정산 금액 계산
      const winnings = isWinner ? order.amount * (order.odds - 1) : -order.amount;
      
      // 주문 상태 업데이트
      await order.update({
        status: 'settled',
        settledAt: new Date(),
        actualProfit: winnings
      }, { transaction });
      
      // 사용자 잔액 업데이트
      const user = await User.findByPk(order.userId, { transaction });
      if (user) {
        const currentBalance = parseFloat(user.balance) || 0;
        user.balance = currentBalance + winnings;
        await user.save({ transaction });
        
        // 결제 내역 생성
        await PaymentHistory.create({
          userId: order.userId,
          betId: `EXCHANGE_${order.id}`,
          amount: winnings,
          balanceAfter: user.balance,
          memo: `Exchange 자동 정산 (${winnerSide} 승리) - ${winnings > 0 ? '수익' : '손실'}: ${winnings}원`,
          paidAt: new Date()
        }, { transaction });
      }
      
      await transaction.commit();
      
      console.log(`✅ 주문 ${order.id} 자동 정산 완료: ${winnerSide} 승리, 수익: ${winnings}원`);
      
      return {
        success: true,
        winnerSide,
        winnings,
        orderId: order.id,
        matchedOrderId: matchedOrder.id
      };
      
    } catch (error) {
      await transaction.rollback();
      console.error(`❌ 주문 ${order.id} 자동 정산 실패:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🆕 고아 주문 정산 처리 (상대방이 이미 정산된 경우)
   * @param {Object} orphanOrder - 고아 주문
   * @param {Object} settledMatchedOrder - 이미 정산된 매칭 주문
   * @param {Object} gameResult - 경기 결과
   * @param {Object} transaction - DB 트랜잭션
   * @returns {Object} 정산 결과
   */
  async settleOrphanedOrder(orphanOrder, settledMatchedOrder, gameResult, transaction) {
    try {
      console.log(`\n🔄 고아 주문 ${orphanOrder.id} 정산 시작`);
      console.log(`   매칭된 주문 ${settledMatchedOrder.id}: ${settledMatchedOrder.status}, 수익: ${settledMatchedOrder.actualProfit}원`);
      
      // 🛡️ 제미나이 제안: 고아 주문도 경기 결과 검증 필요 (멀티베팅 제외)
      if (!orphanOrder.isMultibet) {
        if (!gameResult || gameResult.status !== 'finished' || !gameResult.score) {
          const errorMsg = `고아 주문 ${orphanOrder.id} 정산 실패: 경기 결과 없음 (status: ${gameResult?.status})`;
          console.error(`❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }
        console.log(`   ✅ 경기 결과 검증 통과: ${gameResult.status}`);
      }
      
      // 🛡️ 제미나이 제안: 매칭된 주문의 정산 상태 검증
      if (!settledMatchedOrder.settledAt) {
        throw new Error(`고아 주문 ${orphanOrder.id} 정산 실패: 매칭된 주문 ${settledMatchedOrder.id}이 아직 정산되지 않음`);
      }
      
      // 상대방 주문의 정산 결과를 기반으로 고아 주문의 결과 결정
      const isMatchedOrderWinner = settledMatchedOrder.actualProfit > 0;
      const isOrphanWinner = (orphanOrder.side === 'back' && isMatchedOrderWinner) || 
                            (orphanOrder.side === 'lay' && !isMatchedOrderWinner);
      
      let actualProfit = 0;
      if (isOrphanWinner) {
        // 고아 주문이 승리한 경우: 상대방의 손실만큼 수익
        actualProfit = Math.abs(settledMatchedOrder.actualProfit);
      } else {
        // 고아 주문이 패배한 경우: 자신의 베팅 금액만큼 손실
        actualProfit = -orphanOrder.amount;
      }
      
      // 고아 주문 상태 업데이트
      await orphanOrder.update({
        status: 'settled',
        settledAt: new Date(),
        actualProfit: actualProfit,
        settlementNote: `고아 주문 정산 - 매칭된 주문 ${settledMatchedOrder.id} 결과 기반 (${isOrphanWinner ? '승리' : '패배'})`
      }, { transaction });
      
      // 사용자 잔액 업데이트
      if (actualProfit !== 0) {
        const user = await User.findByPk(orphanOrder.userId, { transaction });
        if (user) {
          const newBalance = Number(user.balance) + Number(actualProfit);
          await user.update({ balance: newBalance }, { transaction });
          
          // 결제 내역 생성
          await PaymentHistory.create({
            userId: orphanOrder.userId,
            betId: `EXCHANGE_${orphanOrder.id}`,
            amount: actualProfit,
            balanceAfter: newBalance,
            memo: `고아 주문 정산 (${isOrphanWinner ? '승리' : '패배'}) - ${actualProfit > 0 ? '수익' : '손실'}: ${actualProfit}원`,
            paidAt: new Date()
          }, { transaction });
        }
      }
      
      console.log(`✅ 고아 주문 ${orphanOrder.id} 정산 완료: ${isOrphanWinner ? '승리' : '패배'}, 수익: ${actualProfit}원`);
      
      return {
        success: true,
        winnerSide: isOrphanWinner ? orphanOrder.side : settledMatchedOrder.side,
        winnings: actualProfit,
        orderId: orphanOrder.id,
        matchedOrderId: settledMatchedOrder.id,
        totalWinnings: Math.abs(actualProfit)
      };
      
    } catch (error) {
      console.error(`❌ 고아 주문 ${orphanOrder.id} 정산 실패:`, error.message);
      return { success: false, error: error.message };
    }
  }
  /**
   * 🆕 고아 주문 탐지 및 정산 (ExchangeOrderMatch 기반)
   * 안전망: 트랜잭션 부분 실패, 네트워크 오류 등으로 한쪽만 정산된 경우 복구
   */
  async settleOrphanedOrders() {
    console.log('\n🔍 [ORPHAN_SETTLEMENT] 고아 주문 탐지 시작 (ExchangeOrderMatch 기반)...');

    // 1. ExchangeOrderMatch에서 active 상태의 매치 조회
    const activeMatches = await ExchangeOrderMatch.findAll({
      where: {
        status: 'active'
      },
      include: [
        { model: ExchangeOrder, as: 'originalOrder' },
        { model: ExchangeOrder, as: 'matchingOrder' }
      ]
    });

    console.log(`📋 활성 매치: ${activeMatches.length}개`);

    if (activeMatches.length === 0) {
      return { settledCount: 0, results: [] };
    }

    // 2. 한쪽만 정산된 매치 찾기 (고아 매치)
    const orphanMatches = [];

    for (const match of activeMatches) {
      const originalOrder = match.originalOrder;
      const matchingOrder = match.matchingOrder;

      if (!originalOrder || !matchingOrder) {
        console.log(`⚠️  매치 ${match.id}: 주문을 찾을 수 없음`);
        continue;
      }

      // 한쪽은 정산됨, 다른쪽은 미정산
      const originalSettled = originalOrder.settledAt !== null;
      const matchingSettled = matchingOrder.settledAt !== null;

      if (originalSettled && !matchingSettled) {
        orphanMatches.push({
          match,
          settledOrder: originalOrder,
          orphanOrder: matchingOrder,
          orphanSide: match.matchingSide
        });
        console.log(`🔄 고아 발견: 매치 ${match.id}, 정산됨=${originalOrder.id}, 고아=${matchingOrder.id} (${match.matchingSide})`);
      } else if (!originalSettled && matchingSettled) {
        orphanMatches.push({
          match,
          settledOrder: matchingOrder,
          orphanOrder: originalOrder,
          orphanSide: match.originalSide
        });
        console.log(`🔄 고아 발견: 매치 ${match.id}, 정산됨=${matchingOrder.id}, 고아=${originalOrder.id} (${match.originalSide})`);
      }
    }

    console.log(`🔄 발견된 고아 매치: ${orphanMatches.length}개`);

    if (orphanMatches.length === 0) {
      return { settledCount: 0, results: [] };
    }

    // 3. 각 고아 매치를 제로썸 정산
    let settledCount = 0;
    const results = [];

    for (const { match, settledOrder, orphanOrder, orphanSide } of orphanMatches) {
      const orphanTransaction = await sequelize.transaction();

      try {
        console.log(`\n🔄 고아 매치 ${match.id} 정산 시작...`);
        console.log(`   정산된 주문: ${settledOrder.id} (수익: ${settledOrder.actualProfit})`);
        console.log(`   고아 주문: ${orphanOrder.id} (${orphanSide})`);

        // 📊 정산 감사 로그
        console.log('[SETTLEMENT_AUDIT]', {
          matchId: match.id,
          settledOrderId: settledOrder.id,
          orphanOrderId: orphanOrder.id,
          settledBy: 'orphan',
          timestamp: new Date().toISOString()
        });

        // ✅ 제로썸 계산 - 정수 연산으로 부동소수점 오차 방지
        const backAmount = Number(match.matchedAmount);
        const matchedPriceValue = Number(match.matchedPrice);
        const layLiability = Math.floor(backAmount * matchedPriceValue) - backAmount;
        const totalStake = Number(backAmount) + Number(layLiability);

        const settledProfit = parseFloat(settledOrder.actualProfit) || 0;

        let orphanProfit;
        if (settledProfit > 0) {
          // 정산된 쪽이 승리 (총 담보금 받음) → 고아는 패배 (담보금 손실)
          orphanProfit = 0;
          console.log(`   정산된 쪽 승리 → 고아 패배: 0원`);
        } else {
          // 정산된 쪽이 패배 (담보금 손실) → 고아는 승리 (총 담보금 받음)
          orphanProfit = totalStake;
          console.log(`   정산된 쪽 패배 → 고아 승리: ${totalStake}원 (백담보 ${backAmount} + 레이담보 ${layLiability})`);
        }

        // ✅ 제로썸 검증
        const zeroSum = settledProfit + orphanProfit - totalStake;
        console.log(`   제로썸 검증: ${settledProfit} + ${orphanProfit} - ${totalStake} = ${zeroSum}`);
        if (Math.abs(zeroSum) > 0.01) {
          console.warn(`   ⚠️  제로썸 위반! 차이: ${zeroSum}`);
        }

        // 고아 주문 업데이트
        await orphanOrder.update({
          status: 'settled',
          settledAt: new Date(),
          actualProfit: orphanProfit
        }, { transaction: orphanTransaction });

        // 사용자 잔액 업데이트
        if (orphanProfit > 0) {
          const user = await User.findByPk(orphanOrder.userId, { transaction: orphanTransaction });
          const currentBalance = parseFloat(user.balance);
          const newBalance = currentBalance + orphanProfit;

          await user.update({ balance: newBalance }, { transaction: orphanTransaction });

          // PaymentHistory 기록
          await PaymentHistory.create({
            userId: orphanOrder.userId,
            betId: `EXCHANGE_${orphanOrder.id}_ORPHAN`,
            amount: orphanProfit,
            balanceAfter: newBalance,
            memo: `Exchange 고아 주문 정산 (매치 ${match.id}: ${orphanSide} 승리)`,
            paidAt: new Date()
          }, { transaction: orphanTransaction });

          console.log(`   💰 잔액 업데이트: ${currentBalance} → ${newBalance} (+${orphanProfit})`);
        } else {
          console.log(`   💰 패배: 잔액 변동 없음 (담보금 이미 차감됨)`);
        }

        // 매치 상태 업데이트
        await match.update({
          status: 'settled',
          settledAt: new Date(),
          settlementResult: {
            settledOrderId: settledOrder.id,
            orphanOrderId: orphanOrder.id,
            orphanProfit: orphanProfit,
            zeroSumCheck: zeroSum
          }
        }, { transaction: orphanTransaction });

        await orphanTransaction.commit();

        results.push({
          success: true,
          matchId: match.id,
          orphanOrderId: orphanOrder.id,
          orphanProfit: orphanProfit
        });
        settledCount++;

        console.log(`✅ 고아 매치 ${match.id} 정산 완료`);

      } catch (error) {
        await orphanTransaction.rollback();

        console.error(`❌ 고아 매치 ${match.id} 정산 실패:`, error.message);
        results.push({
          success: false,
          matchId: match.id,
          orphanOrderId: orphanOrder.id,
          error: error.message
        });
      }
    }

    console.log(`\n🎉 고아 정산 완료: ${settledCount}/${orphanMatches.length}개`);

    return { settledCount, results };
  }

  /**
   * 승부 결과 판정 함수
   * @param {string} selection - 선택한 팀/옵션
   * @param {Object} gameResult - 경기 결과
   * @returns {boolean} 승리 여부
   */
  determineWinResult(selection, gameResult) {
    if (!selection || !gameResult) {
      console.warn('determineWinResult: selection 또는 gameResult가 없습니다');
      return false;
    }

    // 스코어 파싱
    const scores = gameResult.scores || [];
    if (scores.length < 2) {
      console.warn('determineWinResult: 스코어 정보가 부족합니다', scores);
      return false;
    }

    const homeScore = parseInt(scores[0]?.score) || 0;
    const awayScore = parseInt(scores[1]?.score) || 0;

    console.log(`🎯 승부 판정: ${selection} vs ${gameResult.homeTeam} ${homeScore}:${awayScore} ${gameResult.awayTeam}`);

    // 팀명 정규화
    const normalizedSelection = this.normalizeTeamName(selection);
    const normalizedHomeTeam = this.normalizeTeamName(gameResult.homeTeam);
    const normalizedAwayTeam = this.normalizeTeamName(gameResult.awayTeam);

    // 승부 판정
    if (normalizedSelection === normalizedHomeTeam) {
      const isWin = homeScore > awayScore;
      console.log(`   홈팀 선택: ${isWin ? '승리' : '패배'}`);
      return isWin;
    } else if (normalizedSelection === normalizedAwayTeam) {
      const isWin = awayScore > homeScore;
      console.log(`   어웨이팀 선택: ${isWin ? '승리' : '패배'}`);
      return isWin;
    } else if (selection === 'Draw' || selection === '무승부') {
      const isDraw = homeScore === awayScore;
      console.log(`   무승부 선택: ${isDraw ? '승리' : '패배'}`);
      return isDraw;
    }

    console.warn(`determineWinResult: 알 수 없는 선택 "${selection}"`);
    return false;
  }

  /**
   * 팀명 정규화 헬퍼 함수
   * @param {string} teamName - 팀명
   * @returns {string} 정규화된 팀명
   */
  normalizeTeamName(teamName) {
    if (!teamName) return '';
    
    return teamName
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, '') // 특수문자 제거
      .replace(/\s+/g, '') // 공백 제거
      .trim();
  }
}

export default ExchangeSettlementService; 