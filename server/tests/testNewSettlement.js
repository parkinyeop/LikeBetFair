import NewExchangeSettlementService from '../services/newExchangeSettlementService.js';

async function testNewSettlement() {
  console.log('🧪 새로운 정산 시스템 테스트 시작...\n');
  
  try {
    const settlementService = new NewExchangeSettlementService();
    
    // 전체 정산 실행
    const result = await settlementService.settleAllFinishedGames();
    
    console.log('\n📊 정산 결과:');
    console.log(`- 정산된 경기 수: ${result.settledGames}`);
    console.log(`- 정산된 주문 수: ${result.settledOrders}`);
    
    if (result.results && result.results.length > 0) {
      console.log('\n🏆 정산된 경기 상세:');
      result.results.forEach((game, index) => {
        console.log(`${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`   - 정산 주문 수: ${game.settledOrders}`);
        console.log(`   - 총 수익: ${game.totalWinnings.toLocaleString()}원`);
      });
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testNewSettlement();
