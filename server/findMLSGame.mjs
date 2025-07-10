import GameResult from './models/gameResultModel.js';
import sequelize from './models/db.js';
import { Op } from 'sequelize';

async function findMLSGame() {
  try {
    console.log('=== MLS 경기 검색 ===\n');
    
    // 1. 2025-07-09 근처의 모든 경기 조회
    const targetDate = new Date('2025-07-09T23:30:00.000Z');
    const from = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000); // 24시간 전
    const to = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);   // 24시간 후
    
    console.log('1. 2025-07-09 ±24시간 내 모든 경기:');
    const allGames = await GameResult.findAll({
      where: {
        commenceTime: { [Op.between]: [from, to] }
      },
      order: [['commenceTime', 'ASC']]
    });
    
    console.log(`   총 ${allGames.length}개 경기 발견`);
    
    allGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      시간: ${game.commenceTime}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log('');
    });
    
    // 2. Inter Miami가 포함된 경기 검색
    console.log('2. Inter Miami 관련 경기 검색:');
    const miamiGames = await GameResult.findAll({
      where: {
        [Op.or]: [
          { homeTeam: { [Op.iLike]: '%miami%' } },
          { awayTeam: { [Op.iLike]: '%miami%' } }
        ]
      },
      order: [['commenceTime', 'DESC']],
      limit: 10
    });
    
    console.log(`   Inter Miami 관련 경기: ${miamiGames.length}개`);
    miamiGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      시간: ${game.commenceTime}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log('');
    });
    
    // 3. New England Revolution이 포함된 경기 검색
    console.log('3. New England Revolution 관련 경기 검색:');
    const revolutionGames = await GameResult.findAll({
      where: {
        [Op.or]: [
          { homeTeam: { [Op.iLike]: '%new england%' } },
          { awayTeam: { [Op.iLike]: '%new england%' } },
          { homeTeam: { [Op.iLike]: '%revolution%' } },
          { awayTeam: { [Op.iLike]: '%revolution%' } }
        ]
      },
      order: [['commenceTime', 'DESC']],
      limit: 10
    });
    
    console.log(`   New England Revolution 관련 경기: ${revolutionGames.length}개`);
    revolutionGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      시간: ${game.commenceTime}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log('');
    });
    
    // 4. 정확한 시간대의 경기 검색
    console.log('4. 정확한 시간대 (2025-07-09 23:30 ±2시간) 경기 검색:');
    const exactTimeFrom = new Date('2025-07-09T21:30:00.000Z');
    const exactTimeTo = new Date('2025-07-10T01:30:00.000Z');
    
    const exactTimeGames = await GameResult.findAll({
      where: {
        commenceTime: { [Op.between]: [exactTimeFrom, exactTimeTo] }
      },
      order: [['commenceTime', 'ASC']]
    });
    
    console.log(`   정확한 시간대 경기: ${exactTimeGames.length}개`);
    exactTimeGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      시간: ${game.commenceTime}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

findMLSGame(); 