import Bet from '../models/betModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import betResultService from '../services/betResultService.js';

async function testBetHistoryAPI() {
  const betId = '423ec960-c6f9-44c6-a105-d69ed013c2de';
  
  console.log('🔍 API 응답 시뮬레이션 테스트');
  console.log(`베팅 ID: ${betId}`);
  console.log('='.repeat(50));
  
  try {
    // 1. 원본 Bet 데이터 조회
    console.log('\n📊 1. 원본 Bet 데이터:');
    const bet = await Bet.findByPk(betId);
    if (!bet) {
      console.log('❌ 베팅을 찾을 수 없습니다.');
      return;
    }
    
    console.log(`- Status: ${bet.status}`);
    console.log(`- Updated At: ${bet.updatedAt}`);
    console.log(`- Selections: ${JSON.stringify(bet.selections.map(s => ({ desc: s.desc, result: s.result })), null, 2)}`);
    
    // 2. processBetResult 호출 전후 비교
    console.log('\n🔄 2. processBetResult 호출 전후 비교:');
    console.log('Before processBetResult:');
    console.log(`- Status: ${bet.status}`);
    
    // processBetResult 호출
    const isCompleted = await betResultService.processBetResult(bet);
    console.log(`- processBetResult 결과: ${isCompleted}`);
    
    console.log('After processBetResult:');
    console.log(`- Status: ${bet.status}`);
    console.log(`- Updated At: ${bet.updatedAt}`);
    
    // 3. DB에서 다시 조회하여 실제 저장 여부 확인
    console.log('\n💾 3. DB 재조회 (실제 저장 확인):');
    const refreshedBet = await Bet.findByPk(betId);
    console.log(`- Status: ${refreshedBet.status}`);
    console.log(`- Updated At: ${refreshedBet.updatedAt}`);
    
    // 4. PaymentHistory 재확인
    console.log('\n💰 4. PaymentHistory 재확인:');
    const refundHistory = await PaymentHistory.findOne({
      where: {
        betId: betId,
        memo: { [require('sequelize').Op.like]: '%환불%' }
      }
    });
    
    if (refundHistory) {
      console.log(`- 환불 기록 존재: ✅`);
      console.log(`- 환불 시간: ${refundHistory.createdAt}`);
      console.log(`- 환불 사유: ${refundHistory.memo}`);
    } else {
      console.log(`- 환불 기록 존재: ❌`);
    }
    
    // 5. 상태 일관성 최종 확인
    console.log('\n🔍 5. 상태 일관성 최종 확인:');
    const hasRefund = !!refundHistory;
    const isCancelled = refreshedBet.status === 'cancelled';
    
    console.log(`- 환불 기록 존재: ${hasRefund ? '✅' : '❌'}`);
    console.log(`- Bet 상태가 cancelled: ${isCancelled ? '✅' : '❌'}`);
    
    if (hasRefund && !isCancelled) {
      console.log('🚨 문제 발견: 환불 기록이 있지만 Bet 상태가 cancelled가 아닙니다!');
      console.log('💡 해결 방안: bet.status를 수동으로 cancelled로 업데이트해야 합니다.');
    } else if (hasRefund && isCancelled) {
      console.log('✅ 정상: 환불 기록과 Bet 상태가 일치합니다.');
    }
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

// 스크립트 실행
testBetHistoryAPI()
  .then(() => {
    console.log('\n✅ API 테스트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  }); 