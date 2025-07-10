import GameResult from './models/gameResultModel.js';
import { Op } from 'sequelize';

(async () => {
  try {
    console.log('=== 스코어 형식 수정 시작 ===');
    
    // 1. 모든 finished 경기를 가져와서 배열 형식 스코어 찾기
    const finishedGames = await GameResult.findAll({
      where: {
        status: 'finished',
        score: {
          [Op.not]: null
        }
      }
    });
    
    console.log(`finished 경기 수: ${finishedGames.length}`);
    
    let arrayScoreCount = 0;
    let pendingResultCount = 0;
    
    for (const game of finishedGames) {
      try {
        let score = game.score;
        if (typeof score === 'string') {
          score = JSON.parse(score);
        }
        
        // 배열 형식 스코어인지 확인
        if (Array.isArray(score) && score.length === 2 && typeof score[0] !== 'object') {
          arrayScoreCount++;
          
          const newScore = [
            { name: game.homeTeam, score: score[0]?.toString() || '0' },
            { name: game.awayTeam, score: score[1]?.toString() || '0' }
          ];
          
          // 결과 계산
          const homeScore = parseInt(score[0]) || 0;
          const awayScore = parseInt(score[1]) || 0;
          let result = 'pending';
          
          if (homeScore > awayScore) {
            result = 'home_win';
          } else if (awayScore > homeScore) {
            result = 'away_win';
          } else {
            result = 'draw';
          }
          
          await GameResult.update({
            score: newScore,
            result: result
          }, {
            where: { id: game.id }
          });
          
          console.log(`✅ 스코어 형식 수정: ${game.homeTeam} vs ${game.awayTeam} - ${homeScore}:${awayScore} (${result})`);
        }
        
        // finished인데 result가 pending인 경우
        if (game.result === 'pending' && Array.isArray(score) && score.length === 2) {
          pendingResultCount++;
          
          const homeScore = parseInt(score[0]) || 0;
          const awayScore = parseInt(score[1]) || 0;
          let result = 'pending';
          
          if (homeScore > awayScore) {
            result = 'home_win';
          } else if (awayScore > homeScore) {
            result = 'away_win';
          } else {
            result = 'draw';
          }
          
          await GameResult.update({
            result: result
          }, {
            where: { id: game.id }
          });
          
          console.log(`✅ 결과 수정: ${game.homeTeam} vs ${game.awayTeam} - ${result}`);
        }
        
      } catch (error) {
        console.error(`❌ 수정 실패 (${game.id}):`, error.message);
      }
    }
    
    console.log(`\n=== 수정 완료 ===`);
    console.log(`배열 형식 스코어 수정: ${arrayScoreCount}개`);
    console.log(`pending 결과 수정: ${pendingResultCount}개`);
    
  } catch (error) {
    console.error('스크립트 실행 중 오류:', error);
  }
})(); 