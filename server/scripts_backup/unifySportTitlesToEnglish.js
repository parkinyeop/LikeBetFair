import OddsCache from '../models/oddsCacheModel.js';

async function unifySportTitlesToEnglish() {
  try {
    console.log('=== sportTitle 영어 통일 ===');
    
    // 한글 → 영어 매핑
    const titleMappings = {
      '아르헨티나 프리메라': 'Argentina Primera',
      '브라질 세리에 A': 'Brasileirao',
      '중국 슈퍼리그': 'Chinese Super League',
      'J리그': 'J-League',
      'K리그': 'K-League',
      '세리에 A': 'Serie A'
    };
    
    let totalUpdated = 0;
    
    console.log('\n🔄 한글 → 영어 변환 작업:');
    
    for (const [korean, english] of Object.entries(titleMappings)) {
      const updateResult = await OddsCache.update(
        { sportTitle: english },
        { 
          where: { sportTitle: korean } 
        }
      );
      
      if (updateResult[0] > 0) {
        console.log(`  ✅ ${korean} → ${english}: ${updateResult[0]}개 수정`);
        totalUpdated += updateResult[0];
      } else {
        console.log(`  ℹ️ ${korean}: 수정할 데이터 없음`);
      }
    }
    
    console.log(`\n📊 총 ${totalUpdated}개 sportTitle 영어로 변환 완료`);
    
    // 최종 확인
    console.log('\n📋 최종 sportTitle 목록:');
    const finalTitles = await OddsCache.findAll({
      attributes: [
        'sportTitle',
        [OddsCache.sequelize.fn('COUNT', OddsCache.sequelize.col('id')), 'count']
      ],
      group: ['sportTitle'],
      order: [['sportTitle', 'ASC']],
      raw: true
    });
    
    finalTitles.forEach(title => {
      console.log(`  ${title.sportTitle}: ${title.count}개`);
    });
    
    // 한글 여부 검사
    const hasKorean = finalTitles.some(title => 
      /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(title.sportTitle)
    );
    
    if (!hasKorean) {
      console.log('\n🎉 모든 sportTitle이 영어로 통일되었습니다!');
    } else {
      console.log('\n⚠️ 아직 한글이 포함된 sportTitle이 있습니다.');
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

unifySportTitlesToEnglish().then(() => {
  console.log('\n작업 완료');
  process.exit(0);
}).catch(error => {
  console.error('스크립트 실행 오류:', error);
  process.exit(1);
}); 