const GameResult = require('./models/gameResultModel.js').default;

const gameIds = [
  'd673c0be-d569-4a14-834a-071f7d30ff3b', // New York City FC vs Toronto FC
  '754bf784-fa43-4d42-be43-00522f06450f', // Shanghai Shenhua FC vs Tianjin Jinmen Tiger FC
  'bfd10b40-93ea-4e04-bbe2-768e7c6620c0'  // Qingdao Hainiu FC vs Zhejiang
];

async function checkGameResults() {
  const results = await GameResult.findAll({
    where: { id: gameIds },
    order: [['commenceTime', 'DESC']]
  });
  if (results.length === 0) {
    console.log('해당 경기 결과가 DB에 없습니다.');
    return;
  }
  results.forEach((game, i) => {
    console.log(`\n[${i+1}] 경기ID: ${game.id}`);
    console.log(`매치: ${game.homeTeam} vs ${game.awayTeam}`);
    console.log(`일시: ${game.commenceTime}`);
    console.log(`상태: ${game.status}`);
    console.log(`결과: ${game.result}`);
    console.log(`스코어: ${JSON.stringify(game.score)}`);
    console.log(`마지막 업데이트: ${game.lastUpdated}`);
  });
}

checkGameResults(); 