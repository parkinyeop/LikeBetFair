const axios = require('axios');

const API_KEY = '116108';
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

// 조회할 경기 정보
const gamesToCheck = [
  {
    name: 'New York City FC vs Toronto FC',
    date: '2025-07-03',
    leagueId: '4346', // MLS
    category: 'MLS'
  },
  {
    name: 'Shanghai Shenhua FC vs Tianjin Jinmen Tiger FC',
    date: '2025-06-25',
    leagueId: '4359', // CSL
    category: 'CSL'
  },
  {
    name: 'Qingdao Hainiu FC vs Zhejiang',
    date: '2025-06-25',
    leagueId: '4359', // CSL
    category: 'CSL'
  }
];

async function fetchGameFromSportsDB(game) {
  try {
    console.log(`\n🔍 ${game.name} (${game.date}) 조회 중...`);
    
    // eventsday.php API 호출
    const url = `${BASE_URL}/${API_KEY}/eventsday.php?d=${game.date}&id=${game.leagueId}`;
    console.log(`API URL: ${url}`);
    
    const response = await axios.get(url, { timeout: 10000 });
    const events = response.data?.events || [];
    
    console.log(`📊 ${game.date} ${game.category} 경기: ${events.length}개 발견`);
    
    // 해당 경기 찾기
    const targetGame = events.find(event => {
      const eventName = `${event.strHomeTeam} vs ${event.strAwayTeam}`;
      return eventName === game.name;
    });
    
    if (targetGame) {
      console.log(`✅ 경기 발견!`);
      console.log(`   홈팀: ${targetGame.strHomeTeam}`);
      console.log(`   원정팀: ${targetGame.strAwayTeam}`);
      console.log(`   홈스코어: ${targetGame.intHomeScore}`);
      console.log(`   원정스코어: ${targetGame.intAwayScore}`);
      console.log(`   상태: ${targetGame.strStatus}`);
      console.log(`   이벤트ID: ${targetGame.idEvent}`);
      console.log(`   날짜: ${targetGame.dateEvent}`);
      console.log(`   시간: ${targetGame.strTime}`);
      
      // 결과 판정
      let result = 'pending';
      if (targetGame.intHomeScore !== null && targetGame.intAwayScore !== null) {
        const homeScore = parseInt(targetGame.intHomeScore);
        const awayScore = parseInt(targetGame.intAwayScore);
        
        if (homeScore > awayScore) {
          result = 'home_win';
        } else if (awayScore > homeScore) {
          result = 'away_win';
        } else {
          result = 'draw';
        }
      }
      
      console.log(`   판정결과: ${result}`);
      
      return {
        found: true,
        data: targetGame,
        result: result
      };
    } else {
      console.log(`❌ 해당 경기를 찾을 수 없습니다.`);
      console.log(`📋 해당 날짜의 모든 경기:`);
      events.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.strHomeTeam} vs ${event.strAwayTeam} (${event.strStatus})`);
      });
      
      return {
        found: false,
        data: null
      };
    }
    
  } catch (error) {
    console.error(`❌ API 호출 에러: ${error.message}`);
    return {
      found: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('=== TheSportsDB API로 특정 경기 결과 조회 ===\n');
  
  for (const game of gamesToCheck) {
    await fetchGameFromSportsDB(game);
    
    // API 호출 간격 (Rate limiting 방지)
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n=== 조회 완료 ===');
}

main(); 