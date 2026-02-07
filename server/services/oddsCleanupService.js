/**
 * 오래된 배당률 데이터 정리 서비스
 *
 * 정리 기준:
 * 1. commenceTime < (현재 - 3일) AND lastUpdated < (현재 - 2일)
 *    → 과거 경기인데 업데이트도 안 됨 = 버려진 데이터
 *
 * 2. commenceTime > (현재 + 14일)
 *    → 너무 먼 미래 경기 (API 정책상 14일 이내만 유지)
 *
 * 3. lastUpdated < (현재 - 7일)
 *    → 일주일 이상 업데이트 안 된 데이터 = 취소/변경된 경기
 */

import OddsCache from '../models/oddsCacheModel.js';
import OddsHistory from '../models/oddsHistoryModel.js';
import { Op } from 'sequelize';

class OddsCleanupService {
  constructor() {
    this.metrics = {
      totalCleaned: 0,
      cleanupRuns: 0,
      lastCleanupTime: null
    };
  }

  /**
   * 오래된 배당률 데이터 정리 실행
   * @returns {Object} 정리 결과
   */
  async cleanupOldOdds() {
    this.metrics.cleanupRuns++;
    const startTime = Date.now();

    console.log('[OddsCleanup] 🧹 오래된 배당률 데이터 정리 시작...');

    try {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      let totalDeleted = 0;
      const breakdown = {
        abandonedPastGames: 0,    // 기준 1: 과거 경기 + 오래된 업데이트
        farFutureGames: 0,         // 기준 2: 너무 먼 미래 경기
        staleData: 0               // 기준 3: 오래 업데이트 안 된 데이터
      };

      // === 기준 1: 과거 경기인데 업데이트도 안 된 데이터 ===
      console.log('[OddsCleanup] 📋 기준 1: 과거 경기 + 오래된 업데이트 (commenceTime < -3일 AND lastUpdated < -2일)');
      // 먼저 삭제 대상 OddsCache ID 조회
      const abandonedIds = await OddsCache.findAll({
        where: {
          commenceTime: { [Op.lt]: threeDaysAgo },
          lastUpdated: { [Op.lt]: twoDaysAgo }
        },
        attributes: ['id'],
        raw: true
      });
      const abandonedIdList = abandonedIds.map(record => record.id);

      // 연관된 OddsHistory 먼저 삭제
      if (abandonedIdList.length > 0) {
        await OddsHistory.destroy({
          where: { oddsCacheId: { [Op.in]: abandonedIdList } }
        });
        // OddsCache 삭제
        const abandonedCount = await OddsCache.destroy({
          where: { id: { [Op.in]: abandonedIdList } }
        });
        breakdown.abandonedPastGames = abandonedCount;
        totalDeleted += abandonedCount;
        console.log(`[OddsCleanup] ✅ ${abandonedCount}개 삭제됨`);
      } else {
        console.log(`[OddsCleanup] ✅ 0개 삭제됨`);
      }

      // === 기준 2: 너무 먼 미래 경기 (14일 초과) ===
      console.log('[OddsCleanup] 📋 기준 2: 너무 먼 미래 경기 (commenceTime > +14일)');
      const farFutureIds = await OddsCache.findAll({
        where: {
          commenceTime: { [Op.gt]: fourteenDaysLater }
        },
        attributes: ['id'],
        raw: true
      });
      const farFutureIdList = farFutureIds.map(record => record.id);

      if (farFutureIdList.length > 0) {
        await OddsHistory.destroy({
          where: { oddsCacheId: { [Op.in]: farFutureIdList } }
        });
        const farFutureCount = await OddsCache.destroy({
          where: { id: { [Op.in]: farFutureIdList } }
        });
        breakdown.farFutureGames = farFutureCount;
        totalDeleted += farFutureCount;
        console.log(`[OddsCleanup] ✅ ${farFutureCount}개 삭제됨`);
      } else {
        console.log(`[OddsCleanup] ✅ 0개 삭제됨`);
      }

      // === 기준 3: 일주일 이상 업데이트 안 된 데이터 (취소/변경된 경기) ===
      console.log('[OddsCleanup] 📋 기준 3: 오래 업데이트 안 된 데이터 (lastUpdated < -7일)');
      const staleIds = await OddsCache.findAll({
        where: {
          lastUpdated: { [Op.lt]: sevenDaysAgo }
        },
        attributes: ['id'],
        raw: true
      });
      const staleIdList = staleIds.map(record => record.id);

      if (staleIdList.length > 0) {
        await OddsHistory.destroy({
          where: { oddsCacheId: { [Op.in]: staleIdList } }
        });
        const staleCount = await OddsCache.destroy({
          where: { id: { [Op.in]: staleIdList } }
        });
        breakdown.staleData = staleCount;
        totalDeleted += staleCount;
        console.log(`[OddsCleanup] ✅ ${staleCount}개 삭제됨`);
      } else {
        console.log(`[OddsCleanup] ✅ 0개 삭제됨`);
      }

      // 메트릭 업데이트
      this.metrics.totalCleaned += totalDeleted;
      this.metrics.lastCleanupTime = new Date();

      const executionTime = Date.now() - startTime;

      const result = {
        success: true,
        totalDeleted,
        breakdown,
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString(),
        criteria: {
          abandonedPastGames: `commenceTime < ${threeDaysAgo.toISOString()} AND lastUpdated < ${twoDaysAgo.toISOString()}`,
          farFutureGames: `commenceTime > ${fourteenDaysLater.toISOString()}`,
          staleData: `lastUpdated < ${sevenDaysAgo.toISOString()}`
        }
      };

      console.log('[OddsCleanup] 🎉 정리 완료:', {
        totalDeleted,
        breakdown,
        executionTime: `${executionTime}ms`
      });

      return result;

    } catch (error) {
      console.error('[OddsCleanup] ❌ 정리 실패:', error.message);
      throw error;
    }
  }

