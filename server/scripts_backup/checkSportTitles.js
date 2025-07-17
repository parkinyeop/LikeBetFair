import OddsCache from '../models/oddsCacheModel.js';

async function checkSportTitles() {
  try {
    console.log('=== sportTitle 컬럼 검사 ===');
    
    // KBO sportTitle 확인
    const kboResults = await OddsCache.findAll({
      where: { subCategory: 'KBO' },
      attributes: ['sportTitle'],
      group: ['sportTitle'],
      raw: true
    });
    
    console.log('\nKBO sportTitle:');
    kboResults.forEach(r => console.log(`  ${r.sportTitle}`));
    
    // 전체 리그별 sportTitle 확인
    const allResults = await OddsCache.findAll({
      attributes: ['subCategory', 'sportTitle'],
      group: ['subCategory', 'sportTitle'],
      order: ['subCategory'],
      raw: true
    });
    
    console.log('\n전체 리그별 sportTitle:');
    const grouped = {};
    allResults.forEach(r => {
      if (!grouped[r.subCategory]) grouped[r.subCategory] = [];
      grouped[r.subCategory].push(r.sportTitle);
    });
    
    Object.entries(grouped).forEach(([league, titles]) => {
      console.log(`\n${league}:`);
      titles.forEach(title => console.log(`  ${title}`));
      if (titles.length > 1) {
        console.log(`  ⚠️ 여러 sportTitle 존재!`);
      }
    });
    
  } catch (error) {
    console.error('오류:', error);
  }
}

checkSportTitles().then(() => process.exit(0)); 