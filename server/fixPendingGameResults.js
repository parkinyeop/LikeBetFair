import GameResult from './models/gameResultModel.js';
import Bet from './models/betModel.js';
import betResultService from './services/betResultService.js';
import { Op } from 'sequelize';

async function fixPendingGameResults() {
  try {
    console.log('🔧 Pending 경기 결과 수정 시작...');
    
    // 1. 스코어가 있는 pending 경기들 조회
    const pendingGames = await GameResult.findAll({
      where: {
        result: 'pending',
        status: 'finished',
        score: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.ne]: '[]' }
          ]
        }
      }
    });
    
    console.log(`📊 수정할 경기 수: ${pendingGames.length}개`);
    
    let updatedCount = 0;
    
    for (const game of pendingGames) {
      try {
        const score = game.score;
        if (!Array.isArray(score) || score.length !== 2) {
          console.log(`⚠️ 잘못된 스코어 형식: ${game.homeTeam} vs ${game.awayTeam}`);
          continue;
        }
        
        const homeScore = parseInt(score[0].score);
        const awayScore = parseInt(score[1].score);
        
        if (isNaN(homeScore) || isNaN(awayScore)) {
          console.log(`⚠️ 숫자가 아닌 스코어: ${game.homeTeam} vs ${game.awayTeam}`);
          continue;
        }
        
        // 결과 결정
        let result;
        if (homeScore > awayScore) {
          result = 'home_win';
        } else if (awayScore > homeScore) {
          result = 'away_win';
        } else {
          result = 'draw';
        }
        
        // 경기 결과 업데이트
        await game.update({
          result: result,
          updatedAt: new Date()
        });
        
        console.log(`✅ ${game.homeTeam} vs ${game.awayTeam}: ${homeScore}-${awayScore} → ${result}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ 경기 결과 업데이트 실패 (${game.homeTeam} vs ${game.awayTeam}):`, error.message);
      }
    }
    
    console.log(`\n📈 경기 결과 업데이트 완료: ${updatedCount}개`);
    
    // 2. 베팅 결과 업데이트 실행
    if (updatedCount > 0) {
      console.log('\n🎯 베팅 결과 업데이트 시작...');
      const betResult = await betResultService.updateBetResults();
      console.log(`✅ 베팅 결과 업데이트 완료: ${betResult.updatedCount}개 업데이트, ${betResult.errorCount}개 오류`);
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 스크립트 실행
fixPendingGameResults()
  .then(() => {
    console.log('🎉 모든 작업 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 치명적 오류:', error);
    process.exit(1);
  }); 

export default fixPendingGameResults; 