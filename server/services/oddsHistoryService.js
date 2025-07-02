import OddsHistory from '../models/oddsHistoryModel.js';
import OddsCache from '../models/oddsCacheModel.js';
import { Op } from 'sequelize';

class OddsHistoryService {
  constructor() {
    // 히스토리 보존 기간 (7일로 단축)
    this.RETENTION_DAYS = 7;
  }

  /**
   * 배당율 스냅샷 저장 (단순화)
   * @param {Object} oddsData - OddsCache 데이터
   * @returns {Promise<number>} - 저장된 히스토리 개수
   */
  async saveOddsSnapshot(oddsData) {
    try {
      if (!oddsData || !oddsData.bookmakers) {
        return 0;
      }

      let savedCount = 0;
      const snapshotTime = new Date();

      for (const bookmaker of oddsData.bookmakers) {
        if (!bookmaker.markets) continue;

        for (const market of bookmaker.markets) {
          if (!market.outcomes) continue;

          for (const outcome of market.outcomes) {
            await OddsHistory.create({
              oddsCacheId: oddsData.id,
              homeTeam: oddsData.homeTeam,
              awayTeam: oddsData.awayTeam,
              commenceTime: oddsData.commenceTime,
              marketType: market.key,
              outcomeName: outcome.name,
              outcomePoint: outcome.point || null,
              oddsValue: outcome.price,
              bookmakerName: bookmaker.title,
              snapshotTime: snapshotTime
            });
            savedCount++;
          }
        }
      }

      return savedCount;

    } catch (error) {
      console.error('[OddsHistory] 히스토리 저장 중 오류:', error);
      return 0;
    }
  }

  /**
   * 베팅 시점 배당율 검증용 히스토리 조회
   * @param {Object} selection - 베팅 선택 정보
   * @param {Date} betTime - 베팅 시간
   * @returns {Promise<Object|null>} - 히스토리 데이터
   */
  async getValidationHistory(selection, betTime) {
    try {
      const whereClause = {
        marketType: this.getMarketKey(selection.market),
        outcomeName: selection.team || selection.option,
        snapshotTime: {
          [Op.between]: [
            new Date(betTime.getTime() - 10 * 60 * 1000), // 10분 전
            new Date(betTime.getTime() + 10 * 60 * 1000)  // 10분 후
          ]
        }
      };

      if (selection.point !== undefined) {
        whereClause.outcomePoint = selection.point;
      }

      const history = await OddsHistory.findOne({
        where: whereClause,
        order: [['snapshotTime', 'DESC']],
        limit: 1
      });

      if (!history) return null;

      return {
        odds: parseFloat(history.oddsValue),
        timestamp: history.snapshotTime,
        bookmaker: history.bookmakerName
      };

    } catch (error) {
      console.error('[OddsHistory] 검증용 히스토리 조회 중 오류:', error);
      return null;
    }
  }

  /**
   * 오래된 히스토리 정리 (7일)
   * @returns {Promise<number>} - 삭제된 레코드 수
   */
  async cleanupOldHistory() {
    try {
      const cutoffDate = new Date(Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
      
      const deletedCount = await OddsHistory.destroy({
        where: {
          snapshotTime: {
            [Op.lt]: cutoffDate
          }
        }
      });

      if (deletedCount > 0) {
        console.log(`[OddsHistory] 오래된 히스토리 ${deletedCount}개 삭제됨`);
      }

      return deletedCount;

    } catch (error) {
      console.error('[OddsHistory] 히스토리 정리 중 오류:', error);
      return 0;
    }
  }

  /**
   * 마켓 키 변환
   */
  getMarketKey(market) {
    const marketMapping = {
      '승/패': 'h2h',
      '언더/오버': 'totals',
      '핸디캡': 'spreads'
    };
    return marketMapping[market] || market || 'h2h';
  }
}

export default new OddsHistoryService(); 