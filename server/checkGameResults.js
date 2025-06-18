const GameResult = require('./models/gameResultModel');

async function checkGameResults() {
  try {
    console.log('GameResults 테이블 확인...\n');
    
    const gameResults = await GameResult.findAll({
      order: [['commenceTime', 'DESC']]
    });
    
    console.log(`총 게임 결과 수: ${gameResults.length}\n`);
    
    for (const result of gameResults) {
      const koreaTime = result.commenceTime.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'});
      console.log(`경기: ${result.homeTeam} vs ${result.awayTeam}`);
      console.log(`  시간: ${result.commenceTime.toISOString()} (${koreaTime})`);
      console.log(`  상태: ${result.status}`);
      console.log(`  결과: ${result.result}`);
      console.log('');
    }
  } catch (error) {
    console.error('에러:', error);
  }
}

checkGameResults(); 