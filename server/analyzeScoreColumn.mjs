import GameResult from './models/gameResultModel.js';
import sequelize from './models/db.js';
import { Op } from 'sequelize';

async function analyzeScoreColumn() {
  try {
    console.log('=== 경기 결과 DB 스코어 컬럼 분석 ===\n');
    
    // 1. 전체 경기 수 조회
    const totalGames = await GameResult.count();
    console.log(`1. 전체 경기 수: ${totalGames}개`);
    
    // 2. 스코어가 null인 경기 수
    const nullScoreGames = await GameResult.count({
      where: {
        score: null
      }
    });
    console.log(`2. 스코어가 null인 경기: ${nullScoreGames}개`);
    
    // 3. 스코어가 빈 배열인 경기 수
    const emptyScoreGames = await GameResult.count({
      where: {
        score: '[]'
      }
    });
    console.log(`3. 스코어가 빈 배열인 경기: ${emptyScoreGames}개`);
    
    // 4. 스코어가 [null, null]인 경기 수
    const nullArrayScoreGames = await GameResult.count({
      where: {
        score: '[null,null]'
      }
    });
    console.log(`4. 스코어가 [null,null]인 경기: ${nullArrayScoreGames}개`);
    
    // 5. 스코어가 [null, 숫자] 또는 [숫자, null]인 경기 수 (JSONB 쿼리로 수정)
    const partialNullScoreGames = await GameResult.count({
      where: {
        [Op.or]: [
          sequelize.literal(`score::text LIKE '[null,%'`),
          sequelize.literal(`score::text LIKE '%,null]'`)
        ]
      }
    });
    console.log(`5. 스코어가 부분적으로 null인 경기: ${partialNullScoreGames}개`);
    
    // 6. 정상적인 스코어 형태의 경기 수
    const normalScoreGames = await GameResult.count({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          { score: { [Op.ne]: '[]' } },
          { score: { [Op.ne]: '[null,null]' } },
          sequelize.literal(`score::text NOT LIKE '[null,%'`),
          sequelize.literal(`score::text NOT LIKE '%,null]'`)
        ]
      }
    });
    console.log(`6. 정상적인 스코어 형태의 경기: ${normalScoreGames}개`);
    
    // 7. 스코어 데이터 형태 샘플 조회
    console.log('\n7. 스코어 데이터 형태 샘플:');
    
    // null 스코어 샘플
    const nullScoreSample = await GameResult.findAll({
      where: { score: null },
      limit: 3
    });
    console.log('\n   null 스코어 샘플:');
    nullScoreSample.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      스코어: ${game.score}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
    });
    
    // 빈 배열 스코어 샘플
    const emptyScoreSample = await GameResult.findAll({
      where: { score: '[]' },
      limit: 3
    });
    console.log('\n   빈 배열 스코어 샘플:');
    emptyScoreSample.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      스코어: ${game.score}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
    });
    
    // [null,null] 스코어 샘플
    const nullArraySample = await GameResult.findAll({
      where: { score: '[null,null]' },
      limit: 3
    });
    console.log('\n   [null,null] 스코어 샘플:');
    nullArraySample.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      스코어: ${game.score}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
    });
    
    // 부분 null 스코어 샘플
    const partialNullSample = await GameResult.findAll({
      where: {
        [Op.or]: [
          sequelize.literal(`score::text LIKE '[null,%'`),
          sequelize.literal(`score::text LIKE '%,null]'`)
        ]
      },
      limit: 5
    });
    console.log('\n   부분 null 스코어 샘플:');
    partialNullSample.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      스코어: ${game.score}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
    });
    
    // 정상 스코어 샘플
    const normalScoreSample = await GameResult.findAll({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          { score: { [Op.ne]: '[]' } },
          { score: { [Op.ne]: '[null,null]' } },
          sequelize.literal(`score::text NOT LIKE '[null,%'`),
          sequelize.literal(`score::text NOT LIKE '%,null]'`)
        ]
      },
      limit: 5
    });
    console.log('\n   정상 스코어 샘플:');
    normalScoreSample.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      스코어: ${game.score}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
    });
    
    // 8. 스코어 데이터 타입 분석
    console.log('\n8. 스코어 데이터 타입 분석:');
    const scoreTypes = await GameResult.findAll({
      attributes: [
        'score',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['score'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 10
    });
    
    console.log('\n   가장 많은 스코어 형태 (상위 10개):');
    scoreTypes.forEach((type, index) => {
      console.log(`   ${index + 1}. "${type.score}" - ${type.dataValues.count}개`);
    });
    
    // 9. 리그별 스코어 문제 분석
    console.log('\n9. 리그별 스코어 문제 분석:');
    const leagues = ['KBO', 'MLB', 'NBA', 'KBL', 'MLS', 'NFL'];
    
    for (const league of leagues) {
      const leagueGames = await GameResult.count({
        where: {
          subCategory: league
        }
      });
      
      const leagueNullScores = await GameResult.count({
        where: {
          subCategory: league,
          [Op.or]: [
            { score: null },
            { score: '[]' },
            { score: '[null,null]' },
            sequelize.literal(`score::text LIKE '[null,%'`),
            sequelize.literal(`score::text LIKE '%,null]'`)
          ]
        }
      });
      
      if (leagueGames > 0) {
        const problemRate = ((leagueNullScores / leagueGames) * 100).toFixed(1);
        console.log(`   ${league}: ${leagueNullScores}/${leagueGames} (${problemRate}%)`);
      }
    }
    
    // 10. 스코어 데이터 구조 분석
    console.log('\n10. 스코어 데이터 구조 분석:');
    
    // JSON 형태로 저장된 스코어 샘플
    const jsonScoreSample = await GameResult.findAll({
      where: {
        [Op.and]: [
          { score: { [Op.not]: null } },
          sequelize.literal(`score::text LIKE '[%'`)
        ]
      },
      limit: 3
    });
    
    console.log('\n   JSON 형태 스코어 샘플:');
    jsonScoreSample.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      스코어: ${game.score}`);
      console.log(`      스코어 타입: ${typeof game.score}`);
      console.log(`      파싱된 스코어: ${JSON.stringify(game.score)}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
    });
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

analyzeScoreColumn(); 