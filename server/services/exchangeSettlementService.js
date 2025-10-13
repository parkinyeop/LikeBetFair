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

      // 팀명+날짜로 활성 매치 조회
      const matches = await ExchangeOrderMatch.findAll({
        where: {
          homeTeam,
          awayTeam,
          commenceTime,
          status: 'active'
        },
        include: [
          { model: ExchangeOrder, as: 'originalOrder' },
          { model: ExchangeOrder, as: 'matchingOrder' }
        ],
        transaction
      });

      console.log(`[Team-Based] 정산 대상 매치 수: ${matches.length}`);
      if (matches.length === 0) {
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

        const pair = [backOrder, layOrder];
        const result = await this.settlePair(pair, gameResult, transaction);

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
          const result = await this.settlePair(pair, gameResult, transaction);
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
        if (!ordersBySelection[order.selection]) {
          ordersBySelection[order.selection] = { back: [], lay: [] };
        }
        ordersBySelection[order.selection][order.side].push(order);
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
   * @returns {Object} 정산 결과
   */
  async settlePair(pair, gameResult, transaction) {
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
    console.log(`  Back 주문: ID ${backOrder.id}, ${backOrder.selection}, 배당 ${backOrder.price}`);
    console.log(`  Lay 주문: ID ${layOrder.id}, ${layOrder.selection}, 배당 ${layOrder.price}`);
    
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
    
    // 🆕 부분 매칭된 주문의 경우 실제 체결된 금액으로 수익 계산
    const backStakeAmount = backOrder.partiallyFilled ? (backOrder.filledAmount || 0) : backOrder.stakeAmount;
    const layStakeAmount = layOrder.partiallyFilled ? (layOrder.filledAmount || 0) : layOrder.stakeAmount;
    
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
      backWinAmount = backStakeAmount + layStakeAmount;
      layWinAmount = 0; // Lay 패배: 담보금 이미 차감됨
      console.log(`  🏆 Back 승리: Back +${backWinAmount}원 (Back담보 ${backStakeAmount} + Lay담보 ${layStakeAmount}), Lay 0원 (이미 차감)`);
    } else {
      // Lay 승리: 총 담보금 지급 (Lay담보 + Back담보)
      backWinAmount = 0; // Back 패배: 담보금 이미 차감됨
      layWinAmount = layStakeAmount + backStakeAmount;
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
    if (backOrder.partiallyFilled) {
      // 부분 매칭된 주문: 체결된 부분만 정산하고 남은 부분은 취소 처리
      const backSettlementNote = this.generateDetailedPartialMatchingSettlementNote(backOrder, gameResult, isBackWin, backStakeAmount);
      await backOrder.update({
        status: 'settled',
        actualProfit: backWinAmount,
        settledAt,
        settlementNote: backSettlementNote
      }, { transaction });
      
      // 🆕 남은 금액이 있다면 취소 처리
      if (backOrder.remainingAmount > 0) {
        await this.cancelRemainingAmount(backOrder, transaction);
      }
    } else {
      // 완전 매칭된 주문: 기존 로직
      await backOrder.update({
        status: 'settled',
        actualProfit: backWinAmount,
        settledAt,
        settlementNote: this.generateSettlementNote(backOrder, gameResult, isBackWin)
      }, { transaction });
    }
    
    // Lay 주문 정산
    if (layOrder.partiallyFilled) {
      // 부분 매칭된 주문: 체결된 부분만 정산하고 남은 부분은 취소 처리
      const laySettlementNote = this.generateDetailedPartialMatchingSettlementNote(layOrder, gameResult, isBackWin, layStakeAmount);
      await layOrder.update({
        status: 'settled',
        actualProfit: layWinAmount,
        settledAt,
        settlementNote: laySettlementNote
      }, { transaction });
      
      // Lay 주문은 Back 주문의 매칭이므로 환불 없음
    } else {
      // 완전 매칭된 주문: 기존 로직
      await layOrder.update({
        status: 'settled',
        actualProfit: layWinAmount,
        settledAt,
        settlementNote: this.generateSettlementNote(layOrder, gameResult, isBackWin)
      }, { transaction });
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
    
    // 선택한 팀이 홈팀인지 확인
    const isHomeSelection = selection.includes(homeTeam) || 
                           selection.toLowerCase().includes('home');
    
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
    
    console.log(`      선택팀: ${selection}, 홈팀여부: ${isHomeSelection}, 스코어: ${actualHomeScore}-${actualAwayScore}`);
    
    if (isDraw) {
      return false; // 무승부는 일반적으로 패배 처리
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
          // 추천인 수수료 계산 (승리 금액의 일정 비율)
          const referralCommissionRate = referralCode.commissionRate || 0.05;
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
    const matchType = isPartialMatch ? '부분 매칭' : '완전 매칭';
    const matchAmount = isPartialMatch ? `(체결: ${order.filledAmount}원)` : '';
    
    let memo = '';
    if (amount > 0) {
      if (order.side === 'back') {
        memo = `Exchange Back ${matchType} 베팅 승리 수익 ${matchAmount} (수수료 없음)`;
      } else {
        memo = `Exchange Lay ${matchType} 베팅 승리 수익 ${matchAmount}`;
        if (commissionAmount > 0) {
          memo += ` (수수료 ${commissionAmount}원 차감 후)`;
        }
      }
    } else {
      memo = `Exchange ${order.side.toUpperCase()} ${matchType} 베팅 손실 ${matchAmount}`;
    }
    
    memo += ` - ${order.side.toUpperCase()}: ${order.selection}, ` +
            `경기: ${gameResult.homeTeam} vs ${gameResult.awayTeam}, ` +
            `배당: ${order.price}배, ` +
            `결과: ${gameResult.status}`;
    
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
    const selection = order.selection || '선택 없음';
    
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
   * 개선: 경기 시작 후 3시간 경과 시 자동 취소
   */
  async cancelUnmatchedOrdersAtKickoff() {
    try {
      console.log('🔄 경기 시작 후 매칭되지 않은 주문 자동 취소 시작...');
      
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3시간 전
      
      // 매칭되지 않은 주문들 조회 (경기 시작 후 3시간이 지난 주문들)
      const unmatchedOrders = await ExchangeOrder.findAll({
        where: {
          status: 'open',
          matchedOrderId: null,
          commenceTime: {
            [Op.lte]: threeHoursAgo // 경기 시작 후 3시간 경과
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
              settlementNote: `경기 시작 후 ${hoursSinceGame.toFixed(1)}시간 경과로 매칭되지 않아 자동 취소`,
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
          const result = await this.settlePair(pair, gameResult, transaction);
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
    
    for (const selection of order.selectionDetails.selections) {
      console.log(`🔍 선택사항 확인: ${selection.homeTeam} vs ${selection.awayTeam} - ${selection.selection}`);
      
      // 해당 선택사항의 경기 결과 조회
      const selectionGameResult = await this.findGameResultByMatch(
        selection.homeTeam, 
        selection.awayTeam, 
        selection.commenceTime
      );
      
      if (!selectionGameResult || selectionGameResult.status !== 'finished') {
        console.log(`❌ 선택사항 경기 결과 없음: ${selection.homeTeam} vs ${selection.awayTeam}`);
        allSelectionsWon = false;
        allSelectionsHaveResults = false; // 🆕 경기 결과가 없으면 정산 불가
        selectionResults.push({
          selection: selection.selection,
          game: `${selection.homeTeam} vs ${selection.awayTeam}`,
          result: 'no_result',
          won: false
        });
        continue;
      }
      
      // 승부 판정
      const isWinner = this.determineSelectionWinner(selection, selectionGameResult);
      selectionResults.push({
        selection: selection.selection,
        game: `${selection.homeTeam} vs ${selection.awayTeam}`,
        result: selectionGameResult.result,
        score: selectionGameResult.score,
        won: isWinner
      });
      
      if (!isWinner) {
        allSelectionsWon = false;
      }
      
      console.log(`✅ 선택사항 결과: ${isWinner ? '승리' : '패배'} (${selectionGameResult.result})`);
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
    
    // 멀티베팅 결과 계산 (모든 선택사항이 승리해야 함)
    // 부분 매칭된 경우 실제 체결된 금액으로 계산
    const multibetStakeAmount = order.partiallyFilled ? (order.filledAmount || 0) : order.amount;
    
    let actualProfit = 0;
    if (allSelectionsWon) {
      // 모든 선택사항이 승리한 경우 - 총 수익 계산 (부분 매칭 고려)
      if (order.potentialWinnings) {
        // potentialWinnings가 있으면 체결된 비율로 계산 (본금 포함)
        const matchRatio = order.partiallyFilled ? (multibetStakeAmount / order.amount) : 1;
        actualProfit = parseFloat(order.potentialWinnings) * matchRatio;
      } else {
        // potentialWinnings가 없으면 배당률로 총 수익 계산 (본금 포함)
        actualProfit = multibetStakeAmount * parseFloat(order.totalOdds);
      }
      console.log(`🎉 멀티베팅 승리! 수익: ${actualProfit}원 (체결: ${multibetStakeAmount}원)`);
    } else {
      // 하나라도 패배한 경우 - 체결된 금액만 손실
      actualProfit = -multibetStakeAmount;
      console.log(`❌ 멀티베팅 패배! 손실: ${Math.abs(actualProfit)}원 (체결: ${multibetStakeAmount}원)`);
    }
    
    await order.update({
      status: 'settled',
      actualProfit: actualProfit,
      settledAt: new Date(),
      profitLoss: actualProfit
    }, { transaction });
    
    // 사용자 잔액 업데이트
    const user = await User.findByPk(order.userId, { transaction });
    if (user) {
      const newBalance = parseFloat(user.balance) + actualProfit;
      await user.update({ balance: newBalance }, { transaction });
      
      // 결제 이력 추가
      await PaymentHistory.create({
        userId: order.userId,
        betId: `EXCHANGE_${order.id}`,
        amount: actualProfit,
        memo: `Exchange 멀티베팅 정산: ${allSelectionsWon ? '승리' : '패배'} (${selectionResults.length}개 선택사항)`,
        balanceAfter: newBalance,
        paidAt: new Date()
      }, { transaction });
    }
    
    // 🆕 멀티베팅 부분 매칭 환불 처리
    if (order.partiallyFilled && order.remainingAmount > 0) {
      await this.cancelRemainingAmount(order, transaction);
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
   * 🆕 선택사항 승부 판정
   * @param {Object} selection - 선택사항
   * @param {Object} gameResult - 경기 결과
   * @returns {boolean} 승리 여부
   */
  determineSelectionWinner(selection, gameResult) {
    const selectedTeam = selection.selection;
    const homeTeam = selection.homeTeam;
    const awayTeam = selection.awayTeam;
    
    // 승패 마켓의 경우
    if (selection.market === '승패' || selection.market === 'h2h') {
      if (gameResult.status === 'home_win' && selectedTeam === homeTeam) {
        return true;
      }
      if (gameResult.status === 'away_win' && selectedTeam === awayTeam) {
        return true;
      }
      if (gameResult.status === 'draw' && selectedTeam === 'Draw') {
        return true;
      }
      return false;
    }
    
    // 핸디캡 마켓의 경우 (향후 구현)
    if (selection.market === '핸디캡' || selection.market === 'spreads') {
      // TODO: 핸디캡 로직 구현
      return false;
    }
    
    // 오버/언더 마켓의 경우 (향후 구현)
    if (selection.market === '총점' || selection.market === 'totals') {
      // TODO: 오버/언더 로직 구현
      return false;
    }
    
    // 기본적으로 패배 처리
    return false;
  }

  /**
   * 🆕 경기 시작 후 미매칭된 오픈 주문들과 부분 매칭된 주문들을 자동 환불
   */
  async refundUnmatchedOpenOrders() {
    try {
      console.log('🔄 경기 시작 후 미매칭 오픈 주문 및 부분 매칭 주문 환불 처리 시작...');
      
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000)); // 1시간 전
      
      // 🆕 수정: 오픈 주문과 부분 매칭된 주문 모두 처리
      // 1. 완전히 미매칭된 오픈 주문들
      const [openOrdersResults] = await sequelize.query(`
        SELECT 
          id, "userId", side, amount, price, status, "filledAmount", 
          "partiallyFilled", "remainingAmount", "originalAmount", 
          "matchedOrderId", "gameId", market, line, selection, "isMultibet", 
          "selectionDetails", "homeTeam", "awayTeam", "commenceTime",
          "createdAt", "updatedAt"
        FROM "ExchangeOrders" 
        WHERE status = 'open' 
          AND "commenceTime" < :oneHourAgo
          AND "filledAmount" = 0 
          AND ("partiallyFilled" = false OR "partiallyFilled" IS NULL)
        ORDER BY "commenceTime" ASC
        LIMIT 25
      `, {
        replacements: { oneHourAgo },
        type: sequelize.QueryTypes.SELECT
      });
      
      // 2. 부분 매칭된 주문들 (남은 금액이 있는 경우)
      const [partialOrdersResults] = await sequelize.query(`
        SELECT 
          id, "userId", side, amount, price, status, "filledAmount", 
          "partiallyFilled", "remainingAmount", "originalAmount", 
          "matchedOrderId", "gameId", market, line, selection, "isMultibet", 
          "selectionDetails", "homeTeam", "awayTeam", "commenceTime",
          "createdAt", "updatedAt"
        FROM "ExchangeOrders" 
        WHERE status = 'partially_matched' 
          AND "commenceTime" < :oneHourAgo
          AND "remainingAmount" > 0
        ORDER BY "commenceTime" ASC
        LIMIT 25
      `, {
        replacements: { oneHourAgo },
        type: sequelize.QueryTypes.SELECT
      });
      
      // 두 결과를 합치기
      const allResults = [...(Array.isArray(openOrdersResults) ? openOrdersResults : [openOrdersResults]), 
                          ...(Array.isArray(partialOrdersResults) ? partialOrdersResults : [partialOrdersResults])];
      const sqlResults = allResults.filter(result => result != null);
      
      // SQL 결과를 ExchangeOrder 인스턴스로 변환
      const resultsArray = Array.isArray(sqlResults) ? sqlResults : [sqlResults];
      const unmatchedOpenOrders = resultsArray.filter(result => result != null).map(row => {
        const order = ExchangeOrder.build(row);
        order.isNewRecord = false;
        return order;
      });
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
              refundAmount = Math.floor((order.price - 1) * order.amount);
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
          
          // 환불 사유 및 메모 생성
          const timeDescription = isGameStarted 
            ? `경기 시작 후 ${Math.abs(hoursSinceGame).toFixed(1)}시간 경과` 
            : `경기 시작 전 ${Math.abs(hoursSinceGame).toFixed(1)}시간`;
          
          let refundReason;
          if (order.status === 'partially_matched') {
            refundReason = '경기 시작 후 부분 매칭된 주문의 남은 금액 자동 환불';
          } else {
            refundReason = isGameStarted 
              ? '경기 시작 후 미매칭으로 인한 자동 환불' 
              : '경기 시작 전 미매칭으로 인한 자동 환불';
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
            settlementNote: `${timeDescription}로 ${order.status === 'partially_matched' ? '부분 매칭 후 남은 금액' : '미매칭'}되어 자동 환불`,
            settledAt: new Date()
          };
          
          if (order.status === 'partially_matched') {
            // 부분 매칭된 주문: remainingAmount는 그대로 유지하고 정산만 처리
            // updateData.remainingAmount = 0; // 🚨 제거: 부분 매칭된 주문의 잔액을 0으로 만들면 안됨
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
                const result = await this.settlePair(pair, gameResult, null); // transaction 없이
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
   * 🆕 고아 주문 개별 정산 (상대방이 이미 정산된 경우)
   * @param {Object} orphanOrder - 정산할 고아 주문
   * @param {Object} settledMatchedOrder - 이미 정산된 매칭 상대방 주문  
   * @param {Object} gameResult - 경기 결과
   * @param {Object} transaction - DB 트랜잭션
   * @returns {Object} 정산 결과
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
   * 🆕 멀티베팅 고아 주문 정산
   * @param {Object} orphanOrder - 정산할 고아 주문 (멀티베팅)
   * @param {Object} settledMatchedOrder - 이미 정산된 매칭 상대방 주문  
   * @param {Object} gameResult - 경기 결과
   * @param {Object} transaction - DB 트랜잭션
   * @returns {Object} 정산 결과
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
   * 🆕 고아 주문 탐지 및 정산 (경기 결과와 무관하게 실행)
   * 제미나이 제안: 별도 함수로 분리하여 주기적으로 실행
   */
  async settleOrphanedOrders() {
    console.log('\n🔍 [ORPHAN_SETTLEMENT] 고아 주문 탐지 시작...');
    
    // 1. active/partially_matched/matched 상태이면서 matchedOrderId가 있는 주문들 조회
    // ✅ 'matched' 상태 추가: 트랜잭션 부분 실패로 인한 고아 주문 탐지
    const activeOrders = await ExchangeOrder.findAll({
      where: {
        status: { [Op.in]: ['active', 'partially_matched', 'matched'] }, // ✅ 'matched' 추가
        matchedOrderId: { [Op.ne]: null },
        settledAt: null
      }
    });
    
    console.log(`📋 미정산 매칭 주문: ${activeOrders.length}개 (active/partially_matched/matched)`);
    
    if (activeOrders.length === 0) {
      return { settledCount: 0, results: [] };
    }
    
    // 2. 매칭된 주문들을 한 번에 조회 (제미나이 제안: N+1 방지)
    const matchedOrderIds = activeOrders.map(o => o.matchedOrderId);
    const matchedOrders = await ExchangeOrder.findAll({
      where: { id: { [Op.in]: matchedOrderIds } }
    });
    
    const matchedOrderMap = new Map(matchedOrders.map(o => [o.id, o]));
    
    // 3. 고아 주문 필터링
    const orphanedOrders = [];
    
    for (const order of activeOrders) {
      const matchedOrder = matchedOrderMap.get(order.matchedOrderId);
      
      if (matchedOrder && matchedOrder.settledAt !== null) {
        orphanedOrders.push({ order, matchedOrder });
        console.log(`🔄 고아 주문 발견: ${order.id} (${order.side}, 매칭: ${order.matchedOrderId})`);
      }
    }
    
    console.log(`🔄 발견된 고아 주문: ${orphanedOrders.length}개`);
    
    if (orphanedOrders.length === 0) {
      return { settledCount: 0, results: [] };
    }
      
      // 4. 경기 결과들을 한 번에 조회 (제미나이 제안: N+1 방지)
      const nonMultibetOrphans = orphanedOrders.filter(({ order }) => !order.isMultibet);
      
      let gameResultMap = new Map();
      if (nonMultibetOrphans.length > 0) {
        const gameKeys = nonMultibetOrphans.map(({ order }) => ({
          homeTeam: order.homeTeam,
          awayTeam: order.awayTeam,
          commenceTime: order.commenceTime
        }));
        
        const gameResults = await GameResult.findAll({
          where: {
            [Op.or]: gameKeys.map(key => ({
              homeTeam: key.homeTeam,
              awayTeam: key.awayTeam,
              commenceTime: key.commenceTime
            }))
          },
          transaction
        });
        
        gameResultMap = new Map(
          gameResults.map(gr => [
            `${gr.homeTeam}|${gr.awayTeam}|${gr.commenceTime}`,
            gr
          ])
        );
      }
      
      // 5. 고아 주문들 정산 (✅ 각 주문마다 독립적인 트랜잭션 사용)
      let settledCount = 0;
      const results = [];
      
      for (const { order: orphanOrder, matchedOrder: settledMatchedOrder } of orphanedOrders) {
        // ✅ 각 고아 주문마다 독립적인 트랜잭션 생성
        const orphanTransaction = await sequelize.transaction();
        
        try {
          console.log(`\n🔄 고아 주문 ${orphanOrder.id} 정산 시작...`);
          
          // 📊 제미나이 제안: 정산 감사 로그
          console.log('[SETTLEMENT_AUDIT]', {
            orderId: orphanOrder.id,
            matchedOrderId: settledMatchedOrder.id,
            settledBy: 'orphan',
            timestamp: new Date().toISOString()
          });
          
          let result;
          
          // 멀티베팅 여부 확인
          if (orphanOrder.isMultibet) {
            // 멀티베팅 고아 주문 정산
            result = await this.settleMultibetOrphan(
              orphanOrder,
              settledMatchedOrder,
              null,
              orphanTransaction  // ✅ 독립적인 트랜잭션 사용
            );
          } else {
            // 일반 주문 고아 정산
            const gameKey = `${orphanOrder.homeTeam}|${orphanOrder.awayTeam}|${orphanOrder.commenceTime}`;
            const gameResult = gameResultMap.get(gameKey);
            
            result = await this.settleOrphanedOrder(
              orphanOrder,
              settledMatchedOrder,
              gameResult,
              orphanTransaction  // ✅ 독립적인 트랜잭션 사용
            );
          }
          
          // ✅ 성공 시 트랜잭션 커밋
          await orphanTransaction.commit();
          
          results.push(result);
          settledCount++;
          console.log(`✅ 고아 주문 ${orphanOrder.id} 정산 완료`);
        } catch (error) {
          // ✅ 실패 시 트랜잭션 롤백
          await orphanTransaction.rollback();
          
          console.error(`❌ 고아 주문 ${orphanOrder.id} 정산 실패:`, error.message);
          results.push({ 
            success: false, 
            orderId: orphanOrder.id, 
            error: error.message 
          });
        }
      }
      
      console.log(`\n🎉 고아 주문 정산 완료: ${settledCount}/${orphanedOrders.length}개`);
      
      return { settledCount, results };
  }
}

export default ExchangeSettlementService; 