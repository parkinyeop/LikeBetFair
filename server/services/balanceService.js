import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../models/sequelize.js';

/**
 * 중앙화된 잔액 관리 서비스
 * 
 * 모든 잔액 변경은 이 서비스를 통해 처리하여:
 * 1. User.balance 업데이트
 * 2. PaymentHistory 기록
 * 이 원자적으로 함께 실행되도록 보장합니다.
 */
class BalanceService {
  /**
   * 잔액 변경 및 PaymentHistory 기록을 원자적으로 처리
   *
   * @param {string} userId - 사용자 ID
   * @param {number} amount - 변경 금액 (양수: 입금, 음수: 출금)
   * @param {string} memo - 거래 메모
   * @param {object|string|null} options - 옵션 객체 또는 레거시 betId
   *   - {string} options.betId - 베팅 ID (deprecated, use relatedBetId)
   *   - {string} options.transactionType - 거래 유형 (TransactionType enum)
   *   - {string} options.status - 거래 상태 (기본값: 'completed')
   *   - {UUID} options.relatedOrderId - 관련 주문 ID
   *   - {UUID} options.relatedBetId - 관련 베팅 ID
   *   - {UUID} options.relatedMultibetId - 관련 멀티베팅 ID
   *   - {UUID} options.relatedMatchId - 관련 매치 ID
   *   - {object} options.metadata - 추가 메타데이터 (JSONB)
   * @param {Transaction} transaction - Sequelize 트랜잭션 객체
   * @returns {Promise<{user, paymentHistory, oldBalance, newBalance}>}
   */
  async updateBalance(userId, amount, memo, options = null, transaction) {
    try {
      // 1. 사용자 조회 (비관적 락)
      const user = await User.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!user) {
        throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
      }

      // 2. 잔액 계산
      const oldBalance = parseFloat(user.balance);
      const changeAmount = parseFloat(amount);
      const newBalance = parseFloat((oldBalance + changeAmount).toFixed(2));

      // 3. 음수 방지
      if (newBalance < 0) {
        throw new Error(
          `잔액 부족: 현재 ${oldBalance.toLocaleString()}원, ` +
          `요청 ${changeAmount.toLocaleString()}원, ` +
          `결과 ${newBalance.toLocaleString()}원`
        );
      }

      // 4. 잔액 업데이트
      user.balance = newBalance;
      await user.save({ transaction });

      // 5. 옵션 파싱 (하위 호환성)
      let betId = null;
      let transactionType = null;
      let status = 'completed';
      let relatedOrderId = null;
      let relatedBetId = null;
      let relatedMultibetId = null;
      let relatedMatchId = null;
      let metadata = null;

      if (typeof options === 'string') {
        // 레거시: options가 betId 문자열인 경우
        betId = options;
      } else if (options && typeof options === 'object') {
        // 새로운 방식: options 객체
        betId = options.betId || null;
        transactionType = options.transactionType || null;
        status = options.status || 'completed';
        relatedOrderId = options.relatedOrderId || null;
        relatedBetId = options.relatedBetId || null;
        relatedMultibetId = options.relatedMultibetId || null;
        relatedMatchId = options.relatedMatchId || null;
        metadata = options.metadata || null;
      }

      // 6. PaymentHistory 기록 (원자적으로 처리)
      const paymentHistory = await PaymentHistory.create({
        userId,
        amount: changeAmount,
        balanceAfter: newBalance,
        memo,
        betId,  // legacy
        transactionType,
        status,
        relatedOrderId,
        relatedBetId,
        relatedMultibetId,
        relatedMatchId,
        metadata,
        paidAt: new Date()
      }, { transaction });

      console.log(
        `💰 [BalanceService] 잔액 업데이트: ${oldBalance.toLocaleString()} → ` +
        `${newBalance.toLocaleString()} (${changeAmount > 0 ? '+' : ''}${changeAmount.toLocaleString()})`
      );

      return { user, paymentHistory, oldBalance, newBalance };
    } catch (error) {
      console.error(`❌ [BalanceService] 잔액 업데이트 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 초기 잔액 설정 (회원가입 시)
   * 
   * @param {string} userId - 사용자 ID
   * @param {number} initialAmount - 초기 잔액
   * @param {Transaction} transaction - Sequelize 트랜잭션 객체
   * @returns {Promise<{user, paymentHistory, oldBalance, newBalance}>}
   */
  async setInitialBalance(userId, initialAmount, transaction) {
    console.log(`🎁 [BalanceService] 초기 잔액 설정: ${userId} → ${initialAmount.toLocaleString()}원`);
    
    return await this.updateBalance(
      userId,
      initialAmount,
      '회원가입 초기 잔액',
      null,
      transaction
    );
  }

  /**
   * 잔액 검증 (PaymentHistory 합계와 비교)
   * 
   * @param {string} userId - 사용자 ID
   * @returns {Promise<{userId, username, actualBalance, calculatedBalance, difference, isValid}>}
   */
  async verifyBalance(userId) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
      }

      const [result] = await sequelize.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM "PaymentHistories"
        WHERE "userId" = :userId
      `, {
        replacements: { userId },
        type: QueryTypes.SELECT
      });

      const calculatedBalance = parseFloat(result.total);
      const actualBalance = parseFloat(user.balance);
      const diff = Math.abs(actualBalance - calculatedBalance);

      const isValid = diff < 0.01; // 소수점 오차 허용 (1센트)

      if (!isValid) {
        console.warn(
          `⚠️ [BalanceService] 잔액 불일치: ${user.username} ` +
          `(실제: ${actualBalance.toLocaleString()}, ` +
          `계산: ${calculatedBalance.toLocaleString()}, ` +
          `차이: ${diff.toLocaleString()})`
        );
      }

      return {
        userId,
        username: user.username,
        actualBalance,
        calculatedBalance,
        difference: diff,
        isValid
      };
    } catch (error) {
      console.error(`❌ [BalanceService] 잔액 검증 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 모든 사용자 잔액 검증
   * 
   * @returns {Promise<{totalUsers, validUsers, invalidUsers, discrepancies}>}
   */
  async verifyAllBalances() {
    try {
      console.log('🔍 [BalanceService] 전체 사용자 잔액 검증 시작...');

      const users = await User.findAll();
      const discrepancies = [];

      for (const user of users) {
        const verification = await this.verifyBalance(user.id);
        
        if (!verification.isValid) {
          discrepancies.push(verification);
        }
      }

      console.log(
        `✅ [BalanceService] 잔액 검증 완료: ` +
        `${users.length}명 중 ${discrepancies.length}명 불일치`
      );

      return {
        totalUsers: users.length,
        validUsers: users.length - discrepancies.length,
        invalidUsers: discrepancies.length,
        discrepancies
      };
    } catch (error) {
      console.error(`❌ [BalanceService] 전체 잔액 검증 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 잔액 차감 (편의 메서드)
   */
  async deductBalance(userId, amount, memo, options = null, transaction) {
    return await this.updateBalance(userId, -Math.abs(amount), memo, options, transaction);
  }

  /**
   * 잔액 추가 (편의 메서드)
   */
  async addBalance(userId, amount, memo, options = null, transaction) {
    return await this.updateBalance(userId, Math.abs(amount), memo, options, transaction);
  }
}

export default new BalanceService();

