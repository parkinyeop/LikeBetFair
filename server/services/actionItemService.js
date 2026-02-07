import ExchangeOrder from '../models/exchangeOrderModel.js';
import ExchangeOrderMatch from '../models/exchangeOrderMatchModel.js';
import GameResult from '../models/gameResultModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import { Op } from 'sequelize';
import createScriptSequelize from '../config/scriptDatabase.js';

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();

/**
 * 관리자 대시보드 긴급 조치 항목 서비스
 * 시스템 상태를 모니터링하고 관리자가 즉시 처리해야 할 항목들을 식별
 */
class ActionItemService {

  /**
   * 모든 액션 아이템 조회
   * @returns {Promise<Array>} 액션 아이템 배열
   */
  async getAllActionItems() {
    console.log('🔍 모든 액션 아이템 조회 시작...');

    try {
      const items = await Promise.all([
        // 🔥 최우선 (Danger Level)
        this.getStuckSettlements(),
        this.getBalanceMismatches(),

        // ⚠️ 중요 (Warning Level)
        this.getPendingSettlements(),
        this.getCancelledGameRefunds(),
        this.getPushGames(), // ✅ 추가: Push 발생 주문/배팅
        this.getGamesWithoutResults(), // 🆕 추가: 결과 없는 경기
        this.getHighVolumeUsers(),

        // ℹ️ 정보 (Info Level)
        this.getUnprocessedMatches()
      ]);

      // 카운트가 0보다 큰 항목만 반환
      const activeItems = items.filter(item => item && item.count > 0);

      console.log(`✅ 액션 아이템 조회 완료: ${activeItems.length}개 활성 항목`);
      return activeItems;

    } catch (error) {
      console.error('❌ 액션 아이템 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 🔥 정산 실패한 주문 (24시간 이상 미정산)
   * @returns {Promise<Object>} 액션 아이템
   */
  async getStuckSettlements() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 방법 1: 경기가 완료되었고(gameResultId 존재) 24시간 이상 정산되지 않은 주문
      const countWithGameResult = await ExchangeOrder.count({
        where: {
          status: { [Op.in]: ['matched', 'partially_matched'] },
          settledAt: null,
          createdAt: { [Op.lt]: twentyFourHoursAgo },
          gameResultId: { [Op.ne]: null } // gameResult가 있는 것만
        },
        include: [{
          model: GameResult,
          as: 'gameResult',
          where: {
            status: 'finished' // 완료된 경기만
          },
          required: true // ✅ 수정: GameResult가 반드시 있어야 함
        }]
      });

      console.log(`🔍 정산 실패 주문 (완료 경기 연결): ${countWithGameResult}개`);

      return {
        id: 'stuck-settlements',
        type: 'danger',
        icon: '💸',
        title: '정산 실패한 주문',
        count: countWithGameResult,
        link: '/admin/exchange?tab=settlements&filter=stuck',
        description: '24시간 이상 미정산 완료 경기'
      };
    } catch (error) {
      console.error('정산 실패 주문 조회 오류:', error);
      return { id: 'stuck-settlements', type: 'danger', icon: '💸', title: '정산 실패한 주문', count: 0, link: '#', description: '조회 실패' };
    }
  }

  /**
   * 🔥 잔액 불일치 감지
   * @returns {Promise<Object>} 액션 아이템
   */
  async getBalanceMismatches() {
    try {
      // 최근 1시간 내 거래가 있었던 사용자들의 잔액 검증
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // ✅ 개선: 직접 SQL 쿼리로 성능 향상
      const mismatchResults = await sequelize.query(`
        SELECT u.id, u.username, u.balance as "actualBalance", 
               ph."balanceAfter" as "calculatedBalance",
               ABS(u.balance - ph."balanceAfter") as difference
        FROM "Users" u
        INNER JOIN (
          SELECT "userId", "balanceAfter",
                 ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC, id DESC) as rn
          FROM "PaymentHistories"
          WHERE "createdAt" >= :oneHourAgo
        ) ph ON u.id = ph."userId" AND ph.rn = 1
        WHERE ABS(u.balance - ph."balanceAfter") > 1
        LIMIT 100
      `, {
        replacements: { oneHourAgo },
        type: sequelize.QueryTypes.SELECT
      });

      const mismatchCount = mismatchResults.length;

      if (mismatchCount > 0) {
        console.log(`⚠️ 잔액 불일치 감지: ${mismatchCount}건`);
        mismatchResults.forEach(result => {
          console.log(`  - User ${result.username}: 실제 ${result.actualBalance}, 계산 ${result.calculatedBalance}, 차이 ${result.difference}`);
        });
      }

      console.log(`🔍 잔액 불일치: ${mismatchCount}개`);

      return {
        id: 'balance-mismatch',
        type: 'danger',
        icon: '💰',
        title: '잔액 불일치 감지',
        count: mismatchCount,
        link: '/admin/users?filter=balance-mismatch',
        description: '사용자 잔액 vs 거래내역 불일치'
      };
    } catch (error) {
      console.error('잔액 불일치 검사 오류:', error);
      return { id: 'balance-mismatch', type: 'danger', icon: '💰', title: '잔액 불일치 감지', count: 0, link: '#', description: '조회 실패' };
    }
  }

  /**
   * ⚠️ 정산 대기 주문 (2시간 이상)
   * @returns {Promise<Object>} 액션 아이템
   */
  async getPendingSettlements() {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const count = await ExchangeOrder.count({
        where: {
          status: { [Op.in]: ['matched', 'active'] },
          settledAt: null,
          createdAt: { [Op.lt]: twoHoursAgo }
        }
      });

      console.log(`🔍 정산 대기 주문: ${count}개`);

      return {
        id: 'pending-settlements',
        type: 'warning',
        icon: '⏳',
        title: '정산 대기 주문',
        count,
        link: '/admin/exchange?tab=settlements&filter=pending',
        description: '2시간 이상 정산 대기 중'
      };
    } catch (error) {
      console.error('정산 대기 주문 조회 오류:', error);
      return { id: 'pending-settlements', type: 'warning', icon: '⏳', title: '정산 대기 주문', count: 0, link: '#', description: '조회 실패' };
    }
  }

