import axios from 'axios';

const API_KEY = '116108';
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

// NBA 리그 ID 후보들
const nbaCandidateIds = [
  '4387', // 기존 ID
  '4388', 
  '4389',
  '4390',
  '4391',
  '4392',
  '4393',
  '4394',
  '4395',
  '4396',
  '4397',
  '4398',
  '4399',
  '4400'
];

async function testNBALeagueIds() {
  console.log('=== NBA 리그 ID 찾기 ===');
  console.log(`API Key: ${API_KEY}`);
  console.log('');

  for (const id of nbaCandidateIds) {
    try {
      console.log(`테스트 중: NBA ID ${id}`);
      
      const url = `${BASE_URL}/${API_KEY}/eventsnextleague.php?id=${id}`;
      const response = await axios.get(url);
      
      if (response.data && response.data.events && response.data.events.length > 0) {
        console.log(`✅ 성공: ${response.data.events.length}개 이벤트 발견`);
        
        const sampleEvent = response.data.events[0];
        console.log(`샘플 이벤트: ${sampleEvent.strHomeTeam} vs ${sampleEvent.strAwayTeam}`);
        console.log(`날짜: ${sampleEvent.dateEvent} ${sampleEvent.strTime}`);
        console.log(`상태: ${sampleEvent.strStatus}`);
        
        // NBA 팀인지 확인
        const nbaTeams = ['Lakers', 'Warriors', 'Celtics', 'Bulls', 'Heat', 'Knicks', 'Nets', 'Bucks', 'Suns', 'Nuggets'];
        const isNBATeam = nbaTeams.some(team => 
          sampleEvent.strHomeTeam.includes(team) || sampleEvent.strAwayTeam.includes(team)
        );
        
        if (isNBATeam) {
          console.log(`🎯 NBA 팀 발견! 올바른 ID: ${id}`);
          break;
        }
      } else {
        console.log(`❌ 실패: 이벤트 없음`);
      }
      
    } catch (error) {
      console.log(`❌ 에러: ${error.message}`);
    }
    
    console.log('---');
  }
}

async function testNBAAPI() {
  console.log('=== NBA API 상세 분석 ===');
  console.log(`API Key: ${API_KEY}`);
  console.log('');

  try {
    // 1. eventsnextleague.php 테스트
    console.log('1. eventsnextleague.php 테스트');
    const nextUrl = `${BASE_URL}/${API_KEY}/eventsnextleague.php?id=4387`;
    console.log(`URL: ${nextUrl}`);
    
    const nextResponse = await axios.get(nextUrl);
    console.log(`응답 상태: ${nextResponse.status}`);
    console.log(`응답 데이터:`, JSON.stringify(nextResponse.data, null, 2));
    
    // 2. eventspastleague.php 테스트 (과거 경기)
    console.log('\n2. eventspastleague.php 테스트');
    const pastUrl = `${BASE_URL}/${API_KEY}/eventspastleague.php?id=4387`;
    console.log(`URL: ${pastUrl}`);
    
    const pastResponse = await axios.get(pastUrl);
    console.log(`응답 상태: ${pastResponse.status}`);
    console.log(`응답 데이터:`, JSON.stringify(pastResponse.data, null, 2));
    
    // 3. eventsseason.php 테스트 (시즌별)
    console.log('\n3. eventsseason.php 테스트');
    const seasonUrl = `${BASE_URL}/${API_KEY}/eventsseason.php?id=4387&s=2024-2025`;
    console.log(`URL: ${seasonUrl}`);
    
    const seasonResponse = await axios.get(seasonUrl);
    console.log(`응답 상태: ${seasonResponse.status}`);
    console.log(`응답 데이터:`, JSON.stringify(seasonResponse.data, null, 2));
    
  } catch (error) {
    console.log(`❌ 에러: ${error.message}`);
    if (error.response) {
      console.log(`상태 코드: ${error.response.status}`);
      console.log(`응답:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

testNBALeagueIds();
testNBAAPI(); 