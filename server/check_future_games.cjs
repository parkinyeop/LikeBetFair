const GameResult = require('./models/gameResultModel.js').default;
const { Op } = require('sequelize');

async function checkFutureGames() {
  try {
    console.log('=== DB 미래 경기 데이터 현황 ===');
    
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    console.log(`현재 시간: ${now.toISOString()}`);
    console.log(`1주일 후: ${oneWeekFromNow.toISOString()}`);
    console.log(`1개월 후: ${oneMonthFromNow.toISOString()}`);
    
    // 1주일 후 경기
    const weekFutureGames = await GameResult.findAll({
      where: {
        commenceTime: {
          [Op.gt]: oneWeekFromNow
        }
      },
      attributes: ['id', 'homeTeam', 'awayTeam', 'commenceTime', 'mainCategory', 'subCategory'],
      order: [['commenceTime', 'ASC']],
      limit: 10
    });
    
    // 1개월 후 경기
    const monthFutureGames = await GameResult.findAll({
      where: {
        commenceTime: {
          [Op.gt]: oneMonthFromNow
        }
      },
      attributes: ['id', 'homeTeam', 'awayTeam', 'commenceTime', 'mainCategory', 'subCategory'],
      order: [['commenceTime', 'ASC']],
      limit: 10
    });
    
    console.log(`\n1주일 후 경기: ${weekFutureGames.length}개`);
    console.log(`1개월 후 경기: ${monthFutureGames.length}개`);
    
    if (weekFutureGames.length > 0) {
      console.log('\n1주일 후 경기 샘플:');
      weekFutureGames.forEach((game, index) => {
        console.log(`${index + 1}. ${game.homeTeam} vs ${game.awayTeam} (${game.mainCategory}/${game.subCategory})`);
        console.log(`   일시: ${game.commenceTime}`);
      });
    }
    
    if (monthFutureGames.length > 0) {
      console.log('\n1개월 후 경기 샘플:');
      monthFutureGames.forEach((game, index) => {
        console.log(`${index + 1}. ${game.homeTeam} vs ${game.awayTeam} (${game.mainCategory}/${game.subCategory})`);
        console.log(`   일시: ${game.commenceTime}`);
      });
    }
    
    // 전체 미래 경기 수 (현재 시간 이후)
    const allFutureGames = await GameResult.findAll({
      where: {
        commenceTime: {
          [Op.gt]: now
        }
      },
      attributes: ['id'],
    });
    
    console.log(`\n전체 미래 경기 (현재 시간 이후): ${allFutureGames.length}개`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkFutureGames(); 