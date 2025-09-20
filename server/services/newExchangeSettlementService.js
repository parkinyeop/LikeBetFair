import GameResult from '../models/gameResultModel.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import AdminCommission from '../models/adminCommissionModel.js';
import CommissionSettingsService from './commissionSettingsService.js';
import { Op } from 'sequelize';
import teamMatchingService from './teamMatchingService.js';

/**
 * 새로운 Exchange 정산 서비스
 * - 경기 시간(UTC) + 홈팀명 + 어웨이팀명으로 매칭
 * - gameResultId는 보조적 수단으로만 사용
 */
class NewExchangeSettlementService {
  constructor() {
    this.teamMatching = teamMatchingService;
  }

  /**
   * 완료된 경기의 모든 매칭 주문 자동 정산
   * @param {string} gameResultId - 정산할 경기 ID (선택사항)
   * @returns {Object} 정산 결과
   */
  async settleAllFinishedGames(gameResultId = null) {
    console.log('🎯 새로운 정산 시스템 시작...');
    
    // 완료된 경기들 조회
    const whereCondition = { status: 'finished' };
    if (gameResultId) {
      whereCondition.id = gameResultId;
    }
    
    const finishedGames = await GameResult.findAll({
      where: whereCondition,
      order: [['commenceTime', 'DESC']]
    });
    
    console.log(`📊 정산 대상 경기 수: ${finishedGames.length}`);
    
    if (finishedGames.length === 0) {
      return { message: '정산할 완료된 경기가 없습니다.', settledGames: 0 };
    }
    
    let totalSettledGames = 0;
    let totalSettledOrders = 0;
    const results = [];
    
    for (const game of finishedGames) {
      try {
        console.log(`\n🏆 경기 정산 시작: ${game.homeTeam} vs ${game.awayTeam} (${game.commenceTime})`);
        
        const gameResult = await this.settleGameByMatching(game);
        
        if (gameResult.settledOrders > 0) {
          totalSettledGames++;
          totalSettledOrders += gameResult.settledOrders;
          results.push(gameResult);
          
          console.log(`✅ 경기 정산 완료: ${gameResult.settledOrders}개 주문 정산`);
        } else {
          console.log(`⚠️ 경기 정산 대상 주문 없음`);
        }
        
      } catch (error) {
        console.error(`❌ 경기 정산 실패: ${game.homeTeam} vs ${game.awayTeam}`, error.message);
      }
    }
    
    console.log(`\n🎉 전체 정산 완료: ${totalSettledGames}개 경기, ${totalSettledOrders}개 주문`);
    
    return {
      message: '정산이 완료되었습니다.',
      settledGames: totalSettledGames,
      settledOrders: totalSettledOrders,
      results
    };
  }

