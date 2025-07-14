const sequelize = require('./models/db.js').default;

async function deleteExchangeOrders() {
  try {
    console.log('🔍 비정상적인 Exchange 주문 삭제 시작...');
    
    // 삭제할 주문 ID들
    const orderIdsToDelete = [5, 6, 7, 8];
    
    for (const orderId of orderIdsToDelete) {
      const result = await sequelize.query(
        'DELETE FROM exchange_orders WHERE id = :orderId',
        {
          replacements: { orderId },
          type: sequelize.QueryTypes.DELETE
        }
      );
      
      console.log(`✅ 주문 ID ${orderId} 삭제 완료`);
    }
    
    // 삭제 후 남은 주문 확인
    const [remainingOrders] = await sequelize.query(
      'SELECT id, gameId, market, side, price, amount, status FROM exchange_orders WHERE status = :status',
      {
        replacements: { status: 'open' },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    console.log('📊 삭제 후 남은 열린 주문:', remainingOrders.length, '개');
    if (remainingOrders.length > 0) {
      console.log('남은 주문들:', remainingOrders);
    }
    
    console.log('✅ 비정상적인 Exchange 주문 삭제 완료');
    
  } catch (error) {
    console.error('❌ 삭제 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

deleteExchangeOrders(); 