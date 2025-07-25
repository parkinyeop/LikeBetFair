import Bet from '../models/betModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import sequelize from '../models/sequelize.js';
import { Op } from 'sequelize';

class BetCancellationService {
  
  /**
   * 안전한 베팅 취소 및 환불 (PaymentHistory 강제 기록)
   * @param {string} betId - 취소할 베팅 ID
   * @param {string} reason - 취소 사유
   * @param {string} processedBy - 처리자 (system, admin, user)
   * @returns {Object} 취소 결과
   */
  async cancelBetWithRefund(betId, reason, processedBy = 'system') {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`[BetCancellation] 베팅 취소 시작: ${betId}`);
      
      // 1. 베팅 조회 및 검증
      const bet = await Bet.findByPk(betId, { 
        transaction,
        lock: transaction.LOCK.UPDATE 
      });
      
      if (!bet) {
        throw new Error(`베팅을 찾을 수 없습니다: ${betId}`);
      }
      
      if (bet.status !== 'pending') {
        throw new Error(`취소 불가능한 베팅 상태: ${bet.status}`);
      }
      
      // 2. 사용자 조회 및 잠금
      const user = await User.findByPk(bet.userId, { 
        transaction,
        lock: transaction.LOCK.UPDATE 
      });
      
      if (!user) {
        throw new Error(`사용자를 찾을 수 없습니다: ${bet.userId}`);
      }
      
      const refundAmount = Number(bet.stake);
      const originalBalance = Number(user.balance);
      const newBalance = originalBalance + refundAmount;
      
      // 3. 중복 환불 체크
      const existingRefund = await PaymentHistory.findOne({
        where: {
          userId: bet.userId,
          betId: betId,
          amount: refundAmount,
          memo: { [Op.like]: '%환불%' }
        },
        transaction
      });
      
      if (existingRefund) {
        throw new Error(`이미 환불 처리된 베팅입니다: ${existingRefund.id}`);
      }
      
      // 4. 베팅 상태 변경
      bet.status = 'cancelled';
      await bet.save({ transaction });
      
      // 5. 사용자 잔액 업데이트
      user.balance = newBalance;
      await user.save({ transaction });
      
      // 6. ⭐ PaymentHistory 기록 (필수!)
      const paymentHistory = await PaymentHistory.create({
        userId: bet.userId,
        betId: betId,
        amount: refundAmount,
        memo: `베팅 취소 환불 - ${reason}`,
        paidAt: new Date(),
        balanceAfter: newBalance,
        metadata: {
          originalStake: bet.stake,
          refundReason: reason,
          processedBy: processedBy,
          betSelections: bet.selections,
          cancelledAt: new Date().toISOString()
        }
      }, { transaction });
      
      await transaction.commit();
      
      const result = {
        success: true,
        betId: betId,
        userId: bet.userId,
        refundAmount: refundAmount,
        originalBalance: originalBalance,
        newBalance: newBalance,
        paymentHistoryId: paymentHistory.id,
        reason: reason,
        processedBy: processedBy,
        timestamp: new Date().toISOString()
      };
      
      console.log(`[BetCancellation] ✅ 베팅 취소 완료:`, result);
      return result;
      
    } catch (error) {
      await transaction.rollback();
      console.error(`[BetCancellation] ❌ 베팅 취소 실패:`, error.message);
      throw error;
    }
  }
  
  /**
   * 다중 베팅 일괄 취소
   * @param {Array} betIds - 취소할 베팅 ID 배열
   * @param {string} reason - 취소 사유
   * @param {string} processedBy - 처리자
   * @returns {Object} 일괄 취소 결과
   */
  async cancelMultipleBets(betIds, reason, processedBy = 'system') {
    const results = {
      successful: [],
      failed: [],
      totalRefunded: 0
    };
    
    for (const betId of betIds) {
      try {
        const result = await this.cancelBetWithRefund(betId, reason, processedBy);
        results.successful.push(result);
        results.totalRefunded += result.refundAmount;
      } catch (error) {
        results.failed.push({
          betId: betId,
          error: error.message
        });
      }
    }
    
    console.log(`[BetCancellation] 일괄 취소 완료: ${results.successful.length}성공, ${results.failed.length}실패`);
    return results;
  }
  
  /**
   * 시즌오프 베팅 자동 취소
   * @param {string} sportKey - 스포츠 키
   * @returns {Object} 자동 취소 결과
   */
  async cancelOffseasonBets(sportKey) {
    console.log(`[BetCancellation] ${sportKey} 시즌오프 베팅 자동 취소 시작`);
    
    // pending 상태의 해당 스포츠 베팅 조회
    const offseasonBets = await Bet.findAll({
      where: {
        status: 'pending'
      }
    });
    
    // 해당 스포츠 베팅 필터링
    const targetBets = offseasonBets.filter(bet => 
      bet.selections && bet.selections.some(sel => sel.sport_key === sportKey)
    );
    
    if (targetBets.length === 0) {
      console.log(`[BetCancellation] ${sportKey} 관련 pending 베팅이 없습니다`);
      return { successful: [], failed: [], totalRefunded: 0 };
    }
    
    const betIds = targetBets.map(bet => bet.id);
    const reason = `${sportKey} 시즌오프로 인한 자동 취소`;
    
    return await this.cancelMultipleBets(betIds, reason, 'system_auto');
  }
  
  /**
   * 베팅 취소 내역 조회
   * @param {string} userId - 사용자 ID (선택)
   * @param {number} limit - 조회 건수
   * @returns {Array} 취소 내역
   */
  async getCancellationHistory(userId = null, limit = 50) {
    const whereClause = {
      memo: { [Op.like]: '%취소%' }
    };
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    return await PaymentHistory.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: limit,
      include: [{
        model: Bet,
        as: 'bet',
        attributes: ['id', 'stake', 'status', 'selections']
      }]
    });
  }
}

export default new BetCancellationService(); 