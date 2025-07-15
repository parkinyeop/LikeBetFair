import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';

async function fixGameResults() {
  try {
    const kboGames = await GameResult.findAll({
      where: {
        subCategory: 'KBO',
        commenceTime: {
          [Op.between]: [
            new Date('2025-07-09T00:00:00Z'),
            new Date('2025-07-09T23:59:59Z')
          ]
        },
        status: 'finished',
        result: 'pending'
      }
    });

    console.log('결과 업데이트 필요한 경기 수:', kboGames.length);
    
    for (const game of kboGames) {
      if (game.score && Array.isArray(game.score) && game.score.length === 2) {
        const homeScore = parseInt(game.score[0].score);
        const awayScore = parseInt(game.score[1].score);
        
        let result = 'pending';
        if (homeScore > awayScore) {
          result = 'home_win';
        } else if (awayScore > homeScore) {
          result = 'away_win';
        } else {
          result = 'draw';
        }
        
        await game.update({ result });
        console.log(`업데이트: ${game.homeTeam} vs ${game.awayTeam} -> ${result} (${homeScore}-${awayScore})`);
      }
    }
    
    console.log('결과 업데이트 완료');
  } catch (err) {
    console.error('에러:', err.message);
  }
}

fixGameResults(); 