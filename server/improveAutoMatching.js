import sequelize from './models/sequelize.js';

async function improveAutoMatching() {
  try {
    console.log('=== 자동 매칭 시스템 개선 시작 ===\n');
    
    // 1. 현재 매칭 가능한 주문들 확인
    const [openOrders] = await sequelize.query(`
      SELECT id, "gameId", market, line, side, price, amount, "homeTeam", "awayTeam", "createdAt"
      FROM "ExchangeOrders"
      WHERE status = 'open'
      ORDER BY "createdAt" ASC
    `);
    
    console.log('현재 open 상태 주문 수:', openOrders.length);
    
    if (openOrders.length === 0) {
      console.log('매칭할 주문이 없습니다.');
      return;
    }
    
    // 2. 매칭 가능한 쌍 찾기 (가격 일치)
    const exactMatches = [];
    const processed = new Set();
    
    for (let i = 0; i < openOrders.length; i++) {
      if (processed.has(openOrders[i].id)) continue;
      
      for (let j = i + 1; j < openOrders.length; j++) {
        if (processed.has(openOrders[j].id)) continue;
        
        const order1 = openOrders[i];
        const order2 = openOrders[j];
        
        // 정확한 매칭 조건
        if (
          order1.gameId === order2.gameId &&
          order1.market === order2.market &&
          order1.line === order2.line &&
          order1.price === order2.price &&
          order1.amount === order2.amount &&
          order1.side !== order2.side
        ) {
          exactMatches.push({ order1, order2 });
          processed.add(order1.id);
          processed.add(order2.id);
          break;
        }
      }
    }
    
    console.log('정확한 매칭 가능한 쌍:', exactMatches.length, '개');
    
    // 3. 부분 매칭 찾기 (가격이 다르지만 호환 가능한 경우)
    const partialMatches = [];
    const remainingOrders = openOrders.filter(order => !processed.has(order.id));
    
    for (let i = 0; i < remainingOrders.length; i++) {
      if (processed.has(remainingOrders[i].id)) continue;
      
      for (let j = i + 1; j < remainingOrders.length; j++) {
        if (processed.has(remainingOrders[j].id)) continue;
        
        const order1 = remainingOrders[i];
        const order2 = remainingOrders[j];
        
        // 부분 매칭 조건 (같은 게임, 마켓, 라인, 반대 사이드)
        if (
          order1.gameId === order2.gameId &&
          order1.market === order2.market &&
          order1.line === order2.line &&
          order1.side !== order2.side &&
          order1.amount === order2.amount
        ) {
          partialMatches.push({ order1, order2 });
          processed.add(order1.id);
          processed.add(order2.id);
          break;
        }
      }
    }
    
    console.log('부분 매칭 가능한 쌍:', partialMatches.length, '개');
    
    // 4. 정확한 매칭 실행
    for (const match of exactMatches) {
      console.log(`\n정확한 매칭 실행: ${match.order1.id}(${match.order1.side}) <-> ${match.order2.id}(${match.order2.side})`);
      
      const transaction = await sequelize.transaction();
      
      try {
        // 첫 번째 주문 매칭
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
        
        // 두 번째 주문 매칭
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
        console.log('✅ 정확한 매칭 완료');
        
      } catch (error) {
        await transaction.rollback();
        console.error('❌ 정확한 매칭 실패:', error);
      }
    }
    
    // 5. 부분 매칭 실행 (가격 조정 필요)
    for (const match of partialMatches) {
      console.log(`\n부분 매칭 실행: ${match.order1.id}(${match.order1.side}@${match.order1.price}) <-> ${match.order2.id}(${match.order2.side}@${match.order2.price})`);
      
      const transaction = await sequelize.transaction();
      
      try {
        // 중간 가격 계산
        const middlePrice = (match.order1.price + match.order2.price) / 2;
        
        // 첫 번째 주문 매칭 (가격 조정)
        await sequelize.query(`
          UPDATE "ExchangeOrders"
          SET status = 'matched', "matchedOrderId" = :matchedId, price = :middlePrice, "updatedAt" = NOW()
          WHERE id = :orderId
        `, {
          replacements: { 
            matchedId: match.order2.id,
            middlePrice,
            orderId: match.order1.id
          },
          transaction
        });
        
        // 두 번째 주문 매칭 (가격 조정)
        await sequelize.query(`
          UPDATE "ExchangeOrders"
          SET status = 'matched', "matchedOrderId" = :matchedId, price = :middlePrice, "updatedAt" = NOW()
          WHERE id = :orderId
        `, {
          replacements: { 
            matchedId: match.order1.id,
            middlePrice,
            orderId: match.order2.id
          },
          transaction
        });
        
        await transaction.commit();
        console.log(`✅ 부분 매칭 완료 (조정된 가격: ${middlePrice})`);
        
      } catch (error) {
        await transaction.rollback();
        console.error('❌ 부분 매칭 실패:', error);
      }
    }
    
    // 6. 매칭 후 상태 확인
    const [finalStatus] = await sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM "ExchangeOrders"
      GROUP BY status
    `);
    
    console.log('\n최종 주문 상태:');
    finalStatus.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count}개`);
    });
    
    // 7. 매칭되지 않은 주문들
    const [unmatchedCount] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM "ExchangeOrders"
      WHERE status = 'open'
    `);
    
    console.log(`\n매칭되지 않은 주문: ${unmatchedCount[0].count}개`);
    
    if (unmatchedCount[0].count > 0) {
      const [unmatchedOrders] = await sequelize.query(`
        SELECT id, side, price, amount, "homeTeam", "awayTeam", "createdAt"
        FROM "ExchangeOrders"
        WHERE status = 'open'
        ORDER BY "createdAt" DESC
      `);
      
      console.log('\n매칭되지 않은 주문들:');
      unmatchedOrders.forEach(order => {
        console.log(`  ${order.id}: ${order.side} ${order.amount}원 @ ${order.price} (${order.homeTeam} vs ${order.awayTeam})`);
      });
    }
    
    console.log('\n=== 자동 매칭 시스템 개선 완료 ===');
    
  } catch (error) {
    console.error('자동 매칭 시스템 개선 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

improveAutoMatching(); 