// KBO 데이터 실제 저장 테스트
import GameResult from './models/gameResultModel.js';
import gameResultService from './services/gameResultService.js';

(async () => {
  try {
    console.log('💾 KBO 데이터 실제 저장 테스트\n');
    
    // 1. TheSportsDB에서 KBO 데이터 가져오기
    const resultsResponse = await gameResultService.fetchResultsWithSportsDB('baseball_kbo', 15, true);
    const games = resultsResponse.data;
    
    console.log(`📊 가져온 KBO 경기: ${games.length}개\n`);
    
    if (games.length === 0) {
      console.log('❌ 저장할 데이터가 없습니다.');
      process.exit(1);
    }
    
    // 2. 첫 번째 유효한 경기로 저장 테스트
    const validGame = games.find(game => gameResultService.validateGameData(game));
    
    if (!validGame) {
      console.log('❌ 유효한 경기 데이터를 찾을 수 없습니다.');
      process.exit(1);
    }
    
    console.log(`🎯 테스트할 경기: ${validGame.home_team} vs ${validGame.away_team}`);
    console.log(`   시작 시간: ${validGame.commence_time}`);
    console.log(`   완료 여부: ${validGame.completed}`);
    console.log(`   스코어: ${JSON.stringify(validGame.scores)}\n`);
    
    // 3. 데이터 준비
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
        console.log('⚠️ 스코어 형식 문제:', validGame.scores);
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
      eventId: validGame.id,
      lastUpdated: new Date()
    };
    
    console.log('📋 저장할 데이터:');
    console.log(JSON.stringify(gameData, null, 2));
    
    // 4. 기존 데이터 체크
    console.log('\n🔍 기존 데이터 체크...');
    const existingGame = await GameResult.findOne({
      where: {
        homeTeam: gameData.homeTeam,
        awayTeam: gameData.awayTeam,
        commenceTime: gameData.commenceTime
      }
    });
    
    if (existingGame) {
      console.log(`✅ 기존 데이터 발견: ID ${existingGame.id}`);
      console.log(`   현재 상태: ${existingGame.status} | 결과: ${existingGame.result}`);
      console.log(`   현재 스코어: ${JSON.stringify(existingGame.score)}`);
      console.log(`   마지막 업데이트: ${existingGame.lastUpdated}`);
    } else {
      console.log('📍 새로운 데이터입니다.');
    }
    
    // 5. 실제 저장 시도
    console.log('\n💾 실제 저장 시도...');
    
    try {
      if (existingGame) {
        // 기존 데이터 업데이트
        const [updatedCount] = await GameResult.update(gameData, {
          where: { id: existingGame.id }
        });
        
        if (updatedCount > 0) {
          console.log('✅ 기존 데이터 업데이트 성공');
          
          // 업데이트된 데이터 확인
          const updatedGame = await GameResult.findByPk(existingGame.id);
          console.log('📋 업데이트 후 데이터:');
          console.log(`   상태: ${updatedGame.status} | 결과: ${updatedGame.result}`);
          console.log(`   스코어: ${JSON.stringify(updatedGame.score)}`);
          console.log(`   마지막 업데이트: ${updatedGame.lastUpdated}`);
        } else {
          console.log('⚠️ 업데이트된 레코드 수: 0 (변경사항 없음)');
        }
      } else {
        // 새 데이터 생성
        const newGame = await GameResult.create(gameData);
        console.log(`✅ 새 데이터 생성 성공: ID ${newGame.id}`);
      }
      
    } catch (dbError) {
      console.error('❌ 데이터베이스 저장 실패:', dbError.message);
      
      if (dbError.name === 'SequelizeValidationError') {
        console.error('🔍 Sequelize 검증 에러:');
        dbError.errors.forEach(error => {
          console.error(`   필드: ${error.path}`);
          console.error(`   메시지: ${error.message}`);
          console.error(`   값: ${error.value}`);
        });
      } else if (dbError.name === 'SequelizeUniqueConstraintError') {
        console.error('🔍 유니크 제약조건 위반:');
        dbError.errors.forEach(error => {
          console.error(`   필드: ${error.path}`);
          console.error(`   메시지: ${error.message}`);
        });
      } else {
        console.error('🔍 전체 스택:');
        console.error(dbError.stack);
      }
    }
    
    console.log('\n📋 저장 테스트 완료');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ KBO 저장 테스트 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();