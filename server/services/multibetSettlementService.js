import ExchangeOrder from '../models/exchangeOrderModel.js';
import ExchangeOrderMatch from '../models/exchangeOrderMatchModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import User from '../models/userModel.js';
import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';
import sequelize from '../models/sequelize.js';
import directMatchingService from './directMatchingService.js';

/**
 * 멀티배팅 전용 정산 서비스
 * 모든 경기 결과를 종합하여 멀티배팅 정산 처리
 */
class MultibetSettlementService {
  
  /**
   * 멀티배팅 주문 정산 (부분 매칭 상관없이 그룹으로 처리)
   * @param {Object} order - 멀티배팅 주문
   * @returns {Object} 정산 결과
   */
  async settleMultibetOrder(order) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🎯 멀티배팅 정산 시작: 주문 ${order.id}`);
      console.log(`   상태: ${order.status}, 부분매칭: ${order.partiallyFilled}, 체결: ${order.filledAmount}, 잔여: ${order.remainingAmount}`);

      if (!order.isMultibet) {
        throw new Error('멀티배팅 주문이 아닙니다.');
      }

      if (!order.selectionDetails?.selections) {
        throw new Error('선택된 경기가 없습니다.');
      }

      // 🆕 매치 여부 확인
      const hasMatches = await this.checkOrderMatches(order.id);
      if (!hasMatches) {
        console.log(`⚠️ 매치되지 않은 주문: ${order.id} - 만료 취소 처리`);
        await this.processUnmatchedOrderCancellation(order, transaction);
        await transaction.commit();
        return { message: 'Unmatched order cancelled', orderId: order.id };
      }

      console.log(`📋 선택된 경기: ${order.selectionDetails.selections.length}개 (매치된 주문 정산)`);

      // 이미 정산된 경우 스킵
      if (order.status === 'settled') {
        console.log(`⚠️ 이미 정산된 주문: ${order.id}`);
        await transaction.commit();
        return { message: 'Already settled', orderId: order.id };
      }
      
      // 1. 모든 경기 결과 수집
      const gameResults = await this.collectAllGameResults(order.selectionDetails.selections);
      console.log(`📊 수집된 경기 결과: ${gameResults.length}개`);
      
      // 2. 멀티배팅 승패 판정
      const settlementResult = this.determineMultibetResult(gameResults);
      console.log(`🏆 멀티배팅 판정: ${settlementResult.finalResult}`);
      
      // 3. 정산 처리
      const settlement = await this.processMultibetSettlement(order, settlementResult, transaction);
      
      await transaction.commit();
      
      console.log(`✅ 멀티배팅 정산 완료: 주문 ${order.id}`);
      
      return settlement;
      
    } catch (error) {
      await transaction.rollback();
      console.error(`❌ 멀티배팅 정산 실패: 주문 ${order.id}`, error);
      throw error;
    }
  }
  
  /**
   * 주문의 매치 여부 확인
   * @param {number} orderId - 주문 ID
   * @returns {boolean} 매치 여부
   */
  async checkOrderMatches(orderId) {
    const matches = await ExchangeOrderMatch.findAll({
      where: {
        [Op.or]: [
          { originalOrderId: orderId },
          { matchingOrderId: orderId }
        ],
        status: 'active'
      }
    });
    
    console.log(`🔍 주문 ${orderId} 매치 확인: ${matches.length}개 매치`);
    return matches.length > 0;
  }
  
  /**
   * 매치되지 않은 주문 취소 처리
   * @param {Object} order - 주문
   * @param {Object} transaction - 트랜잭션
   */
  async processUnmatchedOrderCancellation(order, transaction) {
    console.log(`🔄 매치되지 않은 주문 취소 처리: ${order.id}`);
    
    // 1. 주문 상태를 cancelled로 변경
    await order.update({
      status: 'cancelled',
      settlementNote: '매치되지 않아 만료 취소',
      settledAt: new Date()
    }, { transaction });
    
    // 2. 사용자 잔액 환불
    const user = await User.findByPk(order.userId, { transaction });
    const refundAmount = order.stakeAmount || order.amount;
    const currentBalance = parseFloat(user.balance) || 0;
    const newBalance = currentBalance + refundAmount;
    
    await user.update({ balance: newBalance }, { transaction });
    
    // 3. 환불 내역 기록
    await PaymentHistory.create({
      userId: order.userId,
      betId: `EXCHANGE_${order.id}`,
      amount: refundAmount,
      type: 'refund',
      memo: `Exchange 멀티배팅 주문 만료로 인한 자동 환불 (매치되지 않음)`,
      status: 'completed',
      balanceAfter: newBalance,
      paidAt: new Date()
    }, { transaction });
    
    console.log(`✅ 매치되지 않은 주문 취소 완료: ${order.id} - 환불: ${refundAmount}원`);
  }
  
  /**
   * 모든 경기 결과 수집
   * @param {Array} selections - 선택된 경기들
   * @returns {Array} 경기 결과 배열
   */
  async collectAllGameResults(selections) {
    const gameResults = [];
    
    for (const [index, selection] of selections.entries()) {
      console.log(`🔍 경기 ${index + 1}/${selections.length} 결과 수집: ${selection.homeTeam} vs ${selection.awayTeam}`);
      
      try {
        const gameResult = await this.findGameResult(selection);
        
        gameResults.push({
          selection,
          gameResult,
          index: index + 1
        });
        
        console.log(`   결과: ${gameResult ? gameResult.result || 'pending' : 'not_found'}`);
        
      } catch (error) {
        console.error(`   오류: ${error.message}`);
        gameResults.push({
          selection,
          gameResult: null,
          error: error.message,
          index: index + 1
        });
      }
    }
    
    return gameResults;
  }
  
  /**
   * 개별 경기 결과 찾기 (기존 DirectMatchingService 활용)
   * @param {Object} selection - 선택된 경기
   * @returns {Object|null} 경기 결과
   */
  async findGameResult(selection) {
    const { homeTeam, awayTeam, commenceTime } = selection;
    
    console.log(`🔍 경기 검색: ${homeTeam} vs ${awayTeam} (${commenceTime})`);
    
    // 기존 DirectMatchingService 사용
    const directMatching = directMatchingService;
    const gameResult = await directMatching.findMatchingGameResult(selection);
    
    if (!gameResult) {
      console.log(`   경기 결과를 찾을 수 없음`);
      return null;
    }
    
    // 경기 결과 판정
    const result = this.determineGameResult(gameResult, selection);
    console.log(`   경기 결과: ${result} (스코어: ${gameResult.homeScore}-${gameResult.awayScore})`);
    
    return {
      ...gameResult.toJSON(),
      result
    };
  }
  
  /**
   * 개별 경기 결과 판정
   * @param {Object} gameResult - 경기 결과 데이터
   * @param {Object} selection - 선택된 팀
   * @returns {string} 경기 결과 (won/lost/cancelled/pending)
   */
  determineGameResult(gameResult, selection) {
    const { status, homeScore, awayScore, result, score } = gameResult;
    const { team: selectedTeam } = selection;

    console.log(`   🔍 경기 결과 판정: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
    console.log(`      상태: ${status}, 결과: ${result}`);
    console.log(`      선택한 팀: ${selectedTeam}`);

