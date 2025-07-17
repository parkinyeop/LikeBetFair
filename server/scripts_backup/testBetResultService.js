import betResultService from '../services/betResultService.js';
import Bet from '../models/betModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import { Op } from 'sequelize';

async function testBetResultService() {
  const betId = '423ec960-c6f9-44c6-a105-d69ed013c2de';
  
  console.log('🔍 betResultService.updateBetResults() 테스트');
  console.log(`베팅 ID: ${betId}`);
  console.log('='.repeat(50));
  
  try {
    // 1. 실행 전 상태 확인
    console.log('\n📊 1. 실행 전 상태:');
    const betBefore = await Bet.findByPk(betId);
    console.log(`- Status: ${betBefore.status}`);
    console.log(`- Updated At: ${betBefore.updatedAt}`);
    
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
    
    // 3. betResultService.updateBetResults() 실행
    console.log('\n🔄 3. betResultService.updateBetResults() 실행:');
    console.log('실행 시작...');
    
    const result = await betResultService.updateBetResults();
    
    console.log('실행 완료!');
    console.log(`- 결과: ${JSON.stringify(result)}`);
    
    // 4. 실행 후 상태 확인
    console.log('\n📊 4. 실행 후 상태:');
    const betAfter = await Bet.findByPk(betId);
    console.log(`- Status: ${betAfter.status}`);
    console.log(`- Updated At: ${betAfter.updatedAt}`);
    
    // 5. 상태 변화 확인
    console.log('\n🔍 5. 상태 변화 확인:');
    const statusChanged = betBefore.status !== betAfter.status;
    const timeChanged = betBefore.updatedAt.getTime() !== betAfter.updatedAt.getTime();
    
    console.log(`- Status 변화: ${statusChanged ? '✅' : '❌'}`);
    console.log(`- Updated At 변화: ${timeChanged ? '✅' : '❌'}`);
    
    if (statusChanged) {
      console.log(`- 이전 상태: ${betBefore.status} → 현재 상태: ${betAfter.status}`);
    }
    
    // 6. 최종 검증
    console.log('\n✅ 6. 최종 검증:');
    const hasRefund = !!refundHistory;
    const isCancelled = betAfter.status === 'cancelled';
    
    console.log(`- 환불 기록 존재: ${hasRefund ? '✅' : '❌'}`);
    console.log(`- Bet 상태가 cancelled: ${isCancelled ? '✅' : '❌'}`);
    
    if (hasRefund && isCancelled) {
      console.log('✅ 정상: 환불 기록과 Bet 상태가 일치합니다.');
    } else if (hasRefund && !isCancelled) {
      console.log('🚨 문제: 환불 기록이 있지만 Bet 상태가 cancelled가 아닙니다.');
      console.log('💡 betResultService.updateBetResults()가 제대로 작동하지 않았습니다.');
    }
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

// 스크립트 실행
testBetResultService()
  .then(() => {
    console.log('\n✅ betResultService 테스트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  }); 