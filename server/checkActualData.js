import OddsCache from './models/oddsCacheModel.js';

async function checkActualData() {
  try {
    console.log('🔍 실제 데이터 확인...\n');
    
    // 샘플 데이터 5개 조회
    const samples = await OddsCache.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']]
    });
    
    console.log('📊 샘플 데이터 5개:');
    samples.forEach((item, i) => {
      console.log(`\n${i+1}. ${item.sportKey} - ${item.homeTeam} vs ${item.awayTeam}`);
      console.log(`   officialOdds 타입: ${typeof item.officialOdds}`);
      console.log(`   officialOdds 값: ${JSON.stringify(item.officialOdds).substring(0, 100)}...`);
      console.log(`   bookmakers 타입: ${typeof item.bookmakers}`);
      console.log(`   bookmakers 길이: ${Array.isArray(item.bookmakers) ? item.bookmakers.length : 'N/A'}`);
    });
    
    // officialOdds가 실제로 빈 객체인지 확인
    const emptyObjects = await OddsCache.findAll({
      where: {
        officialOdds: {}
      },
      limit: 3
    });
    
    console.log(`\n📋 officialOdds가 빈 객체인 데이터: ${emptyObjects.length}개`);
    emptyObjects.forEach((item, i) => {
      console.log(`${i+1}. ${item.sportKey} - ${item.homeTeam} vs ${item.awayTeam}`);
      console.log(`   officialOdds: ${JSON.stringify(item.officialOdds)}`);
    });
    
    // officialOdds가 실제로 데이터가 있는지 확인
    const hasData = await OddsCache.findAll({
      where: {
        officialOdds: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.ne]: {} }
          ]
        }
      },
      limit: 3
    });
    
    console.log(`\n✅ officialOdds에 실제 데이터가 있는 데이터: ${hasData.length}개`);
    hasData.forEach((item, i) => {
      console.log(`${i+1}. ${item.sportKey} - ${item.homeTeam} vs ${item.awayTeam}`);
      console.log(`   officialOdds: ${JSON.stringify(item.officialOdds).substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('❌ 확인 중 오류:', error);
  }
}

checkActualData(); 