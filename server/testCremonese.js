const axios = require('axios');

const ODDS_API_KEY = 'b1a67915235b9dd963dcb5be603853ea';
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4/sports';

async function fetchCremoneseOdds() {
  try {
    console.log('🔍 Cremonese vs Sassuolo 경기 배당 데이터 가져오기 시작...');
    
    // 세리에 A (soccer_italy_serie_a)에서 경기 가져오기
    const url = `${ODDS_API_BASE_URL}/soccer_italy_serie_a/odds`;
    const params = {
      apiKey: ODDS_API_KEY,
      regions: 'us',
      markets: 'h2h,totals,spreads',
      oddsFormat: 'decimal'
    };
    
    console.log(`📡 API 요청: ${url}`);
    console.log(`📋 파라미터:`, params);
    
    const response = await axios.get(url, { params });
    
    console.log(`✅ 응답 받음: ${response.data.length}개 경기`);
    
    if (response.data.length > 0) {
      console.log('\n📊 모든 경기 목록:');
      response.data.forEach((game, index) => {
        const gameTime = new Date(game.commence_time);
        const koreaTime = new Date(gameTime.getTime() + 9 * 60 * 60 * 1000);
        console.log(`${index + 1}. ${game.home_team} vs ${game.away_team} (${koreaTime.toLocaleString('ko-KR')})`);
      });
      
      // Cremonese vs Sassuolo 경기 찾기
      const targetGame = response.data.find(game => 
        game.home_team === 'Cremonese' && 
        game.away_team === 'Sassuolo'
      );
      
      if (targetGame) {
        console.log('\n🎯 찾는 경기 발견!');
        console.log(`🏟️ ${targetGame.home_team} vs ${targetGame.away_team}`);
        console.log(`⏰ 경기 시간 (UTC): ${targetGame.commence_time}`);
        
        const gameTime = new Date(targetGame.commence_time);
        const koreaTime = new Date(gameTime.getTime() + 9 * 60 * 60 * 1000);
        console.log(`⏰ 경기 시간 (KST): ${koreaTime.toLocaleString('ko-KR')}`);
        
        console.log(`📈 북메이커 수: ${targetGame.bookmakers.length}`);
        
        // 모든 북메이커의 마켓 확인
        targetGame.bookmakers.forEach((bookmaker, index) => {
          console.log(`\n🏪 북메이커 ${index + 1}: ${bookmaker.title}`);
          
          bookmaker.markets.forEach(market => {
            console.log(`  📊 마켓: ${market.key}`);
            console.log(`  📝 결과 수: ${market.outcomes.length}`);
            
            market.outcomes.forEach(outcome => {
              console.log(`    - ${outcome.name}: ${outcome.price}`);
            });
          });
        });
        
        // totals와 spreads 마켓 확인
        const totalsMarket = targetGame.bookmakers.find(bm => 
          bm.markets.some(m => m.key === 'totals')
        );
        
        const spreadsMarket = targetGame.bookmakers.find(bm => 
          bm.markets.some(m => m.key === 'spreads')
        );
        
        console.log(`\n📊 totals 마켓: ${totalsMarket ? '✅' : '❌'}`);
        console.log(`🎯 spreads 마켓: ${spreadsMarket ? '✅' : '❌'}`);
        
        if (totalsMarket) {
          console.log('\n📈 totals 마켓 상세:');
          const totals = totalsMarket.markets.find(m => m.key === 'totals');
          totals.outcomes.forEach(outcome => {
            console.log(`  - ${outcome.name}: ${outcome.price}`);
          });
        }
        
        if (spreadsMarket) {
          console.log('\n🎯 spreads 마켓 상세:');
          const spreads = spreadsMarket.markets.find(m => m.key === 'spreads');
          spreads.outcomes.forEach(outcome => {
            console.log(`  - ${outcome.name}: ${outcome.price}`);
          });
        }
        
        // 데이터베이스 업데이트를 위한 정보
        console.log('\n💾 데이터베이스 업데이트 정보:');
        console.log(`현재 DB 상태: h2h만 있음`);
        console.log(`API 상태: totals ${totalsMarket ? '있음' : '없음'}, spreads ${spreadsMarket ? '있음' : '없음'}`);
        
        if (totalsMarket || spreadsMarket) {
          console.log('🔄 데이터베이스 업데이트 필요!');
        } else {
          console.log('✅ 데이터베이스가 최신 상태입니다.');
        }
      } else {
        console.log('\n❌ 찾는 경기를 찾을 수 없습니다.');
        console.log('🔍 가능한 이유:');
        console.log('  1. 경기 날짜가 다름');
        console.log('  2. 팀명이 다름');
        console.log('  3. API에서 해당 경기 데이터를 제공하지 않음');
      }
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.response) {
      console.error('📡 응답 상태:', error.response.status);
      console.error('📋 응답 데이터:', error.response.data);
    }
  }
}

// 스크립트 실행
fetchCremoneseOdds();
