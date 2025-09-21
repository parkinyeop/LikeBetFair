/**
 * 스포츠북 평균 환수율 계산 서비스
 * OddsCache 데이터를 기반으로 스포츠북의 평균 환수율을 계산
 */

import OddsCache from '../models/oddsCacheModel.js';
import { Op } from 'sequelize';

class SportsbookPayoutRateService {
  
  /**
   * 전체 스포츠북 평균 환수율 계산
   * @returns {Object} 평균 환수율 정보
   */
  static async getOverallAveragePayoutRate() {
    try {
      console.log('[SportsbookPayoutRate] 전체 평균 환수율 계산 시작...');
      
      // 최근 24시간 내의 모든 OddsCache 데이터 조회
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const oddsData = await OddsCache.findAll({
        where: {
          createdAt: {
            [Op.gte]: twentyFourHoursAgo
          }
        },
        order: [['createdAt', 'DESC']]
      });

      if (!oddsData || oddsData.length === 0) {
        return {
          averagePayoutRate: null,
          gameCount: 0,
          totalMarkets: 0,
          message: '최근 24시간 내 배당률 데이터가 없습니다.'
        };
      }

      let totalPayoutRates = [];
      let totalGames = 0;
      let totalMarkets = 0;

      for (const odds of oddsData) {
        const gamePayoutRates = this.calculateGamePayoutRates(odds);
        if (gamePayoutRates.length > 0) {
          totalPayoutRates.push(...gamePayoutRates);
          totalGames++;
          totalMarkets += gamePayoutRates.length;
        }
      }

      if (totalPayoutRates.length === 0) {
        return {
          averagePayoutRate: null,
          gameCount: 0,
          totalMarkets: 0,
          message: '유효한 배당률 데이터가 없습니다.'
        };
      }

      // 전체 평균 환수율 계산
      const overallAverage = totalPayoutRates.reduce((sum, rate) => sum + rate, 0) / totalPayoutRates.length;
      
      console.log(`[SportsbookPayoutRate] 전체 평균 환수율 계산 완료: ${(overallAverage * 100).toFixed(2)}%`);
      
      return {
        averagePayoutRate: parseFloat(overallAverage.toFixed(4)),
        gameCount: totalGames,
        totalMarkets: totalMarkets,
        message: `최근 24시간 ${totalGames}개 경기, ${totalMarkets}개 마켓 기준`
      };

    } catch (error) {
      console.error('[SportsbookPayoutRate] 전체 평균 환수율 계산 오류:', error);
      return {
        averagePayoutRate: null,
        gameCount: 0,
        totalMarkets: 0,
        message: '평균 환수율 계산 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 특정 스포츠의 평균 환수율 계산
   * @param {string} sportKey - 스포츠 키
   * @returns {Object} 스포츠별 평균 환수율 정보
   */
  static async getSportAveragePayoutRate(sportKey) {
    try {
      console.log(`[SportsbookPayoutRate] ${sportKey} 평균 환수율 계산 시작...`);
      
      // 최근 24시간 내의 해당 스포츠 데이터 조회
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const oddsData = await OddsCache.findAll({
        where: {
          sportKey: sportKey,
          createdAt: {
            [Op.gte]: twentyFourHoursAgo
          }
        },
        order: [['createdAt', 'DESC']]
      });

      if (!oddsData || oddsData.length === 0) {
        return {
          averagePayoutRate: null,
          gameCount: 0,
          totalMarkets: 0,
          sportKey: sportKey,
          message: `${sportKey} 최근 24시간 내 배당률 데이터가 없습니다.`
        };
      }

      let totalPayoutRates = [];
      let totalGames = 0;
      let totalMarkets = 0;

      for (const odds of oddsData) {
        const gamePayoutRates = this.calculateGamePayoutRates(odds);
        if (gamePayoutRates.length > 0) {
          totalPayoutRates.push(...gamePayoutRates);
          totalGames++;
          totalMarkets += gamePayoutRates.length;
        }
      }

      if (totalPayoutRates.length === 0) {
        return {
          averagePayoutRate: null,
          gameCount: 0,
          totalMarkets: 0,
          sportKey: sportKey,
          message: `${sportKey} 유효한 배당률 데이터가 없습니다.`
        };
      }

      // 스포츠별 평균 환수율 계산
      const sportAverage = totalPayoutRates.reduce((sum, rate) => sum + rate, 0) / totalPayoutRates.length;
      
      console.log(`[SportsbookPayoutRate] ${sportKey} 평균 환수율: ${(sportAverage * 100).toFixed(2)}%`);
      
      return {
        averagePayoutRate: parseFloat(sportAverage.toFixed(4)),
        gameCount: totalGames,
        totalMarkets: totalMarkets,
        sportKey: sportKey,
        message: `${sportKey} 최근 24시간 ${totalGames}개 경기, ${totalMarkets}개 마켓 기준`
      };

    } catch (error) {
      console.error(`[SportsbookPayoutRate] ${sportKey} 평균 환수율 계산 오류:`, error);
      return {
        averagePayoutRate: null,
        gameCount: 0,
        totalMarkets: 0,
        sportKey: sportKey,
        message: `${sportKey} 평균 환수율 계산 중 오류가 발생했습니다.`
      };
    }
  }

  /**
   * 단일 게임의 환수율들을 계산
   * @param {Object} oddsData - OddsCache 데이터
   * @returns {Array} 환수율 배열
   */
  static calculateGamePayoutRates(oddsData) {
    const payoutRates = [];
    
    try {
      if (!oddsData.bookmakers || !Array.isArray(oddsData.bookmakers)) {
        return payoutRates;
      }

      // 각 북메이커의 마켓별 환수율 계산
      for (const bookmaker of oddsData.bookmakers) {
        if (!bookmaker.markets || !Array.isArray(bookmaker.markets)) continue;

        for (const market of bookmaker.markets) {
          if (!market.outcomes || !Array.isArray(market.outcomes)) continue;

          // 마켓별 배당률 배열 생성
          const odds = market.outcomes
            .filter(outcome => outcome.price && typeof outcome.price === 'number' && outcome.price > 1.0)
            .map(outcome => outcome.price);

          if (odds.length >= 2) {
            // 환수율 계산: 1 / (1/배당률1 + 1/배당률2 + ...)
            const impliedProbabilities = odds.map(odd => 1 / odd);
            const totalProbability = impliedProbabilities.reduce((sum, prob) => sum + prob, 0);
            const payoutRate = 1 / totalProbability;
            
            payoutRates.push(payoutRate);
            
            console.log(`[SportsbookPayoutRate] 마켓 환수율: ${(payoutRate * 100).toFixed(2)}% (배당률: [${odds.join(', ')}])`);
          }
        }
      }
    } catch (error) {
      console.error('[SportsbookPayoutRate] 게임 환수율 계산 오류:', error);
    }

    return payoutRates;
  }

  /**
   * 실시간 평균 환수율 업데이트 (캐시용)
   * @returns {Object} 업데이트된 평균 환수율
   */
  static async updateRealtimeAveragePayoutRate() {
    try {
      const overallStats = await this.getOverallAveragePayoutRate();
      
      // 주요 스포츠별 통계도 함께 계산
      const sportKeys = ['soccer_korea_kleague1', 'baseball_mlb', 'basketball_nba', 'americanfootball_nfl'];
      const sportStats = {};
      
      for (const sportKey of sportKeys) {
        sportStats[sportKey] = await this.getSportAveragePayoutRate(sportKey);
      }

      const result = {
        overall: overallStats,
        bySport: sportStats,
        lastUpdated: new Date().toISOString()
      };

      console.log('[SportsbookPayoutRate] 실시간 평균 환수율 업데이트 완료:', result);
      return result;

    } catch (error) {
      console.error('[SportsbookPayoutRate] 실시간 평균 환수율 업데이트 오류:', error);
      return null;
    }
  }
}

export default SportsbookPayoutRateService;
