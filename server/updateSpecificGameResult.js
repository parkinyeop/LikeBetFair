import GameResult from './models/gameResultModel.js';

// TheSportsDB에서 조회한 경기 결과 데이터
const GAME_RESULT_DATA = {
  mainCategory: "soccer",
  subCategory: "MLS",
  homeTeam: "New York City FC",
  awayTeam: "Toronto FC",
  commenceTime: "2025-07-03T14:30:00.000Z",
  status: "finished",
  score: [
    {
      "name": "New York City FC",
      "score": "3"
    },
    {
      "name": "Toronto FC",
      "score": "1"
    }
  ],
  result: "home_win",
  eventId: "2192304",
  lastUpdated: "2025-07-04T08:12:52.243Z"
};

async function updateSpecificGameResult() {
  try {
    console.log('=== 특정 경기 결과 DB 저장 ===');
    console.log(`경기: ${GAME_RESULT_DATA.homeTeam} vs ${GAME_RESULT_DATA.awayTeam}`);
    console.log(`결과: ${GAME_RESULT_DATA.result} (${GAME_RESULT_DATA.score[0].score}-${GAME_RESULT_DATA.score[1].score})`);
    console.log('');

    // 1. 기존 경기 결과 확인
    console.log('1. 기존 경기 결과 확인 중...');
    const existingGame = await GameResult.findOne({
      where: {
        homeTeam: GAME_RESULT_DATA.homeTeam,
        awayTeam: GAME_RESULT_DATA.awayTeam,
        commenceTime: new Date(GAME_RESULT_DATA.commenceTime)
      }
    });

    if (existingGame) {
      console.log('✅ 기존 경기 결과 발견');
      console.log(`기존 상태: ${existingGame.status}`);
      console.log(`기존 결과: ${existingGame.result}`);
      console.log(`기존 스코어: ${JSON.stringify(existingGame.score)}`);
      
      // 기존 데이터 업데이트
      await existingGame.update({
        status: GAME_RESULT_DATA.status,
        score: GAME_RESULT_DATA.score,
        result: GAME_RESULT_DATA.result,
        eventId: GAME_RESULT_DATA.eventId,
        lastUpdated: new Date()
      });
      
      console.log('✅ 기존 경기 결과 업데이트 완료');
      
    } else {
      console.log('❌ 기존 경기 결과 없음 - 새로 생성');
      
      // 새 경기 결과 생성
      await GameResult.create({
        mainCategory: GAME_RESULT_DATA.mainCategory,
        subCategory: GAME_RESULT_DATA.subCategory,
        homeTeam: GAME_RESULT_DATA.homeTeam,
        awayTeam: GAME_RESULT_DATA.awayTeam,
        commenceTime: new Date(GAME_RESULT_DATA.commenceTime),
        status: GAME_RESULT_DATA.status,
        score: GAME_RESULT_DATA.score,
        result: GAME_RESULT_DATA.result,
        eventId: GAME_RESULT_DATA.eventId,
        lastUpdated: new Date()
      });
      
      console.log('✅ 새 경기 결과 생성 완료');
    }

    // 2. 업데이트된 경기 결과 확인
    console.log('\n2. 업데이트된 경기 결과 확인...');
    const updatedGame = await GameResult.findOne({
      where: {
        homeTeam: GAME_RESULT_DATA.homeTeam,
        awayTeam: GAME_RESULT_DATA.awayTeam,
        commenceTime: new Date(GAME_RESULT_DATA.commenceTime)
      }
    });

    if (updatedGame) {
      console.log('=== 최종 경기 결과 ===');
      console.log(`ID: ${updatedGame.id}`);
      console.log(`홈팀: ${updatedGame.homeTeam}`);
      console.log(`원정팀: ${updatedGame.awayTeam}`);
      console.log(`경기시간: ${updatedGame.commenceTime}`);
      console.log(`상태: ${updatedGame.status}`);
      console.log(`결과: ${updatedGame.result}`);
      console.log(`스코어: ${JSON.stringify(updatedGame.score)}`);
      console.log(`Event ID: ${updatedGame.eventId}`);
      console.log(`업데이트: ${updatedGame.lastUpdated}`);
    }

    // 3. 배팅 결과 업데이트 트리거
    console.log('\n3. 배팅 결과 업데이트 시작...');
    const betResultService = (await import('./services/betResultService.js')).default;
    const updateResult = await betResultService.updateBetResults();
    
    console.log('=== 배팅 결과 업데이트 완료 ===');
    console.log(`업데이트된 배팅: ${updateResult.updatedCount}개`);
    console.log(`에러: ${updateResult.errorCount}개`);

    console.log('\n✅ 모든 작업 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
updateSpecificGameResult(); 