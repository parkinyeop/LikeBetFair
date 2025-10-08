import createScriptSequelize from '../config/scriptDatabase.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';

const sequelize = createScriptSequelize();

(async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 EXCHANGE_348 롤백 시작...\n');
    
    // 1. 사용자 정보 조회
    const mainUserId = 'fe128695-1fb8-485e-8f16-c52ac014516e';
    const referrerUserId = 'fb4b780d-c7c0-4112-90fd-f7ca85427a90';
    
    const mainUser = await User.findByPk(mainUserId, { transaction });
    const referrerUser = await User.findByPk(referrerUserId, { transaction });
    
    console.log('현재 잔액:');
    console.log('- 주문 사용자:', mainUser.username, mainUser.balance, '원');
    console.log('- 추천인:', referrerUser.username, referrerUser.balance, '원');
    console.log('');
    
    // 2. 잔액 확인 (음수 방지)
    const rollbackAmount = 8901790.20;
    const referrerRollback = 982831.00;
    
    if (mainUser.balance < rollbackAmount) {
      console.log('⚠️ 경고: 사용자 잔액 부족');
      console.log(`   현재: ${mainUser.balance}원`);
      console.log(`   필요: ${rollbackAmount}원`);
      console.log(`   부족: ${rollbackAmount - mainUser.balance}원`);
      console.log('');
      console.log('❌ 롤백 중단 (음수 잔액 방지)');
      await transaction.rollback();
      process.exit(1);
    }
    
    if (referrerUser.balance < referrerRollback) {
      console.log('⚠️ 경고: 추천인 잔액 부족');
      console.log(`   현재: ${referrerUser.balance}원`);
      console.log(`   필요: ${referrerRollback}원`);
      console.log(`   부족: ${referrerRollback - referrerUser.balance}원`);
      console.log('');
      console.log('❌ 롤백 중단 (음수 잔액 방지)');
      await transaction.rollback();
      process.exit(1);
    }
    
    console.log('✅ 잔액 확인 완료 (충분함)\n');
    
    // 3. 주문 사용자 잔액 차감
    const newMainBalance = Number(mainUser.balance) - rollbackAmount;
    await mainUser.update({ balance: newMainBalance }, { transaction });
    
    await PaymentHistory.create({
      userId: mainUserId,
      betId: 'EXCHANGE_348_ROLLBACK',
      amount: -rollbackAmount,
      balanceAfter: newMainBalance,
      memo: '오지급 롤백 (scheduled 상태 정산) - EXCHANGE_348 승리 수익 회수: 8,901,790원',
      paidAt: new Date()
    }, { transaction });
    
    console.log('✅ 주문 사용자 롤백 완료:', -rollbackAmount, '원');
    console.log('   새 잔액:', newMainBalance, '원');
    console.log('');
    
    // 4. 추천인 수수료 회수
    const newReferrerBalance = Number(referrerUser.balance) - referrerRollback;
    await referrerUser.update({ balance: newReferrerBalance }, { transaction });
    
    await PaymentHistory.create({
      userId: referrerUserId,
      betId: 'EXCHANGE_348_ROLLBACK',
      amount: -referrerRollback,
      balanceAfter: newReferrerBalance,
      memo: '오지급 롤백 (scheduled 상태 정산) - EXCHANGE_348 추천인 수수료 회수: 982,831원',
      paidAt: new Date()
    }, { transaction });
    
    console.log('✅ 추천인 수수료 회수 완료:', -referrerRollback, '원');
    console.log('   새 잔액:', newReferrerBalance, '원');
    console.log('');
    
    // 5. 커밋
    await transaction.commit();
    
    console.log('='.repeat(80));
    console.log('✅ 롤백 완료!');
    console.log('='.repeat(80));
    console.log('');
    console.log('- 주문 사용자 회수: -8,901,790원');
    console.log('- 추천인 회수: -982,831원');
    console.log('- 총 회수: -9,884,621원');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ 에러:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
