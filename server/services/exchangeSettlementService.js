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
      
      // 🆕 정산 대상 주문들 조회 (매칭된 상태 + 부분 매칭된 상태의 주문들)
      const orders = await ExchangeOrder.findAll({
        where: {
          gameResultId: gameResultId,
          status: { [Op.in]: ['matched', 'partially_matched'] },  // 🆕 부분 매칭 포함
          settledAt: null  // 아직 정산되지 않은 주문들
        },
        transaction
      });
      
      console.log(`📋 정산 대상 주문 수: ${orders.length}`);
      
      // 🆕 연결된 주문들도 함께 조회 (matchedOrderId가 있는 주문들 + 부분 매칭된 주문들)
      const connectedOrders = await ExchangeOrder.findAll({
        where: {
          gameResultId: gameResultId,
          status: { [Op.in]: ['matched', 'partially_matched'] },  // 🆕 부분 매칭 포함
          settledAt: null
        },
        transaction
      });
      
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
      
      await transaction.commit();
      
      const summary = {
        gameId: gameResultId,
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
    
    // 1. matchedOrderId가 있는 주문들 먼저 처리
    for (const order of orders) {
      if (processedIds.has(order.id)) continue;
      
      if (order.matchedOrderId) {
        // 매칭된 상대 주문 찾기
        const matchedOrder = orders.find(o => 
          o.id === order.matchedOrderId && !processedIds.has(o.id)
        );
        
        if (matchedOrder) {
          pairs.push([order, matchedOrder]);
          processedIds.add(order.id);
          processedIds.add(matchedOrder.id);
          console.log(`   ✅ 쌍 생성: ${order.id} ↔ ${matchedOrder.id} (${order.side} ↔ ${matchedOrder.side})`);
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
    
    // 수익 계산 (부분 매칭 고려)
    const backWinAmount = isBackWin ? 
      (backStakeAmount * (backOrder.price - 1)) : -backStakeAmount;
    const layWinAmount = isBackWin ? 
      -(layStakeAmount * (layOrder.price - 1)) : layStakeAmount;
    
    console.log(`  💰 수익 계산 (부분 매칭 고려):`);
    console.log(`    Back 주문: ${backWinAmount > 0 ? '+' : ''}${backWinAmount} (체결: ${backStakeAmount}원)`);
    console.log(`    Lay 주문: ${layWinAmount > 0 ? '+' : ''}${layWinAmount} (체결: ${layStakeAmount}원)`);
    
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
      
      // 🆕 남은 금액이 있다면 취소 처리
      if (layOrder.remainingAmount > 0) {
        await this.cancelRemainingAmount(layOrder, transaction);
      }
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
    
    const previousBalance = parseFloat(user.balance);
    const newBalance = previousBalance + amount;
    
    await user.update({ balance: newBalance }, { transaction });
    
    // 🆕 개선된 결제 내역 메모 생성
    const isPartialMatch = order.partiallyFilled;
    const matchType = isPartialMatch ? '부분 매칭' : '완전 매칭';
    const matchAmount = isPartialMatch ? `(체결: ${order.filledAmount}원)` : '';
    
    let memo = '';
    if (amount > 0) {
      memo = `Exchange ${matchType} 베팅 승리 수익 ${matchAmount}`;
    } else {
      memo = `Exchange ${matchType} 베팅 손실 ${matchAmount}`;
    }
    
    memo += ` - ${order.side.toUpperCase()}: ${order.selection}, ` +
            `경기: ${gameResult.homeTeam} vs ${gameResult.awayTeam}, ` +
            `배당: ${order.price}배, ` +
            `결과: ${gameResult.result}`;
    
    // 결제 내역 생성
    await PaymentHistory.create({
      userId,
      betId: null, // Exchange 주문은 Bet 테이블과 연결되지 않음
      amount,
      memo,
      paidAt: new Date(),
      balanceAfter: newBalance
    }, { transaction });
    
    console.log(`      💳 ${userId}: ${previousBalance} → ${newBalance} (${amount > 0 ? '+' : ''}${amount})`);
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
           `결과: ${gameResult.result}`;
  }

  /**
   * 🆕 특정 경기의 정산 가능한 주문 조회 (부분 매칭 포함)
   */
  async getSettlableOrders(gameResultId) {
    return await ExchangeOrder.findAll({
      where: {
        gameResultId,
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
      
      // 1. 남은 금액을 0으로 설정하고 상세한 정산 메모 생성
      const detailedNote = this.generateDetailedPartialMatchingNote(order);
      await order.update({
        remainingAmount: 0,
        settlementNote: detailedNote
      }, { transaction });
      
      // 2. 사용자 잔액에 남은 금액 환불
      const user = await User.findByPk(order.userId, { transaction });
      const currentBalance = parseFloat(user.balance);
      const newBalance = currentBalance + order.remainingAmount;
      
      await user.update({ balance: newBalance }, { transaction });
      
      // 3. 환불 내역 기록 (상세한 메모 포함)
      const refundMemo = this.generateDetailedRefundMemo(order);
      await PaymentHistory.create({
        userId: order.userId,
        betId: null,
        amount: order.remainingAmount,
        type: 'refund',
        memo: refundMemo,
        status: 'completed',
        balanceAfter: newBalance,
        paidAt: new Date()
      }, { transaction });
      
      console.log(`    ✅ 남은 금액 취소 완료 - 환불: ${order.remainingAmount}원, 새 잔액: ${newBalance}원`);
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
   * @returns {string} 상세한 환불 메모
   */
  generateDetailedRefundMemo(order) {
    return `부분 매칭 후 남은 금액 자동 환불 - ${order.homeTeam} vs ${order.awayTeam} (${order.side} ${order.selection}) - 체결: ${(order.filledAmount || 0).toLocaleString()}원, 환불: ${(order.remainingAmount || 0).toLocaleString()}원`;
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

  /**
   * 연결된 모든 매칭 주문들을 경기별로 그룹화하여 정산
   * @returns {Object} 정산 결과 요약
   */
  async settleAllConnectedOrders() {
    try {
      console.log('🎯 연결된 모든 매칭 주문 정산 시작...');
      
      // 1. 연결된 모든 매칭 주문들 조회
      const allMatchedOrders = await ExchangeOrder.findAll({
        where: { 
          status: 'matched',
          settledAt: null  // 아직 정산되지 않은 주문들
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
      for (const pair of allPairs) {
        const [order1, order2] = pair;
        const gameResultId = order1.gameResultId || order2.gameResultId;
        
        if (gameResultId) {
          if (!pairsByGame[gameResultId]) {
            pairsByGame[gameResultId] = [];
          }
          pairsByGame[gameResultId].push(pair);
        }
      }
      
      console.log(`🎯 정산 대상 경기 수: ${Object.keys(pairsByGame).length}개`);
      
      // 4. 각 경기별로 정산 실행
      let totalSettled = 0;
      let totalWinnings = 0;
      const allSettlementResults = [];
      
      for (const [gameResultId, pairs] of Object.entries(pairsByGame)) {
        try {
          // GameResult 정보 조회
          const gameResult = await GameResult.findByPk(gameResultId);
          if (!gameResult) {
            console.log(`⚠️ GameResult ${gameResultId}를 찾을 수 없습니다.`);
            continue;
          }
          
          console.log(`\n🏟️ 경기 정산 시작: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
          console.log(`   📊 결과: ${gameResult.result}, 스코어: ${JSON.stringify(gameResult.score)}`);
          console.log(`   🤝 정산할 쌍 수: ${pairs.length}개`);
          
          // 각 쌍에 대해 정산 실행
          for (const pair of pairs) {
            try {
              const result = await this.settlePair(pair, gameResult, null); // transaction 없이
              totalSettled += 2; // back + lay 주문
              totalWinnings += result.totalWinnings || 0;
              allSettlementResults.push(result);
              
              console.log(`   ✅ 주문 쌍 정산 완료: ${result.winnerSide} 승리, 수익: ${result.totalWinnings}`);
              
            } catch (error) {
              console.error(`   ❌ 주문 쌍 정산 실패:`, error.message);
            }
          }
          
        } catch (error) {
          console.error(`   ❌ 경기 ${gameResultId} 정산 실패:`, error.message);
        }
      }
      
      // 5. 정산 결과 요약
      const summary = {
        totalSettled,
        totalWinnings,
        results: allSettlementResults
      };
      
      console.log('\n🎉 모든 연결된 주문 정산 완료!');
      console.log(`📊 총 정산된 주문: ${totalSettled}개`);
      console.log(`💰 총 수익: ${totalWinnings.toLocaleString()}원`);
      
      return summary;
      
    } catch (error) {
      console.error('❌ 모든 연결된 주문 정산 실패:', error.message);
      throw error;
    }
  }
}

export default ExchangeSettlementService; 