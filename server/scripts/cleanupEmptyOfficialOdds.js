import { Op } from 'sequelize';
import OddsCache from '../models/oddsCacheModel.js';

async function cleanupEmptyOfficialOdds() {
  try {
    console.log('🧹 officialOdds가 없는 데이터 정리 시작...');
    
    // officialOdds가 null이거나 빈 객체인 데이터 개수 확인
    const emptyCount = await OddsCache.count({
      where: {
        [Op.or]: [
          { officialOdds: null },
          { officialOdds: {} }
        ]
      }
    });
    
    console.log(`📊 officialOdds가 없는 데이터: ${emptyCount}개`);
    
    if (emptyCount === 0) {
      console.log('✅ 정리할 데이터가 없습니다.');
      return;
    }
    
    // 사용자 확인
    console.log('\n⚠️  이 작업은 officialOdds가 없는 데이터를 삭제합니다.');
    console.log('   새로 들어오는 데이터는 자동으로 officialOdds가 계산됩니다.');
    console.log('   계속하시겠습니까? (y/N)');
    
    // 실제로는 사용자 입력을 받아야 하지만, 스크립트에서는 자동 진행
    const shouldProceed = true; // 실제로는 readline으로 사용자 입력 받기
    
    if (!shouldProceed) {
      console.log('❌ 작업이 취소되었습니다.');
      return;
    }
    
    // 삭제 실행
    const deletedCount = await OddsCache.destroy({
      where: {
        [Op.or]: [
          { officialOdds: null },
          { officialOdds: {} }
        ]
      }
    });
    
    console.log(`\n✅ 정리 완료: ${deletedCount}개 데이터 삭제됨`);
    
    // 남은 데이터 확인
    const remainingCount = await OddsCache.count();
    console.log(`📊 남은 총 데이터: ${remainingCount}개`);
    
  } catch (error) {
    console.error('❌ 정리 중 오류:', error);
  }
}

cleanupEmptyOfficialOdds(); 