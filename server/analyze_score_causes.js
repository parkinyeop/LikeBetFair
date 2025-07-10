import GameResult from './models/gameResultModel.js';
import { Op } from 'sequelize';

(async () => {
  try {
    console.log('=== 스코어 형식 차이 원인 분석 ===\n');
    
    // 1. 스크립트별 스코어 형식 분석
    console.log('📊 스크립트별 스코어 형식 차이:');
    console.log('');
    
    console.log('1️⃣ collectMLBData.js:');
    console.log('   - 형식: JSON.stringify([{ name: team, score: score }])');
    console.log('   - 예시: [{"name":"New York Yankees","score":"5"},{"name":"Boston Red Sox","score":"3"}]');
    console.log('');
    
    console.log('2️⃣ collectCSLData.js:');
    console.log('   - 형식: JSON.stringify([{ name: team, score: score }])');
    console.log('   - 예시: [{"name":"Shanghai Port","score":"2"},{"name":"Beijing Guoan","score":"1"}]');
    console.log('');
    
    console.log('3️⃣ collectKLeagueData.js:');
    console.log('   - 형식: JSON.stringify([{ name: team, score: score }])');
    console.log('   - 예시: [{"name":"Ulsan Hyundai","score":"3"},{"name":"Jeonbuk Hyundai","score":"2"}]');
    console.log('');
    
    console.log('4️⃣ updateDbScoresFromSportsdbJson.js:');
    console.log('   - 형식: [{ team: team, score: score }] (JSON.stringify 없음)');
    console.log('   - 예시: [{"team":"Team A","score":5},{"team":"Team B","score":3}]');
    console.log('');
    
    console.log('5️⃣ updateGameResultsFromBets.js:');
    console.log('   - 형식: [{"name": team, "score": score}] (JSON.stringify 없음)');
    console.log('   - 예시: [{"name":"Team A","score":"5"},{"name":"Team B","score":"3"}]');
    console.log('');
    
    console.log('6️⃣ 기존 데이터 (The Odds API):');
    console.log('   - 형식: ["score1", "score2"] (문자열 배열)');
    console.log('   - 예시: ["5", "3"]');
    console.log('');
    
    // 2. 실제 데이터베이스에서 형식별 분포 확인
    console.log('🔍 실제 데이터베이스 형식 분포:');
    
    const allGames = await GameResult.findAll({
      where: {
        status: 'finished',
        score: {
          [Op.not]: null
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    
    const formatAnalysis = {
      objectFormat: { count: 0, examples: [] },
      arrayFormat: { count: 0, examples: [] },
      stringFormat: { count: 0, examples: [] },
      otherFormat: { count: 0, examples: [] }
    };
    
    for (const game of allGames) {
      const score = game.score;
      
      if (Array.isArray(score)) {
        if (score.length === 2 && typeof score[0] === 'object' && score[0].name) {
          formatAnalysis.objectFormat.count++;
          if (formatAnalysis.objectFormat.examples.length < 2) {
            formatAnalysis.objectFormat.examples.push({
              id: game.id,
              subCategory: game.subCategory,
              score: score,
              createdAt: game.createdAt
            });
          }
        } else if (score.length === 2 && (typeof score[0] === 'string' || typeof score[0] === 'number')) {
          formatAnalysis.arrayFormat.count++;
          if (formatAnalysis.arrayFormat.examples.length < 2) {
            formatAnalysis.arrayFormat.examples.push({
              id: game.id,
              subCategory: game.subCategory,
              score: score,
              createdAt: game.createdAt
            });
          }
        }
      } else if (typeof score === 'string') {
        formatAnalysis.stringFormat.count++;
        if (formatAnalysis.stringFormat.examples.length < 2) {
          formatAnalysis.stringFormat.examples.push({
            id: game.id,
            subCategory: game.subCategory,
            score: score,
            createdAt: game.createdAt
          });
        }
      } else {
        formatAnalysis.otherFormat.count++;
        if (formatAnalysis.otherFormat.examples.length < 2) {
          formatAnalysis.otherFormat.examples.push({
            id: game.id,
            subCategory: game.subCategory,
            score: score,
            createdAt: game.createdAt
          });
        }
      }
    }
    
    console.log(`✅ 객체 형식 (올바른): ${formatAnalysis.objectFormat.count}개`);
    console.log(`❌ 배열 형식 (잘못된): ${formatAnalysis.arrayFormat.count}개`);
    console.log(`⚠️ 문자열 형식: ${formatAnalysis.stringFormat.count}개`);
    console.log(`❓ 기타 형식: ${formatAnalysis.otherFormat.count}개`);
    
    // 3. 원인 분석
    console.log('\n🎯 원인 분석:');
    console.log('');
    console.log('1. **API 응답 형식 차이**:');
    console.log('   - The Odds API: ["score1", "score2"] 형태');
    console.log('   - TheSportsDB API: {intHomeScore, intAwayScore} 형태');
    console.log('');
    console.log('2. **스크립트 작성 시점 차이**:');
    console.log('   - 초기 스크립트: 배열 형식 사용');
    console.log('   - 최신 스크립트: 객체 형식 사용');
    console.log('');
    console.log('3. **데이터 저장 방식 차이**:');
    console.log('   - 일부: JSON.stringify() 사용');
    console.log('   - 일부: 직접 객체 저장');
    console.log('');
    console.log('4. **팀명 필드 차이**:');
    console.log('   - 일부: "name" 필드 사용');
    console.log('   - 일부: "team" 필드 사용');
    console.log('');
    
    // 4. 해결 방안
    console.log('💡 해결 방안:');
    console.log('');
    console.log('1. **표준 형식 정의**:');
    console.log('   - [{"name": "팀명", "score": "점수"}] 형태로 통일');
    console.log('');
    console.log('2. **데이터 저장 전 검증**:');
    console.log('   - 모든 스크립트에서 동일한 형식 검증 로직 사용');
    console.log('');
    console.log('3. **기존 데이터 마이그레이션**:');
    console.log('   - 이미 fix_score_formats.js로 완료됨');
    console.log('');
    console.log('4. **API 응답 처리 통일**:');
    console.log('   - 모든 API 응답을 동일한 형식으로 변환');
    console.log('');
    
    // 5. 권장사항
    console.log('📋 권장사항:');
    console.log('');
    console.log('1. 모든 데이터 수집 스크립트에서 다음 형식 사용:');
    console.log('   const score = JSON.stringify([');
    console.log('     { name: homeTeam, score: homeScore.toString() },');
    console.log('     { name: awayTeam, score: awayScore.toString() }');
    console.log('   ]);');
    console.log('');
    console.log('2. 데이터 저장 전 형식 검증 함수 추가:');
    console.log('   function validateScoreFormat(score) {');
    console.log('     // 검증 로직');
    console.log('   }');
    console.log('');
    console.log('3. 정기적인 데이터 형식 검사 스크립트 실행');
    
  } catch (error) {
    console.error('분석 중 오류:', error);
  }
})(); 