const Bet = require('./models/betModel');
const GameResult = require('./models/gameResultModel');
const { Op } = require('sequelize');

async function checkBetResults() {
  try {
    console.log('베팅 결과 확인 시작...');
    
    const bets = await Bet.findAll({where: {status: 'pending'}});
    console.log('Pending 베팅 수:', bets.length);
    
    for (const bet of bets) {
      console.log(`\n베팅 ID: ${bet.id}, 선택사항 수: ${bet.selections.length}`);
      
      for (const selection of bet.selections) {
        console.log(`  선택사항: ${selection.desc}, 팀: ${selection.team}, 시간: ${selection.commence_time}`);
        
        if (selection.commence_time) {
          const gameTime = new Date(selection.commence_time);
          const startOfDay = new Date(gameTime);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(gameTime);
          endOfDay.setHours(23, 59, 59, 999);
          
          const teams = selection.desc.split(' vs ');
          const gameResult = await GameResult.findOne({
            where: {
              homeTeam: teams[0].trim(),
              awayTeam: teams[1].trim(),
              commenceTime: {
                [Op.between]: [startOfDay, endOfDay]
              }
            }
          });
          
          if (gameResult) {
            console.log(`    게임 결과: status=${gameResult.status}, result=${gameResult.result}`);
          } else {
            console.log(`    게임 결과: 없음`);
          }
        } else {
          console.log(`    commence_time 없음`);
        }
      }
    }
  } catch (error) {
    console.error('에러:', error);
  }
}

checkBetResults(); 