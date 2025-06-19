const GameResult = require('./models/gameResultModel');

async function checkGameResults() {
  try {
    console.log('GameResults 테이블 확인...\n');
    
    const gameResults = await GameResult.findAll({
      order: [['commenceTime', 'ASC']]
    });
    
    console.log(`총 게임 결과 수: ${gameResults.length}\n`);
    
    // 날짜별, 카테고리별로 그룹핑
    const grouped = {};
    gameResults.forEach(result => {
      const date = result.commenceTime.toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = {};
      if (!grouped[date][result.mainCategory]) grouped[date][result.mainCategory] = [];
      grouped[date][result.mainCategory].push(result);
    });
    
    // 날짜순으로 출력
    Object.keys(grouped).sort().forEach(date => {
      console.log(`=== ${date} ===`);
      Object.keys(grouped[date]).forEach(category => {
        console.log(`  [${category}]`);
        grouped[date][category].forEach(result => {
          const koreaTime = result.commenceTime.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'});
          console.log(`    ${result.homeTeam} vs ${result.awayTeam}`);
          console.log(`      시간: ${koreaTime}`);
          console.log(`      상태: ${result.status} | 결과: ${result.result}`);
        });
      });
      console.log('');
    });
  } catch (error) {
    console.error('에러:', error);
  }
}

checkGameResults(); 