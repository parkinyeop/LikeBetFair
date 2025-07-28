import GameResult from './models/gameResultModel.js';
import { Op } from 'sequelize';

async function fixPendingResults() {
  console.log('=== GameResults pending 상태 수정 시작 ===');
  
  // status가 'finished'이지만 result가 'pending'이고 스코어가 있는 경기들 조회
  const pendingGames = await GameResult.findAll({
    where: {
      status: 'finished',
      result: 'pending',
      score: {
        [Op.not]: null
      }
    }
  });
  
  console.log(`총 ${pendingGames.length}개의 pending 경기 발견`);
  
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const game of pendingGames) {
    try {
      let score = game.score;
      
      // JSON 문자열인 경우 파싱
      if (typeof score === 'string') {
        score = JSON.parse(score);
      }
      
      // 스코어 형식 검증
      if (!Array.isArray(score) || score.length !== 2) {
        console.log(`❌ 잘못된 스코어 형식: ${game.homeTeam} vs ${game.awayTeam} - ${JSON.stringify(score)}`);
        errorCount++;
        continue;
      }
      
      // 스코어에서 점수 추출
      let homeScore, awayScore;
      
      if (typeof score[0] === 'object' && score[0].name && score[0].score) {
        // [{"name": "팀명", "score": "점수"}] 형식
        const homeScoreData = score.find(s => s.name === game.homeTeam);
        const awayScoreData = score.find(s => s.name === game.awayTeam);
        
        if (!homeScoreData || !awayScoreData) {
          console.log(`❌ 팀명 매칭 실패: ${game.homeTeam} vs ${game.awayTeam} - ${JSON.stringify(score)}`);
          errorCount++;
          continue;
        }
        
        homeScore = parseInt(homeScoreData.score);
        awayScore = parseInt(awayScoreData.score);
      } else {
        // [점수1, 점수2] 형식 (홈팀이 첫 번째)
        homeScore = parseInt(score[0]);
        awayScore = parseInt(score[1]);
      }
      
      if (isNaN(homeScore) || isNaN(awayScore)) {
        console.log(`❌ 점수 파싱 실패: ${game.homeTeam} vs ${game.awayTeam} - ${JSON.stringify(score)}`);
        errorCount++;
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
      
      // 데이터베이스 업데이트
      await game.update({
        result: result
      });
      
      console.log(`✅ 업데이트 완료: ${game.homeTeam} vs ${game.awayTeam} - ${homeScore}:${awayScore} → ${result}`);
      updatedCount++;
      
    } catch (error) {
      console.error(`❌ 오류 발생: ${game.homeTeam} vs ${game.awayTeam} - ${error.message}`);
      errorCount++;
    }
  }
  
  console.log('\n=== 수정 완료 ===');
  console.log(`총 ${pendingGames.length}개 경기 중:`);
  console.log(`  ✅ 성공: ${updatedCount}개`);
  console.log(`  ❌ 실패: ${errorCount}개`);
  
  // 업데이트 후 상태 확인
  const remainingPending = await GameResult.count({
    where: {
      status: 'finished',
      result: 'pending'
    }
  });
  
  console.log(`\n남은 pending 경기: ${remainingPending}개`);
  
  process.exit(0);
}

// 스크립트 실행
fixPendingResults()
  .catch(error => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }); 