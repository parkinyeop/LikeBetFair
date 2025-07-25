import ExchangeOrder from '../models/exchangeOrderModel.js';
import GameResult from '../models/gameResultModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import { Op } from 'sequelize';
import sequelize from '../models/sequelize.js';

/**
 * Exchange Orders 자동 정산 서비스
 * - 경기 결과 기반 승부 판정
 * - market별 정확한 정산 로직
 * - 자동 수익 배분
 */
class ExchangeSettlementService {

  /**
   * 완료된 경기의 모든 매칭 주문 자동 정산
   * @param {string} gameResultId - 정산할 경기 ID
   * @returns {Object} 정산 결과
   */
  async settleGameOrders(gameResultId) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🎯 경기 ${gameResultId} 자동 정산 시작...`);
      
      // 경기 결과 조회
      const gameResult = await GameResult.findByPk(gameResultId);
      if (!gameResult || gameResult.status !== 'finished') {
        throw new Error('경기가 완료되지 않았거나 찾을 수 없습니다.');
      }
      
      console.log(`🏟️ 경기 정보: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
      console.log(`📊 경기 결과: ${gameResult.result}, 스코어:`, gameResult.score);
      
      // 정산 대상 주문들 조회 (매칭된 상태의 주문들)
      const orders = await ExchangeOrder.findAll({
        where: {
          gameResultId: gameResultId,
          status: 'matched',
          settledAt: null  // 아직 정산되지 않은 주문들
        },
        transaction
      });
      
      console.log(`📋 정산 대상 주문 수: ${orders.length}`);
      
      let settledCount = 0;
      let totalWinnings = 0;
      const settlementResults = [];
      
