const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database.cjs').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

// 서브카테고리 매핑 정의
const subCategoryMapping = {
  // 이탈리아 세리에 A 통일
  'SERIE_A': 'ITALY_SERIE_A',
  '세리에 A': 'ITALY_SERIE_A',
  
  // 아르헨티나 프리메라 통일
  '아르헨티나 프리메라': 'ARGENTINA_PRIMERA_DIVISION',
  'ARGENTINA_PRIMERA': 'ARGENTINA_PRIMERA_DIVISION',
  
  // 브라질 세리에 A 통일
  '브라질 세리에 A': 'BRAZIL_CAMPEONATO',
  'BRASILEIRAO': 'BRAZIL_CAMPEONATO',
  
  // 중국 슈퍼리그 통일
  '중국 슈퍼리그': 'CHINA_SUPERLEAGUE',
  
  // J리그 통일
  'J리그': 'JAPAN_J_LEAGUE',
  
  // K리그 통일
  'K리그': 'KOREA_KLEAGUE1',
  
  // MLS 통일
  'MLS': 'USA_MLS'
};

async function unifySubCategories() {
  try {
    console.log('서브카테고리를 대문자 + 언더스코어 (영문) 방식으로 통일합니다.');
    console.log('계속하시겠습니까? (y/n)');
    
    console.log('=== 서브카테고리 통일 작업 시작 ===\n');

    // 1. 통일 전 서브카테고리 현황 확인
    console.log('=== 통일 전 서브카테고리 현황 ===');
    const currentSubCategories = await sequelize.query(`
      SELECT "subCategory", COUNT(*) as count
      FROM "OddsCaches"
      GROUP BY "subCategory"
      ORDER BY count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    currentSubCategories.forEach(item => {
      console.log(`${item.subCategory}: ${item.count}개`);
    });

    // 2. 중복 제거 후 통일 작업 수행
    console.log('\n=== 서브카테고리 통일 작업 수행 ===');
    
    for (const [oldCategory, newCategory] of Object.entries(subCategoryMapping)) {
      console.log(`\n처리 중: ${oldCategory} → ${newCategory}`);
      
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
        console.log(`  - ${oldCategory}: 레코드 없음, 건너뜀`);
        continue;
      }
      
      console.log(`  - ${oldCategory}: ${count[0].count}개 레코드 발견`);
      
      // 중복 확인 및 제거
      const duplicates = await sequelize.query(`
        SELECT 
          "sportKey", "homeTeam", "awayTeam", "commenceTime", "market",
          COUNT(*) as duplicate_count
        FROM "OddsCaches"
        WHERE "subCategory" IN (?, ?)
        GROUP BY "sportKey", "homeTeam", "awayTeam", "commenceTime", "market"
        HAVING COUNT(*) > 1
      `, {
        replacements: [oldCategory, newCategory],
        type: Sequelize.QueryTypes.SELECT
      });
      
      if (duplicates.length > 0) {
        console.log(`  - 중복 그룹 ${duplicates.length}개 발견, 중복 제거 중...`);
        
        for (const duplicate of duplicates) {
          // 중복된 레코드들 조회 (가장 최근 것만 남기고 삭제)
          const records = await sequelize.query(`
            SELECT "id", "subCategory", "createdAt"
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
            await sequelize.query(`
              DELETE FROM "OddsCaches"
              WHERE "id" IN (${idsToDelete.map(() => '?').join(',')})
            `, {
              replacements: idsToDelete,
              type: Sequelize.QueryTypes.DELETE
            });
            console.log(`    - ${recordsToDelete.length}개 중복 레코드 삭제`);
          }
        }
      }
      
      // 서브카테고리 업데이트
      const updateResult = await sequelize.query(`
        UPDATE "OddsCaches"
        SET "subCategory" = ?, "updatedAt" = NOW()
        WHERE "subCategory" = ?
      `, {
        replacements: [newCategory, oldCategory],
        type: Sequelize.QueryTypes.UPDATE
      });
      
      console.log(`  - ${oldCategory} → ${newCategory} 완료`);
    }

    // 3. 통일 후 서브카테고리 현황 확인
    console.log('\n=== 통일 후 서브카테고리 현황 ===');
    const finalSubCategories = await sequelize.query(`
      SELECT "subCategory", COUNT(*) as count
      FROM "OddsCaches"
      GROUP BY "subCategory"
      ORDER BY count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    finalSubCategories.forEach(item => {
      console.log(`${item.subCategory}: ${item.count}개`);
    });

    // 4. 전체 레코드 수 확인
    const totalCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM "OddsCaches"',
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(`\n전체 레코드 수: ${totalCount[0].count}`);

    console.log('\n=== 서브카테고리 통일 작업 완료 ===');

  } catch (error) {
    console.error('서브카테고리 통일 작업 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

// 실제 실행을 위해서는 아래 주석을 해제하세요
unifySubCategories();

// 테스트용 (실제 업데이트 없이 확인만)
// async function testUnification() {
//   try {
//     console.log('=== 서브카테고리 통일 테스트 ===\n');
//     
//     // 현재 서브카테고리 현황
//     const currentSubCategories = await sequelize.query(`
//       SELECT "subCategory", COUNT(*) as count
//       FROM "OddsCaches"
//       GROUP BY "subCategory"
//       ORDER BY count DESC
//     `, { type: Sequelize.QueryTypes.SELECT });
//     
//     console.log('현재 서브카테고리:');
//     currentSubCategories.forEach(item => {
//       console.log(`  ${item.subCategory}: ${item.count}개`);
//     });
//     
//     // 통일 후 예상 현황
//     console.log('\n통일 후 예상 서브카테고리:');
//     const categoryCounts = {};
//     
//     for (const item of currentSubCategories) {
//       const newCategory = subCategoryMapping[item.subCategory] || item.subCategory;
//       categoryCounts[newCategory] = (categoryCounts[newCategory] || 0) + parseInt(item.count);
//     }
//     
//     Object.entries(categoryCounts)
//       .sort(([,a], [,b]) => b - a)
//       .forEach(([category, count]) => {
//         console.log(`  ${category}: ${count}개`);
//       });
//     
//     console.log(`\n총 ${Object.keys(categoryCounts).length}개 서브카테고리로 통일됨`);
//     
//   } catch (error) {
//     console.error('테스트 중 오류:', error);
//   } finally {
//     await sequelize.close();
//   }
// }

// 테스트 실행
// testUnification(); 