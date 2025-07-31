import { Op } from 'sequelize';
import OddsCache from './models/oddsCacheModel.js';
import sequelize from './models/sequelize.js';

async function cleanDuplicateOdds() {
  try {
    console.log('🔍 중복 데이터 정리 시작...');
    
    // 1. 중복 데이터 찾기
    const duplicates = await sequelize.query(`
      SELECT 
        "sportKey", 
        "homeTeam", 
        "awayTeam", 
        "commenceTime",
        COUNT(*) as count,
        array_agg(id) as ids,
        array_agg("createdAt") as created_ats
      FROM "OddsCaches" 
      GROUP BY "sportKey", "homeTeam", "awayTeam", "commenceTime"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`📊 발견된 중복 그룹: ${duplicates.length}개`);

    let totalDeleted = 0;

    for (const duplicate of duplicates) {
      const { sportKey, homeTeam, awayTeam, commenceTime, count, ids, created_ats } = duplicate;
      
      console.log(`\n🔍 중복 그룹: ${homeTeam} vs ${awayTeam} (${commenceTime})`);
      console.log(`   - 중복 개수: ${count}개`);
      console.log(`   - ID 목록: ${ids.join(', ')}`);
      
      // 가장 최근 데이터를 제외하고 나머지 삭제
      const recordsToDelete = ids.slice(1); // 첫 번째(가장 오래된) 제외하고 삭제
      
      if (recordsToDelete.length > 0) {
        const deletedCount = await OddsCache.destroy({
          where: {
            id: {
              [Op.in]: recordsToDelete
            }
          }
        });
        
        totalDeleted += deletedCount;
        console.log(`   ✅ ${deletedCount}개 중복 레코드 삭제됨`);
      }
    }

    console.log(`\n🎉 중복 데이터 정리 완료!`);
    console.log(`   - 총 삭제된 레코드: ${totalDeleted}개`);
    
    // 2. 정리 후 통계
    const totalCount = await OddsCache.count();
    console.log(`   - 현재 총 레코드 수: ${totalCount}개`);

  } catch (error) {
    console.error('❌ 중복 데이터 정리 중 오류:', error);
    throw error;
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanDuplicateOdds()
    .then(() => {
      console.log('✅ 중복 데이터 정리 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 중복 데이터 정리 실패:', error);
      process.exit(1);
    });
}

export default cleanDuplicateOdds; 