import oddsApiService from './services/oddsApiService.js';

async function testOddsUpdate() {
  try {
    console.log('🧪 Render 서버 배당율 업데이트 테스트 시작...');
    
    // 1. API 키 확인
    if (!process.env.ODDS_API_KEY) {
      console.error('❌ ODDS_API_KEY가 설정되지 않았습니다');
      return;
    }
    
    console.log('✅ API 키 확인됨');
    
    // 2. API 호출 가능 여부 확인
    if (!oddsApiService.canMakeApiCall()) {
      console.error('❌ API 호출 한도에 도달했습니다');
      return;
    }
    
    console.log('✅ API 호출 가능');
    
    // 3. KBO 배당율만 테스트 (비용 절약)
    console.log('\n📡 KBO 배당율 업데이트 테스트...');
    
    try {
      const result = await oddsApiService.fetchAndCacheOddsForCategories(['KBO'], 'medium');
      
      console.log('✅ KBO 배당율 업데이트 결과:');
      console.log(`  새로 생성: ${result.newCount}개`);
      console.log(`  업데이트: ${result.updatedExistingCount}개`);
      console.log(`  총 업데이트: ${result.updatedCount}개`);
      console.log(`  건너뜀: ${result.skippedCount}개`);
      console.log(`  API 호출: ${result.apiCalls}회`);
      
    } catch (error) {
      console.error('❌ KBO 배당율 업데이트 실패:', error.message);
      
      // 상세 오류 정보 출력
      if (error.response) {
        console.error('API 응답 오류:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
    }
    
    // 4. 업데이트된 데이터 확인
    console.log('\n🔍 업데이트된 데이터 확인...');
    try {
      const kboOdds = await oddsApiService.getCachedOdds('baseball_kbo', 'KBO', 5);
      console.log(`KBO 배당율 데이터 ${kboOdds.length}개 발견:`);
      
      kboOdds.forEach((odds, index) => {
        console.log(`${index + 1}. ${odds.home_team} vs ${odds.away_team}`);
        console.log(`   경기시간: ${odds.commence_time}`);
        console.log(`   북메이커 수: ${odds.bookmakers?.length || 0}`);
        console.log(`   업데이트: ${odds.lastUpdated}`);
        if (odds.bookmakers && odds.bookmakers.length > 0) {
          const bookmaker = odds.bookmakers[0];
          console.log(`   첫 번째 북메이커: ${bookmaker.title}`);
          if (bookmaker.markets && bookmaker.markets.length > 0) {
            const market = bookmaker.markets[0];
            console.log(`   첫 번째 마켓: ${market.key} (${market.outcomes?.length || 0}개 아웃컴)`);
            if (market.outcomes && market.outcomes.length > 0) {
              market.outcomes.forEach(outcome => {
                console.log(`     ${outcome.name}: ${outcome.price}`);
              });
            }
          }
        }
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ 업데이트된 데이터 확인 실패:', error.message);
    }
    
    console.log('\n✅ Render 서버 배당율 업데이트 테스트 완료');
    
  } catch (error) {
    console.error('❌ 배당율 업데이트 테스트 중 오류:', error);
  }
  
  process.exit(0);
}

testOddsUpdate(); 