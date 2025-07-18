import oddsApiService from '../services/oddsApiService.js';
import gameResultService from '../services/gameResultService.js';
import dotenv from 'dotenv';

dotenv.config();

async function collectOddsForRender() {
  try {
    console.log('🚀 Render 서버 배당율 수집 시작...');
    
    // 1. 활성 카테고리 설정 (모든 주요 리그)
    const activeCategories = [
      'NBA', 'MLB', 'KBO', 'NFL', 'MLS', 'K리그', 'J리그', 
      '세리에 A', '브라질 세리에 A', '아르헨티나 프리메라', 
      '중국 슈퍼리그', '라리가', '분데스리가'
    ];
    
    console.log(`📊 수집할 카테고리: ${activeCategories.join(', ')}`);
    
    // 2. 배당율 데이터 수집
    console.log('\n1️⃣ 배당율 데이터 수집...');
    const oddsResult = await oddsApiService.fetchAndCacheOddsForCategories(activeCategories, 'high');
    
    console.log('📊 배당율 수집 결과:');
    console.log(`- 총 업데이트: ${oddsResult.updatedCount}개`);
    console.log(`- 새로 생성: ${oddsResult.newCount}개`);
    console.log(`- 기존 업데이트: ${oddsResult.updatedExistingCount}개`);
    console.log(`- 건너뜀: ${oddsResult.skippedCount}개`);
    console.log(`- API 호출: ${oddsResult.apiCalls}회`);
    
    // 3. 경기 결과 데이터 수집
    console.log('\n2️⃣ 경기 결과 데이터 수집...');
    const resultsResult = await gameResultService.fetchAndUpdateResultsForCategories(activeCategories);
    
    console.log('📊 경기 결과 수집 결과:');
    console.log(`- 총 업데이트: ${resultsResult?.updatedCount || 0}개`);
    console.log(`- 새로 생성: ${resultsResult?.newCount || 0}개`);
    console.log(`- 기존 업데이트: ${resultsResult?.updatedExistingCount || 0}개`);
    console.log(`- 건너뜀: ${resultsResult?.skippedCount || 0}개`);
    
    // 4. 데이터베이스 통계 확인
    console.log('\n3️⃣ 최종 데이터베이스 통계...');
    const OddsCache = (await import('../models/oddsCacheModel.js')).default;
    const GameResult = (await import('../models/gameResultModel.js')).default;
    
    const finalOddsCount = await OddsCache.count();
    const finalGameCount = await GameResult.count();
    
    console.log(`📊 최종 통계:`);
    console.log(`- 배당율 데이터: ${finalOddsCount}개`);
    console.log(`- 경기 결과: ${finalGameCount}개`);
    
    // 5. 샘플 데이터 확인
    console.log('\n4️⃣ 샘플 데이터 확인...');
    const sampleOdds = await OddsCache.findAll({
      order: [['lastUpdated', 'DESC']],
      limit: 3
    });
    
    if (sampleOdds.length > 0) {
      console.log('📊 최근 배당율 샘플:');
      sampleOdds.forEach((odds, index) => {
        console.log(`${index + 1}. ${odds.homeTeam} vs ${odds.awayTeam} (${odds.sportKey})`);
        console.log(`   - 시간: ${odds.commenceTime}`);
        console.log(`   - 업데이트: ${odds.lastUpdated}`);
        console.log(`   - 북메이커: ${odds.bookmakers?.length || 0}개`);
      });
    } else {
      console.log('❌ 배당율 데이터가 없습니다!');
    }
    
    console.log('\n✅ Render 서버 배당율 수집 완료!');
    console.log('이제 클라이언트에서 배당율 데이터를 확인할 수 있습니다.');
    
  } catch (error) {
    console.error('❌ Render 서버 배당율 수집 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  }
}

collectOddsForRender(); 