    // 경기 취소/연기
    if (status === 'cancelled' || status === 'postponed') {
      console.log(`   ❌ 취소/연기된 경기`);
      return 'cancelled';
    }

    // finished + pending 패턴은 실제로 취소된 경기
    if (status === 'finished' && result === 'pending') {
      console.log(`   📋 finished+pending 패턴 감지 - 취소된 경기로 처리`);
      return 'pending'; // determineMultibetResult에서 cancelled로 변환됨
    }

    // 결과가 이미 판정된 경우 직접 사용
    if (status === 'finished' && result && result !== 'pending') {
      console.log(`   ✅ 기존 경기 결과 사용: ${result}`);

      // 선택한 팀이 홈팀인지 어웨이팀인지 확인
      const isHomeTeam = selectedTeam === gameResult.homeTeam ||
                        selectedTeam.includes(gameResult.homeTeam) ||
                        gameResult.homeTeam.includes(selectedTeam);

      console.log(`      홈팀 여부: ${isHomeTeam}`);

      if (result === 'home_win') {
        return isHomeTeam ? 'won' : 'lost';
      } else if (result === 'away_win') {
        return isHomeTeam ? 'lost' : 'won';
      } else if (result === 'draw') {
        return 'lost'; // 익스체인지에서 무승부는 보통 패배 처리
      }
    }

