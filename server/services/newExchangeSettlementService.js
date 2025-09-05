import GameResult from '../models/gameResultModel.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
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
      newBalance += winnings;
      
      // 잔액 업데이트
      await user.update({ balance: newBalance });
      
      // PaymentHistory 기록
      await PaymentHistory.create({
        userId: user.id,
        amount: winnings,
        type: 'Exchange 정산',
        description: `Exchange 주문 정산 - ${gameResult.homeTeam} vs ${gameResult.awayTeam}`,
        balanceAfter: newBalance,
        relatedOrderId: order.id
      });
      
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
}

export default NewExchangeSettlementService;
