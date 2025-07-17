import PaymentHistory from '../models/paymentHistoryModel.js';

async function checkPaymentHistory() {
  try {
    const betId = '423ec960-c6f9-44c6-a105-d69ed013c2de';
    const userId = '14ffe740-4cfd-4611-99a4-b66b3d7bc6be';
    
    console.log(`🔍 베팅 ${betId}의 PaymentHistory 확인 중...`);
    
    // 해당 베팅의 모든 PaymentHistory 조회
    const paymentHistories = await PaymentHistory.findAll({
      where: {
        betId: betId
      },
      order: [['createdAt', 'ASC']]
    });
    
    console.log(`📊 총 ${paymentHistories.length}개의 PaymentHistory 발견`);
    
    if (paymentHistories.length === 0) {
      console.log('❌ 해당 베팅에 대한 PaymentHistory가 없습니다.');
    } else {
      console.log('\n📋 PaymentHistory 상세:');
      paymentHistories.forEach((ph, index) => {
        console.log(`${index + 1}. ID: ${ph.id}`);
        console.log(`   타입: ${ph.type}`);
        console.log(`   금액: ${ph.amount}원`);
        console.log(`   상태: ${ph.status}`);
        console.log(`   메모: ${ph.memo}`);
        console.log(`   생성일: ${ph.createdAt}`);
        console.log(`   잔액: ${ph.balanceAfter}`);
        console.log('');
      });
    }
    
    // 해당 사용자의 모든 PaymentHistory 중 환불 관련 확인
    const refundHistories = await PaymentHistory.findAll({
      where: {
        userId: userId,
        memo: {
          [PaymentHistory.sequelize.Op.like]: '%환불%'
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    console.log(`\n🔄 사용자의 최근 환불 내역 (${refundHistories.length}건):`);
    refundHistories.forEach((ph, index) => {
      console.log(`${index + 1}. ${ph.createdAt}: ${ph.amount}원 - ${ph.memo}`);
      console.log(`   베팅 ID: ${ph.betId || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

checkPaymentHistory(); 