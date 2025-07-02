import betCancellationService from '../services/betCancellationService.js';

async function cancelOverdueBet() {
  try {
    const betId = '423ec960-c6f9-44c6-a105-d69ed013c2de';
    const reason = 'J리그 시즌오프 기간 중 잘못 생성된 베팅';
    
    console.log(`🔄 베팅 취소 시작: ${betId}`);
    
    // 안전한 베팅 취소 서비스 사용 (PaymentHistory 자동 기록)
    const result = await betCancellationService.cancelBetWithRefund(
      betId, 
      reason, 
      'admin_manual'
    );
    
    console.log('\n✅ 베팅 취소 및 환불 완료!');
    console.log(`- 베팅 ID: ${result.betId}`);
    console.log(`- 사용자 ID: ${result.userId}`);
    console.log(`- 환불 금액: ${result.refundAmount}원`);
    console.log(`- 기존 잔액: ${result.originalBalance}원`);
    console.log(`- 새 잔액: ${result.newBalance}원`);
    console.log(`- PaymentHistory ID: ${result.paymentHistoryId}`);
    console.log(`- 취소 사유: ${result.reason}`);
    
  } catch (error) {
    console.error('❌ 베팅 취소 실패:', error.message);
  } finally {
    process.exit();
  }
}

cancelOverdueBet(); 