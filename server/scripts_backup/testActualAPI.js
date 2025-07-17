import Bet from '../models/betModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import { Op } from 'sequelize';

async function testActualAPI() {
  const betId = '423ec960-c6f9-44c6-a105-d69ed013c2de';
  
  console.log('🔍 실제 API 응답 확인');
  console.log(`베팅 ID: ${betId}`);
  console.log('='.repeat(50));
  
  try {
    // 1. 현재 DB 상태 확인
    console.log('\n📊 1. 현재 DB 상태:');
    const bet = await Bet.findByPk(betId);
    if (!bet) {
      console.log('❌ 베팅을 찾을 수 없습니다.');
      return;
    }
    
    console.log(`- Status: ${bet.status}`);
    console.log(`- Updated At: ${bet.updatedAt}`);
    
    // 2. PaymentHistory 확인
    console.log('\n💰 2. PaymentHistory 확인:');
    const refundHistory = await PaymentHistory.findOne({
      where: {
        betId: betId,
        memo: { [Op.like]: '%환불%' }
      }
    });
    
    console.log(`- 환불 기록 존재: ${!!refundHistory ? '✅' : '❌'}`);
    if (refundHistory) {
      console.log(`- 환불 시간: ${refundHistory.createdAt}`);
      console.log(`- 환불 사유: ${refundHistory.memo}`);
    }
    
    // 3. API 응답 시뮬레이션 (getBetHistory 로직)
    console.log('\n🔄 3. API 응답 시뮬레이션 (getBetHistory 로직):');
    
    // getBetHistory에서 하는 것과 동일한 로직
    const bets = await Bet.findAll({
      where: { userId: bet.userId },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`- 사용자 총 베팅 수: ${bets.length}개`);
    
    // 해당 베팅 찾기
    const targetBet = bets.find(b => b.id === betId);
    if (targetBet) {
      console.log(`- 찾은 베팅 Status: ${targetBet.status}`);
      console.log(`- 찾은 베팅 Updated At: ${targetBet.updatedAt}`);
    }
    
    // 4. 최종 상태 확인
    console.log('\n🔍 4. 최종 상태 확인:');
    const hasRefund = !!refundHistory;
    const isCancelled = bet.status === 'cancelled';
    
    console.log(`- 환불 기록 존재: ${hasRefund ? '✅' : '❌'}`);
    console.log(`- Bet 상태가 cancelled: ${isCancelled ? '✅' : '❌'}`);
    
    if (hasRefund && isCancelled) {
      console.log('✅ 정상: 환불 기록과 Bet 상태가 일치합니다.');
      console.log('💡 프론트엔드에서도 cancelled로 표시될 것입니다.');
    } else if (hasRefund && !isCancelled) {
      console.log('🚨 문제: 환불 기록이 있지만 Bet 상태가 cancelled가 아닙니다.');
    } else {
      console.log('ℹ️  정보: 환불 기록과 Bet 상태가 일치합니다.');
    }
    
    // 5. 프론트엔드 표시 예상
    console.log('\n📱 5. 프론트엔드 표시 예상:');
    if (isCancelled) {
      console.log('✅ 프론트엔드에서 "취소됨" 또는 "환불됨"으로 표시될 것입니다.');
      console.log('✅ "진행 중" 상태로 표시되지 않을 것입니다.');
    } else {
      console.log('❌ 프론트엔드에서 여전히 "진행 중"으로 표시될 수 있습니다.');
    }
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

// 스크립트 실행
testActualAPI()
  .then(() => {
    console.log('\n✅ API 테스트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  }); 