    // 스코어 기반 판정 (fallback)
    let actualHomeScore = homeScore;
    let actualAwayScore = awayScore;

    // score JSON에서 스코어 추출 시도
    if ((actualHomeScore === null || actualHomeScore === undefined) && score) {
      try {
        let scoreData;
        if (typeof score === 'string') {
          scoreData = JSON.parse(score);
        } else {
          scoreData = score;
        }

        if (Array.isArray(scoreData) && scoreData.length >= 2) {
          actualHomeScore = parseInt(scoreData[0].score);
          actualAwayScore = parseInt(scoreData[1].score);
          console.log(`      JSON 스코어 추출: ${actualHomeScore}-${actualAwayScore}`);
        }
      } catch (e) {
        console.log(`      JSON 스코어 파싱 실패: ${e.message}`);
      }
    }

    // 경기 미완료
    if (status !== 'finished' || actualHomeScore === null || actualAwayScore === null ||
        actualHomeScore === undefined || actualAwayScore === undefined || isNaN(actualHomeScore) || isNaN(actualAwayScore)) {
      console.log(`   ⏳ 경기 미완료 또는 스코어 없음`);
      return 'pending';
    }

    // 승부 판정
    const homeWon = actualHomeScore > actualAwayScore;
    const awayWon = actualAwayScore > actualHomeScore;
    const draw = actualHomeScore === actualAwayScore;

    console.log(`      스코어: ${actualHomeScore}-${actualAwayScore}, 홈승: ${homeWon}, 원정승: ${awayWon}, 무승부: ${draw}`);

    // 선택한 팀이 홈팀인지 어웨이팀인지 확인
    const isHomeTeam = selectedTeam === gameResult.homeTeam ||
                      selectedTeam.includes(gameResult.homeTeam) ||
                      gameResult.homeTeam.includes(selectedTeam);

    console.log(`      홈팀 여부: ${isHomeTeam}`);

    if (isHomeTeam) {
      if (homeWon) {
        console.log(`      ✅ 홈팀 승리!`);
        return 'won';
      }
      if (awayWon || draw) {
        console.log(`      ❌ 홈팀 패배`);
        return 'lost';
      }
    } else {
      if (awayWon) {
        console.log(`      ✅ 어웨이팀 승리!`);
        return 'won';
      }
      if (homeWon || draw) {
        console.log(`      ❌ 어웨이팀 패배`);
        return 'lost';
      }
    }

