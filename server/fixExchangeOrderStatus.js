import sequelize from './models/sequelize.js';

async function fixExchangeOrderStatus() {
  try {
    console.log('=== ExchangeOrders 상태 수정 시작 ===\n');
    
    // 1. 현재 문제가 있는 주문 확인
    const [problemOrders] = await sequelize.query(`
      SELECT id, status, "matchedOrderId", "gameId", "homeTeam", "awayTeam", "side", "price", "amount"
      FROM "ExchangeOrders" 
      WHERE status = 'matched' AND "matchedOrderId" IS NULL
    `);
    
    console.log('문제가 있는 주문 수:', problemOrders.length);
    
    if (problemOrders.length > 0) {
      problemOrders.forEach(order => {
        console.log(`  주문 ID: ${order.id}, ${order.homeTeam} vs ${order.awayTeam}`);
        console.log(`    ${order.side} ${order.amount}원 @ ${order.price}, 상태: ${order.status}`);
      });
      
      // 2. 상태를 'open'으로 변경
      console.log('\n상태를 open으로 변경 중...');
      await sequelize.query(`
        UPDATE "ExchangeOrders" 
        SET status = 'open', "updatedAt" = NOW()
        WHERE status = 'matched' AND "matchedOrderId" IS NULL
      `);
      
      console.log('✅ 상태 수정 완료');
    }
    
    // 3. 수정 후 상태 확인
    const [afterFix] = await sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM "ExchangeOrders"
      GROUP BY status
    `);
    
    console.log('\n수정 후 상태별 분포:');
    afterFix.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count}개`);
    });
    
    // 4. 매칭 가능한 주문 쌍 확인
    const [matchingPairs] = await sequelize.query(`
      SELECT 
        e1.id as order1_id, e1.side as order1_side, e1.price as order1_price, e1.amount as order1_amount,
        e2.id as order2_id, e2.side as order2_side, e2.price as order2_price, e2.amount as order2_amount
      FROM "ExchangeOrders" e1
      JOIN "ExchangeOrders" e2 ON 
        e1."gameId" = e2."gameId" AND
        e1."market" = e2."market" AND
        e1."line" = e2."line" AND
        e1."price" = e2."price" AND
        e1."amount" = e2."amount" AND
        e1.side != e2.side AND
        e1.status = 'open' AND
        e2.status = 'open' AND
        e1.id < e2.id
    `);
    
    console.log('\n매칭 가능한 주문 쌍:', matchingPairs.length, '개');
    if (matchingPairs.length > 0) {
      console.log('매칭 가능한 쌍들:');
      matchingPairs.forEach(pair => {
        console.log(`  ${pair.order1_id}(${pair.order1_side}) <-> ${pair.order2_id}(${pair.order2_side})`);
      });
    }
    
    console.log('\n=== 수정 완료 ===');
    
  } catch (error) {
    console.error('수정 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

fixExchangeOrderStatus(); 