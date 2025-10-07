import createScriptSequelize from '../config/scriptDatabase.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';

const sequelize = createScriptSequelize();

/**
 * 343번 주문 복구 스크립트
 * - 버그로 인해 경기 시작 전 부당 정산된 주문 복구
 * - 사용자에게 손실 금액 환불
 */
async function fixOrder343() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n🔧 343번 주문 복구 시작...\n');

    // 1. 343번 주문 조회
    const order = await ExchangeOrder.findOne({
      where: { id: 343 },
      transaction
    });

    if (!order) {
      console.log('❌ 343번 주문을 찾을 수 없습니다.');
      await transaction.rollback();
      return;
    }

    console.log('📋 현재 주문 상태:');
    console.log(`  - 주문 ID: ${order.id}`);
    console.log(`  - 사용자 ID: ${order.userId}`);
    console.log(`  - 상태: ${order.status}`);
    console.log(`  - 배팅 금액: ${order.stakeAmount}원`);
    console.log(`  - 실제 수익: ${order.actualProfit}원`);
    console.log(`  - 정산 시간: ${order.settledAt}`);

    // 2. 이미 복구된 주문인지 확인
    if (order.settlementNote && order.settlementNote.includes('복구')) {
      console.log('\n⚠️ 이미 복구된 주문입니다. 중복 복구를 방지합니다.');
      await transaction.rollback();
      return;
    }

    // 3. 사용자 조회
    const user = await User.findByPk(order.userId, { transaction });
    if (!user) {
      console.log('❌ 사용자를 찾을 수 없습니다.');
      await transaction.rollback();
      return;
    }

    console.log('\n👤 사용자 정보:');
    console.log(`  - 사용자 ID: ${user.id}`);
    console.log(`  - 현재 잔액: ${user.balance}원`);

    // 4. 복구 금액 계산
    const refundAmount = Math.abs(parseFloat(order.actualProfit || 0)) + parseFloat(order.stakeAmount || 0);
    console.log('\n💰 복구 금액 계산:');
    console.log(`  - 부당 차감 금액: ${Math.abs(order.actualProfit)}원`);
    console.log(`  - 원본 베팅 금액: ${order.stakeAmount}원`);
    console.log(`  - 총 환불 금액: ${refundAmount}원`);

    // 5. 주문 상태 복구
    await order.update({
      status: 'open',
      settledAt: null,
      actualProfit: null,
      profitLoss: null,
      settlementNote: `[시스템 복구] 버그로 인한 부당 정산 복구 (${new Date().toISOString()})`
    }, { transaction });

    console.log('\n✅ 주문 상태 복구 완료:');
    console.log(`  - 상태: settled → open`);
    console.log(`  - 정산 시간: 제거됨`);
    console.log(`  - 실제 수익: 제거됨`);

    // 6. 사용자 잔액 환불
    const currentBalance = parseFloat(user.balance) || 0;
    const newBalance = currentBalance + refundAmount;

    await user.update({
      balance: newBalance
    }, { transaction });

    console.log('\n💵 사용자 잔액 복구:');
    console.log(`  - 이전 잔액: ${currentBalance}원`);
    console.log(`  - 환불 금액: ${refundAmount}원`);
    console.log(`  - 새 잔액: ${newBalance}원`);

    // 7. 환불 내역 기록
    await PaymentHistory.create({
      userId: user.id,
      betId: `EXCHANGE_${order.id}`,
      type: 'refund',
      amount: refundAmount,
      status: 'completed',
      balanceAfter: newBalance,
      memo: `[시스템 복구] 343번 주문 버그 보상 - 경기 시작 전 부당 정산 환불`,
      paidAt: new Date()
    }, { transaction });

    console.log('\n📝 환불 내역 기록 완료');

    await transaction.commit();

    console.log('\n🎉 343번 주문 복구 완료!');
    console.log('\n📊 복구 요약:');
    console.log(`  - 주문 ID: ${order.id}`);
    console.log(`  - 환불 금액: ${refundAmount}원`);
    console.log(`  - 새 잔액: ${newBalance}원`);
    console.log(`  - 주문 상태: open (매칭 대기 중)`);

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ 복구 실패:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

fixOrder343();

