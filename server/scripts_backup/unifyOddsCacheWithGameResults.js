import OddsCache from '../models/oddsCacheModel.js';

console.log('🔄 OddsCache 카테고리를 GameResults 표준에 맞춰 통일');

async function unifyWithGameResults() {
  try {
    console.log('=' .repeat(60));
    
    // GameResults DB 표준 매핑표
    const standardMapping = {
      // 축구 리그들
      '아르헨티나프리메라': 'ARGENTINA_PRIMERA',
      '아르헨티나 프리메라': 'ARGENTINA_PRIMERA',
      '브라질리라오': 'BRASILEIRAO',
      '브라질 세리에 A': 'BRASILEIRAO',
      '세리에A': 'SERIE_A',
      '세리에 A': 'SERIE_A',
      'USA_MLS': 'MLS',
      'JAPAN_J_LEAGUE': 'J_LEAGUE',
      'J리그': 'J_LEAGUE',
      'KOREA_KLEAGUE1': 'KLEAGUE1',
      'K리그': 'KLEAGUE1',
      'CSL': 'CSL',
      '중국 슈퍼리그': 'CSL',
      
      // 이미 표준인 것들은 그대로
      'MLS': 'MLS',
      'NFL': 'NFL',
      'NBA': 'NBA',
      'MLB': 'MLB',
      'KBO': 'KBO',
      'KBL': 'KBL'
    };
    
    console.log('📊 현재 OddsCache 상태 확인...');
    const currentStats = await OddsCache.findAll({
      attributes: [
        'subCategory',
        [OddsCache.sequelize.fn('COUNT', OddsCache.sequelize.col('id')), 'count']
      ],
      group: ['subCategory'],
      order: [[OddsCache.sequelize.fn('COUNT', OddsCache.sequelize.col('id')), 'DESC']],
      raw: true
    });
    
    console.log('\\n현재 카테고리:');
    currentStats.forEach(stat => {
      console.log(`  ${stat.subCategory.padEnd(20)}: ${stat.count}개`);
    });
    
    console.log('\\n🔄 카테고리 통일 작업 시작...');
    let totalUpdated = 0;
    
    for (const [oldCategory, newCategory] of Object.entries(standardMapping)) {
      try {
        const updateResult = await OddsCache.update(
          { subCategory: newCategory },
          { where: { subCategory: oldCategory } }
        );
        
        if (updateResult[0] > 0) {
          console.log(`  ✅ ${oldCategory} → ${newCategory}: ${updateResult[0]}개 수정`);
          totalUpdated += updateResult[0];
        }
      } catch (error) {
        console.log(`  ⚠️ ${oldCategory} 수정 실패: ${error.message}`);
      }
    }
    
    console.log(`\\n📊 총 ${totalUpdated}개 카테고리 수정 완료`);
    
    // 최종 결과 확인
    console.log('\\n✅ 통일 후 카테고리 현황:');
    const finalStats = await OddsCache.findAll({
      attributes: [
        'mainCategory', 'subCategory',
        [OddsCache.sequelize.fn('COUNT', OddsCache.sequelize.col('id')), 'count']
      ],
      group: ['mainCategory', 'subCategory'],
      order: [[OddsCache.sequelize.fn('COUNT', OddsCache.sequelize.col('id')), 'DESC']],
      raw: true
    });
    
    finalStats.forEach(stat => {
      console.log(`  ${stat.subCategory.padEnd(20)} (${stat.mainCategory}): ${stat.count}개`);
    });
    
    // GameResults와 매칭 확인
    console.log('\\n🎯 GameResults DB와 매칭 확인:');
    const gameResultsCategories = ['NFL', 'NBA', 'MLB', 'KBO', 'KBL', 'MLS', 'CSL', 'KLEAGUE1', 'ARGENTINA_PRIMERA', 'BRASILEIRAO', 'J_LEAGUE', 'SERIE_A'];
    
    finalStats.forEach(stat => {
      if (gameResultsCategories.includes(stat.subCategory)) {
        console.log(`  ✅ ${stat.subCategory}: GameResults와 일치`);
      } else {
        console.log(`  ⚠️ ${stat.subCategory}: GameResults에 없는 카테고리`);
      }
    });
    
    console.log('\\n🎉 OddsCache와 GameResults 카테고리 통일 완료!');
    
  } catch (error) {
    console.error('❌ 통일 작업 중 오류:', error.message);
    console.error(error.stack);
  }
}

unifyWithGameResults(); 