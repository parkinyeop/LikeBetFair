const Bet = require('./models/betModel');
const GameResult = require('./models/gameResultModel');
const { Op } = require('sequelize');

async function updateCompletedBetResults() {
  try {
    console.log('완료된 베팅들의 선택사항 결과 업데이트...');
    
    // lost, won, cancel 상태의 베팅들 조회
    const completedBets = await Bet.findAll({
      where: {
        status: ['lost', 'won', 'cancel']
      }
    });
    
    console.log(`완료된 베팅 수: ${completedBets.length}`);
    
    let updatedCount = 0;
    
    for (const bet of completedBets) {
      console.log(`\n베팅 ID: ${bet.id}, 상태: ${bet.status}`);
      
      let needsUpdate = false;
      
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
            
            if (selection.market === '승/패') {
              if (gameResult.result === 'home_win') {
                selectionResult = selection.team === gameResult.homeTeam ? 'won' : 'lost';
              } else if (gameResult.result === 'away_win') {
                selectionResult = selection.team === gameResult.awayTeam ? 'won' : 'lost';
              } else if (gameResult.result === 'draw') {
                selectionResult = 'draw';
              }
            } else if (selection.market === '언더/오버') {
              // 언더/오버 로직 (간단한 버전)
              selectionResult = 'pending'; // 나중에 구현
            }
            
            if (selection.result !== selectionResult) {
              selection.result = selectionResult;
              needsUpdate = true;
              console.log(`  ${selection.desc} (${selection.team}): ${selectionResult}`);
            }
          }
        }
      }
      
      if (needsUpdate) {
        await bet.update({
          selections: bet.selections
        });
        updatedCount++;
        console.log(`  베팅 ${bet.id} 업데이트 완료`);
      }
    }
    
    console.log(`\n총 ${updatedCount}개 베팅의 선택사항 결과 업데이트 완료!`);
  } catch (error) {
    console.error('에러:', error);
  }
}

updateCompletedBetResults(); 