  /**
   * ⚠️ 취소된 경기의 미환불 주문
   * @returns {Promise<Object>} 액션 아이템
   */
  async getCancelledGameRefunds() {
    try {
      const count = await ExchangeOrder.count({
        include: [{
          model: GameResult,
          as: 'gameResult',
          where: {
            status: { [Op.in]: ['cancelled', 'postponed'] }
          },
          required: true
        }],
        where: {
          status: { [Op.notIn]: ['cancelled', 'settled'] },
          settledAt: null
        }
      });

      console.log(`🔍 취소 경기 미환불: ${count}개`);

      return {
        id: 'cancelled-game-refunds',
        type: 'warning',
        icon: '🔄',
        title: '경기 취소 미처리',
        count,
        link: '/admin/games?filter=cancelled',
        description: '취소된 경기의 미환불 주문'
      };
    } catch (error) {
      console.error('취소 경기 미환불 조회 오류:', error);
      return { id: 'cancelled-game-refunds', type: 'warning', icon: '🔄', title: '경기 취소 미처리', count: 0, link: '#', description: '조회 실패' };
    }
  }

  /**
   * ⚠️ Push 발생 경기 (무승부/환불 필요)
   * @returns {Promise<Object>} 액션 아이템
   */
  async getPushGames() {
    try {
      // 무승부(draw) 결과가 나왔지만 아직 정산되지 않은 주문
      const count = await ExchangeOrder.count({
        include: [{
          model: GameResult,
          as: 'gameResult',
          where: {
            status: 'finished'
          },
          required: true
        }],
        where: {
          status: { [Op.in]: ['matched', 'partially_matched'] },
          settledAt: null
        }
      });

      console.log(`🔍 Push 발생 경기: ${count}개`);

      return {
        id: 'push-games',
        type: 'warning',
        icon: '🤝',
        title: 'Push 발생 경기',
        count,
        link: '/admin/exchange?tab=settlements&filter=push',
        description: '무승부 발생 환불 필요 주문'
      };
    } catch (error) {
      console.error('Push 발생 경기 조회 오류:', error);
      return { id: 'push-games', type: 'warning', icon: '🤝', title: 'Push 발생 경기', count: 0, link: '#', description: '조회 실패' };
    }
  }

