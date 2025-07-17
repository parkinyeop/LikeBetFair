const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database.cjs').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

async function checkSportTitleInDb() {
  try {
    console.log('=== DB에서 sportTitle 확인 ===\n');

    // 아르헨티나 프리메라 데이터 확인
    console.log('=== 아르헨티나 프리메라 데이터 ===');
    const argentinaData = await sequelize.query(`
      SELECT "sportTitle", "subCategory", "homeTeam", "awayTeam", "commenceTime"
      FROM "OddsCaches"
      WHERE "subCategory" = 'ARGENTINA_PRIMERA_DIVISION'
      ORDER BY "createdAt" DESC
      LIMIT 5
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`총 ${argentinaData.length}개 레코드:`);
    argentinaData.forEach((record, index) => {
      console.log(`${index + 1}. sportTitle: "${record.sportTitle}" | ${record.homeTeam} vs ${record.awayTeam}`);
    });

    // 모든 subCategory별 sportTitle 현황
    console.log('\n=== 모든 subCategory별 sportTitle 현황 ===');
    const allData = await sequelize.query(`
      SELECT "subCategory", "sportTitle", COUNT(*) as count
      FROM "OddsCaches"
      GROUP BY "subCategory", "sportTitle"
      ORDER BY "subCategory", count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    let currentSubCategory = '';
    allData.forEach(item => {
      if (item.subCategory !== currentSubCategory) {
        console.log(`\n${item.subCategory}:`);
        currentSubCategory = item.subCategory;
      }
      console.log(`  - sportTitle: "${item.sportTitle}" (${item.count}개)`);
    });

    // sportTitle이 null인 레코드 확인
    console.log('\n=== sportTitle이 null인 레코드 ===');
    const nullSportTitle = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM "OddsCaches"
      WHERE "sportTitle" IS NULL
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`sportTitle이 null인 레코드: ${nullSportTitle[0].count}개`);

    if (nullSportTitle[0].count > 0) {
      const nullSamples = await sequelize.query(`
        SELECT "subCategory", "homeTeam", "awayTeam", "commenceTime"
        FROM "OddsCaches"
        WHERE "sportTitle" IS NULL
        LIMIT 5
      `, { type: Sequelize.QueryTypes.SELECT });

      console.log('샘플 레코드:');
      nullSamples.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.subCategory} | ${record.homeTeam} vs ${record.awayTeam}`);
      });
    }

  } catch (error) {
    console.error('DB 확인 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

// 실행
checkSportTitleInDb(); 