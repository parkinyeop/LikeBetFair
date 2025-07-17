const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database.cjs').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

async function removeOldSubCategories() {
  try {
    console.log('=== 구형 서브카테고리 레코드 삭제 ===\n');

    // 삭제할 구형 서브카테고리 목록
    const oldSubCategories = [
      'SERIE_A',
      '세리에 A',
      '아르헨티나 프리메라',
      'ARGENTINA_PRIMERA',
      '브라질 세리에 A',
      'BRASILEIRAO',
      '중국 슈퍼리그',
      'J리그',
      'K리그',
      'MLS'
    ];

    let totalRemoved = 0;

    for (const oldCategory of oldSubCategories) {
      console.log(`\n처리 중: ${oldCategory}`);
      
      // 해당 서브카테고리의 레코드 수 확인
      const count = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM "OddsCaches"
        WHERE "subCategory" = ?
      `, {
        replacements: [oldCategory],
        type: Sequelize.QueryTypes.SELECT
      });
      
      if (count[0].count === 0) {
        console.log(`  - 레코드 없음, 건너뜀`);
        continue;
      }
      
      console.log(`  - ${count[0].count}개 레코드 발견`);
      
      // 삭제 전에 해당 레코드들의 정보 출력
      const records = await sequelize.query(`
        SELECT "id", "homeTeam", "awayTeam", "commenceTime", "market", "createdAt"
        FROM "OddsCaches"
        WHERE "subCategory" = ?
        ORDER BY "createdAt" DESC
        LIMIT 5
      `, {
        replacements: [oldCategory],
        type: Sequelize.QueryTypes.SELECT
      });
      
      console.log(`  - 샘플 레코드:`);
      records.forEach((record, index) => {
        console.log(`    ${index + 1}. ${record.homeTeam} vs ${record.awayTeam} | ${record.market} | ${record.createdAt}`);
      });
      
      // 삭제 실행
      const deleteResult = await sequelize.query(`
        DELETE FROM "OddsCaches"
        WHERE "subCategory" = ?
      `, {
        replacements: [oldCategory],
        type: Sequelize.QueryTypes.DELETE
      });
      
      console.log(`  - ${count[0].count}개 레코드 삭제 완료`);
      totalRemoved += count[0].count;
    }

    console.log(`\n총 ${totalRemoved}개 구형 서브카테고리 레코드 삭제 완료`);

    // 삭제 후 서브카테고리 현황 확인
    console.log('\n=== 삭제 후 서브카테고리 현황 ===');
    const finalSubCategories = await sequelize.query(`
      SELECT "subCategory", COUNT(*) as count
      FROM "OddsCaches"
      GROUP BY "subCategory"
      ORDER BY count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    finalSubCategories.forEach(item => {
      console.log(`${item.subCategory}: ${item.count}개`);
    });

    // 전체 레코드 수 확인
    const totalCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM "OddsCaches"',
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(`\n전체 레코드 수: ${totalCount[0].count}`);

  } catch (error) {
    console.error('구형 서브카테고리 삭제 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

// 실행
removeOldSubCategories(); 