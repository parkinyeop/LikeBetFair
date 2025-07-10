import GameResult from './models/gameResultModel.js';
import sequelize from './models/db.js';
import { Op } from 'sequelize';

async function checkScoreFormatConsistency() {
  try {
    console.log('=== 스코어 저장 형식 일관성 점검 ===\n');
    
    // 1. 올바른 형식 (TheSportsDB 형식) 샘플 조회
    console.log('1. 올바른 형식 (TheSportsDB 형식) 샘플:');
    const correctFormatSample = await GameResult.findAll({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '[{"name":%'`)
        ]
      },
      limit: 5
    });
    
    console.log(`   올바른 형식 경기: ${correctFormatSample.length}개`);
    correctFormatSample.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
      console.log(`      서브카테고리: ${game.subCategory}`);
    });
    
    // 2. 잘못된 형식 (배열 형식) 샘플 조회
    console.log('\n2. 잘못된 형식 (배열 형식) 샘플:');
    const wrongFormatSample = await GameResult.findAll({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '["%'`),
          sequelize.literal(`score::text NOT LIKE '[{"name":%'`)
        ]
      },
      limit: 5
    });
    
    console.log(`   잘못된 형식 경기: ${wrongFormatSample.length}개`);
    wrongFormatSample.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
      console.log(`      서브카테고리: ${game.subCategory}`);
    });
    
    // 3. 형식별 통계
    console.log('\n3. 형식별 통계:');
    
    // 올바른 형식 개수
    const correctFormatCount = await GameResult.count({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '[{"name":%'`)
        ]
      }
    });
    
    // 잘못된 형식 개수
    const wrongFormatCount = await GameResult.count({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '["%'`),
          sequelize.literal(`score::text NOT LIKE '[{"name":%'`)
        ]
      }
    });
    
    // 빈 스코어 개수
    const emptyScoreCount = await GameResult.count({
      where: {
        score: ','
      }
    });
    
    // null 스코어 개수
    const nullScoreCount = await GameResult.count({
      where: {
        score: null
      }
    });
    
    console.log(`   올바른 형식 (TheSportsDB): ${correctFormatCount}개`);
    console.log(`   잘못된 형식 (배열): ${wrongFormatCount}개`);
    console.log(`   빈 스코어 (,): ${emptyScoreCount}개`);
    console.log(`   null 스코어: ${nullScoreCount}개`);
    
    // 4. 리그별 형식 분석
    console.log('\n4. 리그별 형식 분석:');
    const leagues = ['KBO', 'MLB', 'NBA', 'KBL', 'MLS', 'NFL'];
    
    for (const league of leagues) {
      const leagueTotal = await GameResult.count({
        where: { subCategory: league }
      });
      
      const leagueCorrect = await GameResult.count({
        where: {
          subCategory: league,
          [Op.and]: [
            { score: { [Op.not]: null } },
            sequelize.literal(`score::text LIKE '[{"name":%'`)
          ]
        }
      });
      
      const leagueWrong = await GameResult.count({
        where: {
          subCategory: league,
          [Op.and]: [
            { score: { [Op.not]: null } },
            sequelize.literal(`score::text LIKE '["%'`),
            sequelize.literal(`score::text NOT LIKE '[{"name":%'`)
          ]
        }
      });
      
      const leagueEmpty = await GameResult.count({
        where: {
          subCategory: league,
          score: ','
        }
      });
      
      if (leagueTotal > 0) {
        console.log(`   ${league}:`);
        console.log(`     전체: ${leagueTotal}개`);
        console.log(`     올바른 형식: ${leagueCorrect}개 (${((leagueCorrect/leagueTotal)*100).toFixed(1)}%)`);
        console.log(`     잘못된 형식: ${leagueWrong}개 (${((leagueWrong/leagueTotal)*100).toFixed(1)}%)`);
        console.log(`     빈 스코어: ${leagueEmpty}개 (${((leagueEmpty/leagueTotal)*100).toFixed(1)}%)`);
      }
    }
    
    // 5. TheSportsDB API 사용 여부 확인 (eventId 필드 확인)
    console.log('\n5. TheSportsDB API 사용 여부 확인:');
    
    const withEventId = await GameResult.count({
      where: {
        eventId: { [Op.not]: null }
      }
    });
    
    const withoutEventId = await GameResult.count({
      where: {
        eventId: null
      }
    });
    
    console.log(`   eventId 있는 경기: ${withEventId}개`);
    console.log(`   eventId 없는 경기: ${withoutEventId}개`);
    
    // eventId가 있는 경기들의 스코어 형식 확인
    const eventIdCorrectFormat = await GameResult.count({
      where: {
        [Op.and]: [
          { eventId: { [Op.not]: null } },
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '[{"name":%'`)
        ]
      }
    });
    
    const eventIdWrongFormat = await GameResult.count({
      where: {
        [Op.and]: [
          { eventId: { [Op.not]: null } },
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '["%'`),
          sequelize.literal(`score::text NOT LIKE '[{"name":%'`)
        ]
      }
    });
    
    console.log(`   eventId + 올바른 형식: ${eventIdCorrectFormat}개`);
    console.log(`   eventId + 잘못된 형식: ${eventIdWrongFormat}개`);
    
    // 6. 문제가 있는 경기들 상세 분석
    console.log('\n6. 문제가 있는 경기들 상세 분석:');
    
    // eventId가 있지만 잘못된 형식인 경기들
    const problematicGames = await GameResult.findAll({
      where: {
        [Op.and]: [
          { eventId: { [Op.not]: null } },
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '["%'`),
          sequelize.literal(`score::text NOT LIKE '[{"name":%'`)
        ]
      },
      limit: 10
    });
    
    console.log(`\n   eventId가 있지만 잘못된 형식인 경기들 (상위 10개):`);
    problematicGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      eventId: ${game.eventId}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log(`      서브카테고리: ${game.subCategory}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
    });
    
    // 7. 0점이 null로 저장된 경기들 확인
    console.log('\n7. 0점이 null로 저장된 경기들 확인:');
    
    const zeroScoreGames = await GameResult.findAll({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '[{"name":%'`),
          sequelize.literal(`score::text LIKE '%"score":"0"%'`)
        ]
      },
      limit: 5
    });
    
    console.log(`   0점이 올바르게 저장된 경기들 (상위 5개):`);
    zeroScoreGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log(`      서브카테고리: ${game.subCategory}`);
    });
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

checkScoreFormatConsistency(); 