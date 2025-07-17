const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database.cjs').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

async function checkSpecificDuplicates() {
  try {
    console.log('=== 특정 중복 데이터 확인 ===\n');

    // SERIE_A와 ITALY_SERIE_A 간의 중복 확인
    console.log('=== SERIE_A와 ITALY_SERIE_A 중복 확인 ===');
    const duplicates = await sequelize.query(`
      SELECT 
        "sportKey", "homeTeam", "awayTeam", "commenceTime", "market",
        COUNT(*) as duplicate_count,
        array_agg("subCategory") as subCategories,
        array_agg("id") as ids
      FROM "OddsCaches"
      WHERE "subCategory" IN ('SERIE_A', 'ITALY_SERIE_A')
      GROUP BY "sportKey", "homeTeam", "awayTeam", "commenceTime", "market"
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`총 ${duplicates.length}개 중복 그룹 발견`);

    for (const duplicate of duplicates) {
      console.log(`\n경기: ${duplicate.homeTeam} vs ${duplicate.awayTeam}`);
      console.log(`시간: ${duplicate.commenceTime}`);
      console.log(`마켓: ${duplicate.market}`);
      console.log(`서브카테고리: ${duplicate.subCategories.join(', ')}`);
      console.log(`ID: ${duplicate.ids.join(', ')}`);
      
      // 각 레코드의 상세 정보 조회
      const records = await sequelize.query(`
        SELECT "id", "subCategory", "createdAt", "updatedAt"
        FROM "OddsCaches"
        WHERE "id" IN (${duplicate.ids.map(() => '?').join(',')})
        ORDER BY "createdAt" DESC
      `, {
        replacements: duplicate.ids,
        type: Sequelize.QueryTypes.SELECT
      });
      
      records.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}, 서브카테고리: ${record.subCategory}, 생성: ${record.createdAt}`);
      });
    }

    // 전체 중복 현황 재확인
    console.log('\n=== 전체 중복 현황 재확인 ===');
    const allDuplicates = await sequelize.query(`
      SELECT 
        "sportKey", "homeTeam", "awayTeam", "commenceTime", "market",
        COUNT(*) as duplicate_count
      FROM "OddsCaches" 
      GROUP BY "sportKey", "homeTeam", "awayTeam", "commenceTime", "market"
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`전체 중복 그룹: ${allDuplicates.length}개`);

    // 서브카테고리별 현황
    console.log('\n=== 서브카테고리별 현황 ===');
    const subCategoryStats = await sequelize.query(`
      SELECT "subCategory", COUNT(*) as count
      FROM "OddsCaches"
      GROUP BY "subCategory"
      ORDER BY count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    subCategoryStats.forEach(item => {
      console.log(`${item.subCategory}: ${item.count}개`);
    });

  } catch (error) {
    console.error('중복 확인 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

// 실행
checkSpecificDuplicates(); 