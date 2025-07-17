import { Op } from 'sequelize';
import OddsCache from '../models/oddsCacheModel.js';
import oddsApiService from '../services/oddsApiService.js';

async function calculateOfficialOdds() {
  try {
    console.log('🔧 officialOdds 계산 스크립트 시작...');
    
    // officialOdds가 NULL이거나 빈 객체인 모든 레코드 조회
    const oddsRecords = await OddsCache.findAll({
      where: {
        [Op.or]: [
          { officialOdds: null },
          { officialOdds: {} }
        ]
      }
    });
    
    console.log(`📊 처리할 레코드 수: ${oddsRecords.length}개`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const record of oddsRecords) {
      try {
        if (record.bookmakers && Array.isArray(record.bookmakers) && record.bookmakers.length > 0) {
          // calculateAverageOdds 메서드를 사용하여 officialOdds 계산
          const officialOdds = oddsApiService.calculateAverageOdds(record.bookmakers);
          
          if (officialOdds) {
            // 레코드 업데이트
            await record.update({
              officialOdds: officialOdds
            });
            updatedCount++;
            
            if (updatedCount % 50 === 0) {
              console.log(`✅ ${updatedCount}개 처리 완료...`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ 레코드 ${record.id} 처리 중 오류:`, error.message);
        errorCount++;
      }
    }
    
    console.log('============================================================');
    console.log('📊 officialOdds 계산 완료:');
    console.log(`  • 총 처리: ${oddsRecords.length}개`);
    console.log(`  • 성공: ${updatedCount}개`);
    console.log(`  • 실패: ${errorCount}개`);
    console.log('✅ 스크립트 완료!');
    
  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류:', error);
  }
}

calculateOfficialOdds(); 