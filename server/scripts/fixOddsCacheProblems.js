import OddsCache from '../models/oddsCacheModel.js';
import { normalizeCategoryPair } from '../normalizeUtils.js';
import { Op } from 'sequelize';

console.log('🔧 배당률 DB 문제 해결 스크립트 시작...');

async function fixOddsCacheProblems() {
  try {
    console.log('=' .repeat(60));
    
    // 1. 현재 상태 확인
    const totalBefore = await OddsCache.count();
    console.log('📊 수정 전 총 데이터:', totalBefore, '개');
    
    // 2. 중복 데이터 먼저 제거 (카테고리 수정 전)
    console.log('\n🗑️ 중복 데이터 제거 중...');
    
    // 중복 그룹 찾기 (더 안전한 방식)
    const duplicateQuery = `
      SELECT "homeTeam", "awayTeam", "commenceTime", "subCategory", array_agg(id) as ids, count(*) as cnt
      FROM "OddsCaches" 
      GROUP BY "homeTeam", "awayTeam", "commenceTime", "subCategory" 
      HAVING count(*) > 1
    `;
    
    const [duplicateGroups] = await OddsCache.sequelize.query(duplicateQuery);
    
    let duplicatesRemoved = 0;
    for (const group of duplicateGroups) {
      try {
        const ids = group.ids;
        
        // 가장 최근 데이터 찾기
        const latestRecord = await OddsCache.findOne({
          where: { id: { [Op.in]: ids } },
          order: [['lastUpdated', 'DESC']]
        });
        
        // 나머지 삭제
        const idsToDelete = ids.filter(id => id !== latestRecord.id);
        if (idsToDelete.length > 0) {
          const deleteResult = await OddsCache.destroy({
            where: { id: { [Op.in]: idsToDelete } }
          });
          duplicatesRemoved += deleteResult;
          console.log(`  🗑️ ${group.subCategory}: ${group.homeTeam} vs ${group.awayTeam} - ${deleteResult}개 중복 제거`);
        }
      } catch (error) {
        console.log(`  ⚠️ 중복 제거 실패: ${group.subCategory} - ${error.message}`);
      }
    }
    
    console.log(`  ✅ 총 ${duplicatesRemoved}개 중복 데이터 제거 완료`);
    
    // 3. 카테고리 매핑 표준화 (개별적으로 처리)
    console.log('\n🔄 카테고리 매핑 표준화 중...');
    
    const categoryMappings = {
      // 축구 리그 표준화 (한글명으로 통일)
      'ARGENTINA_PRIMERA_DIVISION': '아르헨티나 프리메라',
      'BRAZIL_CAMPEONATO': '브라질 세리에 A', 
      'ITALY_SERIE_A': '세리에 A',
      'USA_MLS': 'MLS',
      'JAPAN_J_LEAGUE': 'J리그',
      'CHINA_SUPERLEAGUE': '중국 슈퍼리그',
      'KOREA_KLEAGUE1': 'K리그',
      'sweden': '스웨덴 알스벤스칸',
      'CSL': '중국 슈퍼리그',
      '브라질리라오': '브라질 세리에 A',
      '아르헨티나프리메라': '아르헨티나 프리메라',
      '세리에A': '세리에 A'
    };
    
    let categoryUpdated = 0;
    for (const [oldCategory, newCategory] of Object.entries(categoryMappings)) {
      try {
        const updateResult = await OddsCache.update(
          { subCategory: newCategory },
          { where: { subCategory: oldCategory } }
        );
        if (updateResult[0] > 0) {
          console.log(`  ✅ ${oldCategory} → ${newCategory}: ${updateResult[0]}개 수정`);
          categoryUpdated += updateResult[0];
        }
      } catch (error) {
        console.log(`  ⚠️ ${oldCategory} 수정 실패: ${error.message}`);
      }
    }
    
    // 4. NFL mainCategory 통일 (american_football → americanfootball)
    console.log('\n🏈 NFL mainCategory 통일 중...');
    try {
      const nflUpdateResult = await OddsCache.update(
        { mainCategory: 'americanfootball' },
        { where: { mainCategory: 'american_football' } }
      );
      console.log(`  ✅ NFL mainCategory 통일: ${nflUpdateResult[0]}개 수정`);
    } catch (error) {
      console.log(`  ⚠️ NFL mainCategory 수정 실패: ${error.message}`);
    }
    
    // 5. mainCategory 정규화
    console.log('\n🔄 mainCategory 정규화 중...');
    const allData = await OddsCache.findAll({
      attributes: ['id', 'mainCategory', 'subCategory'],
      limit: 100 // 배치 처리
    });
    
    let mainCategoryUpdated = 0;
    for (const item of allData) {
      try {
        const normalized = normalizeCategoryPair(item.mainCategory, item.subCategory);
        if (normalized.mainCategory !== item.mainCategory) {
          await OddsCache.update(
            { mainCategory: normalized.mainCategory },
            { where: { id: item.id } }
          );
          mainCategoryUpdated++;
        }
      } catch (error) {
        console.log(`  ⚠️ ID ${item.id} 정규화 실패: ${error.message}`);
      }
    }
    console.log(`  ✅ mainCategory 정규화: ${mainCategoryUpdated}개 수정`);
    
    // 6. 최종 결과 확인
    console.log('\n📊 수정 결과:');
    const totalAfter = await OddsCache.count();
    console.log(`  • 중복 데이터 제거: ${duplicatesRemoved}개`);
    console.log(`  • 카테고리 표준화: ${categoryUpdated}개`);
    console.log(`  • mainCategory 정규화: ${mainCategoryUpdated}개`);
    console.log(`  • 총 데이터: ${totalBefore}개 → ${totalAfter}개 (${totalBefore - totalAfter}개 감소)`);
    
    // 7. 최종 상태 확인
    console.log('\n✅ 수정 후 리그별 현황:');
    const finalStats = await OddsCache.findAll({
      attributes: [
        'mainCategory', 'subCategory',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['mainCategory', 'subCategory'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
      raw: true
    });
    
    finalStats.forEach(stat => {
      console.log(`  ${stat.subCategory.padEnd(20)} (${stat.mainCategory}): ${stat.count}개`);
    });
    
    console.log('\n🎉 배당률 DB 문제 해결 완료!');
    
  } catch (error) {
    console.error('❌ 문제 해결 중 오류:', error.message);
    console.error(error.stack);
  }
}

fixOddsCacheProblems(); 