const axios = require('axios');

const API_KEY = '116108';
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

// 수정된 경기 정보
const correctedGames = [
  {
    name: 'Shanghai Shenhua vs Tianjin Jinmen Tiger',
    date: '2025-06-25',
    leagueId: '4359', // CSL
    category: 'CSL'
  },
  {
    name: 'Qingdao Hainiu vs Zhejiang Professional',
    date: '2025-06-25',
    leagueId: '4359', // CSL
    category: 'CSL'
  }
];

async function fetchCorrectedGame(game) {
  try {
    console.log(`\n🔍 ${game.name} (${game.date}) 조회 중...`);
    
    const url = `${BASE_URL}/${API_KEY}/eventsday.php?d=${game.date}&id=${game.leagueId}`;
    const response = await axios.get(url, { timeout: 10000 });
    const events = response.data?.events || [];
    
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
  console.log('=== 수정된 팀명으로 CSL 경기 결과 조회 ===\n');
  
  for (const game of correctedGames) {
    await fetchCorrectedGame(game);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n=== 조회 완료 ===');
}

main(); 