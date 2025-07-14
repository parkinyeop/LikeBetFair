import GameResult from './models/gameResultModel.js';
import { Op } from 'sequelize';

async function findCorrectGame() {
  try {
    console.log('=== 올바른 경기 찾기 ===');
    
    // Juventude vs Sport Club do Recife 경기들 찾기
    const games = await GameResult.findAll({
      where: {
        homeTeam: 'Juventude',
        awayTeam: 'Sport Club do Recife'
      },
      order: [['commenceTime', 'DESC']]
    });
    
    console.log(`총 ${games.length}개의 Juventude vs Sport Club do Recife 경기 발견:`);
    
    games.forEach((game, i) => {
      console.log(`\n${i+1}. 경기 정보:`);
      console.log(`   ID: ${game.id}`);
      console.log(`   경기: ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`   시간: ${game.commenceTime}`);
      console.log(`   카테고리: ${game.mainCategory} > ${game.subCategory}`);
      console.log(`   상태: ${game.status}`);
      console.log(`   결과: ${game.result}`);
    });
    
    // 7월 12일 경기 찾기
    const july12Games = await GameResult.findAll({
      where: {
        commenceTime: {
          [Op.between]: [
            new Date('2025-07-12T00:00:00.000Z'),
            new Date('2025-07-12T23:59:59.000Z')
          ]
        }
      },
      order: [['commenceTime', 'ASC']]
    });
    
    console.log(`\n=== 7월 12일 모든 경기 (${july12Games.length}개) ===`);
    july12Games.forEach((game, i) => {
      console.log(`${i+1}. ${game.homeTeam} vs ${game.awayTeam} (${game.commenceTime})`);
    });
    
  } catch (error) {
    console.error('오류:', error);
  }
}

findCorrectGame(); 