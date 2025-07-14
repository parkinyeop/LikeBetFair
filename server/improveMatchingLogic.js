import sequelize from './models/sequelize.js';

async function improveMatchingLogic() {
  try {
    console.log('=== 매칭 로직 개선 시작 ===\n');
    
    // 1. 현재 open 상태의 주문들 확인
    const [openOrders] = await sequelize.query(`
      SELECT id, "gameId", market, line, side, price, amount, "homeTeam", "awayTeam"
      FROM "ExchangeOrders"
      WHERE status = 'open'
      ORDER BY "createdAt" ASC
    `);
    
    console.log('현재 open 상태 주문 수:', openOrders.length);
    
    if (openOrders.length === 0) {
      console.log('매칭할 주문이 없습니다.');
      return;
    }
    
    // 2. 매칭 가능한 쌍 찾기
    const matches = [];
    const processed = new Set();
    
    for (let i = 0; i < openOrders.length; i++) {
      if (processed.has(openOrders[i].id)) continue;
      
      for (let j = i + 1; j < openOrders.length; j++) {
        if (processed.has(openOrders[j].id)) continue;
        
        const order1 = openOrders[i];
        const order2 = openOrders[j];
        
        // 매칭 조건 확인
        if (
          order1.gameId === order2.gameId &&
          order1.market === order2.market &&
          order1.line === order2.line &&
          order1.price === order2.price &&
          order1.amount === order2.amount &&
          order1.side !== order2.side
        ) {
          matches.push({
            order1: order1,
            order2: order2
          });
          processed.add(order1.id);
          processed.add(order2.id);
          break;
        }
      }
    }
    
    console.log('매칭 가능한 쌍:', matches.length, '개');
    
    // 3. 매칭 실행
    for (const match of matches) {
      console.log(`\n매칭 실행: ${match.order1.id}(${match.order1.side}) <-> ${match.order2.id}(${match.order2.side})`);
      
      const transaction = await sequelize.transaction();
      
      try {
        // 첫 번째 주문을 matched로 변경
        await sequelize.query(`
          UPDATE "ExchangeOrders"
          SET status = 'matched', "matchedOrderId" = :matchedId, "updatedAt" = NOW()
          WHERE id = :orderId
        `, {
          replacements: { 
            matchedId: match.order2.id,
            orderId: match.order1.id
          },
          transaction
        });
        
        // 두 번째 주문을 matched로 변경
        await sequelize.query(`
          UPDATE "ExchangeOrders"
          SET status = 'matched', "matchedOrderId" = :matchedId, "updatedAt" = NOW()
          WHERE id = :orderId
        `, {
          replacements: { 
            matchedId: match.order1.id,
            orderId: match.order2.id
          },
          transaction
        });
        
        await transaction.commit();
        console.log('✅ 매칭 완료');
        
      } catch (error) {
        await transaction.rollback();
        console.error('❌ 매칭 실패:', error);
      }
    }
    
    // 4. 매칭 후 상태 확인
    const [finalStatus] = await sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM "ExchangeOrders"
      GROUP BY status
    `);
    
    console.log('\n최종 상태별 분포:');
    finalStatus.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count}개`);
    });
    
    console.log('\n=== 매칭 로직 개선 완료 ===');
    
  } catch (error) {
    console.error('매칭 로직 개선 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

improveMatchingLogic(); 