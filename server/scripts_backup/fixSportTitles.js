import OddsCache from '../models/oddsCacheModel.js';

async function fixSportTitles() {
  try {
    console.log('=== sportTitle 컬럼 수정 ===');
    
    // 1. BRASILEIRAO sportTitle 통일 (브라질 세리에 A로)
    console.log('\n🇧🇷 브라질 리그 sportTitle 통일...');
    const brasileiraoResult = await OddsCache.update(
      { sportTitle: '브라질 세리에 A' },
      { 
        where: { 
          subCategory: 'BRASILEIRAO',
          sportTitle: 'Brazil Série A'
        } 
      }
    );
    console.log(`✅ Brazil Série A → 브라질 세리에 A: ${brasileiraoResult[0]}개 수정`);
    
    // 2. NFL sportTitle 수정 (American Soccer → NFL)
    console.log('\n🏈 NFL sportTitle 수정...');
    const nflResult = await OddsCache.update(
      { sportTitle: 'NFL' },
      { 
        where: { 
          subCategory: 'NFL',
          sportTitle: 'American Soccer'
        } 
      }
    );
    console.log(`✅ American Soccer → NFL: ${nflResult[0]}개 수정`);
    
    // 3. 수정 후 확인
    console.log('\n📊 수정 후 확인:');
    
    const problematicLeagues = ['BRASILEIRAO', 'NFL'];
    for (const league of problematicLeagues) {
      const titles = await OddsCache.findAll({
        where: { subCategory: league },
        attributes: [
          'sportTitle',
          [OddsCache.sequelize.fn('COUNT', OddsCache.sequelize.col('id')), 'count']
        ],
        group: ['sportTitle'],
        raw: true
      });
      
      console.log(`\n${league}:`);
      titles.forEach(title => {
        console.log(`  ${title.sportTitle}: ${title.count}개`);
      });
      
      if (titles.length === 1) {
        console.log(`  ✅ ${league} sportTitle 통일 완료`);
      } else {
        console.log(`  ⚠️ ${league} 아직 여러 sportTitle 존재`);
      }
    }
    
    console.log('\n🎉 sportTitle 수정 완료!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

fixSportTitles().then(() => {
  console.log('\n작업 완료');
  process.exit(0);
}).catch(error => {
  console.error('스크립트 실행 오류:', error);
  process.exit(1);
}); 