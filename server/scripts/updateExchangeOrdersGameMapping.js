import ExchangeOrder from '../models/exchangeOrderModel.js';
import exchangeGameMappingService from '../services/exchangeGameMappingService.js';

/**
 * 기존 ExchangeOrders 데이터에 게임 매핑 정보 업데이트
 */
async function updateExchangeOrdersGameMapping() {
  try {
    console.log('🔄 기존 ExchangeOrders 게임 매핑 업데이트 시작...');
    
    // 모든 기존 주문 조회
    const orders = await ExchangeOrder.findAll({
      where: {
        homeTeam: null // 아직 매핑되지 않은 주문들
      }
    });
    
    console.log(`📊 매핑 대상 주문 수: ${orders.length}`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const order of orders) {
      try {
        console.log(`\n🎯 주문 ID ${order.id} 매핑 중...`);
        console.log(`  - gameId: ${order.gameId}`);
        console.log(`  - market: ${order.market}`);
        console.log(`  - selection: ${order.selection}`);
        
        // 게임 매핑 시도
        const success = await exchangeGameMappingService.updateOrderGameMapping(order.id);
        
        if (success) {
          console.log(`  ✅ 성공적으로 매핑됨`);
          updatedCount++;
        } else {
          console.log(`  ⚠️ 매핑 실패 - 게임을 찾을 수 없음`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`  ❌ 주문 ${order.id} 매핑 오류:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📈 매핑 결과 요약:');
    console.log(`  - 전체 대상: ${orders.length}개`);
    console.log(`  - 성공: ${updatedCount}개`);
    console.log(`  - 실패: ${errorCount}개`);
    
    // 매핑 결과 확인
    const { Op } = await import('sequelize');
    const mappedOrders = await ExchangeOrder.findAll({
      where: {
        homeTeam: { [Op.ne]: null }
      }
    });
    
    console.log(`\n🎮 매핑된 주문 현황:`);
    for (const order of mappedOrders) {
      console.log(`  ID ${order.id}: ${order.homeTeam} vs ${order.awayTeam} (${order.sportKey})`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 매핑 업데이트 중 오류:', error);
    process.exit(1);
  }
}

// 스크립트 실행
updateExchangeOrdersGameMapping(); 