import gameResultService from './services/gameResultService.js';

async function testDateFiltering() {
  try {
    console.log('=== 날짜 필터링 테스트 시작 ===');
    
    // KBO 테스트 (현재 활성 리그)
    console.log('\n1. KBO 테스트 (daysFrom = 7)');
    try {
      const kboResults = await gameResultService.fetchResultsWithSportsDB('baseball_kbo', 7);
      console.log(`KBO 결과: ${kboResults.data.length}개 경기`);
      
      if (kboResults.data.length > 0) {
        console.log('샘플 경기:');
        kboResults.data.slice(0, 3).forEach((game, index) => {
          console.log(`  ${index + 1}. ${game.home_team} vs ${game.away_team}`);
          console.log(`     시간: ${game.commence_time}`);
          console.log(`     완료: ${game.completed}`);
          console.log(`     스코어: ${JSON.stringify(game.scores)}`);
        });
      }
    } catch (error) {
      console.log(`KBO 테스트 실패: ${error.message}`);
    }
    
    // MLB 테스트
    console.log('\n2. MLB 테스트 (daysFrom = 3)');
    try {
      const mlbResults = await gameResultService.fetchResultsWithSportsDB('baseball_mlb', 3);
      console.log(`MLB 결과: ${mlbResults.data.length}개 경기`);
      
      if (mlbResults.data.length > 0) {
        console.log('샘플 경기:');
        mlbResults.data.slice(0, 3).forEach((game, index) => {
          console.log(`  ${index + 1}. ${game.home_team} vs ${game.away_team}`);
          console.log(`     시간: ${game.commence_time}`);
          console.log(`     완료: ${game.completed}`);
          console.log(`     스코어: ${JSON.stringify(game.scores)}`);
        });
      }
    } catch (error) {
      console.log(`MLB 테스트 실패: ${error.message}`);
    }
    
    // 날짜 범위 검증
    console.log('\n3. 날짜 범위 검증');
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log(`현재 시간: ${now.toISOString()}`);
    console.log(`3일 전: ${threeDaysAgo.toISOString()}`);
    console.log(`7일 전: ${sevenDaysAgo.toISOString()}`);
    
    console.log('\n=== 날짜 필터링 테스트 완료 ===');
    
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
  }
}

testDateFiltering(); 