  /**
   * ⚠️ 경기 시간 3시간 이상 지났는데 결과 없는 경기
   * @returns {Promise<Object>} 액션 아이템
   */
  async getGamesWithoutResults() {
    try {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

      // Exchange 주문과 스포츠북 배팅에서 사용된 경기 중 결과가 없는 경기
      const gamesWithoutResults = await sequelize.query(`
        WITH BettedGames AS (
          -- Exchange 주문에서 사용된 경기
          SELECT DISTINCT
            eo."selectionDetails"->>'homeTeam' as "homeTeam",
            eo."selectionDetails"->>'awayTeam' as "awayTeam",
            (eo."selectionDetails"->>'commence_time')::timestamp as "commenceTime",
            'exchange' as source
          FROM "ExchangeOrders" eo
          WHERE eo."selectionDetails" IS NOT NULL
            AND (eo."selectionDetails"->>'commence_time')::timestamp < :threeHoursAgo
            AND eo.status IN ('matched', 'partially_matched', 'active')
            AND eo."settledAt" IS NULL
          
          UNION
          
          -- 스포츠북 배팅에서 사용된 경기 (selections 배열에서 추출)
          SELECT DISTINCT
            sel->>'homeTeam' as "homeTeam",
            sel->>'awayTeam' as "awayTeam",
            (sel->>'commence_time')::timestamp as "commenceTime",
            'sportsbook' as source
          FROM "Bets" b,
            jsonb_array_elements(b."selections") AS sel
          WHERE b."selections" IS NOT NULL
            AND (sel->>'commence_time')::timestamp < :threeHoursAgo
            AND b.status = 'pending'
        )
        SELECT 
          bg."homeTeam",
          bg."awayTeam",
          bg."commenceTime",
          bg.source,
          COUNT(*) OVER() as total_count
        FROM BettedGames bg
        WHERE NOT EXISTS (
          SELECT 1 FROM "GameResults" gr
          WHERE (
            (gr."homeTeam" = bg."homeTeam" AND gr."awayTeam" = bg."awayTeam")
            OR (gr."homeTeam" = bg."awayTeam" AND gr."awayTeam" = bg."homeTeam")
          )
          AND gr."commenceTime" BETWEEN bg."commenceTime" - INTERVAL '1 hour' 
                                    AND bg."commenceTime" + INTERVAL '1 hour'
          AND gr.status IN ('finished', 'cancelled', 'postponed')
        )
        ORDER BY bg."commenceTime" ASC
        LIMIT 10
      `, {
        replacements: { threeHoursAgo },
        type: sequelize.QueryTypes.SELECT
      });

      const count = gamesWithoutResults.length > 0 ? gamesWithoutResults[0].total_count : 0;

      console.log(`🔍 결과 없는 경기: ${count}개`);

      return {
        id: 'games-without-results',
        type: 'warning',
        icon: '⏰',
        title: '결과 없는 경기',
        count: parseInt(count) || 0,
        link: '/admin/games?filter=no-results',
        description: '경기 시작 3시간 이상 경과',
        details: gamesWithoutResults.slice(0, 10).map(game => ({
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          commenceTime: game.commenceTime,
          source: game.source,
          hoursElapsed: Math.floor((Date.now() - new Date(game.commenceTime).getTime()) / (1000 * 60 * 60))
        }))
      };
    } catch (error) {
      console.error('결과 없는 경기 조회 오류:', error);
      return { 
        id: 'games-without-results', 
        type: 'warning', 
        icon: '⏰', 
        title: '결과 없는 경기', 
        count: 0, 
        link: '#', 
        description: '조회 실패',
        details: []
      };
    }
  }

  /**
   * ⚠️ 이상 거래 패턴 사용자
   * @returns {Promise<Object>} 액션 아이템
   */
  async getHighVolumeUsers() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 오늘 하루 거래량이 평소의 10배 이상인 사용자 (PostgreSQL 구문으로 수정)
      const highVolumeUsers = await sequelize.query(`
        SELECT "userId", COUNT(*) as "todayOrders",
               (SELECT AVG(daily_count) FROM (
                 SELECT COUNT(*) as daily_count
                 FROM "ExchangeOrders"
                 WHERE "userId" = e."userId"
                   AND "createdAt" >= NOW() - INTERVAL '30 days'
                   AND "createdAt" < CURRENT_DATE
                 GROUP BY DATE("createdAt")
               ) avg_table) as "avgOrders"
        FROM "ExchangeOrders" e
        WHERE DATE("createdAt") = CURRENT_DATE
        GROUP BY "userId"
        HAVING COUNT(*) > (SELECT AVG(daily_count) FROM (
          SELECT COUNT(*) as daily_count
          FROM "ExchangeOrders"
          WHERE "userId" = e."userId"
            AND "createdAt" >= NOW() - INTERVAL '30 days'
            AND "createdAt" < CURRENT_DATE
          GROUP BY DATE("createdAt")
        ) avg_table) * 10
      `, { type: sequelize.QueryTypes.SELECT });

