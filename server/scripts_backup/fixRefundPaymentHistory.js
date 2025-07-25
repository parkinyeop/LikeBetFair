import Bet from '../models/betModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import sequelize from '../models/sequelize.js';

async function fixRefundPaymentHistory() {
  console.log('🚨 긴급 수정: 환불 PaymentHistory 기록 추가');
  
  const betId = '423ec960-c6f9-44c6-a105-d69ed013c2de';
  const userId = '14ffe740-4cfd-4611-99a4-b66b3d7bc6be';
  const refundAmount = 100000;
  
  const transaction = await sequelize.transaction();
  
  try {
    // 베팅 정보 확인
    const bet = await Bet.findByPk(betId);
    if (!bet || bet.status !== 'cancelled') {
      console.log('❌ 베팅이 취소 상태가 아닙니다.');
      await transaction.rollback();
      return;
    }
    
    // 이미 환불 기록이 있는지 확인
    const existingRefund = await PaymentHistory.findOne({
      where: {
        userId: userId,
        type: 'refund',
        amount: refundAmount,
        description: { [sequelize.Op.like]: '%423ec960%' }
      }
    });
    
    if (existingRefund) {
      console.log('✅ 환불 기록이 이미 존재합니다:', existingRefund.id);
      await transaction.rollback();
      return;
    }
    
    // PaymentHistory 기록 추가
    const user = await User.findByPk(userId);
    const paymentHistory = await PaymentHistory.create({
      userId: userId,
      type: 'refund', 
      amount: refundAmount,
      status: 'completed',
      method: 'system_refund',
      description: `베팅 취소 환불 (ID: ${betId}) - J리그 시즌오프 기간 잘못 허용된 베팅`,
      balanceAfter: user.balance,
      metadata: {
        betId: betId,
        refundReason: 'season_offseason',
        originalStake: bet.stake,
        refundedAt: new Date().toISOString(),
        processedBy: 'system_admin'
      }
    }, { transaction });
    
    await transaction.commit();
    
    console.log('✅ PaymentHistory 기록 추가 완료:');
    console.log(`- Payment ID: ${paymentHistory.id}`);
    console.log(`- 사용자 ID: ${userId}`);
    console.log(`- 환불 금액: ${refundAmount.toLocaleString()}원`);
    console.log(`- 베팅 ID: ${betId}`);
    console.log(`- 생성 시간: ${paymentHistory.createdAt}`);
    
    // 사용자 최근 결제 내역 확인
    console.log('\n📋 사용자 최근 결제 내역:');
    const recentPayments = await PaymentHistory.findAll({
      where: { userId: userId },
      order: [['createdAt', 'DESC']],
      limit: 3
    });
    
    recentPayments.forEach(p => {
      console.log(`- ${p.createdAt}: ${p.type} ${p.amount.toLocaleString()}원 (${p.status})`);
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ PaymentHistory 기록 추가 실패:', error);
  }
}

fixRefundPaymentHistory(); 