      // 주문을 쌍으로 그룹화 (매칭된 주문들)
      const orderPairs = this.groupMatchedOrders(orders);
      
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
        gameId: gameResultId,
        settledOrders: settledCount,
        totalWinnings,
        results: settlementResults
      };
      
      console.log('🎉 정산 완료 요약:', summary);
      return summary;
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 정산 중 오류:', error);
      throw error;
    }
  }

  /**
   * 매칭된 주문 쌍으로 그룹화
   * @param {Array} orders - 주문 목록
   * @returns {Array} 주문 쌍 배열
   */
  groupMatchedOrders(orders) {
    const pairs = [];
    const processedIds = new Set();
    
    for (const order of orders) {
      if (processedIds.has(order.id)) continue;
      
      // 매칭된 상대 주문 찾기
      const matchedOrder = orders.find(o => 
        o.id === order.matchedOrderId && !processedIds.has(o.id)
      );
      
      if (matchedOrder) {
        pairs.push([order, matchedOrder]);
        processedIds.add(order.id);
        processedIds.add(matchedOrder.id);
      }
    }
    
    return pairs;
  }

  /**
   * 매칭된 주문 쌍 정산
   * @param {Array} pair - [backOrder, layOrder] 쌍
   * @param {Object} gameResult - 경기 결과
   * @param {Object} transaction - DB 트랜잭션
   * @returns {Object} 정산 결과
   */
  async settlePair(pair, gameResult, transaction) {
    const [order1, order2] = pair;
    
    // back과 lay 주문 구분
    const backOrder = order1.side === 'back' ? order1 : order2;
    const layOrder = order1.side === 'lay' ? order1 : order2;
    
    console.log(`\n🔍 주문 쌍 분석:`);
    console.log(`  Back 주문: ID ${backOrder.id}, ${backOrder.selection}, 배당 ${backOrder.price}`);
    console.log(`  Lay 주문: ID ${layOrder.id}, ${layOrder.selection}, 배당 ${layOrder.price}`);
    
    // 승부 판정
    const isBackWin = this.determineWinner(backOrder, gameResult);
    
    console.log(`  🎲 승부 판정: Back ${isBackWin ? '승리' : '패배'}`);
    
    // 수익 계산
    const backWinAmount = isBackWin ? backOrder.potentialProfit : -backOrder.stakeAmount;
    const layWinAmount = isBackWin ? -layOrder.potentialProfit : layOrder.stakeAmount;
    
    console.log(`  💰 수익 계산:`);
    console.log(`    Back 주문: ${backWinAmount > 0 ? '+' : ''}${backWinAmount}`);
    console.log(`    Lay 주문: ${layWinAmount > 0 ? '+' : ''}${layWinAmount}`);
    
    // 사용자 잔고 업데이트
    await this.updateUserBalance(backOrder.userId, backWinAmount, backOrder.id, transaction);
    await this.updateUserBalance(layOrder.userId, layWinAmount, layOrder.id, transaction);
    
    // 주문 상태 업데이트
    const settledAt = new Date();
    await backOrder.update({
      status: 'settled',
      actualProfit: backWinAmount,
      settledAt,
      settlementNote: this.generateSettlementNote(backOrder, gameResult, isBackWin)
    }, { transaction });
    
    await layOrder.update({
      status: 'settled',
      actualProfit: layWinAmount,
      settledAt,
      settlementNote: this.generateSettlementNote(layOrder, gameResult, !isBackWin)
    }, { transaction });
    
    return {
      backOrderId: backOrder.id,
      layOrderId: layOrder.id,
      winnerSide: isBackWin ? 'back' : 'lay',
      backResult: { userId: backOrder.userId, profit: backWinAmount },
      layResult: { userId: layOrder.userId, profit: layWinAmount },
      totalWinnings: Math.abs(backWinAmount) + Math.abs(layWinAmount)
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
    const { result, score } = gameResult;
    
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
    const { result, homeTeam, awayTeam } = gameResult;
    
    // 선택한 팀이 홈팀인지 확인
    const isHomeSelection = selection.includes(homeTeam) || 
                           selection.toLowerCase().includes('home');
    
    console.log(`      선택팀: ${selection}, 홈팀여부: ${isHomeSelection}, 경기결과: ${result}`);
    
    switch (result) {
      case 'home_win':
        return isHomeSelection;
      case 'away_win':
        return !isHomeSelection;
      case 'draw':
        return false; // 무승부는 일반적으로 패배 처리
      default:
        return false;
    }
  }

  /**
   * 핸디캡(Spread) 베팅 판정
   */
  determineSpreadWinner(order, gameResult) {
    const { line, selection } = order;
    const { score, homeTeam } = gameResult;
    
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
    const { score } = gameResult;
    
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
   * 사용자 잔고 업데이트 및 결제 내역 생성
   */
  async updateUserBalance(userId, amount, orderId, transaction) {
    const user = await User.findByPk(userId, { transaction });
    if (!user) throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    
    const previousBalance = parseFloat(user.balance);
    const newBalance = previousBalance + amount;
    
    await user.update({ balance: newBalance }, { transaction });
    
    // 결제 내역 생성
    await PaymentHistory.create({
      userId,
      betId: orderId,
      amount,
      memo: amount > 0 ? 'Exchange 베팅 승리 수익' : 'Exchange 베팅 손실',
      paidAt: new Date(),
      balanceAfter: newBalance
    }, { transaction });
    
    console.log(`      💳 ${userId}: ${previousBalance} → ${newBalance} (${amount > 0 ? '+' : ''}${amount})`);
  }

  /**
   * 정산 메모 생성
   */
  generateSettlementNote(order, gameResult, isWin) {
    const result = isWin ? '승리' : '패배';
    const market = order.market;
    const selection = order.selection;
    
    return `${market} 베팅 ${result} - 선택: ${selection}, ` +
           `경기: ${gameResult.homeTeam} vs ${gameResult.awayTeam}, ` +
           `결과: ${gameResult.result}`;
  }

  /**
   * 특정 경기의 정산 가능한 주문 조회
   */
    async getSettlableOrders(gameResultId) {
    return await ExchangeOrder.findAll({
      where: {
        gameResultId,
        status: 'matched',
        settledAt: null
      }
    });
  }

  /**
   * 경기 시작 시점에 매칭되지 않은 주문 자동 취소
   */
  async cancelUnmatchedOrdersAtKickoff() {
    try {
      console.log('🔄 경기 시작 시점 매칭되지 않은 주문 자동 취소 시작...');
      
      // 매칭되지 않은 주문들 조회 (경기 시작 시간이 지난 주문들)
      const unmatchedOrders = await ExchangeOrder.findAll({
        where: {
          status: 'open',
          matchedOrderId: null,
          commenceTime: {
            [Op.lte]: new Date() // 경기 시작 시간이 지난 주문
          }
        }
      });

      console.log(`📊 매칭되지 않은 주문 수: ${unmatchedOrders.length}`);

      if (unmatchedOrders.length === 0) {
        console.log('✅ 취소할 주문이 없습니다.');
        return { cancelledCount: 0, totalRefund: 0 };
      }

      let cancelledCount = 0;
      let totalRefund = 0;

      for (const order of unmatchedOrders) {
        try {
          console.log(`\n🎯 주문 취소 처리: ID ${order.id}`);
          console.log(`   경기: ${order.homeTeam} vs ${order.awayTeam}`);
          console.log(`   사이드: ${order.side}, 금액: ${order.amount}원`);
          console.log(`   스테이크: ${order.stakeAmount}원`);

          const transaction = await sequelize.transaction();

          try {
            // 1. 주문 상태 업데이트
            await order.update({
              status: 'cancelled',
              settlementNote: '경기 시작 시점에 매칭되지 않아 자동 취소',
              settledAt: new Date()
            }, { transaction });

            // 2. 사용자 잔액 환불
            await User.increment('balance', {
              by: order.stakeAmount,
              where: { id: order.userId }
            }, { transaction });

            // 환불 후 잔액 조회
            const user = await User.findByPk(order.userId, { transaction });

            // 3. 환불 내역 기록
            await PaymentHistory.create({
              userId: order.userId,
              betId: null,
              amount: order.stakeAmount,
              type: 'refund',
              memo: 'Exchange 주문 매칭 실패로 인한 환불',
              status: 'completed',
              balanceAfter: user.balance,
              paidAt: new Date()
            }, { transaction });

            await transaction.commit();

            cancelledCount++;
            totalRefund += order.stakeAmount;

            console.log(`   ✅ 취소 완료 - 환불: ${order.stakeAmount}원`);

          } catch (error) {
            await transaction.rollback();
            console.error(`   ❌ 주문 ${order.id} 취소 실패:`, error.message);
          }

        } catch (error) {
          console.error(`❌ 주문 ${order.id} 처리 중 오류:`, error.message);
        }
      }

      console.log(`\n📈 자동 취소 완료:`);
      console.log(`   - 취소된 주문: ${cancelledCount}개`);
      console.log(`   - 총 환불 금액: ${totalRefund}원`);

      return { cancelledCount, totalRefund };

    } catch (error) {
      console.error('❌ 매칭되지 않은 주문 자동 취소 중 오류:', error);
      throw error;
    }
  }

  /**
   * 모든 완료된 경기 자동 정산
   */
  async settleAllFinishedGames() {
    try {
      console.log('🔄 모든 완료된 경기 자동 정산 시작...');
      
      // 완료되었지만 정산되지 않은 경기들 조회
      const finishedGames = await GameResult.findAll({
        where: {
          status: 'finished',
          result: { [Op.ne]: 'pending' }
        },
        // include 제거하고 별도 쿼리로 확인
      });
      
      // 각 게임에 대해 정산 가능한 주문이 있는지 확인
      const gamesWithOrders = [];
      for (const game of finishedGames) {
        const hasOrders = await ExchangeOrder.count({
          where: {
            gameResultId: game.id,
            status: 'matched',
            settledAt: null
          }
        });
        if (hasOrders > 0) {
          gamesWithOrders.push(game);
        }
      }
      
      console.log(`📊 정산 대상 경기 수: ${gamesWithOrders.length}`);
      
      const results = [];
      for (const game of gamesWithOrders) {
        try {
          const result = await this.settleGameOrders(game.id);
          results.push(result);
        } catch (error) {
          console.error(`경기 ${game.id} 정산 실패:`, error.message);
        }
      }
      
      return {
        totalGames: gamesWithOrders.length,
        settledGames: results.length,
        results
      };
      
    } catch (error) {
      console.error('❌ 전체 자동 정산 중 오류:', error);
      throw error;
    }
  }
}

export default new ExchangeSettlementService(); 