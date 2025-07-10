import axios from 'axios';

const API_KEY = '116108';
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

// 테스트할 리그들 (pending 배팅에서 발견된 문제 리그들)
const testLeagues = [
  {
    name: 'MLS',
    leagueId: '4346',
    sportKey: 'soccer_usa_mls'
  },
  {
    name: '중국 슈퍼리그',
    leagueId: '4359',
    sportKey: 'soccer_china_superleague'
  }
];

async function testAPIResponseStructure() {
  console.log('=== TheSportsDB API 응답 구조 분석 ===\n');
  
  for (const league of testLeagues) {
    console.log(`🔍 ${league.name} API 응답 구조 분석:`);
    console.log(`   리그 ID: ${league.leagueId}`);
    console.log(`   스포츠 키: ${league.sportKey}\n`);
    
    try {
      // 1. 시즌 경기 조회 (다른 엔드포인트 시도)
      console.log('   1️⃣ 시즌 경기 조회:');
      const seasonUrl = `${BASE_URL}/${API_KEY}/eventsseason.php?id=${league.leagueId}&s=2024-2025`;
      const seasonResponse = await axios.get(seasonUrl);
      
      if (seasonResponse.data && seasonResponse.data.events) {
        const events = seasonResponse.data.events;
        console.log(`   ✅ ${events.length}개 경기 발견`);
        
        if (events.length > 0) {
          const sampleEvent = events[0];
          console.log('\n   📋 샘플 이벤트 구조:');
          console.log('   ======================================');
          
          // 모든 필드 출력
          Object.keys(sampleEvent).forEach(key => {
            const value = sampleEvent[key];
            const valueType = typeof value;
            const valuePreview = valueType === 'string' && value.length > 50 
              ? value.substring(0, 50) + '...' 
              : value;
            console.log(`   ${key}: ${valuePreview} (${valueType})`);
          });
          
          // 스코어 관련 필드 특별 분석
          console.log('\n   🎯 스코어 관련 필드 분석:');
          const scoreFields = Object.keys(sampleEvent).filter(key => 
            key.toLowerCase().includes('score') || 
            key.toLowerCase().includes('home') || 
            key.toLowerCase().includes('away') ||
            key.toLowerCase().includes('result')
          );
          
          scoreFields.forEach(field => {
            console.log(`   ${field}: ${sampleEvent[field]} (${typeof sampleEvent[field]})`);
          });
          
          // 상태 관련 필드 분석
          console.log('\n   📊 상태 관련 필드 분석:');
          const statusFields = Object.keys(sampleEvent).filter(key => 
            key.toLowerCase().includes('status') || 
            key.toLowerCase().includes('time') ||
            key.toLowerCase().includes('date')
          );
          
          statusFields.forEach(field => {
            console.log(`   ${field}: ${sampleEvent[field]} (${typeof sampleEvent[field]})`);
          });
          
          // 완료된 경기 찾기
          console.log('\n   🏁 완료된 경기 분석:');
          const finishedEvents = events.filter(event => 
            event.strStatus === 'Match Finished' || 
            event.strStatus === 'FT' ||
            event.strStatus === 'AET' ||
            event.strStatus === 'PEN'
          );
          
          console.log(`   완료된 경기 수: ${finishedEvents.length}개`);
          
          if (finishedEvents.length > 0) {
            const finishedEvent = finishedEvents[0];
            console.log('\n   📋 완료된 경기 샘플:');
            console.log(`   홈팀: ${finishedEvent.strHomeTeam}`);
            console.log(`   원정팀: ${finishedEvent.strAwayTeam}`);
            console.log(`   상태: ${finishedEvent.strStatus}`);
            console.log(`   홈팀 스코어: ${finishedEvent.intHomeScore} (${typeof finishedEvent.intHomeScore})`);
            console.log(`   원정팀 스코어: ${finishedEvent.intAwayScore} (${typeof finishedEvent.intAwayScore})`);
            console.log(`   날짜: ${finishedEvent.dateEvent}`);
            console.log(`   시간: ${finishedEvent.strTime}`);
            console.log(`   이벤트 ID: ${finishedEvent.idEvent}`);
          }
          
        } else {
          console.log('   ❌ 경기 데이터 없음');
        }
      } else {
        console.log('   ❌ API 응답에 events 필드 없음');
        console.log('   응답:', JSON.stringify(seasonResponse.data, null, 2));
      }
      
    } catch (error) {
      console.log(`   ❌ 시즌 API 호출 실패: ${error.message}`);
      
      // 2. 다른 엔드포인트 시도
      try {
        console.log('\n   2️⃣ 리그 정보 조회:');
        const leagueUrl = `${BASE_URL}/${API_KEY}/lookupleague.php?id=${league.leagueId}`;
        const leagueResponse = await axios.get(leagueUrl);
        console.log(`   ✅ 리그 정보 조회 성공`);
        console.log('   응답:', JSON.stringify(leagueResponse.data, null, 2));
        
        // 3. 팀 목록 조회
        console.log('\n   3️⃣ 팀 목록 조회:');
        const teamsUrl = `${BASE_URL}/${API_KEY}/lookuptable.php?l=${league.leagueId}&s=2024-2025`;
        const teamsResponse = await axios.get(teamsUrl);
        console.log(`   ✅ 팀 목록 조회 성공`);
        console.log('   응답:', JSON.stringify(teamsResponse.data, null, 2));
        
      } catch (error2) {
        console.log(`   ❌ 대체 API 호출도 실패: ${error2.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
  
  // 4. 실제 작동하는 API 엔드포인트 테스트
  console.log('🔍 실제 작동하는 API 엔드포인트 테스트:\n');
  
  try {
    // MLB 테스트 (작동하는 리그)
    console.log('📊 MLB API 테스트:');
    const mlbUrl = `${BASE_URL}/${API_KEY}/eventsseason.php?id=4424&s=2024-2025`;
    const mlbResponse = await axios.get(mlbUrl);
    
    if (mlbResponse.data && mlbResponse.data.events) {
      const events = mlbResponse.data.events;
      console.log(`   ✅ MLB ${events.length}개 경기 발견`);
      
      if (events.length > 0) {
        const sampleEvent = events[0];
        console.log('\n   📋 MLB 샘플 이벤트 구조:');
        Object.keys(sampleEvent).forEach(key => {
          const value = sampleEvent[key];
          const valueType = typeof value;
          const valuePreview = valueType === 'string' && value.length > 50 
            ? value.substring(0, 50) + '...' 
            : value;
          console.log(`   ${key}: ${valuePreview} (${valueType})`);
        });
        
        // 완료된 경기 찾기
        const finishedEvents = events.filter(event => 
          event.strStatus === 'Match Finished' || 
          event.strStatus === 'FT' ||
          event.strStatus === 'AET' ||
          event.strStatus === 'PEN'
        );
        
        if (finishedEvents.length > 0) {
          const finishedEvent = finishedEvents[0];
          console.log('\n   🏁 MLB 완료된 경기 샘플:');
          console.log(`   홈팀: ${finishedEvent.strHomeTeam}`);
          console.log(`   원정팀: ${finishedEvent.strAwayTeam}`);
          console.log(`   상태: ${finishedEvent.strStatus}`);
          console.log(`   홈팀 스코어: ${finishedEvent.intHomeScore} (${typeof finishedEvent.intHomeScore})`);
          console.log(`   원정팀 스코어: ${finishedEvent.intAwayScore} (${typeof finishedEvent.intAwayScore})`);
          console.log(`   날짜: ${finishedEvent.dateEvent}`);
          console.log(`   시간: ${finishedEvent.strTime}`);
          console.log(`   이벤트 ID: ${finishedEvent.idEvent}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`   ❌ MLB API 테스트 실패: ${error.message}`);
  }
}

// 실행
testAPIResponseStructure().catch(console.error); 