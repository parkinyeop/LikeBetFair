import GameResult from './models/gameResultModel.js';
import sequelize from './models/db.js';
import { Op } from 'sequelize';

async function findExactGame() {
  try {
    console.log('=== 정확한 경기명 찾기 ===\n');
    
    // 1. 정확한 시간의 모든 경기 조회
    const targetTime = new Date('2025-07-09T23:30:00.000Z');
    const timeRange = 5 * 60 * 1000; // ±5분
    
    const exactTimeGames = await GameResult.findAll({
      where: {
        commenceTime: { 
          [Op.between]: [
            new Date(targetTime.getTime() - timeRange),
            new Date(targetTime.getTime() + timeRange)
          ]
        }
      },
      order: [['commenceTime', 'ASC']]
    });
    
    console.log('1. 정확한 시간 (2025-07-09 23:30 ±5분) 경기:');
    console.log(`   총 ${exactTimeGames.length}개 경기 발견`);
    
    exactTimeGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      시간: ${game.commenceTime}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log(`      ID: ${game.id}`);
      console.log('');
    });
    
    // 2. Revolution이 포함된 모든 경기 검색
    console.log('2. Revolution이 포함된 모든 경기:');
    const revolutionGames = await GameResult.findAll({
      where: {
        [Op.or]: [
          { homeTeam: { [Op.iLike]: '%revolution%' } },
          { awayTeam: { [Op.iLike]: '%revolution%' } }
        ]
      },
      order: [['commenceTime', 'DESC']],
      limit: 20
    });
    
    console.log(`   총 ${revolutionGames.length}개 경기 발견`);
    revolutionGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      시간: ${game.commenceTime}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log(`      ID: ${game.id}`);
      console.log('');
    });
    
    // 3. Miami가 포함된 모든 경기 검색 (Inter Miami 제외)
    console.log('3. Miami가 포함된 모든 경기 (Inter Miami 제외):');
    const miamiGames = await GameResult.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { homeTeam: { [Op.iLike]: '%miami%' } },
              { awayTeam: { [Op.iLike]: '%miami%' } }
            ]
          },
          {
            [Op.and]: [
              { homeTeam: { [Op.notILike]: '%inter%' } },
              { awayTeam: { [Op.notILike]: '%inter%' } }
            ]
          }
        ]
      },
      order: [['commenceTime', 'DESC']],
      limit: 20
    });
    
    console.log(`   총 ${miamiGames.length}개 경기 발견`);
    miamiGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      시간: ${game.commenceTime}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log(`      ID: ${game.id}`);
      console.log('');
    });
    
    // 4. 스코어가 ["1","2"]인 모든 경기 검색
    console.log('4. 스코어가 ["1","2"]인 모든 경기:');
    const scoreGames = await GameResult.findAll({
      where: {
        score: '["1","2"]'
      },
      order: [['commenceTime', 'DESC']]
    });
    
    console.log(`   총 ${scoreGames.length}개 경기 발견`);
    scoreGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      시간: ${game.commenceTime}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log(`      ID: ${game.id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

findExactGame(); 