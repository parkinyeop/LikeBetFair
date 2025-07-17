import { Op } from 'sequelize';
import OddsCache from '../models/oddsCacheModel.js';
import oddsApiService from '../services/oddsApiService.js';

async function fixOfficialOddsBatch() {
  try {
    console.log('🔧 officialOdds 배치 수정 스크립트 시작...');
    
    // 배치 크기
    const BATCH_SIZE = 50;
    
    // 전체 개수 확인
    const totalCount = await OddsCache.count({
      where: {
        [Op.or]: [
          { officialOdds: null },
          { officialOdds: {} }
        ]
      }
    });
    
    console.log(`📊 총 처리할 레코드 수: ${totalCount}개`);
    console.log(`📦 배치 크기: ${BATCH_SIZE}개`);
    
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    while (processedCount < totalCount) {
      // 배치로 데이터 조회
      const batch = await OddsCache.findAll({
        where: {
          [Op.or]: [
            { officialOdds: null },
            { officialOdds: {} }
          ]
        },
        limit: BATCH_SIZE,
        order: [['createdAt', 'ASC']]
      });
      
      if (batch.length === 0) break;
      
      console.log(`\n🔄 배치 처리 중... (${processedCount + 1} ~ ${processedCount + batch.length}/${totalCount})`);
      
      // 배치 내에서 병렬 처리
      const updatePromises = batch.map(async (record) => {
        try {
          if (record.bookmakers && Array.isArray(record.bookmakers) && record.bookmakers.length > 0) {
            const officialOdds = oddsApiService.calculateAverageOdds(record.bookmakers);
            
            if (officialOdds) {
              await record.update({ officialOdds });
              return { success: true };
            }
          }
          return { success: false, reason: 'No valid bookmakers data' };
        } catch (error) {
          return { success: false, reason: error.message };
        }
      });
      
      // 배치 결과 처리
      const results = await Promise.all(updatePromises);
      
      const batchUpdated = results.filter(r => r.success).length;
      const batchErrors = results.filter(r => !r.success).length;
      
      updatedCount += batchUpdated;
      errorCount += batchErrors;
      processedCount += batch.length;
      
      console.log(`✅ 배치 완료: 성공 ${batchUpdated}개, 실패 ${batchErrors}개`);
      
      // 잠시 대기 (DB 부하 방지)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n============================================================');
    console.log('📊 officialOdds 배치 수정 완료:');
    console.log(`  • 총 처리: ${processedCount}개`);
    console.log(`  • 성공: ${updatedCount}개`);
    console.log(`  • 실패: ${errorCount}개`);
    console.log('✅ 스크립트 완료!');
    
  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류:', error);
  }
}

fixOfficialOddsBatch(); 