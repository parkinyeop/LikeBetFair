import ExchangeOrder from '../models/exchangeOrderModel.js';
import ExchangeOrderMatch from '../models/exchangeOrderMatchModel.js';
import GameResult from '../models/gameResultModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import { Op } from 'sequelize';
import sequelize from '../models/sequelize.js';

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

      // 경기가 완료되었지만 24시간 이상 정산되지 않은 주문들
      const count = await ExchangeOrder.count({
        where: {
          status: { [Op.in]: ['matched', 'partially_matched', 'active'] },
          settledAt: null,
          createdAt: { [Op.lt]: twentyFourHoursAgo }
        },
        include: [{
          model: GameResult,
          as: 'gameResult',
          where: {
            status: 'finished',
            updatedAt: { [Op.lt]: twentyFourHoursAgo }
          },
          required: false
        }]
      });

      console.log(`🔍 정산 실패 주문: ${count}개`);

      return {
        id: 'stuck-settlements',
        type: 'danger',
        icon: '💸',
        title: '정산 실패한 주문',
        count,
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

      const recentUsers = await User.findAll({
        include: [{
          model: PaymentHistory,
          as: 'paymentHistories',
          where: {
            createdAt: { [Op.gte]: oneHourAgo }
          },
          required: true
        }],
        limit: 100 // 성능을 위해 최근 100명만 체크
      });

      let mismatchCount = 0;

      for (const user of recentUsers) {
        const calculatedBalance = await this.calculateUserBalance(user.id);
        const actualBalance = parseFloat(user.balance);

        if (Math.abs(calculatedBalance - actualBalance) > 1) { // 1원 이상 차이
          mismatchCount++;
          console.log(`⚠️ 잔액 불일치 사용자 ${user.id}: 실제 ${actualBalance}, 계산 ${calculatedBalance}`);
        }
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
      const payments = await PaymentHistory.findAll({
        where: { userId },
        order: [['createdAt', 'ASC']]
      });

      let calculatedBalance = 0;
      for (const payment of payments) {
        calculatedBalance += parseFloat(payment.amount);
      }

      return calculatedBalance;
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

    const recentUsers = await User.findAll({
      include: [{
        model: PaymentHistory,
        where: {
          createdAt: { [Op.gte]: oneHourAgo }
        },
        required: true
      }],
      limit: 100
    });

    const mismatchUsers = [];

    for (const user of recentUsers) {
      const calculatedBalance = await this.calculateUserBalance(user.id);
      const actualBalance = parseFloat(user.balance);
      const difference = Math.abs(calculatedBalance - actualBalance);

      if (difference > 1) {
        mismatchUsers.push({
          userId: user.id,
          username: user.username,
          email: user.email,
          actualBalance,
          calculatedBalance,
          difference
        });
      }
    }

    return mismatchUsers;
  }
}

export default new ActionItemService();