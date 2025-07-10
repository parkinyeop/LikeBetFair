const GameResult = require('./models/gameResultModel.js').default;

// TheSportsDB API에서 찾은 경기 결과들
const gameResults = [
  {
    eventId: '2192304',
    mainCategory: 'soccer',
    subCategory: 'MLS',
    homeTeam: 'New York City FC',
    awayTeam: 'Toronto FC',
    commenceTime: new Date('2025-07-03T23:30:00.000Z'),
    status: 'finished',
    score: JSON.stringify([
      { name: 'New York City FC', score: '3' },
      { name: 'Toronto FC', score: '1' }
    ]),
    result: 'home_win',
    lastUpdated: new Date()
  },
  {
    eventId: '2210946',
    mainCategory: 'soccer',
    subCategory: 'CSL',
    homeTeam: 'Shanghai Shenhua',
    awayTeam: 'Tianjin Jinmen Tiger',
    commenceTime: new Date('2025-06-25T11:00:00.000Z'),
    status: 'finished',
    score: JSON.stringify([
      { name: 'Shanghai Shenhua', score: '3' },
      { name: 'Tianjin Jinmen Tiger', score: '0' }
    ]),
    result: 'home_win',
    lastUpdated: new Date()
  },
  {
    eventId: '2210947',
    mainCategory: 'soccer',
    subCategory: 'CSL',
    homeTeam: 'Qingdao Hainiu',
    awayTeam: 'Zhejiang Professional',
    commenceTime: new Date('2025-06-25T11:00:00.000Z'),
    status: 'finished',
    score: JSON.stringify([
      { name: 'Qingdao Hainiu', score: '0' },
      { name: 'Zhejiang Professional', score: '3' }
    ]),
    result: 'away_win',
    lastUpdated: new Date()
  }
];

async function saveGameResults() {
  console.log('=== 누락된 경기 결과 DB 저장 시작 ===\n');
  
  let savedCount = 0;
  let updatedCount = 0;
  
  for (const gameData of gameResults) {
    try {
      // 기존 경기 확인 (eventId로)
      const existingGame = await GameResult.findOne({
        where: { eventId: gameData.eventId }
      });
      
      if (existingGame) {
        // 기존 경기 업데이트
        await existingGame.update(gameData);
        console.log(`✅ 업데이트: ${gameData.homeTeam} vs ${gameData.awayTeam} (${gameData.result})`);
        updatedCount++;
      } else {
        // 새 경기 생성
        await GameResult.create(gameData);
        console.log(`✅ 새로 저장: ${gameData.homeTeam} vs ${gameData.awayTeam} (${gameData.result})`);
        savedCount++;
      }
      
    } catch (error) {
      console.error(`❌ 저장 실패: ${gameData.homeTeam} vs ${gameData.awayTeam} - ${error.message}`);
    }
  }
  
  console.log(`\n=== 저장 완료 ===`);
  console.log(`새로 저장: ${savedCount}개`);
  console.log(`업데이트: ${updatedCount}개`);
  console.log(`총 처리: ${savedCount + updatedCount}개`);
}

saveGameResults(); 