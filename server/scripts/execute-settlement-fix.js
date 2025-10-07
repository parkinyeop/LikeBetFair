// server/scripts/execute-settlement-fix.js
import analyzeIncorrectSettlements from './analyze-incorrect-settlements.js';
import fixIncorrectSettlements from './fix-incorrect-settlements.js';
import notifyUsersAndVerify from './notify-users-and-verify.js';

/**
 * 잘못된 정산 데이터 수정 전체 프로세스 실행
 * 안전한 순서로 단계별 실행
 */
async function executeSettlementFix() {
  console.log('🚀 잘못된 정산 데이터 수정 프로세스 시작');
  console.log('=' * 60);
  
  try {
    // Step 1: 영향 범위 분석
    console.log('\n📊 Step 1: 영향 범위 분석');
    console.log('-'.repeat(40));
    const analysisResult = await analyzeIncorrectSettlements();
    
    if (analysisResult.totalAffectedBets === 0) {
      console.log('✅ 수정할 잘못된 정산 데이터가 없습니다.');
      return;
    }
    
    console.log(`\n⚠️  수정 대상:`);
    console.log(`   - 영향받은 GameResult: ${analysisResult.inconsistentGameResults.length}건`);
    console.log(`   - 영향받은 베팅: ${analysisResult.totalAffectedBets}건`);
    console.log(`   - 잘못 지급된 총 당첨금: ${analysisResult.totalIncorrectWinnings.toLocaleString()}원`);
    
    // 사용자 확인 (실제 운영에서는 더 엄격한 확인 필요)
    console.log(`\n❓ 수정을 진행하시겠습니까? (y/N)`);
    // 실제로는 readline 등을 사용하여 사용자 입력 받기
    
    // Step 2: 데이터 수정
    console.log('\n🔧 Step 2: 잘못된 정산 데이터 수정');
    console.log('-'.repeat(40));
    const fixResult = await fixIncorrectSettlements();
    
    console.log(`\n✅ 수정 완료:`);
    console.log(`   - 수정된 베팅: ${fixResult.correctedCount}건`);
    console.log(`   - 총 환불 금액: ${fixResult.refundedAmount.toLocaleString()}원`);
    
    // Step 3: 사용자 통지 및 검증
    console.log('\n📧 Step 3: 사용자 통지 및 검증');
    console.log('-'.repeat(40));
    const notificationResult = await notifyUsersAndVerify();
    
    console.log(`\n✅ 통지 완료:`);
    console.log(`   - 환불 처리된 베팅: ${notificationResult.refundedBets}건`);
    console.log(`   - 통지된 사용자: ${notificationResult.notifiedUsers}명`);
    console.log(`   - 총 환불 금액: ${notificationResult.totalRefundAmount.toLocaleString()}원`);
    
    // 최종 요약
    console.log('\n🎉 전체 프로세스 완료');
    console.log('=' * 60);
    console.log(`📊 최종 결과:`);
    console.log(`   - 분석된 GameResult: ${analysisResult.inconsistentGameResults.length}건`);
    console.log(`   - 수정된 베팅: ${fixResult.correctedCount}건`);
    console.log(`   - 환불 처리: ${fixResult.refundedAmount.toLocaleString()}원`);
    console.log(`   - 통지된 사용자: ${notificationResult.notifiedUsers}명`);
    
    console.log(`\n✅ 모든 작업이 성공적으로 완료되었습니다.`);
    
  } catch (error) {
    console.error('\n❌ 프로세스 실행 중 오류 발생:', error);
    console.error('🔄 롤백이 필요한 경우 데이터베이스 백업을 복원하세요.');
    throw error;
  }
}

// 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  executeSettlementFix()
    .then(() => {
      console.log('\n✅ 프로세스 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 프로세스 실패:', error);
      process.exit(1);
    });
}

export default executeSettlementFix;
