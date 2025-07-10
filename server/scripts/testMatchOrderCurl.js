import sequelize from '../models/sequelize.js';

async function testMatchOrderCurl() {
  try {
    console.log('🔍 match-order API 직접 테스트...\n');

    // 1. 테스트 사용자 토큰 생성 (가상)
    const testUserId = '14ffe740-4cfd-4611-99a4-b66b3d7bc6be';
    
    // 2. 테스트할 게임 ID (실제 존재하는 NBA 게임)
    const testGameId = '7f419b31-7a98-45ca-bf7d-f3cfbf7724b2';

    // 3. 테스트 데이터 준비
    const testPayload = {
      gameId: testGameId,
      market: 'moneyline',
      line: 0,
      side: 'lay',
      price: 2.5,
      amount: 10000,
      selection: 'Detroit Pistons'
    };

    console.log('📊 테스트 페이로드:');
    console.log(JSON.stringify(testPayload, null, 2));
    console.log();

    // 4. 실제 API 호출 대신 데이터베이스 직접 확인
    console.log('🔍 해당 게임의 기존 주문 확인...');
    const [existingOrders] = await sequelize.query(`
      SELECT * FROM "ExchangeOrders" 
      WHERE "gameId" = $1 
      ORDER BY "createdAt" DESC
    `, {
      bind: [testGameId]
    });

    console.log(`📊 기존 주문 수: ${existingOrders.length}`);
    existingOrders.forEach((order, index) => {
      console.log(`   주문 ${index + 1}: ${order.side} ${order.price} (${order.amount}원) - ${order.status}`);
    });

    // 5. 게임 정보 확인
    console.log('\n🎮 게임 정보 확인...');
    const [gameData] = await sequelize.query(`
      SELECT * FROM "GameResults" 
      WHERE id = $1
    `, {
      bind: [testGameId]
    });

    if (gameData.length > 0) {
      const game = gameData[0];
      console.log(`   경기: ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`   시작시간: ${game.commenceTime}`);
      console.log(`   상태: ${game.status}`);
      console.log(`   스포츠: ${game.sportKey}`);
    } else {
      console.log('❌ 해당 게임을 찾을 수 없습니다.');
    }

    // 6. 오류 검증 - 필요한 필드들 확인
    console.log('\n🔧 API 호출 전 검증...');
    const requiredFields = ['gameId', 'market', 'line', 'side', 'price', 'amount', 'selection'];
    const missingFields = requiredFields.filter(field => !testPayload[field] && testPayload[field] !== 0);
    
    if (missingFields.length > 0) {
      console.log(`❌ 누락된 필드: ${missingFields.join(', ')}`);
    } else {
      console.log('✅ 모든 필수 필드가 존재합니다.');
    }

    // 7. 게임 매핑 서비스 테스트
    console.log('\n🔧 게임 매핑 서비스 확인...');
    try {
      const exchangeGameMappingService = await import('../services/exchangeGameMappingService.js');
      
      const mappingTestData = {
        ...testPayload,
        userId: testUserId,
        homeTeam: gameData[0]?.homeTeam,
        awayTeam: gameData[0]?.awayTeam,
        commenceTime: gameData[0]?.commenceTime
      };

      const mappedData = await exchangeGameMappingService.default.mapGameDataToOrder(mappingTestData);
      console.log('✅ 게임 매핑 서비스 정상 작동');
      console.log(`   매핑된 gameResultId: ${mappedData.gameResultId}`);
      console.log(`   매핑된 sportKey: ${mappedData.sportKey}`);
    } catch (mappingError) {
      console.error('❌ 게임 매핑 서비스 오류:', mappingError.message);
    }

    console.log('\n✅ match-order API 사전 테스트 완료!');
    console.log('\n💡 실제 프론트엔드에서 호출 시 서버 로그를 실시간으로 확인하세요:');
    console.log('   tail -f logs/scheduler_*.log | grep -E "(매치|match|error|Error)"');

  } catch (error) {
    console.error('❌ 테스트 오류:', error);
  } finally {
    process.exit(0);
  }
}

testMatchOrderCurl(); 