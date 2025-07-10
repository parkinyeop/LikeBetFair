const GameResult = require('./models/gameResultModel.js').default;
const { Op } = require('sequelize');

async function deleteFutureGames() {
  try {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const count = await GameResult.count({
      where: {
        commenceTime: {
          [Op.gt]: oneWeekFromNow
        }
      }
    });
    console.log(`삭제 대상(7일 이후) 경기 수: ${count}개`);
    if (count === 0) {
      console.log('삭제할 데이터가 없습니다.');
      return;
    }
    const deleted = await GameResult.destroy({
      where: {
        commenceTime: {
          [Op.gt]: oneWeekFromNow
        }
      }
    });
    console.log(`삭제 완료: ${deleted}개 경기 결과 삭제됨.`);
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteFutureGames(); 