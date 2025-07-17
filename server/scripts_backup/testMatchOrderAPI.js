import sequelize from '../models/sequelize.js';

async function testMatchOrderAPI() {
  try {
    console.log('🔍 match-order API 테스트 시작...\n');

    // 1. 테스트용 게임 찾기
    const [gameResults] = await sequelize.query(`
      SELECT * FROM "GameResults" 
      WHERE status = 'scheduled' 
      ORDER BY "commenceTime" ASC 
      LIMIT 1
    `);

    if (gameResults.length === 0) {
      console.log('❌ 예정된 경기가 없습니다.');
      return;
    }

    const gameResult = gameResults[0];
    console.log(`🎮 테스트 게임: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
    console.log(`   시작시간: ${gameResult.commenceTime}`);
    console.log(`   스포츠: ${gameResult.sportKey}\n`);

    // 2. 기존 주문 확인
    const [existingOrders] = await sequelize.query(`
      SELECT * FROM "ExchangeOrders" 
      WHERE "gameId" = $1 
      ORDER BY "createdAt" DESC
    `, {
      bind: [gameResult.id]
    });

    console.log(`📊 기존 주문 수: ${existingOrders.length}\n`);

    // 3. 게임 매핑 서비스 테스트
    const exchangeGameMappingService = await import('../services/exchangeGameMappingService.js');
    
    const testOrderData = {
      gameId: gameResult.id,
      market: 'moneyline',
      line: 0,
      side: 'back',
      price: 2.0,
      amount: 10000,
      selection: gameResult.homeTeam,
      homeTeam: gameResult.homeTeam,
      awayTeam: gameResult.awayTeam,
      commenceTime: gameResult.commenceTime,
      userId: '14ffe740-4cfd-4611-99a4-b66b3d7bc6be'  // 테스트 사용자 ID
    };

    console.log('🔧 게임 매핑 서비스 테스트...');
    const mappedData = await exchangeGameMappingService.default.mapGameDataToOrder(testOrderData);
    
    console.log('✅ 매핑 결과:');
    console.log(`   homeTeam: ${mappedData.homeTeam}`);
    console.log(`   awayTeam: ${mappedData.awayTeam}`);
    console.log(`   sportKey: ${mappedData.sportKey}`);
    console.log(`   gameResultId: ${mappedData.gameResultId}`);
    console.log(`   selectionDetails: ${JSON.stringify(mappedData.selectionDetails, null, 2)}\n`);

    // 4. 주문 생성 테스트
    console.log('📝 테스트 주문 생성...');
    const stakeAmount = testOrderData.side === 'back' ? testOrderData.amount : Math.floor((testOrderData.price - 1) * testOrderData.amount);
    const potentialProfit = testOrderData.side === 'back' ? Math.floor((testOrderData.price - 1) * testOrderData.amount) : testOrderData.amount;
    
    const [insertResult] = await sequelize.query(`
      INSERT INTO "ExchangeOrders" (
        "userId", "gameId", "market", "line", "side", "price", "amount", 
        "selection", "status", "homeTeam", "awayTeam", "commenceTime", 
        "sportKey", "gameResultId", "selectionDetails", "stakeAmount", 
        "potentialProfit", "autoSettlement", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
      ) RETURNING id
    `, {
      bind: [
        testOrderData.userId, testOrderData.gameId, testOrderData.market, testOrderData.line,
        testOrderData.side, testOrderData.price, testOrderData.amount, testOrderData.selection,
        'open', mappedData.homeTeam, mappedData.awayTeam, mappedData.commenceTime,
        mappedData.sportKey, mappedData.gameResultId, JSON.stringify(mappedData.selectionDetails),
        stakeAmount, potentialProfit, true
      ]
    });

    console.log(`✅ 테스트 주문 생성 완료 - ID: ${insertResult[0]?.id}\n`);

    // 5. 최종 확인
    console.log('🎯 최종 주문 상태 확인...');
    const [finalOrders] = await sequelize.query(`
      SELECT * FROM "ExchangeOrders" 
      WHERE "gameId" = $1 
      ORDER BY "createdAt" DESC
    `, {
      bind: [gameResult.id]
    });

    console.log(`📊 현재 주문 수: ${finalOrders.length}`);
    finalOrders.forEach((order, index) => {
      console.log(`   주문 ${index + 1}: ${order.side} ${order.price} (${order.amount}원) - ${order.status}`);
    });

    console.log('\n✅ match-order API 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 오류:', error);
  } finally {
    process.exit(0);
  }
}

testMatchOrderAPI(); 