      console.log(`🔍 이상 거래 패턴: ${highVolumeUsers.length}명`);

      return {
        id: 'high-volume-users',
        type: 'warning',
        icon: '📈',
        title: '이상 거래 패턴',
        count: highVolumeUsers.length,
        link: '/admin/users?filter=high-volume',
        description: '1일 평균 10배 이상 거래'
      };
    } catch (error) {
      console.error('이상 거래 패턴 조회 오류:', error);
      return { id: 'high-volume-users', type: 'warning', icon: '📈', title: '이상 거래 패턴', count: 0, link: '#', description: '조회 실패' };
    }
  }

  /**
   * ℹ️ 미처리 매칭 기록
   * @returns {Promise<Object>} 액션 아이템
   */
  async getUnprocessedMatches() {
    try {
      const count = await ExchangeOrderMatch.count({
        where: {
          status: 'pending'
        }
      });

      console.log(`🔍 미처리 매칭: ${count}개`);

      return {
        id: 'unprocessed-matches',
        type: 'info',
        icon: '🔗',
        title: '미처리 매칭 기록',
        count,
        link: '/admin/exchange?tab=orders&filter=matches',
        description: '처리 대기 중인 매칭 기록'
      };
    } catch (error) {
      console.error('미처리 매칭 조회 오류:', error);
      return { id: 'unprocessed-matches', type: 'info', icon: '🔗', title: '미처리 매칭 기록', count: 0, link: '#', description: '조회 실패' };
    }
  }

  /**
   * 사용자 잔액 계산 (거래내역 기반)
   * @param {number} userId - 사용자 ID
   * @returns {Promise<number>} 계산된 잔액
   */
  async calculateUserBalance(userId) {
    try {
      // 가장 최근 거래 내역의 balanceAfter 값 사용
      const latestPayment = await PaymentHistory.findOne({
        where: { userId },
        order: [['createdAt', 'DESC'], ['id', 'DESC']]
      });

      if (!latestPayment) {
        return 0; // 거래 내역이 없으면 0
      }

      // 최근 거래 후 잔액을 반환
      return parseFloat(latestPayment.balanceAfter) || 0;
    } catch (error) {
      console.error(`사용자 ${userId} 잔액 계산 오류:`, error);
      return 0;
    }
  }

  /**
   * 특정 액션 아이템 상세 정보 조회
   * @param {string} itemId - 액션 아이템 ID
   * @returns {Promise<Object>} 상세 정보
   */
  async getActionItemDetails(itemId) {
    try {
      switch (itemId) {
        case 'stuck-settlements':
          return await this.getStuckSettlementDetails();
        case 'pending-settlements':
          return await this.getPendingSettlementDetails();
        case 'balance-mismatch':
          return await this.getBalanceMismatchDetails();
        case 'games-without-results':
          return await this.getGamesWithoutResultsDetails();
        default:
          throw new Error(`알 수 없는 액션 아이템: ${itemId}`);
      }
    } catch (error) {
      console.error(`액션 아이템 ${itemId} 상세 조회 오류:`, error);
      throw error;
    }
  }

  /**
   * 정산 실패 주문 상세 정보
   * @returns {Promise<Array>} 상세 주문 목록
   */
  async getStuckSettlementDetails() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await ExchangeOrder.findAll({
      where: {
        status: { [Op.in]: ['matched', 'partially_matched', 'active'] },
        settledAt: null,
        createdAt: { [Op.lt]: twentyFourHoursAgo }
      },
      include: [
        { model: User, attributes: ['id', 'username', 'email'] },
        { model: GameResult, required: false }
      ],
      order: [['createdAt', 'ASC']],
      limit: 50
    });
  }

  /**
   * 정산 대기 주문 상세 정보
   * @returns {Promise<Array>} 상세 주문 목록
   */
  async getPendingSettlementDetails() {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    return await ExchangeOrder.findAll({
      where: {
        status: { [Op.in]: ['matched', 'active'] },
        settledAt: null,
        createdAt: { [Op.lt]: twoHoursAgo }
      },
      include: [
        { model: User, attributes: ['id', 'username', 'email'] }
      ],
      order: [['createdAt', 'ASC']],
      limit: 50
    });
  }

  /**
   * 잔액 불일치 상세 정보
   * @returns {Promise<Array>} 문제 사용자 목록
   */
  async getBalanceMismatchDetails() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // ✅ 개선: 직접 SQL 쿼리로 성능 향상
    const mismatchUsers = await sequelize.query(`
      SELECT u.id as "userId", u.username, u.email,
             u.balance as "actualBalance", 
             ph."balanceAfter" as "calculatedBalance",
             ABS(u.balance - ph."balanceAfter") as difference,
             ph."createdAt" as "lastTransactionAt"
      FROM "Users" u
      INNER JOIN (
        SELECT "userId", "balanceAfter", "createdAt",
               ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC, id DESC) as rn
        FROM "PaymentHistory"
        WHERE "createdAt" >= :oneHourAgo
      ) ph ON u.id = ph."userId" AND ph.rn = 1
      WHERE ABS(u.balance - ph."balanceAfter") > 1
      ORDER BY difference DESC
      LIMIT 100
    `, {
      replacements: { oneHourAgo },
      type: sequelize.QueryTypes.SELECT
    });

    return mismatchUsers;
  }

  /**
   * 결과 없는 경기 상세 정보
   * @returns {Promise<Array>} 경기 목록
   */
  async getGamesWithoutResultsDetails() {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    const gamesWithoutResults = await sequelize.query(`
      WITH BettedGames AS (
        -- Exchange 주문에서 사용된 경기
        SELECT DISTINCT
          eo."selectionDetails"->>'homeTeam' as "homeTeam",
          eo."selectionDetails"->>'awayTeam' as "awayTeam",
          (eo."selectionDetails"->>'commence_time')::timestamp as "commenceTime",
          eo."selectionDetails"->>'sport_title' as "sportTitle",
          'exchange' as source,
          COUNT(*) OVER(PARTITION BY 
            eo."selectionDetails"->>'homeTeam',
            eo."selectionDetails"->>'awayTeam',
            (eo."selectionDetails"->>'commence_time')::timestamp
          ) as order_count
        FROM "ExchangeOrders" eo
        WHERE eo."selectionDetails" IS NOT NULL
          AND (eo."selectionDetails"->>'commence_time')::timestamp < :threeHoursAgo
          AND eo.status IN ('matched', 'partially_matched', 'active')
          AND eo."settledAt" IS NULL
        
        UNION
        
        -- 스포츠북 배팅에서 사용된 경기
        SELECT DISTINCT
          sel->>'homeTeam' as "homeTeam",
          sel->>'awayTeam' as "awayTeam",
          (sel->>'commence_time')::timestamp as "commenceTime",
          sel->>'sport_title' as "sportTitle",
          'sportsbook' as source,
          COUNT(*) OVER(PARTITION BY 
            sel->>'homeTeam',
            sel->>'awayTeam',
            (sel->>'commence_time')::timestamp
          ) as order_count
        FROM "Bets" b,
          jsonb_array_elements(b."selectionDetails"->'selections') AS sel
        WHERE b."selectionDetails" IS NOT NULL
          AND (sel->>'commence_time')::timestamp < :threeHoursAgo
          AND b.status = 'pending'
      )
      SELECT 
        bg."homeTeam",
        bg."awayTeam",
        bg."commenceTime",
        bg."sportTitle",
        bg.source,
        bg.order_count,
        EXTRACT(EPOCH FROM (NOW() - bg."commenceTime")) / 3600 as hours_elapsed
      FROM BettedGames bg
      WHERE NOT EXISTS (
        SELECT 1 FROM "GameResults" gr
        WHERE (
          (gr."homeTeam" = bg."homeTeam" AND gr."awayTeam" = bg."awayTeam")
          OR (gr."homeTeam" = bg."awayTeam" AND gr."awayTeam" = bg."homeTeam")
        )
        AND gr."commenceTime" BETWEEN bg."commenceTime" - INTERVAL '1 hour' 
                                  AND bg."commenceTime" + INTERVAL '1 hour'
        AND gr.status IN ('finished', 'cancelled', 'postponed')
      )
      ORDER BY bg."commenceTime" ASC
      LIMIT 50
    `, {
      replacements: { threeHoursAgo },
      type: sequelize.QueryTypes.SELECT
    });

    return gamesWithoutResults.map(game => ({
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      commenceTime: game.commenceTime,
      sportTitle: game.sportTitle || 'Unknown',
      source: game.source,
      orderCount: parseInt(game.order_count) || 0,
      hoursElapsed: Math.floor(parseFloat(game.hours_elapsed))
    }));
  }
}

export default new ActionItemService();