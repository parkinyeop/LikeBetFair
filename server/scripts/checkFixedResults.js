import GameResult from '../models/gameResultModel.js';
import Bet from '../models/betModel.js';
import { Op } from 'sequelize';
import sequelize from '../models/db.js';

async function checkFixedResults() {
  try {
    console.log('=== 🔍 수정 결과 확인 ===\n');
    
    // 1. 잘못된 형식의 스코어 확인
    const invalidScores = await GameResult.count({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '["%'`),
          sequelize.literal(`score::text NOT LIKE '[{"name":%'`)
        ]
      }
    });
    
    console.log(`📊 잘못된 형식의 스코어: ${invalidScores}개`);
    
    // 2. Pending 베팅 확인
    const pendingBets = await Bet.count({
      where: { status: 'pending' }
    });
    
    console.log(`📊 Pending 베팅: ${pendingBets}개`);
    
    // 3. 올바른 형식의 스코어 샘플 확인
    const correctScores = await GameResult.findAll({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '[{"name":%'`)
        ]
      },
      limit: 3,
      order: [['lastUpdated', 'DESC']]
    });
    
    console.log(`\n📋 올바른 형식 스코어 샘플:`);
    correctScores.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
    });
    
    // 4. 최근 업데이트된 경기 확인
    const recentGames = await GameResult.findAll({
      where: {
        status: 'finished',
        result: { [Op.not]: 'pending' }
      },
      limit: 5,
      order: [['lastUpdated', 'DESC']]
    });
    
    console.log(`\n📋 최근 완료된 경기 샘플:`);
    recentGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log(`      결과: ${game.result}`);
      console.log(`      업데이트: ${game.lastUpdated}`);
    });
    
    console.log(`\n✅ 확인 완료!`);
    
  } catch (error) {
    console.error('❌ 확인 중 오류:', error);
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  checkFixedResults()
    .then(() => {
      console.log('\n✅ 확인 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default checkFixedResults; 