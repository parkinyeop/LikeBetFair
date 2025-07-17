import Bet from '../models/betModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import { Op } from 'sequelize';

async function checkBetStatusAndPaymentHistory() {
  const betId = '423ec960-c6f9-44c6-a105-d69ed013c2de'; // 문제가 된 베팅 ID
  
  console.log('🔍 베팅 상태 및 PaymentHistory 점검 시작');
  console.log(`베팅 ID: ${betId}`);
  console.log('='.repeat(50));
  
  try {
    // 1. Bet 테이블 상태 확인
    console.log('\n📊 1. Bet 테이블 상태:');
    const bet = await Bet.findByPk(betId);
    if (!bet) {
      console.log('❌ 베팅을 찾을 수 없습니다.');
      return;
    }
    
    console.log(`- ID: ${bet.id}`);
    console.log(`- User ID: ${bet.userId}`);
    console.log(`- Status: ${bet.status}`);
    console.log(`- Stake: ${bet.stake}원`);
    console.log(`- Created At: ${bet.createdAt}`);
    console.log(`- Updated At: ${bet.updatedAt}`);
    console.log(`- Selections: ${JSON.stringify(bet.selections, null, 2)}`);
    
    // 2. PaymentHistory 확인
    console.log('\n💰 2. PaymentHistory 확인:');
    const paymentHistories = await PaymentHistory.findAll({
      where: { betId: betId }
    });
    
    if (paymentHistories.length === 0) {
      console.log('❌ 해당 베팅에 대한 PaymentHistory가 없습니다.');
    } else {
      console.log(`✅ PaymentHistory ${paymentHistories.length}개 발견:`);
      paymentHistories.forEach((ph, index) => {
        console.log(`\n  ${index + 1}. PaymentHistory ID: ${ph.id}`);
        console.log(`     - Amount: ${ph.amount}원`);
        console.log(`     - Memo: ${ph.memo}`);
        console.log(`     - Created At: ${ph.createdAt}`);
        console.log(`     - Paid At: ${ph.paidAt}`);
        console.log(`     - Balance After: ${ph.balanceAfter}원`);
      });
    }
    
    // 3. 환불 관련 PaymentHistory만 확인
    console.log('\n🔄 3. 환불 관련 PaymentHistory:');
    const refundHistories = await PaymentHistory.findAll({
      where: {
        betId: betId,
        memo: { [Op.like]: '%환불%' }
      }
    });
    
    if (refundHistories.length === 0) {
      console.log('❌ 환불 관련 PaymentHistory가 없습니다.');
    } else {
      console.log(`✅ 환불 관련 PaymentHistory ${refundHistories.length}개 발견:`);
      refundHistories.forEach((ph, index) => {
        console.log(`\n  ${index + 1}. 환불 ID: ${ph.id}`);
        console.log(`     - 환불 금액: ${ph.amount}원`);
        console.log(`     - 환불 사유: ${ph.memo}`);
        console.log(`     - 환불 시간: ${ph.createdAt}`);
      });
    }
    
    // 4. 상태 일관성 검사
    console.log('\n🔍 4. 상태 일관성 검사:');
    const hasRefund = refundHistories.length > 0;
    const isCancelled = bet.status === 'cancelled';
    
    console.log(`- 환불 기록 존재: ${hasRefund ? '✅' : '❌'}`);
    console.log(`- Bet 상태가 cancelled: ${isCancelled ? '✅' : '❌'}`);
    
    if (hasRefund && !isCancelled) {
      console.log('🚨 문제 발견: 환불 기록이 있지만 Bet 상태가 cancelled가 아닙니다!');
    } else if (!hasRefund && isCancelled) {
      console.log('⚠️  주의: 환불 기록이 없지만 Bet 상태가 cancelled입니다.');
    } else if (hasRefund && isCancelled) {
      console.log('✅ 정상: 환불 기록과 Bet 상태가 일치합니다.');
    } else {
      console.log('ℹ️  정보: 환불 기록과 Bet 상태 모두 없습니다.');
    }
    
    // 5. 최근 업데이트 시간 확인
    console.log('\n⏰ 5. 최근 업데이트 시간:');
    console.log(`- Bet Updated At: ${bet.updatedAt}`);
    if (refundHistories.length > 0) {
      const latestRefund = refundHistories.reduce((latest, current) => 
        current.createdAt > latest.createdAt ? current : latest
      );
      console.log(`- 최신 환불 시간: ${latestRefund.createdAt}`);
      
      if (bet.updatedAt < latestRefund.createdAt) {
        console.log('⚠️  주의: Bet 업데이트 시간이 환불 시간보다 이전입니다.');
      } else {
        console.log('✅ Bet 업데이트 시간이 환불 시간 이후입니다.');
      }
    }
    
  } catch (error) {
    console.error('❌ 점검 중 오류 발생:', error);
  }
}

// 스크립트 실행
checkBetStatusAndPaymentHistory()
  .then(() => {
    console.log('\n✅ 점검 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  }); 