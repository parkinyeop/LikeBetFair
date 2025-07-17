const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bettingDB',
  user: 'postgres',
  password: ''
});

async function analyzeGameIdMismatch() {
  try {
    console.log('=== 7월 9일 KBO 경기 gameId/eventId 불일치 원인 분석 ===');
    
    // 7월 9일 모든 베팅 조회
    const allBetsQuery = `
      SELECT 
        id,
        "userId",
        selections,
        "createdAt"
      FROM "Bets"
      WHERE DATE("createdAt") = '2025-07-09'
      ORDER BY "createdAt";
    `;
    
    const allBets = await pool.query(allBetsQuery);
    
    console.log(`총 ${allBets.rows.length}건의 베팅이 있습니다.`);
    
    // 모든 베팅에서 사용된 gameId 추출
    const allGameIds = new Set();
    allBets.rows.forEach(bet => {
      bet.selections.forEach(selection => {
        allGameIds.add(selection.gameId);
      });
    });
    
    console.log('\n=== 베팅에서 사용된 모든 gameId ===');
    Array.from(allGameIds).forEach(gameId => {
      console.log(`- ${gameId}`);
    });
    
    // GameResults에서 7월 9일 경기들의 eventId 확인
    const gameResultsQuery = `
      SELECT DISTINCT
        "eventId",
        "homeTeam",
        "awayTeam",
        "commenceTime",
        "createdAt"
      FROM "GameResults"
      WHERE DATE("commenceTime") = '2025-07-09'
        AND "subCategory" = 'KBO'
        AND "eventId" IS NOT NULL
      ORDER BY "eventId";
    `;
    
    const gameResults = await pool.query(gameResultsQuery);
    
    console.log('\n=== GameResults의 eventId들 ===');
    gameResults.rows.forEach(game => {
      console.log(`- ${game.eventId}: ${game.awayTeam} vs ${game.homeTeam}`);
    });
    
    // OddsCache에서 7월 9일 경기들의 정보 확인
    const oddsCacheQuery = `
      SELECT DISTINCT
        "homeTeam",
        "awayTeam",
        "commenceTime",
        "createdAt"
      FROM "OddsCaches"
      WHERE DATE("commenceTime") = '2025-07-09'
        AND "subCategory" = 'KBO'
      ORDER BY "commenceTime";
    `;
    
    const oddsCache = await pool.query(oddsCacheQuery);
    
    console.log('\n=== OddsCache의 경기들 ===');
    oddsCache.rows.forEach(game => {
      console.log(`- ${game.awayTeam} vs ${game.homeTeam} (${game.commenceTime})`);
    });
    
    // 매칭되지 않는 gameId들 찾기
    const unmatchedGameIds = Array.from(allGameIds).filter(gameId => {
      return !gameResults.rows.some(gr => gr.eventId === gameId);
    });
    
    console.log('\n=== 매칭되지 않는 gameId들 ===');
    unmatchedGameIds.forEach(gameId => {
      console.log(`- ${gameId}`);
    });
    
    // 각 베팅에서 사용된 경기 정보 상세 분석
    console.log('\n=== 베팅별 경기 정보 상세 분석 ===');
    allBets.rows.forEach((bet, index) => {
      console.log(`\n베팅 ${index + 1} (ID: ${bet.id})`);
      console.log(`베팅 시간: ${bet.createdAt}`);
      
      bet.selections.forEach((selection, selIndex) => {
        const hasGameResult = gameResults.rows.some(gr => gr.eventId === selection.gameId);
        const hasOddsCache = oddsCache.rows.some(oc => 
          oc.awayTeam === selection.desc.split(' vs ')[0] && 
          oc.homeTeam === selection.desc.split(' vs ')[1]
        );
        
        console.log(`  ${selIndex + 1}. ${selection.desc}`);
        console.log(`     gameId: ${selection.gameId}`);
        console.log(`     GameResults 존재: ${hasGameResult ? 'YES' : 'NO'}`);
        console.log(`     OddsCache 존재: ${hasOddsCache ? 'YES' : 'NO'}`);
        console.log(`     베팅 시간: ${selection.commence_time}`);
      });
    });
    
    // 원인 분석
    console.log('\n=== 원인 분석 ===');
    console.log('1. 베팅에서 사용된 gameId는 UUID 형태입니다.');
    console.log('2. GameResults의 eventId는 숫자 형태입니다.');
    console.log('3. 이는 서로 다른 시스템에서 생성된 ID로 보입니다.');
    console.log('4. 베팅 시스템과 경기 결과 수집 시스템이 별도로 운영되고 있는 것 같습니다.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

analyzeGameIdMismatch(); 