import exchangeSettlementService from '../services/exchangeSettlementService.js';

async function testUnmatchedOrderCancellation() {
  try {
    console.log('=== 매칭되지 않은 주문 자동 취소 테스트 시작 ===\n');
    
    // 자동 취소 실행
    const result = await exchangeSettlementService.cancelUnmatchedOrdersAtKickoff();
    
    console.log('\n=== 테스트 결과 ===');
    console.log(`취소된 주문 수: ${result.cancelledCount}개`);
    console.log(`총 환불 금액: ${result.totalRefund}원`);
    
    if (result.cancelledCount > 0) {
      console.log('\n✅ 자동 취소가 성공적으로 실행되었습니다.');
      console.log('프론트엔드에서 주문 목록을 새로고침하면 취소된 주문을 확인할 수 있습니다.');
    } else {
      console.log('\nℹ️ 취소할 주문이 없습니다.');
    }
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

testUnmatchedOrderCancellation(); 