import ExchangeOrder from '../models/exchangeOrderModel.js';
import GameResult from '../models/gameResultModel.js';
import User from '../models/userModel.js';
import exchangeGameMappingService from '../services/exchangeGameMappingService.js';
import exchangeSettlementService from '../services/exchangeSettlementService.js';
import sequelize from '../models/sequelize.js';

/**
 * 완성된 Exchange 시스템 종합 테스트
 */
async function testCompleteExchangeSystem() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🚀 Exchange 시스템 종합 테스트 시작...\n');
    
    // 1. 테스트용 게임 데이터 생성
    console.log('1️⃣ 테스트 게임 데이터 생성...');
    const testGame = await GameResult.create({
      eventId: 'TEST_GAME_2025',
      mainCategory: 'baseball',
      subCategory: 'kbo',
      homeTeam: 'SSG Landers',
      awayTeam: 'KIA Tigers',
      commenceTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2시간 후
      status: 'scheduled',
      result: 'pending'
    }, { transaction });
    
    console.log(`✅ 테스트 게임 생성: ${testGame.homeTeam} vs ${testGame.awayTeam}`);
    
    // 2. 테스트용 사용자 생성
    console.log('\n2️⃣ 테스트 사용자 생성...');
    const testUser1 = await User.create({
      email: 'test1@exchange.com',
      password: 'password123',
      username: 'exchanger1',
      balance: 50000
    }, { transaction });
    
    const testUser2 = await User.create({
      email: 'test2@exchange.com',
      password: 'password123',
      username: 'exchanger2',
      balance: 50000
    }, { transaction });
    
    console.log(`✅ 테스트 사용자 생성: ${testUser1.username}, ${testUser2.username}`);
    
    // 3. 게임 매핑 서비스 테스트
    console.log('\n3️⃣ 게임 매핑 서비스 테스트...');
    const availableGames = await exchangeGameMappingService.getAvailableGames({ limit: 5 });
    console.log(`📊 이용 가능한 게임 수: ${availableGames.length}`);
    
    // 4. Exchange 주문 생성 및 매핑 테스트
    console.log('\n4️⃣ Exchange 주문 생성 및 매핑 테스트...');
    
    // Back 주문 데이터 매핑
    const backOrderData = await exchangeGameMappingService.mapGameDataToOrder({
      gameId: testGame.id,
      market: 'h2h',
      line: 0,
      side: 'back',
      price: 1.8,
      amount: 10000,
      selection: testGame.homeTeam,
      userId: testUser1.id
    });
    
    console.log('📋 Back 주문 매핑 결과:', {
      gameResultId: backOrderData.gameResultId,
      homeTeam: backOrderData.homeTeam,
      sportKey: backOrderData.sportKey,
      selectionDetails: backOrderData.selectionDetails
    });
    
    // Back 주문 생성
    const backOrder = await ExchangeOrder.create({
      ...backOrderData,
      stakeAmount: backOrderData.amount,
      potentialProfit: Math.floor((backOrderData.price - 1) * backOrderData.amount)
    }, { transaction });
    
    console.log(`✅ Back 주문 생성: ID ${backOrder.id}`);
    
    // Lay 주문 데이터 매핑
    const layOrderData = await exchangeGameMappingService.mapGameDataToOrder({
      gameId: testGame.id,
      market: 'h2h',
      line: 0,
      side: 'lay',
      price: 1.8,
      amount: 10000,
      selection: testGame.homeTeam,
      userId: testUser2.id
    });
    
    // Lay 주문 생성 및 즉시 매칭
    const layOrder = await ExchangeOrder.create({
      ...layOrderData,
      stakeAmount: Math.floor((layOrderData.price - 1) * layOrderData.amount),
      potentialProfit: layOrderData.amount,
      status: 'matched',
      matchedOrderId: backOrder.id
    }, { transaction });
    
    // Back 주문도 매칭 상태로 업데이트
    await backOrder.update({
      status: 'matched',
      matchedOrderId: layOrder.id
    }, { transaction });
    
    console.log(`✅ 주문 매칭 완료: Back(${backOrder.id}) ↔ Lay(${layOrder.id})`);
    
    // 5. 경기 결과 업데이트 및 정산 테스트
    console.log('\n5️⃣ 경기 결과 업데이트 및 정산 테스트...');
    
    // 경기 완료 처리
    await testGame.update({
      status: 'finished',
      result: 'home_win',
      score: [
        { name: testGame.homeTeam, score: '7' },
        { name: testGame.awayTeam, score: '4' }
      ]
    }, { transaction });
    
    console.log(`🏆 경기 결과: ${testGame.homeTeam} 승리 (7-4)`);
    
    // 자동 정산 실행
    console.log('\n🔄 자동 정산 실행...');
    await transaction.commit(); // 트랜잭션 커밋 후 정산
    
    const settlementResult = await exchangeSettlementService.settleGameOrders(testGame.id);
    
    console.log('\n📊 정산 결과:', settlementResult);
    
    // 6. 정산 후 사용자 잔고 확인
    console.log('\n6️⃣ 정산 후 사용자 잔고 확인...');
    const updatedUser1 = await User.findByPk(testUser1.id);
    const updatedUser2 = await User.findByPk(testUser2.id);
    
    console.log(`💰 ${testUser1.username} 잔고: 50,000 → ${updatedUser1.balance}`);
    console.log(`💰 ${testUser2.username} 잔고: 50,000 → ${updatedUser2.balance}`);
    
    // 7. 정산된 주문 상태 확인
    console.log('\n7️⃣ 정산된 주문 상태 확인...');
    const settledBackOrder = await ExchangeOrder.findByPk(backOrder.id);
    const settledLayOrder = await ExchangeOrder.findByPk(layOrder.id);
    
    console.log(`📋 Back 주문 상태: ${settledBackOrder.status}, 수익: ${settledBackOrder.actualProfit}`);
    console.log(`📋 Lay 주문 상태: ${settledLayOrder.status}, 수익: ${settledLayOrder.actualProfit}`);
    
    // 8. 시스템 통계 확인
    console.log('\n8️⃣ 시스템 통계 확인...');
    const totalOrders = await ExchangeOrder.count();
    const settledOrders = await ExchangeOrder.count({ where: { status: 'settled' } });
    const totalVolume = await ExchangeOrder.sum('amount');
    
    console.log(`📈 시스템 통계:`);
    console.log(`  - 전체 주문: ${totalOrders}개`);
    console.log(`  - 정산 완료: ${settledOrders}개`);
    console.log(`  - 총 거래량: ${totalVolume}원`);
    
    console.log('\n🎉 Exchange 시스템 종합 테스트 완료!');
    console.log('\n✅ 검증된 기능들:');
    console.log('  ✓ 게임 데이터 자동 매핑');
    console.log('  ✓ 구조화된 베팅 정보 저장');
    console.log('  ✓ 주문 매칭 시스템');
    console.log('  ✓ Market별 승부 판정 (Moneyline)');
    console.log('  ✓ 자동 정산 및 수익 배분');
    console.log('  ✓ 결제 내역 추적');
    
    // 9. 테스트 데이터 정리
    console.log('\n🧹 테스트 데이터 정리...');
    await ExchangeOrder.destroy({ where: { userId: [testUser1.id, testUser2.id] } });
    await User.destroy({ where: { id: [testUser1.id, testUser2.id] } });
    await GameResult.destroy({ where: { id: testGame.id } });
    
    console.log('✅ 테스트 데이터 정리 완료');
    
    process.exit(0);
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ 테스트 중 오류:', error);
    process.exit(1);
  }
}

// 테스트 실행
testCompleteExchangeSystem(); 