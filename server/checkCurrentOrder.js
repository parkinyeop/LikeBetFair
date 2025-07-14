import ExchangeOrder from './models/exchangeOrderModel.js';

async function checkCurrentOrder() {
  try {
    console.log('=== 현재 ExchangeOrder 확인 ===');
    
    const order = await ExchangeOrder.findByPk(1);
    if (order) {
      console.log('현재 주문 정보:');
      console.log(`   ID: ${order.id}`);
      console.log(`   gameId: ${order.gameId}`);
      console.log(`   homeTeam: ${order.homeTeam}`);
      console.log(`   awayTeam: ${order.awayTeam}`);
      console.log(`   status: ${order.status}`);
      console.log(`   userId: ${order.userId}`);
      console.log(`   createdAt: ${order.createdAt}`);
      console.log(`   updatedAt: ${order.updatedAt}`);
    } else {
      console.log('주문을 찾을 수 없습니다.');
    }
    
    // 전체 오픈 주문도 확인
    const allOpenOrders = await ExchangeOrder.findAll({
      where: { status: 'open' },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`\n전체 오픈 주문 수: ${allOpenOrders.length}개`);
    allOpenOrders.forEach((order, i) => {
      console.log(`${i+1}. ID: ${order.id}, gameId: ${order.gameId}, ${order.homeTeam} vs ${order.awayTeam}`);
    });
    
  } catch (error) {
    console.error('오류:', error);
  }
}

checkCurrentOrder(); 