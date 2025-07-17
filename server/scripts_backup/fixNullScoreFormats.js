import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';
import sequelize from '../models/db.js';

/**
 * [null, null] 형식의 스코어를 올바르게 수정하는 스크립트
 */
async function fixNullScoreFormats() {
  try {
    console.log('=== 🚨 [null, null] 스코어 형식 수정 시작 ===\n');
    
    // 1. [null, null] 형식의 스코어 조회
    const nullScores = await GameResult.findAll({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text = '[null, null]'`)
        ]
      },
      order: [['lastUpdated', 'DESC']]
    });
    
    console.log(`📊 [null, null] 형식의 스코어 발견: ${nullScores.length}개\n`);
    
    if (nullScores.length === 0) {
      console.log('✅ 수정할 스코어가 없습니다.');
      return;
    }
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const game of nullScores) {
      try {
        console.log(`\n🔍 처리 중: ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`   현재 스코어: ${JSON.stringify(game.score)}`);
        console.log(`   상태: ${game.status}, 결과: ${game.result}`);
        console.log(`   경기 시간: ${game.commenceTime}`);
        
        // 경기 상태에 따른 처리
        if (game.status === 'scheduled') {
          // 예정된 경기는 스코어를 null로 설정
          await game.update({
            score: null,
            lastUpdated: new Date()
          });
          console.log(`   🔧 예정된 경기: 스코어를 null로 설정`);
        } else if (game.status === 'finished') {
          // 완료된 경기인데 [null, null]이면 문제
          console.log(`   ⚠️ 완료된 경기인데 스코어가 [null, null] - 수동 확인 필요`);
          errorCount++;
          continue;
        } else {
          // 기타 상태는 스코어를 null로 설정
          await game.update({
            score: null,
            lastUpdated: new Date()
          });
          console.log(`   🔧 기타 상태: 스코어를 null로 설정`);
        }
        
        fixedCount++;
        console.log(`   ✅ 수정 완료`);
        
      } catch (error) {
        console.error(`   ❌ 처리 중 오류: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n=== 수정 완료 ===`);
    console.log(`📊 통계:`);
    console.log(`   - 수정된 스코어: ${fixedCount}개`);
    console.log(`   - 오류 발생: ${errorCount}개`);
    console.log(`   - 총 처리: ${nullScores.length}개`);
    
    // 2. 수정 후 검증
    console.log(`\n=== 검증 ===`);
    const remainingNullScores = await GameResult.count({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text = '[null, null]'`)
        ]
      }
    });
    
    console.log(`   - 남은 [null, null] 형식: ${remainingNullScores}개`);
    
    if (remainingNullScores === 0) {
      console.log(`   ✅ 모든 [null, null] 스코어가 올바르게 수정되었습니다!`);
    } else {
      console.log(`   ⚠️ 아직 ${remainingNullScores}개의 [null, null] 형식이 남아있습니다.`);
    }
    
    // 3. 추가 검증: 예정된 경기 중 스코어가 있는 것들 확인
    const scheduledWithScores = await GameResult.count({
      where: {
        status: 'scheduled',
        score: { [Op.not]: null }
      }
    });
    
    console.log(`   - 예정된 경기 중 스코어가 있는 것: ${scheduledWithScores}개`);
    
    if (scheduledWithScores > 0) {
      console.log(`   ⚠️ 예정된 경기 중 스코어가 있는 경기가 있습니다. 추가 확인 필요.`);
    } else {
      console.log(`   ✅ 모든 예정된 경기가 올바른 형식입니다.`);
    }
    
  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류:', error);
    throw error;
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  fixNullScoreFormats()
    .then(() => {
      console.log('\n✅ [null, null] 스코어 형식 수정 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default fixNullScoreFormats; 