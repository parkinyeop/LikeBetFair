const GameResult = require('./models/gameResultModel');
const { Op } = require('sequelize');

async function updateGameResults() {
  try {
    console.log('6월 13일과 15일 경기 결과 업데이트...\n');
    
    // 6월 13일 경기들
    const june13Games = [
      { homeTeam: 'Doosan Bears', awayTeam: 'Kiwoom Heroes', result: 'home_win' },
      { homeTeam: 'Hanwha Eagles', awayTeam: 'LG Twins', result: 'away_win' },
      { homeTeam: 'NC Dinos', awayTeam: 'Kia Tigers', result: 'home_win' },
      { homeTeam: 'SSG Landers', awayTeam: 'Lotte Giants', result: 'away_win' },
      { homeTeam: 'Chicago Cubs', awayTeam: 'Pittsburgh Pirates', result: 'away_win' }
    ];
    
    // 6월 15일 경기들
    const june15Games = [
      { homeTeam: 'Samsung Lions', awayTeam: 'KT Wiz', result: 'away_win' }
    ];
    
    let updatedCount = 0;
    
    // 6월 13일 경기들 업데이트
    for (const game of june13Games) {
      const startOfDay = new Date('2025-06-13T00:00:00Z');
      const endOfDay = new Date('2025-06-13T23:59:59Z');
      
      const gameResult = await GameResult.findOne({
        where: {
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          commenceTime: {
            [Op.between]: [startOfDay, endOfDay]
          }
        }
      });
      
      if (gameResult) {
        await gameResult.update({
          status: 'finished',
          result: game.result
        });
        console.log(`6월 13일: ${game.homeTeam} vs ${game.awayTeam} -> ${game.result}`);
        updatedCount++;
      }
    }
    
    // 6월 15일 경기들 업데이트
    for (const game of june15Games) {
      const startOfDay = new Date('2025-06-15T00:00:00Z');
      const endOfDay = new Date('2025-06-15T23:59:59Z');
      
      const gameResult = await GameResult.findOne({
        where: {
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          commenceTime: {
            [Op.between]: [startOfDay, endOfDay]
          }
        }
      });
      
      if (gameResult) {
        await gameResult.update({
          status: 'finished',
          result: game.result
        });
        console.log(`6월 15일: ${game.homeTeam} vs ${game.awayTeam} -> ${game.result}`);
        updatedCount++;
      }
    }
    
    console.log(`\n총 ${updatedCount}개 경기 결과 업데이트 완료!`);
  } catch (error) {
    console.error('에러:', error);
  }
}

updateGameResults(); 