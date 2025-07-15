import sequelize from '../models/sequelize.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';

async function updateExistingExchangeOrders() {
  try {
    console.log('기존 Exchange 주문들의 배당율 정보 업데이트 시작...');
    
    // backOdds나 layOdds가 null인 주문들을 찾아서 업데이트
    const orders = await ExchangeOrder.findAll({
      where: {
        [sequelize.Op.or]: [
          { backOdds: null },
          { layOdds: null }
        ]
      }
    });
    
    console.log(`업데이트할 주문 수: ${orders.length}`);
    
    for (const order of orders) {
      const updateData = {};
      
      // side가 'back'이면 backOdds를 price로 설정
      if (order.side === 'back' && !order.backOdds) {
        updateData.backOdds = order.price;
      }
      
      // side가 'lay'이면 layOdds를 price로 설정
      if (order.side === 'lay' && !order.layOdds) {
        updateData.layOdds = order.price;
      }
      
      // oddsSource와 oddsUpdatedAt도 설정
      updateData.oddsSource = 'exchange';
      updateData.oddsUpdatedAt = new Date();
      
      if (Object.keys(updateData).length > 0) {
        await order.update(updateData);
        console.log(`주문 ${order.id} 업데이트:`, updateData);
      }
    }
    
    console.log('기존 Exchange 주문들의 배당율 정보 업데이트 완료!');
    process.exit(0);
  } catch (error) {
    console.error('업데이트 중 오류 발생:', error);
    process.exit(1);
  }
}

updateExistingExchangeOrders(); 