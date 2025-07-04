import axios from 'axios';

const API_KEY = '116108';
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

// 테스트할 리그들
const testLeagues = [
  { name: 'MLS', id: '4346' },
  { name: 'KBO', id: '4830' },
  { name: 'MLB', id: '4424' },
  { name: 'NBA', id: '4387' }
];

async function testAPIUrls() {
  console.log('=== TheSportsDB API URL 테스트 ===');
  console.log(`API Key: ${API_KEY}`);
  console.log('');

  for (const league of testLeagues) {
    try {
      console.log(`테스트 중: ${league.name} (ID: ${league.id})`);
      
      // 1. eventsnextleague.php 테스트
      const nextUrl = `${BASE_URL}/${API_KEY}/eventsnextleague.php?id=${league.id}`;
      console.log(`URL: ${nextUrl}`);
      
      const response = await axios.get(nextUrl);
      console.log(`✅ 성공: ${response.status}`);
      
      if (response.data && response.data.events) {
        console.log(`이벤트 수: ${response.data.events.length}`);
      } else {
        console.log(`이벤트: ${response.data.events}`);
      }
      
    } catch (error) {
      console.log(`❌ 에러: ${error.message}`);
      if (error.response) {
        console.log(`상태 코드: ${error.response.status}`);
        console.log(`URL: ${error.config.url}`);
      }
    }
    
    console.log('---');
  }
}

testAPIUrls(); 