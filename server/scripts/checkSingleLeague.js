import dotenv from 'dotenv';
import SeasonStatusChecker from '../services/seasonStatusChecker.js';

// 환경 변수 로드
dotenv.config();

async function analyzeLeague(sportKey) {
  console.log(`🔍 ${sportKey} 상세 분석 시작...\n`);
  
  const checker = new SeasonStatusChecker();
  
  try {
    // 1. Odds API 체크
    console.log('📊 1. Odds API 배당율 체크:');
    const oddsResult = await checker.checkOddsAvailability(sportKey);
    console.log(`   - 배당율 제공: ${oddsResult.hasOdds ? '✅' : '❌'}`);
    console.log(`   - 전체 경기 수: ${oddsResult.totalCount}경기`);
    console.log(`   - 예정 경기 수: ${oddsResult.upcomingCount}경기`);
    
    // 2. 최근 경기 체크
    console.log('\n📅 2. 최근 30일 경기 체크:');
    const recentGames = await checker.checkRecentGames(sportKey);
    console.log(`   - 최근 경기 수: ${recentGames.count}경기`);
    console.log(`   - 마지막 경기일: ${recentGames.lastGameDate || 'N/A'}`);
    
    // 3. 예정 경기 체크
    console.log('\n📆 3. 향후 30일 예정 경기 체크:');
    const upcomingGames = await checker.checkUpcomingGames(sportKey);
    console.log(`   - 예정 경기 수: ${upcomingGames.count}경기`);
    console.log(`   - 다음 경기일: ${upcomingGames.nextGameDate || 'N/A'}`);
    
    // 4. 시즌 상태 판단
    console.log('\n🤖 4. 시즌 상태 판단:');
    const statusResult = checker.determineSeasonStatus({
      hasOdds: oddsResult,
      recentGames,
      upcomingGames,
      sportKey,
      currentStatus: 'unknown'
    });
    
    console.log(`   - 판단된 상태: ${statusResult.status}`);
    console.log(`   - 판단 근거: ${statusResult.reason}`);
    
    // 5. 실제 Odds API 응답 일부 확인
    console.log('\n🔍 5. Odds API 실제 응답 샘플:');
    await checkOddsApiDetails(sportKey);
    
  } catch (error) {
    console.error('❌ 분석 실패:', error);
  }
}

async function checkOddsApiDetails(sportKey) {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(
      `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/`,
      {
        params: {
          apiKey: process.env.ODDS_API_KEY,
          regions: 'us,uk',
          markets: 'h2h',
          oddsFormat: 'decimal'
        },
        timeout: 10000
      }
    );

    const games = response.data || [];
    console.log(`   - 전체 응답 게임 수: ${games.length}`);
    
    if (games.length > 0) {
      console.log('\n   📋 첫 5개 경기 상세 정보:');
      games.slice(0, 5).forEach((game, index) => {
        const gameDate = new Date(game.commence_time);
        const isUpcoming = gameDate > new Date();
        console.log(`   ${index + 1}. ${game.home_team} vs ${game.away_team}`);
        console.log(`      - 경기일: ${gameDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
        console.log(`      - 상태: ${isUpcoming ? '예정' : '지남'}`);
        console.log(`      - 스포츠: ${game.sport_title || game.sport_key}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.log(`   ⚠️ Odds API 상세 조회 실패: ${error.message}`);
  }
}

// 커맨드 라인 인자로 스포츠 키 받기
const sportKey = process.argv[2] || 'americanfootball_nfl';

console.log(`분석 대상: ${sportKey}\n`);
analyzeLeague(sportKey); 