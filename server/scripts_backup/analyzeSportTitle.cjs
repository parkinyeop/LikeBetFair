const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database.cjs').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

async function analyzeSportTitle() {
  try {
    console.log('=== OddsCaches 테이블 sportTitle 분석 ===\n');

    // 1. sportTitle 현황 확인
    console.log('=== sportTitle 현황 ===');
    const sportTitleStats = await sequelize.query(`
      SELECT "sportTitle", COUNT(*) as count
      FROM "OddsCaches"
      GROUP BY "sportTitle"
      ORDER BY count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`총 ${sportTitleStats.length}개 sportTitle 발견:`);
    sportTitleStats.forEach(item => {
      console.log(`  ${item.sportTitle}: ${item.count}개`);
    });

    // 2. subCategory와 sportTitle 매핑 관계 확인
    console.log('\n=== subCategory와 sportTitle 매핑 관계 ===');
    const mappingStats = await sequelize.query(`
      SELECT "subCategory", "sportTitle", COUNT(*) as count
      FROM "OddsCaches"
      GROUP BY "subCategory", "sportTitle"
      ORDER BY "subCategory", count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log('subCategory별 sportTitle 매핑:');
    let currentSubCategory = '';
    mappingStats.forEach(item => {
      if (item.subCategory !== currentSubCategory) {
        console.log(`\n${item.subCategory}:`);
        currentSubCategory = item.subCategory;
      }
      console.log(`  - ${item.sportTitle}: ${item.count}개`);
    });

    // 3. sportTitle이 null인 레코드 확인
    console.log('\n=== sportTitle이 null인 레코드 ===');
    const nullSportTitle = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM "OddsCaches"
      WHERE "sportTitle" IS NULL
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`sportTitle이 null인 레코드: ${nullSportTitle[0].count}개`);

    if (nullSportTitle[0].count > 0) {
      const nullSamples = await sequelize.query(`
        SELECT "id", "mainCategory", "subCategory", "homeTeam", "awayTeam", "commenceTime"
        FROM "OddsCaches"
        WHERE "sportTitle" IS NULL
        LIMIT 5
      `, { type: Sequelize.QueryTypes.SELECT });

      console.log('샘플 레코드:');
      nullSamples.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.subCategory} | ${record.homeTeam} vs ${record.awayTeam} | ${record.commenceTime}`);
      });
    }

    // 4. sportTitle과 subCategory 일관성 확인
    console.log('\n=== sportTitle과 subCategory 일관성 확인 ===');
    const consistencyCheck = await sequelize.query(`
      SELECT 
        "subCategory",
        COUNT(DISTINCT "sportTitle") as unique_sport_titles,
        array_agg(DISTINCT "sportTitle") as sport_titles
      FROM "OddsCaches"
      WHERE "sportTitle" IS NOT NULL
      GROUP BY "subCategory"
      HAVING COUNT(DISTINCT "sportTitle") > 1
      ORDER BY unique_sport_titles DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    if (consistencyCheck.length === 0) {
      console.log('모든 subCategory가 일관된 sportTitle을 가지고 있습니다.');
    } else {
      console.log('일관성이 없는 subCategory들:');
      consistencyCheck.forEach(item => {
        console.log(`  ${item.subCategory}: ${item.unique_sport_titles}개 sportTitle (${item.sport_titles.join(', ')})`);
      });
    }

    // 5. sportTitle 샘플 데이터 확인
    console.log('\n=== sportTitle 샘플 데이터 ===');
    const samples = await sequelize.query(`
      SELECT "subCategory", "sportTitle", "homeTeam", "awayTeam", "commenceTime"
      FROM "OddsCaches"
      WHERE "sportTitle" IS NOT NULL
      ORDER BY "subCategory", "createdAt" DESC
      LIMIT 20
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log('최근 20개 레코드의 sportTitle:');
    let currentCategory = '';
    samples.forEach((sample, index) => {
      if (sample.subCategory !== currentCategory) {
        console.log(`\n${sample.subCategory}:`);
        currentCategory = sample.subCategory;
      }
      console.log(`  ${index + 1}. ${sample.sportTitle} | ${sample.homeTeam} vs ${sample.awayTeam}`);
    });

    // 6. 전체 레코드 수 확인
    const totalCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM "OddsCaches"',
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(`\n전체 레코드 수: ${totalCount[0].count}`);

  } catch (error) {
    console.error('sportTitle 분석 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

// 실행
analyzeSportTitle(); 