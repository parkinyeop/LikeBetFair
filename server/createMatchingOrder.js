import sequelize from './models/sequelize.js';

async function createMatchingOrder() {
  try {
    console.log('=== 매칭 상대 주문 생성 시작 ===\n');
    
    // 1. 현재 lay 주문 정보 확인
    const [currentOrder] = await sequelize.query(`
      SELECT * FROM "ExchangeOrders" 
      WHERE side = 'lay' AND status = 'matched'
      LIMIT 1
    `);
    
    if (currentOrder.length === 0) {
      console.log('매칭할 lay 주문이 없습니다.');
      return;
    }
    
    const layOrder = currentOrder[0];
    console.log('현재 lay 주문:');
    console.log(`  ID: ${layOrder.id}`);
    console.log(`  경기: ${layOrder.homeTeam} vs ${layOrder.awayTeam}`);
    console.log(`  마켓: ${layOrder.market}`);
    console.log(`  배당률: ${layOrder.price}`);
    console.log(`  금액: ${layOrder.amount}원`);
    
    // 2. 매칭되는 back 주문 생성
    const backOrderData = {
      userId: layOrder.userId, // 같은 사용자 (테스트용)
      gameId: layOrder.gameId,
      market: layOrder.market,
      line: layOrder.line,
      side: 'back', // 반대 사이드
      price: layOrder.price,
      amount: layOrder.amount,
      selection: layOrder.selection,
      status: 'open',
      matchedOrderId: null,
      stakeAmount: layOrder.amount, // back은 베팅 금액이 스테이크
      potentialProfit: Math.floor((layOrder.price - 1) * layOrder.amount),
      actualProfit: null,
      settledAt: null,
      homeTeam: layOrder.homeTeam,
      awayTeam: layOrder.awayTeam,
      commenceTime: layOrder.commenceTime,
      sportKey: layOrder.sportKey,
      gameResultId: layOrder.gameResultId,
      selectionDetails: layOrder.selectionDetails,
      autoSettlement: true,
      settlementNote: '매칭 상대 주문 생성'
    };
    
    console.log('\n생성할 back 주문 정보:');
    console.log(`  사이드: ${backOrderData.side}`);
    console.log(`  배당률: ${backOrderData.price}`);
    console.log(`  금액: ${backOrderData.amount}원`);
    console.log(`  스테이크: ${backOrderData.stakeAmount}원`);
    console.log(`  잠재수익: ${backOrderData.potentialProfit}원`);
    
    // 3. back 주문 생성
    const [newOrder] = await sequelize.query(`
      INSERT INTO "ExchangeOrders" (
        "userId", "gameId", "market", "line", "side", "price", "amount", 
        "selection", "status", "matchedOrderId", "stakeAmount", "potentialProfit", 
        "actualProfit", "settledAt", "homeTeam", "awayTeam", "commenceTime", 
        "sportKey", "gameResultId", "selectionDetails", "autoSettlement", 
        "settlementNote", "createdAt", "updatedAt"
      ) VALUES (
        :userId, :gameId, :market, :line, :side, :price, :amount,
        :selection, :status, :matchedOrderId, :stakeAmount, :potentialProfit,
        :actualProfit, :settledAt, :homeTeam, :awayTeam, :commenceTime,
        :sportKey, :gameResultId, :selectionDetails, :autoSettlement,
        :settlementNote, NOW(), NOW()
      ) RETURNING id
    `, {
      replacements: backOrderData
    });
    
    const backOrderId = newOrder[0].id;
    console.log(`\n✅ Back 주문 생성 완료 (ID: ${backOrderId})`);
    
    // 4. 두 주문을 서로 매칭
    console.log('\n주문들을 서로 매칭 중...');
    
    // Lay 주문을 back 주문과 매칭
    await sequelize.query(`
      UPDATE "ExchangeOrders"
      SET "matchedOrderId" = :backOrderId, "updatedAt" = NOW()
      WHERE id = :layOrderId
    `, {
      replacements: { backOrderId, layOrderId: layOrder.id }
    });
    
    // Back 주문을 lay 주문과 매칭
    await sequelize.query(`
      UPDATE "ExchangeOrders"
      SET "matchedOrderId" = :layOrderId, "updatedAt" = NOW()
      WHERE id = :backOrderId
    `, {
      replacements: { layOrderId: layOrder.id, backOrderId }
    });
    
    console.log('✅ 매칭 완료');
    
    // 5. 매칭 결과 확인
    const [matchedOrders] = await sequelize.query(`
      SELECT id, side, status, "matchedOrderId", amount, price
      FROM "ExchangeOrders"
      WHERE id IN (:layOrderId, :backOrderId)
      ORDER BY id
    `, {
      replacements: { layOrderId: layOrder.id, backOrderId }
    });
    
    console.log('\n매칭 결과:');
    matchedOrders.forEach(order => {
      console.log(`  주문 ${order.id}: ${order.side} ${order.amount}원 @ ${order.price}, 매칭: ${order.matchedOrderId}`);
    });
    
    console.log('\n=== 매칭 상대 주문 생성 완료 ===');
    
  } catch (error) {
    console.error('매칭 상대 주문 생성 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

createMatchingOrder(); 