    console.log(`   ❓ 판정 불가`);
    return 'pending';
  }
  
  /**
   * 멀티배팅 최종 결과 판정
   * @param {Array} gameResults - 모든 경기 결과
   * @returns {Object} 정산 결과
   */
  determineMultibetResult(gameResults) {
    const results = gameResults.map(gr => gr.gameResult?.result || gr.result);

    // pending을 취소로 처리 (finished + pending 패턴은 실제로 취소된 경기)
    const normalizedResults = results.map(result => {
      if (result === 'pending') {
        console.log(`   📋 pending 결과를 cancelled로 처리 (취소된 경기)`);
        return 'cancelled';
      }
      return result;
    });

    const hasPending = normalizedResults.includes('pending');
    const hasCancelled = normalizedResults.includes('cancelled');
    const hasLost = normalizedResults.includes('lost');
    const allWon = normalizedResults.every(r => r === 'won');

    let finalResult;
    let reason;

    if (hasPending) {
      finalResult = 'pending';
      reason = '일부 경기가 아직 완료되지 않음';
    } else if (hasCancelled) {
      finalResult = 'cancelled';
      reason = '일부 경기가 취소됨 (pending 결과 포함)';
    } else if (hasLost) {
      finalResult = 'lost';
      reason = '일부 경기에서 패배';
    } else if (allWon) {
      finalResult = 'won';
      reason = '모든 경기에서 승리';
    } else {
      finalResult = 'pending';
      reason = '결과 판정 불가';
    }

    console.log(`🎯 멀티배팅 판정: ${finalResult} (${reason})`);
    console.log(`   원본 경기별 결과: ${results.join(', ')}`);
    console.log(`   정규화된 결과: ${normalizedResults.join(', ')}`);

    return {
      finalResult,
      reason,
      gameResults,
      summary: {
        total: normalizedResults.length,
        won: normalizedResults.filter(r => r === 'won').length,
        lost: normalizedResults.filter(r => r === 'lost').length,
        cancelled: normalizedResults.filter(r => r === 'cancelled').length,
        pending: normalizedResults.filter(r => r === 'pending').length
      }
    };
  }
  
  /**
   * 멀티배팅 정산 처리
   * @param {Object} order - 멀티배팅 주문
   * @param {Object} settlementResult - 정산 결과
   * @param {Object} transaction - 트랜잭션
   * @returns {Object} 정산 처리 결과
   */
  async processMultibetSettlement(order, settlementResult, transaction) {
    const { finalResult } = settlementResult;
    
    // 주문 상태 업데이트
    let orderStatus;
    if (finalResult === 'pending') {
      orderStatus = 'open'; // pending 대신 open 사용
    } else if (finalResult === 'cancelled') {
      orderStatus = 'cancelled';
    } else {
      orderStatus = 'settled';
    }
    
    const profit = await this.calculateProfit(order, finalResult);

    await order.update({
      status: orderStatus,
      settledAt: finalResult !== 'pending' ? new Date() : null,
      actualProfit: profit,
      profitLoss: profit
    }, { transaction });
    
    // 정산 결과에 따른 결제 처리
    if (finalResult !== 'pending') {
      await this.processPayment(order, finalResult, settlementResult, transaction);
    }

    const finalProfit = await this.calculateProfit(order, finalResult);

    return {
      orderId: order.id,
      finalResult,
      profit: finalProfit,
      gameResults: settlementResult.gameResults,
      summary: settlementResult.summary
    };
  }
  
  /**
   * 익스체인지 방식 수익/손실 계산 (매칭 테이블 기반)
   * @param {Object} order - 주문
   * @param {string} result - 최종 결과
   * @returns {number} 수익/손실 금액
   */
  async calculateExchangeProfit(order, result) {
    console.log(`💰 익스체인지 수익 계산 시작: 주문 ${order.id}, 결과: ${result}`);

    if (result === 'pending') {
      console.log(`⏳ 대기 중: 수익 0원`);
      return 0;
    }

    if (result === 'cancelled') {
      // 취소 시 체결된 금액 환불 (익스체인지도 동일)
      const effectiveAmount = order.filledAmount || order.stakeAmount || order.amount;
      console.log(`🔄 취소 환불: +${effectiveAmount} (체결된 금액 환불)`);
      return effectiveAmount;
    }

    // 매칭된 주문들을 조회하여 실제 수익/손실 계산
    const matches = await ExchangeOrderMatch.findAll({
      where: {
        originalOrderId: order.id,
        status: 'active'
      }
    });

    if (matches.length === 0) {
      console.log(`❌ 매칭 정보 없음: 수익 0원`);
      return 0;
    }

    let totalProfit = 0;

    for (const match of matches) {
      const matchedAmount = match.matchedAmount;
      const isBackSide = match.originalSide === 'back';

      if (result === 'won') {
        if (isBackSide) {
          // Back 승리: 매칭된 금액만큼 수익
          totalProfit += matchedAmount;
          console.log(`🏆 Back 승리 매칭: +${matchedAmount} (vs 주문 ${match.matchingOrderId})`);
        } else {
          // Lay 승리: 매칭된 금액 손실
          totalProfit -= matchedAmount;
          console.log(`💸 Lay 패배: -${matchedAmount} (vs 주문 ${match.matchingOrderId})`);
        }
      } else { // result === 'lost'
        if (isBackSide) {
          // Back 패배: 매칭된 금액 손실
          totalProfit -= matchedAmount;
          console.log(`💸 Back 패배: -${matchedAmount} (vs 주문 ${match.matchingOrderId})`);
        } else {
          // Lay 승리: 매칭된 금액만큼 수익
          totalProfit += matchedAmount;
          console.log(`🏆 Lay 승리 매칭: +${matchedAmount} (vs 주문 ${match.matchingOrderId})`);
        }
      }
    }

    console.log(`📊 총 수익/손실: ${totalProfit}원 (${matches.length}개 매칭 기준)`);
    return totalProfit;
  }

  /**
   * 수익/손실 계산 (호환성을 위한 래퍼 함수)
   * @param {Object} order - 주문
   * @param {string} result - 최종 결과
   * @returns {Promise<number>} 수익/손실 금액
   */
  async calculateProfit(order, result) {
    return await this.calculateExchangeProfit(order, result);
  }
  
  /**
   * 결제 처리
   * @param {Object} order - 주문
   * @param {string} result - 최종 결과
   * @param {Object} settlementResult - 정산 결과
   * @param {Object} transaction - 트랜잭션
   */
  async processPayment(order, result, settlementResult, transaction) {
    const user = await User.findByPk(order.userId, { transaction });
    const profit = await this.calculateProfit(order, result);
    
    // 이미 정산된 경우 중복 처리 방지
    const existingPayment = await PaymentHistory.findOne({
      where: {
        betId: `EXCHANGE_${order.id}`,
        memo: { [Op.like]: '%멀티배팅%' }
      },
      transaction
    });
    
    if (existingPayment) {
      console.log(`⚠️ 주문 ${order.id}는 이미 정산됨`);
      return;
    }
    
    // 사용자 잔액 업데이트 (숫자 타입 보장)
    const currentBalance = parseFloat(user.balance) || 0;
    const profitAmount = parseFloat(profit) || 0;
    user.balance = currentBalance + profitAmount;
    await user.save({ transaction });

    console.log(`💰 잔액 업데이트: ${currentBalance} + ${profitAmount} = ${user.balance}`);
    
    // 결제 내역 생성
    const memo = await this.generatePaymentMemo(order, result, settlementResult);
    
    await PaymentHistory.create({
      userId: order.userId,
      betId: `EXCHANGE_${order.id}`,
      amount: profit,
      balanceAfter: user.balance,
      memo: memo,
      paidAt: new Date()
    }, { transaction });
    
    console.log(`💰 결제 처리 완료: ${profit}원 (잔액: ${user.balance}원)`);
  }
  
  /**
   * 결제 메모 생성
   * @param {Object} order - 주문
   * @param {string} result - 최종 결과
   * @param {Object} settlementResult - 정산 결과
   * @returns {Promise<string>} 결제 메모
   */
  async generatePaymentMemo(order, result, settlementResult) {
    const { summary } = settlementResult;
    const gameCount = summary.total;
    const wonCount = summary.won;
    
    if (result === 'cancelled') {
      const refundAmount = await this.calculateProfit(order, result);
      return `Exchange 멀티배팅 취소 환불 (${gameCount}개 경기 중 ${summary.cancelled}개 취소) - 환불: ${refundAmount}원`;
    } else if (result === 'won') {
      const profit = await this.calculateProfit(order, result);
      return `Exchange 멀티배팅 승리 수익 (${gameCount}개 경기 모두 승리) - 수익: ${profit}원`;
    } else {
      const profit = await this.calculateProfit(order, result);
      return `Exchange 멀티배팅 패배 손실 (${gameCount}개 경기 중 ${wonCount}개 승리) - 손실: ${Math.abs(profit)}원`;
    }
  }
  
}

export default new MultibetSettlementService();
