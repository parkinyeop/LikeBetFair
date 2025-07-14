import sequelize from './models/sequelize.js';

async function fixMatchingInfo() {
  try {
    console.log('=== 매칭 정보 복구 시작 ===\n');
    
    // 1. 현재 matched 상태이지만 matchedOrderId가 null인 주문들 확인
    const [problemOrders] = await sequelize.query(`
      SELECT id, "gameId", market, line, side, price, amount, "homeTeam", "awayTeam", "createdAt"
      FROM "ExchangeOrders"
      WHERE status = 'matched' AND "matchedOrderId" IS NULL
    `);
    
    console.log('매칭 정보가 누락된 주문 수:', problemOrders.length);
    
    if (problemOrders.length === 0) {
      console.log('수정할 주문이 없습니다.');
      return;
    }
    
    for (const order of problemOrders) {
      console.log(`\n주문 ID: ${order.id}`);
      console.log(`경기: ${order.homeTeam} vs ${order.awayTeam}`);
      console.log(`사이드: ${order.side}, 배당률: ${order.price}, 금액: ${order.amount}원`);
      
      // 2. 이 주문과 매칭될 수 있는 상대방 주문 찾기
      const [matchingOrders] = await sequelize.query(`
        SELECT id, side, price, amount, "matchedOrderId"
        FROM "ExchangeOrders"
        WHERE "gameId" = :gameId 
          AND market = :market 
          AND line = :line 
          AND price = :price 
          AND amount = :amount 
          AND side != :side
          AND status = 'matched'
          AND id != :orderId
      `, {
        replacements: {
          gameId: order.gameId,
          market: order.market,
          line: order.line,
          price: order.price,
          amount: order.amount,
          side: order.side,
          orderId: order.id
        }
      });
      
      if (matchingOrders.length === 0) {
        console.log('  ❌ 매칭할 상대방 주문을 찾을 수 없습니다.');
        
        // 3. 매칭할 상대방이 없으면 open 상태로 변경
        await sequelize.query(`
          UPDATE "ExchangeOrders"
          SET status = 'open', "updatedAt" = NOW()
          WHERE id = :orderId
        `, {
          replacements: { orderId: order.id }
        });
        
        console.log('  ✅ 상태를 open으로 변경했습니다.');
        continue;
      }
      
      // 4. 가장 적합한 매칭 상대방 선택 (matchedOrderId가 null인 것 우선)
      const bestMatch = matchingOrders.find(m => m.matchedOrderId === null) || matchingOrders[0];
      
      console.log(`  ✅ 매칭 상대방 찾음: 주문 ID ${bestMatch.id} (${bestMatch.side})`);
      
      // 5. 서로 매칭 정보 업데이트
      const transaction = await sequelize.transaction();
      
      try {
        // 현재 주문을 상대방과 매칭
        await sequelize.query(`
          UPDATE "ExchangeOrders"
          SET "matchedOrderId" = :matchedId, "updatedAt" = NOW()
          WHERE id = :orderId
        `, {
          replacements: { 
            matchedId: bestMatch.id,
            orderId: order.id
          },
          transaction
        });
        
        // 상대방 주문을 현재 주문과 매칭 (아직 매칭되지 않은 경우)
        if (bestMatch.matchedOrderId === null) {
          await sequelize.query(`
            UPDATE "ExchangeOrders"
            SET "matchedOrderId" = :matchedId, "updatedAt" = NOW()
            WHERE id = :orderId
          `, {
            replacements: { 
              matchedId: order.id,
              orderId: bestMatch.id
            },
            transaction
          });
        }
        
        await transaction.commit();
        console.log('  ✅ 매칭 정보 업데이트 완료');
        
      } catch (error) {
        await transaction.rollback();
        console.error('  ❌ 매칭 정보 업데이트 실패:', error);
      }
    }
    
    // 6. 수정 후 상태 확인
    const [finalStatus] = await sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM "ExchangeOrders"
      GROUP BY status
    `);
    
    console.log('\n수정 후 주문 상태:');
    finalStatus.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count}개`);
    });
    
    // 7. 매칭 정보가 제대로 설정된 주문들 확인
    const [matchedWithInfo] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM "ExchangeOrders"
      WHERE status = 'matched' AND "matchedOrderId" IS NOT NULL
    `);
    
    console.log(`\n매칭 정보가 있는 주문: ${matchedWithInfo[0].count}개`);
    
    // 8. 매칭 쌍 확인
    const [matchingPairs] = await sequelize.query(`
      SELECT e1.id as order1_id, e1.side as order1_side, e1."matchedOrderId" as order1_matched,
             e2.id as order2_id, e2.side as order2_side, e2."matchedOrderId" as order2_matched
      FROM "ExchangeOrders" e1
      JOIN "ExchangeOrders" e2 ON e1."matchedOrderId" = e2.id
      WHERE e1.status = 'matched' AND e2.status = 'matched'
      ORDER BY e1.id
    `);
    
    console.log('\n매칭된 주문 쌍들:');
    matchingPairs.forEach(pair => {
      console.log(`  ${pair.order1_id}(${pair.order1_side}) <-> ${pair.order2_id}(${pair.order2_side})`);
    });
    
    console.log('\n=== 매칭 정보 복구 완료 ===');
    
  } catch (error) {
    console.error('매칭 정보 복구 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

fixMatchingInfo(); 