import axios from 'axios';

const API_KEY = '116108';
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

async function testMLSAPI() {
  console.log('=== MLS API 수정 테스트 ===\n');
  
  const MLS_LEAGUE_ID = '4346';
  const CURRENT_YEAR = '2025';
  
  try {
    // 1. 기존 방식 (eventsround.php) - 실패할 것으로 예상
    console.log('1️⃣ 기존 방식 테스트 (eventsround.php):');
    try {
      const oldUrl = `${BASE_URL}/${API_KEY}/eventsround.php?id=${MLS_LEAGUE_ID}&r=current`;
      console.log(`   URL: ${oldUrl}`);
      
      const oldResponse = await axios.get(oldUrl, { timeout: 10000 });
      const oldEvents = oldResponse.data?.events || [];
      console.log(`   결과: ${oldEvents.length}개 경기`);
      
      if (oldEvents.length === 0) {
        console.log('   ❌ 기존 방식: 데이터 없음 (예상됨)');
      } else {
        console.log('   ⚠️ 기존 방식: 데이터 있음 (예상과 다름)');
      }
    } catch (error) {
      console.log(`   ❌ 기존 방식: API 오류 - ${error.message}`);
    }
    
    console.log('');
    
    // 2. 수정된 방식 (eventsseason.php) - 성공할 것으로 예상
    console.log('2️⃣ 수정된 방식 테스트 (eventsseason.php):');
    try {
      const newUrl = `${BASE_URL}/${API_KEY}/eventsseason.php?id=${MLS_LEAGUE_ID}&s=${CURRENT_YEAR}`;
      console.log(`   URL: ${newUrl}`);
      
      const newResponse = await axios.get(newUrl, { timeout: 10000 });
      const newEvents = newResponse.data?.events || [];
      console.log(`   결과: ${newEvents.length}개 경기`);
      
      if (newEvents.length > 0) {
        console.log('   ✅ 수정된 방식: 데이터 있음 (성공!)');
        
        // 샘플 경기 출력
        console.log('\n   📋 샘플 경기들:');
        newEvents.slice(0, 5).forEach((event, idx) => {
          console.log(`      ${idx + 1}. ${event.strHomeTeam} vs ${event.strAwayTeam}`);
          console.log(`         날짜: ${event.dateEvent} ${event.strTime}`);
          console.log(`         상태: ${event.strStatus}`);
          if (event.intHomeScore !== null && event.intAwayScore !== null) {
            console.log(`         스코어: ${event.intHomeScore} - ${event.intAwayScore}`);
          }
          console.log('');
        });
        
        // pending 배팅의 경기 찾기
        console.log('   🔍 Pending 배팅 경기 검색:');
        const pendingGames = newEvents.filter(event => 
          event.strHomeTeam === 'New England Revolution' && 
          event.strAwayTeam === 'Inter Miami'
        );
        
        if (pendingGames.length > 0) {
          console.log('   ✅ Pending 배팅 경기 발견!');
          pendingGames.forEach(game => {
            console.log(`      ${game.strHomeTeam} vs ${game.strAwayTeam}`);
            console.log(`      날짜: ${game.dateEvent} ${game.strTime}`);
            console.log(`      상태: ${game.strStatus}`);
            console.log(`      스코어: ${game.intHomeScore} - ${game.intAwayScore}`);
          });
        } else {
          console.log('   ❌ Pending 배팅 경기 없음');
        }
        
      } else {
        console.log('   ❌ 수정된 방식: 데이터 없음 (예상과 다름)');
      }
    } catch (error) {
      console.log(`   ❌ 수정된 방식: API 오류 - ${error.message}`);
      if (error.response) {
        console.log(`      상태 코드: ${error.response.status}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
    // 3. 다른 북미 리그 테스트
    console.log('\n3️⃣ 다른 북미 리그 테스트:');
    
    const northAmericanLeagues = [
      { name: 'MLB', id: '4424', sportKey: 'baseball_mlb' },
      { name: 'NBA', id: '4387', sportKey: 'basketball_nba' },
      { name: 'NFL', id: '4391', sportKey: 'americanfootball_nfl' }
    ];
    
    for (const league of northAmericanLeagues) {
      try {
        const url = `${BASE_URL}/${API_KEY}/eventsseason.php?id=${league.id}&s=${CURRENT_YEAR}`;
        const response = await axios.get(url, { timeout: 10000 });
        const events = response.data?.events || [];
        console.log(`   ${league.name}: ${events.length}개 경기`);
      } catch (error) {
        console.log(`   ${league.name}: 오류 - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
  }
}

// 실행
testMLSAPI().catch(console.error); 