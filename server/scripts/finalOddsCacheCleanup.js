import OddsCache from '../models/oddsCacheModel.js';
import { Op } from 'sequelize';

console.log('🔧 배당률 DB 최종 정리 스크립트 시작...');

async function finalCleanup() {
  try {
    console.log('=' .repeat(60));
    
    // 1. 현재 상태 확인
    const totalBefore = await OddsCache.count();
    console.log('📊 정리 전 총 데이터:', totalBefore, '개');
    
    // 2. 남은 중복 데이터 제거
    console.log('\n🗑️ 남은 중복 데이터 제거 중...');
    const duplicateQuery = `
      SELECT "homeTeam", "awayTeam", "commenceTime", "subCategory", array_agg(id) as ids, count(*) as cnt
      FROM "OddsCaches" 
      GROUP BY "homeTeam", "awayTeam", "commenceTime", "subCategory" 
      HAVING count(*) > 1
    `;
    
    const [duplicateGroups] = await OddsCache.sequelize.query(duplicateQuery);
    
    let duplicatesRemoved = 0;
    for (const group of duplicateGroups) {
      const ids = group.ids;
      const latestRecord = await OddsCache.findOne({
        where: { id: { [Op.in]: ids } },
        order: [['lastUpdated', 'DESC']]
      });
      
      const idsToDelete = ids.filter(id => id !== latestRecord.id);
      if (idsToDelete.length > 0) {
        const deleteResult = await OddsCache.destroy({
          where: { id: { [Op.in]: idsToDelete } }
        });
        duplicatesRemoved += deleteResult;
        console.log(`  🗑️ ${group.subCategory}: ${group.homeTeam} vs ${group.awayTeam} - ${deleteResult}개 중복 제거`);
      }
    }
    
    // 3. 카테고리 통일 (같은 리그의 다른 표기법 정리)
    console.log('\n🔄 카테고리 통일 중...');
    
    // 아르헨티나 프리메라 통일
    await OddsCache.update(
      { subCategory: '아르헨티나 프리메라' },
      { where: { subCategory: '아르헨티나프리메라' } }
    );
    console.log('  ✅ 아르헨티나프리메라 → 아르헨티나 프리메라');
    
    // 세리에 A 통일
    await OddsCache.update(
      { subCategory: '세리에 A' },
      { where: { subCategory: '세리에A' } }
    );
    console.log('  ✅ 세리에A → 세리에 A');
    
    // 브라질 세리에 A 통일
    await OddsCache.update(
      { subCategory: '브라질 세리에 A' },
      { where: { subCategory: '브라질리라오' } }
    );
    console.log('  ✅ 브라질리라오 → 브라질 세리에 A');
    
    // MLS 통일
    await OddsCache.update(
      { subCategory: 'MLS' },
      { where: { subCategory: 'USA_MLS' } }
    );
    console.log('  ✅ USA_MLS → MLS');
    
    // J리그 통일
    await OddsCache.update(
      { subCategory: 'J리그' },
      { where: { subCategory: 'JAPAN_J_LEAGUE' } }
    );
    console.log('  ✅ JAPAN_J_LEAGUE → J리그');
    
    // K리그 통일
    await OddsCache.update(
      { subCategory: 'K리그' },
      { where: { subCategory: 'KOREA_KLEAGUE1' } }
    );
    console.log('  ✅ KOREA_KLEAGUE1 → K리그');
    
    // 중국 슈퍼리그 통일
    await OddsCache.update(
      { subCategory: '중국 슈퍼리그' },
      { where: { subCategory: 'CSL' } }
    );
    console.log('  ✅ CSL → 중국 슈퍼리그');
    
    // 스웨덴 알스벤스칸 통일 (mainCategory도 수정)
    await OddsCache.update(
      { subCategory: '스웨덴 알스벤스칸', mainCategory: 'soccer' },
      { where: { subCategory: '스웨덴 알스벤스칸', mainCategory: '스웨덴 알스벤스칸' } }
    );
    console.log('  ✅ 스웨덴 알스벤스칸 mainCategory 수정');
    
    // 4. 지원하지 않는 리그 제거 (스웨덴 알스벤스칸)
    console.log('\n🗑️ 지원하지 않는 리그 제거 중...');
    const swedenDeleted = await OddsCache.destroy({
      where: { subCategory: '스웨덴 알스벤스칸' }
    });
    console.log(`  🗑️ 스웨덴 알스벤스칸: ${swedenDeleted}개 제거`);
    
    // 5. 최종 결과 확인
    console.log('\n📊 최종 결과:');
    const totalAfter = await OddsCache.count();
    console.log(`  • 중복 데이터 제거: ${duplicatesRemoved}개`);
    console.log(`  • 지원하지 않는 리그 제거: ${swedenDeleted}개`);
    console.log(`  • 총 데이터: ${totalBefore}개 → ${totalAfter}개 (${totalBefore - totalAfter}개 감소)`);
    
    // 6. 최종 상태 확인
    console.log('\n✅ 최종 리그별 현황:');
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
    
    // 7. 중복 확인
    const [finalDuplicateCheck] = await OddsCache.sequelize.query(`
      SELECT count(*) as duplicate_groups
      FROM (
        SELECT "homeTeam", "awayTeam", "commenceTime", "subCategory", count(*) as cnt
        FROM "OddsCaches" 
        GROUP BY "homeTeam", "awayTeam", "commenceTime", "subCategory" 
        HAVING count(*) > 1
      ) as duplicates
    `);
    
    console.log(`\n🔍 중복 데이터 확인: ${finalDuplicateCheck[0].duplicate_groups}개`);
    console.log('\n🎉 배당률 DB 최종 정리 완료!');
    
  } catch (error) {
    console.error('❌ 최종 정리 중 오류:', error.message);
    console.error(error.stack);
  }
}

finalCleanup(); 