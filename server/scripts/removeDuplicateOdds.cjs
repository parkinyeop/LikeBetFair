const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database.cjs').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

async function removeDuplicateOdds() {
  try {
    console.log('=== 중복 데이터 제거 작업 시작 ===\n');

    // 1. 중복 데이터 확인
    console.log('=== 중복 데이터 현황 ===');
    const duplicates = await sequelize.query(`
      SELECT 
        "sportKey", 
        "homeTeam", 
        "awayTeam", 
        "commenceTime",
        "market",
        COUNT(*) as duplicate_count
      FROM "OddsCaches" 
      GROUP BY "sportKey", "homeTeam", "awayTeam", "commenceTime", "market"
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`총 ${duplicates.length}개 중복 그룹 발견`);

    // 2. 중복 데이터 제거 (가장 최근 데이터만 남기고 나머지 삭제)
    let totalRemoved = 0;

    for (const duplicate of duplicates) {
      console.log(`\n처리 중: ${duplicate.sportKey} | ${duplicate.homeTeam} vs ${duplicate.awayTeam} | ${duplicate.commenceTime} | ${duplicate.market} (${duplicate.duplicate_count}개)`);
      
      // 해당 그룹의 모든 레코드 조회 (ID 포함)
      const records = await sequelize.query(`
        SELECT "id", "subCategory", "createdAt", "updatedAt"
        FROM "OddsCaches"
        WHERE "sportKey" = ? AND "homeTeam" = ? AND "awayTeam" = ? AND "commenceTime" = ? AND "market" = ?
        ORDER BY "createdAt" DESC
      `, {
        replacements: [
          duplicate.sportKey,
          duplicate.homeTeam,
          duplicate.awayTeam,
          duplicate.commenceTime,
          duplicate.market
        ],
        type: Sequelize.QueryTypes.SELECT
      });

      // 가장 최근 데이터를 제외하고 나머지 삭제
      const recordsToDelete = records.slice(1);
      
      if (recordsToDelete.length > 0) {
        const idsToDelete = recordsToDelete.map(r => r.id);
        
        const deleteResult = await sequelize.query(`
          DELETE FROM "OddsCaches"
          WHERE "id" IN (${idsToDelete.map(() => '?').join(',')})
        `, {
          replacements: idsToDelete,
          type: Sequelize.QueryTypes.DELETE
        });

        console.log(`  - ${recordsToDelete.length}개 레코드 삭제 (${recordsToDelete.map(r => r.subCategory).join(', ')})`);
        console.log(`  - ${records[0].subCategory} 유지 (가장 최근)`);
        
        totalRemoved += recordsToDelete.length;
      }
    }

    console.log(`\n총 ${totalRemoved}개 중복 레코드 제거 완료`);

    // 3. 제거 후 현황 확인
    console.log('\n=== 제거 후 중복 데이터 재확인 ===');
    const remainingDuplicates = await sequelize.query(`
      SELECT 
        "sportKey", 
        "homeTeam", 
        "awayTeam", 
        "commenceTime",
        "market",
        COUNT(*) as duplicate_count
      FROM "OddsCaches" 
      GROUP BY "sportKey", "homeTeam", "awayTeam", "commenceTime", "market"
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    if (remainingDuplicates.length === 0) {
      console.log('중복 데이터 없음 - 제거 작업 완료!');
    } else {
      console.log(`남은 중복 그룹: ${remainingDuplicates.length}개`);
    }

    // 4. 전체 레코드 수 확인
    const totalCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM "OddsCaches"',
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(`\n전체 레코드 수: ${totalCount[0].count}`);

  } catch (error) {
    console.error('중복 데이터 제거 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

// 실행
removeDuplicateOdds(); 