import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';
import sequelize from '../models/db.js';

/**
 * 잘못된 스코어 형식 수정 스크립트
 * The Odds API 형식 ["1", "0"]을 올바른 형식 [{"name":"팀명","score":"점수"}]로 변환
 */
async function fixInvalidScoreFormats() {
  try {
    console.log('=== 🚨 잘못된 스코어 형식 수정 시작 ===\n');
    
    // 1. 잘못된 형식의 스코어 조회 (The Odds API 형식)
    const invalidScores = await GameResult.findAll({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '["%'`),
          sequelize.literal(`score::text NOT LIKE '[{"name":%'`)
        ]
      },
      order: [['lastUpdated', 'DESC']]
    });
    
    console.log(`📊 잘못된 형식의 스코어 발견: ${invalidScores.length}개\n`);
    
    if (invalidScores.length === 0) {
      console.log('✅ 수정할 스코어가 없습니다.');
      return;
    }
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const game of invalidScores) {
      try {
        console.log(`\n🔍 처리 중: ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`   현재 스코어: ${JSON.stringify(game.score)}`);
        console.log(`   상태: ${game.status}, 결과: ${game.result}`);
        
        // 잘못된 형식 감지 및 수정
        let scoreData = game.score;
        
        // 문자열인 경우 JSON 파싱
        if (typeof scoreData === 'string') {
          try {
            scoreData = JSON.parse(scoreData);
          } catch (e) {
            console.log(`   ❌ JSON 파싱 실패: ${e.message}`);
            errorCount++;
            continue;
          }
        }
        
        // The Odds API 형식 ["1", "0"] 감지
        if (Array.isArray(scoreData) && 
            scoreData.length === 2 && 
            typeof scoreData[0] === 'string' && 
            typeof scoreData[1] === 'string' &&
            !scoreData[0].hasOwnProperty('name') && 
            !scoreData[1].hasOwnProperty('name')) {
          
          // 올바른 형식으로 변환
          const correctedScore = [
            { name: game.homeTeam, score: scoreData[0] },
            { name: game.awayTeam, score: scoreData[1] }
          ];
          
          console.log(`   🔧 수정된 스코어: ${JSON.stringify(correctedScore)}`);
          
          // 데이터베이스 업데이트
          await game.update({
            score: correctedScore,
            lastUpdated: new Date()
          });
          
          fixedCount++;
          console.log(`   ✅ 수정 완료`);
          
        } else {
          console.log(`   ⚠️ 알 수 없는 형식: ${JSON.stringify(scoreData)}`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`   ❌ 처리 중 오류: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n=== 수정 완료 ===`);
    console.log(`📊 통계:`);
    console.log(`   - 수정된 스코어: ${fixedCount}개`);
    console.log(`   - 오류 발생: ${errorCount}개`);
    console.log(`   - 총 처리: ${invalidScores.length}개`);
    
    // 2. 수정 후 검증
    console.log(`\n=== 검증 ===`);
    const remainingInvalid = await GameResult.count({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '["%'`),
          sequelize.literal(`score::text NOT LIKE '[{"name":%'`)
        ]
      }
    });
    
    console.log(`   - 남은 잘못된 형식: ${remainingInvalid}개`);
    
    if (remainingInvalid === 0) {
      console.log(`   ✅ 모든 스코어 형식이 올바르게 수정되었습니다!`);
    } else {
      console.log(`   ⚠️ 아직 ${remainingInvalid}개의 잘못된 형식이 남아있습니다.`);
    }
    
  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류:', error);
    throw error;
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  fixInvalidScoreFormats()
    .then(() => {
      console.log('\n✅ 스코어 형식 수정 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default fixInvalidScoreFormats; 