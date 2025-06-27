import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import { Op } from 'sequelize';

async function updateBetResults() {
  try {
    console.log('베팅 결과 업데이트 시작...');
    
    const bets = await Bet.findAll({where: {status: 'pending'}});
    console.log('Pending 베팅 수:', bets.length);
    
    let updatedCount = 0;
    
    for (const bet of bets) {
      console.log(`\n베팅 ID: ${bet.id} 처리 중...`);
      
      let allSelectionsCompleted = true;
      let hasWinningSelection = true;
      
      for (const selection of bet.selections) {
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
          
          if (gameResult && gameResult.status === 'finished') {
            // 결과 판정
            let selectionResult = 'pending';
            
            if (gameResult.result === 'home_win') {
              selectionResult = selection.team === gameResult.homeTeam ? 'won' : 'lost';
            } else if (gameResult.result === 'away_win') {
              selectionResult = selection.team === gameResult.awayTeam ? 'won' : 'lost';
            } else if (gameResult.result === 'draw') {
              selectionResult = 'draw';
            }
            
            selection.result = selectionResult;
            console.log(`  ${selection.desc} (${selection.team}): ${selectionResult}`);
            
            if (selectionResult === 'lost') {
              hasWinningSelection = false;
            }
          } else {
            allSelectionsCompleted = false;
            console.log(`  ${selection.desc}: 아직 완료되지 않음`);
          }
        } else {
          allSelectionsCompleted = false;
          console.log(`  ${selection.desc}: commence_time 없음`);
        }
      }
      
      if (allSelectionsCompleted) {
        const betStatus = hasWinningSelection ? 'won' : 'lost';
        await bet.update({
          status: betStatus,
          selections: bet.selections
        });
        
        console.log(`베팅 ${bet.id} 업데이트 완료: ${betStatus}`);
        updatedCount++;
      }
    }
    
    console.log(`\n업데이트 완료: ${updatedCount}개 베팅`);
  } catch (error) {
    console.error('에러:', error);
  }
}

updateBetResults(); 