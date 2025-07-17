import OddsCache from '../models/oddsCacheModel.js';

async function fixKboSportKeyConsistency() {
  try {
    console.log('=== KBO 스포츠키 일관성 수정 ===');
    
    // 현재 KBO 관련 데이터 확인
    console.log('\n📊 현재 KBO 데이터 현황:');
    const kboData = await OddsCache.findAll({
      where: {
        subCategory: 'KBO'
      },
      attributes: ['sportKey', 'mainCategory', 'subCategory'],
      group: ['sportKey', 'mainCategory', 'subCategory'],
      raw: true
    });
    
    if (kboData.length === 0) {
      console.log('❌ KBO 데이터가 없습니다.');
      return;
    }
    
    // 스포츠키별 통계
    const sportKeyStats = {};
    for (const data of kboData) {
      const key = data.sportKey;
      if (!sportKeyStats[key]) {
        sportKeyStats[key] = 0;
      }
      
      const count = await OddsCache.count({
        where: {
          subCategory: 'KBO',
          sportKey: key
        }
      });
      sportKeyStats[key] = count;
    }
    
    console.log('\n스포츠키별 현황:');
    Object.entries(sportKeyStats).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}개`);
    });
    
    // KBO 스포츠키를 baseball_kbo로 통일
    console.log('\n🔄 스포츠키 통일 작업 시작...');
    
    const updateResult = await OddsCache.update(
      { 
        sportKey: 'baseball_kbo'
      },
      { 
        where: { 
          subCategory: 'KBO',
          sportKey: 'KBO'  // KBO를 baseball_kbo로 변경
        } 
      }
    );
    
    console.log(`✅ KBO → baseball_kbo: ${updateResult[0]}개 수정 완료`);
    
    // 최종 확인
    console.log('\n📊 수정 후 현황:');
    const finalStats = await OddsCache.findAll({
      where: {
        subCategory: 'KBO'
      },
      attributes: [
        'sportKey',
        [OddsCache.sequelize.fn('COUNT', OddsCache.sequelize.col('id')), 'count']
      ],
      group: ['sportKey'],
      raw: true
    });
    
    finalStats.forEach(stat => {
      console.log(`  ${stat.sportKey}: ${stat.count}개`);
    });
    
    if (finalStats.length === 1 && finalStats[0].sportKey === 'baseball_kbo') {
      console.log('\n🎉 KBO 스포츠키 통일 완료!');
      console.log('✅ 모든 KBO 경기가 baseball_kbo 스포츠키를 사용합니다.');
    } else {
      console.log('\n⚠️ 아직 통일되지 않은 스포츠키가 있습니다.');
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 실행
fixKboSportKeyConsistency()
  .then(() => {
    console.log('\n작업 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }); 