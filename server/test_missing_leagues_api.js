import axios from 'axios';

// 테스트할 리그들 (pending 배팅에서 발견된 문제 리그들)
const testLeagues = [
  {
    name: 'MLS',
    leagueId: '4346',
    sportKey: 'soccer_usa_mls',
    testDate: '2025-07-09' // pending 배팅의 날짜
  },
  {
    name: '중국 슈퍼리그',
    leagueId: '4359', 
    sportKey: 'soccer_china_superleague',
    testDate: '2025-06-25' // pending 배팅의 날짜
  }
];

const API_KEY = '116108';
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

async function testLeagueAPI(league) {
  console.log(`\n🔍 ${league.name} API 테스트 시작...`);
  console.log(`   리그 ID: ${league.leagueId}`);
  console.log(`   테스트 날짜: ${league.testDate}`);
  
  try {
    // 1. 현재 라운드 경기 조회
    console.log(`\n   1️⃣ 현재 라운드 경기 조회:`);
    const currentRoundUrl = `${BASE_URL}/${API_KEY}/eventsround.php?id=${league.leagueId}&r=current`;
    console.log(`   URL: ${currentRoundUrl}`);
    
    const currentRoundResponse = await axios.get(currentRoundUrl, { timeout: 10000 });
    const currentEvents = currentRoundResponse.data?.events || [];
    console.log(`   ✅ 응답 성공: ${currentEvents.length}개 경기`);
    
    if (currentEvents.length > 0) {
      console.log(`   📋 최근 경기들:`);
      currentEvents.slice(0, 3).forEach((event, idx) => {
        console.log(`      ${idx + 1}. ${event.strHomeTeam} vs ${event.strAwayTeam} (${event.dateEvent})`);
      });
    }
    
  } catch (error) {
    console.log(`   ❌ 현재 라운드 조회 실패: ${error.message}`);
    if (error.response) {
      console.log(`      상태 코드: ${error.response.status}`);
      console.log(`      응답 데이터: ${JSON.stringify(error.response.data)}`);
    }
  }
  
  try {
    // 2. 특정 날짜 경기 조회
    console.log(`\n   2️⃣ ${league.testDate} 날짜 경기 조회:`);
    const dateUrl = `${BASE_URL}/${API_KEY}/eventsday.php?id=${league.leagueId}&d=${league.testDate}`;
    console.log(`   URL: ${dateUrl}`);
    
    const dateResponse = await axios.get(dateUrl, { timeout: 10000 });
    const dateEvents = dateResponse.data?.events || [];
    console.log(`   ✅ 응답 성공: ${dateEvents.length}개 경기`);
    
    if (dateEvents.length > 0) {
      console.log(`   📋 해당 날짜 경기들:`);
      dateEvents.forEach((event, idx) => {
        console.log(`      ${idx + 1}. ${event.strHomeTeam} vs ${event.strAwayTeam} (${event.dateEvent} ${event.strTime || '00:00'})`);
        console.log(`         상태: ${event.strStatus || 'N/A'}`);
        if (event.intHomeScore !== null && event.intAwayScore !== null) {
          console.log(`         스코어: ${event.intHomeScore} - ${event.intAwayScore}`);
        }
      });
    } else {
      console.log(`   ⚠️ 해당 날짜에 경기가 없음`);
    }
    
  } catch (error) {
    console.log(`   ❌ 날짜별 조회 실패: ${error.message}`);
    if (error.response) {
      console.log(`      상태 코드: ${error.response.status}`);
      console.log(`      응답 데이터: ${JSON.stringify(error.response.data)}`);
    }
  }
  
  try {
    // 3. 2025 시즌 전체 경기 조회
    console.log(`\n   3️⃣ 2025 시즌 전체 경기 조회:`);
    const seasonUrl = `${BASE_URL}/${API_KEY}/eventsseason.php?id=${league.leagueId}&s=2025`;
    console.log(`   URL: ${seasonUrl}`);
    
    const seasonResponse = await axios.get(seasonUrl, { timeout: 15000 });
    const seasonEvents = seasonResponse.data?.events || [];
    console.log(`   ✅ 응답 성공: ${seasonEvents.length}개 경기`);
    
    if (seasonEvents.length > 0) {
      // 날짜별로 그룹화
      const eventsByDate = {};
      seasonEvents.forEach(event => {
        const date = event.dateEvent;
        if (!eventsByDate[date]) {
          eventsByDate[date] = [];
        }
        eventsByDate[date].push(event);
      });
      
      console.log(`   📅 날짜별 경기 수:`);
      Object.keys(eventsByDate).sort().slice(0, 10).forEach(date => {
        console.log(`      ${date}: ${eventsByDate[date].length}개 경기`);
      });
      
      // 테스트 날짜 근처 경기들 확인
      const testDateEvents = seasonEvents.filter(event => {
        const eventDate = new Date(event.dateEvent);
        const testDate = new Date(league.testDate);
        const diffDays = Math.abs((eventDate - testDate) / (1000 * 60 * 60 * 24));
        return diffDays <= 7; // 7일 이내
      });
      
      if (testDateEvents.length > 0) {
        console.log(`\n   🔍 ${league.testDate} ±7일 경기들:`);
        testDateEvents.forEach((event, idx) => {
          console.log(`      ${idx + 1}. ${event.strHomeTeam} vs ${event.strAwayTeam} (${event.dateEvent})`);
        });
      } else {
        console.log(`\n   ⚠️ ${league.testDate} ±7일 내에 경기 없음`);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ 시즌 조회 실패: ${error.message}`);
    if (error.response) {
      console.log(`      상태 코드: ${error.response.status}`);
      console.log(`      응답 데이터: ${JSON.stringify(error.response.data)}`);
    }
  }
  
  try {
    // 4. 리그 정보 조회
    console.log(`\n   4️⃣ 리그 정보 조회:`);
    const leagueInfoUrl = `${BASE_URL}/${API_KEY}/lookupleague.php?id=${league.leagueId}`;
    console.log(`   URL: ${leagueInfoUrl}`);
    
    const leagueInfoResponse = await axios.get(leagueInfoUrl, { timeout: 10000 });
    const leagueInfo = leagueInfoResponse.data?.leagues?.[0];
    
    if (leagueInfo) {
      console.log(`   ✅ 리그 정보:`);
      console.log(`      이름: ${leagueInfo.strLeague}`);
      console.log(`      스포츠: ${leagueInfo.strSport}`);
      console.log(`      국가: ${leagueInfo.strCountry}`);
      console.log(`      현재 시즌: ${leagueInfo.strCurrentSeason || 'N/A'}`);
    } else {
      console.log(`   ⚠️ 리그 정보 없음`);
    }
    
  } catch (error) {
    console.log(`   ❌ 리그 정보 조회 실패: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 누락되는 리그들의 API 호출 점검 시작\n');
  console.log(`API 키: ${API_KEY}`);
  console.log(`베이스 URL: ${BASE_URL}`);
  
  for (const league of testLeagues) {
    await testLeagueAPI(league);
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n✅ API 호출 점검 완료');
}

main().catch(console.error); 