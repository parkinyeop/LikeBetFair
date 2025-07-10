import GameResult from './models/gameResultModel.js';
import sequelize from './models/db.js';
import { Op } from 'sequelize';

async function fixScoreFormat() {
  try {
    console.log('=== 스코어 형식 수정 ===\n');
    
    // 1. 잘못된 형식의 경기들 조회
    const wrongFormatGames = await GameResult.findAll({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '["%'`),
          sequelize.literal(`score::text NOT LIKE '[{"name":%'`)
        ]
      },
      limit: 10 // 테스트용으로 10개만
    });
    
    console.log(`수정할 경기 수: ${wrongFormatGames.length}개`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const game of wrongFormatGames) {
      try {
        console.log(`\n처리 중: ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`기존 스코어: ${JSON.stringify(game.score)}`);
        
        // 스코어가 배열 형태인지 확인
        if (Array.isArray(game.score) && game.score.length === 2) {
          const homeScore = game.score[0];
          const awayScore = game.score[1];
          
          // 올바른 형식으로 변환
          const correctScore = [
            {
              name: game.homeTeam,
              score: homeScore
            },
            {
              name: game.awayTeam,
              score: awayScore
            }
          ];
          
          // 업데이트
          await game.update({
            score: correctScore
          });
          
          console.log(`✅ 수정 완료: ${JSON.stringify(correctScore)}`);
          fixedCount++;
          
        } else {
          console.log(`❌ 스코어 형식이 예상과 다름: ${typeof game.score}`);
          errorCount++;
        }
        
      } catch (error) {
        console.log(`❌ 오류 발생: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n=== 수정 완료 ===`);
    console.log(`성공: ${fixedCount}개`);
    console.log(`실패: ${errorCount}개`);
    
    // 2. 수정 결과 확인
    console.log('\n=== 수정 결과 확인 ===');
    
    const correctFormatCount = await GameResult.count({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '[{"name":%'`)
        ]
      }
    });
    
    const wrongFormatCount = await GameResult.count({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '["%'`),
          sequelize.literal(`score::text NOT LIKE '[{"name":%'`)
        ]
      }
    });
    
    console.log(`올바른 형식: ${correctFormatCount}개`);
    console.log(`잘못된 형식: ${wrongFormatCount}개`);
    
    // 3. 수정된 경기 샘플 확인
    const fixedSample = await GameResult.findAll({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '[{"name":%'`)
        ]
      },
      limit: 3
    });
    
    console.log('\n수정된 경기 샘플:');
    fixedSample.forEach((game, index) => {
      console.log(`${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`   스코어: ${JSON.stringify(game.score)}`);
      console.log(`   상태: ${game.status}, 결과: ${game.result}`);
    });
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

fixScoreFormat(); 