  /**
   * 정리 대상 데이터 미리보기 (실제 삭제하지 않음)
   * @returns {Object} 정리 대상 통계
   */
  async previewCleanup() {
    console.log('[OddsCleanup] 🔍 정리 대상 미리보기...');

    try {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const [abandonedCount, farFutureCount, staleCount] = await Promise.all([
        // 기준 1
        OddsCache.count({
          where: {
            commenceTime: { [Op.lt]: threeDaysAgo },
            lastUpdated: { [Op.lt]: twoDaysAgo }
          }
        }),
        // 기준 2
        OddsCache.count({
          where: {
            commenceTime: { [Op.gt]: fourteenDaysLater }
          }
        }),
        // 기준 3
        OddsCache.count({
          where: {
            lastUpdated: { [Op.lt]: sevenDaysAgo }
          }
        })
      ]);

      const totalToDelete = abandonedCount + farFutureCount + staleCount;

      const preview = {
        totalToDelete,
        breakdown: {
          abandonedPastGames: abandonedCount,
          farFutureGames: farFutureCount,
          staleData: staleCount
        },
        criteria: {
          criterion1: `과거 경기 + 오래된 업데이트 (commenceTime < -3일 AND lastUpdated < -2일)`,
          criterion2: `너무 먼 미래 경기 (commenceTime > +14일)`,
          criterion3: `오래 업데이트 안 된 데이터 (lastUpdated < -7일)`
        },
        timestamp: new Date().toISOString()
      };

      console.log('[OddsCleanup] 📊 정리 대상:', preview);

      return preview;

    } catch (error) {
      console.error('[OddsCleanup] ❌ 미리보기 실패:', error.message);
      throw error;
    }
  }

  /**
   * 서비스 메트릭 조회
   * @returns {Object} 메트릭 정보
   */
  getMetrics() {
    return {
      ...this.metrics,
      lastCleanupTime: this.metrics.lastCleanupTime?.toISOString() || null,
      averageCleanedPerRun: this.metrics.cleanupRuns > 0
        ? (this.metrics.totalCleaned / this.metrics.cleanupRuns).toFixed(2)
        : 0
    };
  }

  /**
   * 메트릭 초기화
   */
  resetMetrics() {
    this.metrics = {
      totalCleaned: 0,
      cleanupRuns: 0,
      lastCleanupTime: null
    };
    console.log('[OddsCleanup] 📊 메트릭 초기화됨');
  }
}

// 싱글톤 인스턴스 생성
const oddsCleanupService = new OddsCleanupService();

export default oddsCleanupService;
