import sequelize from './models/sequelize.js';

async function simpleAnalysis() {
  try {
    console.log('=== ExchangeOrders 데이터베이스 분석 보고서 ===\n');
    
    // 1. 현재 주문 정보
    const [orders] = await sequelize.query('SELECT * FROM "ExchangeOrders" ORDER BY "createdAt" DESC');
    
    console.log('총 주문 수:', orders.length);
    
    if (orders.length > 0) {
      const order = orders[0];
      console.log('\n현재 주문 정보:');
      console.log('  ID:', order.id);
      console.log('  사용자 ID:', order.userId);
      console.log('  경기:', order.homeTeam, 'vs', order.awayTeam);
      console.log('  스포츠:', order.sportKey);
      console.log('  마켓:', order.market);
      console.log('  사이드:', order.side);
      console.log('  배당률:', order.price);
      console.log('  베팅금액:', order.amount.toLocaleString(), '원');
      console.log('  스테이크:', order.stakeAmount.toLocaleString(), '원');
      console.log('  잠재수익:', order.potentialProfit.toLocaleString(), '원');
      console.log('  상태:', order.status);
      console.log('  게임 결과 ID:', order.gameResultId || '없음');
      console.log('  경기 시작:', order.commenceTime);
      console.log('  생성일:', order.createdAt);
    }
    
    // 2. 사용자 정보 확인
    if (orders.length > 0) {
      const [users] = await sequelize.query('SELECT id, username, balance FROM "Users" WHERE id = :userId', {
        replacements: { userId: orders[0].userId }
      });
      
      if (users.length > 0) {
        console.log('\n사용자 정보:');
        console.log('  사용자명:', users[0].username);
        console.log('  현재 잔고:', users[0].balance.toLocaleString(), '원');
      }
    }
    
    // 3. 게임 결과 정보 확인
    if (orders.length > 0 && orders[0].gameResultId) {
      const [gameResults] = await sequelize.query('SELECT * FROM "GameResults" WHERE id = :gameResultId', {
        replacements: { gameResultId: orders[0].gameResultId }
      });
      
      if (gameResults.length > 0) {
        console.log('\n게임 결과 정보:');
        console.log('  경기 상태:', gameResults[0].status);
        console.log('  경기 결과:', gameResults[0].result);
        console.log('  스코어:', JSON.stringify(gameResults[0].score));
      }
    }
    
    // 4. 테이블 구조 요약
    console.log('\n테이블 구조 요약:');
    const tableDescription = await sequelize.getQueryInterface().describeTable('ExchangeOrders');
    const columns = Object.keys(tableDescription);
    console.log('  총 컬럼 수:', columns.length);
    console.log('  주요 컬럼:', columns.join(', '));
    
    // 5. 인덱스 정보
    const indexes = await sequelize.getQueryInterface().showIndex('ExchangeOrders');
    console.log('\n인덱스 수:', indexes.length);
    
    console.log('\n=== 분석 완료 ===');
    
  } catch (error) {
    console.error('분석 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

simpleAnalysis(); 