  /**
   * 팀명 매칭으로 경기 정산
   * @param {Object} gameResult - 경기 결과
   * @returns {Object} 정산 결과
   */
  async settleGameByMatching(gameResult) {
    console.log(`🔍 매칭 주문 검색: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
    
    // 매칭된 상태의 모든 Exchange 주문 조회
    const matchedOrders = await ExchangeOrder.findAll({
      where: {
        status: { [Op.in]: ['matched', 'partially_matched'] },
        settledAt: null
      },
      order: [['createdAt', 'ASC']]
    });
    
    console.log(`📋 전체 매칭 주문 수: ${matchedOrders.length}`);
    
    // 팀명 매칭으로 해당 경기 주문들 필터링
    const gameOrders = [];
    for (const order of matchedOrders) {
      const matchingInfo = this.teamMatching.getMatchingInfo(order, gameResult);
      
      if (matchingInfo.overallMatch) {
        console.log(`✅ 주문 매칭: ${order.homeTeam} vs ${order.awayTeam} (ID: ${order.id})`);
        console.log(`   홈팀 유사도: ${matchingInfo.homeSimilarity.toFixed(2)}`);
        console.log(`   어웨이팀 유사도: ${matchingInfo.awaySimilarity.toFixed(2)}`);
        
        gameOrders.push({
          ...order.toJSON(),
          matchingInfo
        });
      }
    }
    
    console.log(`🎯 매칭된 주문 수: ${gameOrders.length}`);
    
    if (gameOrders.length === 0) {
      return {
        gameId: gameResult.id,
        homeTeam: gameResult.homeTeam,
        awayTeam: gameResult.awayTeam,
        settledOrders: 0,
        message: '매칭된 주문이 없습니다.'
      };
    }
    
    // 정산 실행
    return await this.executeSettlement(gameResult, gameOrders);
  }

  /**
   * 실제 정산 실행
   * @param {Object} gameResult - 경기 결과
   * @param {Array} orders - 정산할 주문들
   * @returns {Object} 정산 결과
   */
  async executeSettlement(gameResult, orders) {
    console.log(`💰 정산 실행: ${orders.length}개 주문`);
    
    let settledCount = 0;
    let totalWinnings = 0;
    const settlementResults = [];
    
    for (const order of orders) {
      try {
        const result = await this.settleOrder(order, gameResult);
        
        if (result.success) {
          settledCount++;
          totalWinnings += result.winnings || 0;
          settlementResults.push(result);
          
          console.log(`✅ 주문 정산: ID ${order.id}, 수익: ${result.winnings || 0}원`);
        } else {
          console.log(`⚠️ 주문 정산 실패: ID ${order.id}, ${result.error}`);
        }
        
      } catch (error) {
        console.error(`❌ 주문 정산 오류: ID ${order.id}`, error.message);
      }
    }
    
    return {
      gameId: gameResult.id,
      homeTeam: gameResult.homeTeam,
      awayTeam: gameResult.awayTeam,
      commenceTime: gameResult.commenceTime,
      settledOrders: settledCount,
      totalWinnings,
      results: settlementResults
    };
  }

  /**
   * 개별 주문 정산
   * @param {Object} order - Exchange 주문
   * @param {Object} gameResult - 경기 결과
   * @returns {Object} 정산 결과
   */
  async settleOrder(order, gameResult) {
    try {
      // 승자 결정
      const winner = this.determineWinner(gameResult);
      if (!winner) {
        return { success: false, error: '경기 결과에서 승자를 결정할 수 없습니다.' };
      }
      
      // 주문 결과 결정
      const orderResult = this.determineOrderResult(order, winner, gameResult);
      
      // 정산 실행
      const settlement = await this.processSettlement(order, orderResult, gameResult);
      
      return {
        success: true,
        orderId: order.id,
        orderResult,
        winnings: settlement.winnings,
        settlement
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 경기 결과에서 승자 결정
   * @param {Object} gameResult - 경기 결과
   * @returns {string|null} 승자 ('home' | 'away' | 'draw' | null)
   */
  determineWinner(gameResult) {
    if (!gameResult.scores || !Array.isArray(gameResult.scores)) {
      return null;
    }
    
    const homeScore = parseInt(gameResult.scores[0]?.score) || 0;
    const awayScore = parseInt(gameResult.scores[1]?.score) || 0;
    
    if (homeScore > awayScore) return 'home';
    if (awayScore > homeScore) return 'away';
    if (homeScore === awayScore) return 'draw';
    
    return null;
  }

  /**
   * 배팅 선택과 경기 결과 매칭 확인
   * @param {string} selection - 배팅 선택
   * @param {string} winner - 경기 승자
   * @param {string} homeTeam - 홈팀명
   * @param {string} awayTeam - 어웨이팀명
   * @returns {boolean} 선택이 맞는지 여부
   */
  isSelectionCorrect(selection, winner, homeTeam, awayTeam) {
    if (!selection) return false;
    
    // 무승부 처리
    if (selection === '무승부' || selection === 'Draw') {
      return winner === 'draw';
    }
    
    // 정확한 팀명 매칭
    if (selection === homeTeam) {
      return winner === 'home';
    } else if (selection === awayTeam) {
      return winner === 'away';
    }
    
    // 팀명 유사도 매칭 (teamMatchingService 활용)
    const homeMatch = this.teamMatching.isTeamMatch(selection, homeTeam);
    if (homeMatch) {
      return winner === 'home';
    }
    
    const awayMatch = this.teamMatching.isTeamMatch(selection, awayTeam);
    if (awayMatch) {
      return winner === 'away';
    }
    
    return false;
  }

  /**
   * 주문 결과 결정
   * @param {Object} order - Exchange 주문
   * @param {string} winner - 승자
   * @param {Object} gameResult - 경기 결과
   * @returns {string} 주문 결과 ('won' | 'lost')
   */
  determineOrderResult(order, winner, gameResult) {
    const isCorrect = this.isSelectionCorrect(
      order.selection,
      winner,
      gameResult.homeTeam,
      gameResult.awayTeam
    );
    
    if (order.side === 'back') {
      return isCorrect ? 'won' : 'lost';
    } else if (order.side === 'lay') {
      return isCorrect ? 'lost' : 'won';
    }
    
    return 'lost';
  }

  /**
   * 정산 처리
   * @param {Object} order - Exchange 주문
   * @param {string} orderResult - 주문 결과
   * @param {Object} gameResult - 경기 결과
   * @returns {Object} 정산 정보
   */
  async processSettlement(order, orderResult, gameResult) {
    const user = await User.findByPk(order.userId);
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }
    
    let winnings = 0;
    let newBalance = user.balance;
    
    if (orderResult === 'won') {
      // 승리: 잠재 수익을 실제 수익으로
      winnings = order.potentialProfit || 0;
      
      // 🆕 익스체인지 수수료 계산 및 차감 (Lay 주문 승리 시에만)
      let netWinnings = Number(winnings);
      let commissionAmount = 0;
      
      // Back 주문은 승리 시에도 수수료 차감하지 않음, Lay 주문만 승리 시 수수료 차감
      if (order.side === 'lay') { // Lay 주문 승리 시에만 수수료 차감
        const exchangeCommissionRate = await CommissionSettingsService.getCommissionRate('exchange');
        commissionAmount = CommissionSettingsService.calculateCommission(
          winnings, 
          order.stakeAmount || order.stake, 
          exchangeCommissionRate
        );
        
        // 실제 지급할 금액 (수수료 차감 후)
        netWinnings = Number(winnings) - Number(commissionAmount);
        
        console.log(`[익스체인지 Lay 주문 수수료] 주문 ${order.id}: 수익 ${winnings}원, 수수료 ${commissionAmount}원 (${(exchangeCommissionRate * 100).toFixed(2)}%), 실제 지급 ${netWinnings}원`);
      } else if (order.side === 'back') {
        console.log(`[익스체인지 Back 주문 승리] 주문 ${order.id}: 수익 ${winnings}원 (수수료 없음)`);
      }
      
      newBalance = Number(newBalance) + Number(netWinnings);
      
      // 잔액 업데이트
      await user.update({ balance: newBalance });
      
      // 🆕 수수료가 있는 경우 AdminCommission 기록
      if (commissionAmount > 0) {
        const exchangeCommissionRate = await CommissionSettingsService.getCommissionRate('exchange');
        await AdminCommission.create({
          adminId: 'fb4b780d-c7c0-4112-90fd-f7ca85427a90', // admin 사용자 ID
          userId: user.id,
          betId: null, // 익스체인지는 betId 사용하지 않음
          exchangeOrderId: order.id, // Exchange 주문 ID
          betAmount: order.stakeAmount || order.stake,
          winAmount: winnings,
          commissionRate: exchangeCommissionRate,
          commissionAmount: commissionAmount,
          status: 'paid',
          paidAt: new Date(),
          type: 'exchange' // 익스체인지 수수료 구분
        });
        
        // 🆕 수수료 차감 기록을 PaymentHistory에 저장
        await PaymentHistory.create({
          userId: user.id,
          betId: `exchange-${order.id}`,
          amount: -commissionAmount, // 음수로 수수료 차감 표시
          memo: `익스체인지 수수료 (${(exchangeCommissionRate * 100).toFixed(2)}%)`,
          balanceAfter: newBalance,
          paidAt: new Date()
        });
        
        console.log(`[익스체인지 수수료 차감] 주문 ${order.id}: ${commissionAmount}원 차감 (${(exchangeCommissionRate * 100).toFixed(2)}%)`);
      }
      
      // 🆕 실제 상금 지급 기록
      await PaymentHistory.create({
        userId: user.id,
        betId: `exchange-${order.id}`,
        amount: netWinnings,
        memo: order.side === 'back' 
          ? `Exchange Back 주문 정산 - ${gameResult.homeTeam} vs ${gameResult.awayTeam} (수수료 없음)`
          : `Exchange Lay 주문 정산 - ${gameResult.homeTeam} vs ${gameResult.awayTeam} (수수료 차감 후)`,
        balanceAfter: newBalance,
        paidAt: new Date()
      });
      
      // 🆕 추천인 수수료 지급 로직
      if (user.referredBy) {
        await this.processReferralCommission(user, order, winnings);
      }
      
      if (order.side === 'back') {
        console.log(`[익스체인지 Back 정산] 주문 ${order.id}: 총 ${winnings}원 (수수료 없음)`);
      } else {
        console.log(`[익스체인지 Lay 정산] 주문 ${order.id}: 총 ${winnings}원 → 수수료 ${commissionAmount}원 차감 → 실제 지급 ${netWinnings}원`);
      }
      
    } else {
      // 패배: 추가 처리 없음 (이미 리스크 금액은 차감됨)
      winnings = 0;
    }
    
    // 주문 상태 업데이트
    await order.update({
      status: 'settled',
      settledAt: new Date(),
      settlementResult: orderResult,
      winnings: winnings
    });
    
    return {
      winnings,
      newBalance,
      orderResult,
      settledAt: new Date()
    };
  }

  /**
   * 정산 가능한 주문 조회 (디버깅용)
   * @param {string} gameResultId - 경기 ID
   * @returns {Array} 정산 가능한 주문들
   */
  async getSettlableOrders(gameResultId) {
    const gameResult = await GameResult.findByPk(gameResultId);
    if (!gameResult) {
      return [];
    }
    
    const matchedOrders = await ExchangeOrder.findAll({
      where: {
        status: { [Op.in]: ['matched', 'partially_matched'] },
        settledAt: null
      }
    });
    
    const settlableOrders = [];
    for (const order of matchedOrders) {
      const matchingInfo = this.teamMatching.getMatchingInfo(order, gameResult);
      if (matchingInfo.overallMatch) {
        settlableOrders.push({
          ...order.toJSON(),
          matchingInfo
        });
      }
    }
    
    return settlableOrders;
  }

  // 🆕 익스체인지용 추천인 수수료 지급 처리
  async processReferralCommission(user, order, adjustedWinnings) {
    try {
      // ReferralCode 테이블에서 추천인 정보 조회
      const ReferralCode = (await import('../models/referralCodeModel.js')).default;
      const referralCode = await ReferralCode.findOne({
        where: { 
          code: user.referredBy, 
          isActive: true 
        }
      });

      if (!referralCode) {
        console.log(`[익스체인지 추천인 수수료] 추천코드 '${user.referredBy}'를 찾을 수 없거나 비활성화됨`);
        return;
      }

      // 추천인 사용자 조회
      const referrerUser = await User.findByPk(referralCode.adminId);

      if (!referrerUser) {
        console.log(`[익스체인지 추천인 수수료] 추천인 사용자 ID '${referralCode.adminId}'를 찾을 수 없음`);
        return;
      }

      // 추천인 수수료 계산 (승리 금액의 5%)
      const referralCommissionRate = referralCode.commissionRate || 0.05;
      const referralCommissionAmount = Math.floor(adjustedWinnings * referralCommissionRate);

      if (referralCommissionAmount <= 0) {
        console.log(`[익스체인지 추천인 수수료] 수수료 금액이 0원 이하: ${referralCommissionAmount}원`);
        return;
      }

      // 추천인 잔액 증가
      referrerUser.balance = Number(referrerUser.balance) + Number(referralCommissionAmount);
      await referrerUser.save();

      // 추천인 수수료 기록을 AdminCommission에 저장
      await AdminCommission.create({
        adminId: referrerUser.id,
        userId: user.id,
        betId: null, // 익스체인지는 betId 사용하지 않음
        exchangeOrderId: order.id, // Exchange 주문 ID
        betAmount: order.stakeAmount || order.stake,
        winAmount: adjustedWinnings,
        commissionRate: referralCommissionRate,
        commissionAmount: referralCommissionAmount,
        status: 'paid',
        paidAt: new Date(),
        type: 'referral' // 추천인 수수료 구분
      });

      // 추천인에게 지급된 수수료 기록을 PaymentHistory에 저장
      await PaymentHistory.create({
        userId: referrerUser.id,
        betId: `exchange-${order.id}`,
        amount: referralCommissionAmount,
        memo: `익스체인지 추천인 수수료 (${user.email} 주문 승리, ${(referralCommissionRate * 100).toFixed(2)}%)`,
        balanceAfter: referrerUser.balance,
        paidAt: new Date()
      });

      // 추천코드 사용자 수 증가
      await referralCode.incrementUserCount();

      console.log(`[익스체인지 추천인 수수료] 주문 ${order.id}: 추천인 ${referrerUser.email}에게 ${referralCommissionAmount}원 지급 (${(referralCommissionRate * 100).toFixed(2)}%)`);

    } catch (error) {
      console.error(`[익스체인지 추천인 수수료] 처리 중 오류 발생:`, error);
      // 추천인 수수료 처리 실패는 전체 정산 처리를 중단시키지 않음
    }
  }
}

export default NewExchangeSettlementService;
