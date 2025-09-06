// KBO 데이터 검증 문제 디버깅
import GameResult from './models/gameResultModel.js';
import gameResultService from './services/gameResultService.js';

(async () => {
  try {
    console.log('🔍 KBO 데이터 검증 문제 디버깅\n');
    
    // 1. TheSportsDB에서 KBO 데이터 직접 가져오기
    console.log('📡 TheSportsDB에서 KBO 데이터 가져오는 중...');
    const resultsResponse = await gameResultService.fetchResultsWithSportsDB('baseball_kbo', 15, true);
    const games = resultsResponse.data;
    
    console.log(`📊 API에서 가져온 KBO 경기: ${games.length}개\n`);
    
    if (games.length === 0) {
      console.log('❌ API에서 데이터를 가져오지 못했습니다.');
      process.exit(1);
    }
    
    // 2. 첫 번째 경기 샘플 검사
    const sampleGame = games[0];
    console.log('🎯 첫 번째 경기 샘플:');
    console.log(JSON.stringify(sampleGame, null, 2));
    
    // 3. validateGameData 함수 테스트
    console.log('\n🧪 validateGameData 함수 테스트:');
    const isValid = gameResultService.validateGameData(sampleGame);
    console.log(`검증 결과: ${isValid ? '✅ 통과' : '❌ 실패'}`);
    
    if (!isValid) {
      console.log('\n🔍 검증 실패 원인 분석:');
      console.log(`home_team 존재: ${!!sampleGame.home_team}`);
      console.log(`away_team 존재: ${!!sampleGame.away_team}`);
      console.log(`commence_time 존재: ${!!sampleGame.commence_time}`);
      console.log(`home_team === away_team: ${sampleGame.home_team === sampleGame.away_team}`);
      
      const gameTime = new Date(sampleGame.commence_time);
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      console.log(`경기 시간: ${gameTime.toISOString()}`);
      console.log(`1년 후: ${oneYearFromNow.toISOString()}`);
      console.log(`미래로 너무 먼지: ${gameTime > oneYearFromNow}`);
    }
    
    // 4. 모든 경기에 대해 검증 통계
    console.log('\n📊 전체 경기 검증 통계:');
    let validCount = 0;
    let invalidCount = 0;
    let invalidReasons = {};
    
    for (const game of games) {
      if (gameResultService.validateGameData(game)) {
        validCount++;
      } else {
        invalidCount++;
        
        // 실패 원인 분석
        let reason = 'unknown';
        if (!game.home_team || !game.away_team || !game.commence_time) {
          reason = 'missing_required_fields';
        } else if (game.home_team === game.away_team) {
          reason = 'same_team';
        } else {
          const gameTime = new Date(game.commence_time);
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          if (gameTime > oneYearFromNow) {
            reason = 'too_far_future';
          }
        }
        
        invalidReasons[reason] = (invalidReasons[reason] || 0) + 1;
      }
    }
    
    console.log(`✅ 유효한 경기: ${validCount}개`);
    console.log(`❌ 무효한 경기: ${invalidCount}개`);
    
    if (invalidCount > 0) {
      console.log('\n❌ 무효한 경기 원인별 통계:');
      Object.entries(invalidReasons).forEach(([reason, count]) => {
        console.log(`   ${reason}: ${count}개`);
      });
    }
    
    // 5. 유효한 경기 샘플 표시
    if (validCount > 0) {
      console.log('\n✅ 유효한 경기 샘플 (최대 3개):');
      const validGames = games.filter(game => gameResultService.validateGameData(game)).slice(0, 3);
      validGames.forEach((game, index) => {
        console.log(`\n${index + 1}. ${game.home_team} vs ${game.away_team}`);
        console.log(`   시작 시간: ${game.commence_time}`);
        console.log(`   완료 여부: ${game.completed}`);
        console.log(`   스코어: ${JSON.stringify(game.scores)}`);
      });
    }
    
    // 6. DB 저장 테스트 (첫 번째 유효한 경기로)
    const validGame = games.find(game => gameResultService.validateGameData(game));
    if (validGame) {
      console.log('\n🧪 DB 저장 테스트...');
      try {
        const mainCategory = gameResultService.determineMainCategory('baseball_kbo');
        const subCategory = gameResultService.determineSubCategory('baseball_kbo');
        
        // 스코어 형식 검증
        let validatedScore = validGame.scores;
        if (validGame.scores && Array.isArray(validGame.scores)) {
          const isValidFormat = validGame.scores.every(score => 
            typeof score === 'object' && 
            score.name && 
            score.score !== undefined
          );
          
          if (!isValidFormat) {
            console.log('⚠️ 스코어 형식 문제 감지:', validGame.scores);
            validatedScore = null;
          }
        }
        
        const gameData = {
          sportKey: 'baseball_kbo',
          sportTitle: gameResultService.getSportTitleFromSportKey('baseball_kbo'),
          mainCategory,
          subCategory,
          homeTeam: validGame.home_team,
          awayTeam: validGame.away_team,
          commenceTime: new Date(validGame.commence_time + 'Z'),
          status: gameResultService.determineGameStatus(validGame),
          score: validatedScore,
          result: gameResultService.determineGameResult(validGame),
          lastUpdated: new Date()
        };
        
        console.log('📋 저장할 데이터:');
        console.log(JSON.stringify(gameData, null, 2));
        
        // 실제 저장은 하지 않고 데이터만 확인
        console.log('\n✅ DB 저장 데이터 준비 완료 (실제 저장하지 않음)');
        
      } catch (error) {
        console.error('❌ DB 저장 데이터 준비 실패:', error.message);
        console.error(error.stack);
      }
    }
    
    console.log('\n📋 디버깅 완료');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ KBO 검증 디버깅 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();