import axios from 'axios';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4/sports';

async function fetchJuventudeSaoPauloOdds() {
  try {
    console.log('🔍 Juventude vs Sao Paulo 경기 배당율 조회 시작...');
    
    // 브라질 세리에 A 스포츠 키
    const sportKey = 'soccer_brazil_campeonato';
    
    // 7월 25일 경기 조회
    const date = '2025-07-25';
    
    // API 요청 URL
    const url = `${ODDS_API_BASE_URL}/${sportKey}/odds`;
    
    const params = {
      apiKey: ODDS_API_KEY,
      regions: 'us',
      markets: 'totals,spreads', // 언더/오버, 핸디캡
      dateFormat: 'iso',
      oddsFormat: 'decimal'
    };
    
    console.log(`📡 API 요청: ${url}`);
    console.log(`📅 날짜: ${date}`);
    console.log(`🎯 마켓: totals (언더/오버), spreads (핸디캡)`);
    
    const response = await axios.get(url, { params });
    
    console.log(`✅ API 응답 성공: ${response.data.length}개 경기`);
    console.log(`📊 남은 API 호출: ${response.headers['x-requests-remaining']}`);
    
    // Juventude vs Sao Paulo 경기 찾기
    const targetGame = response.data.find(game => {
      const homeTeam = game.home_team.toLowerCase();
      const awayTeam = game.away_team.toLowerCase();
      
      return (homeTeam.includes('juventude') && awayTeam.includes('sao paulo')) ||
             (homeTeam.includes('sao paulo') && awayTeam.includes('juventude'));
    });
    
    if (!targetGame) {
      console.log('❌ Juventude vs Sao Paulo 경기를 찾을 수 없습니다.');
      console.log('📋 전체 경기 목록:');
      response.data.forEach((game, index) => {
        console.log(`${index + 1}. ${game.home_team} vs ${game.away_team} (${game.commence_time})`);
      });
      return;
    }
    
    console.log('\n🎯 찾은 경기:');
    console.log(`🏠 홈팀: ${targetGame.home_team}`);
    console.log(`✈️ 원정팀: ${targetGame.away_team}`);
    console.log(`⏰ 경기시간: ${targetGame.commence_time}`);
    console.log(`🏟️ 경기장: ${targetGame.venue || 'N/A'}`);
    
    // 언더/오버 배당율 출력
    console.log('\n📊 언더/오버 배당율:');
    const totalsMarkets = targetGame.bookmakers.flatMap(bookmaker => 
      bookmaker.markets.filter(market => market.key === 'totals')
    );
    
    if (totalsMarkets.length > 0) {
      totalsMarkets.forEach((market, index) => {
        console.log(`\n📈 ${market.bookmaker_name}:`);
        market.outcomes.forEach(outcome => {
          console.log(`  ${outcome.name}: ${outcome.price} (${outcome.point})`);
        });
      });
    } else {
      console.log('❌ 언더/오버 배당율이 없습니다.');
    }
    
    // 핸디캡 배당율 출력
    console.log('\n🎯 핸디캡 배당율:');
    const spreadsMarkets = targetGame.bookmakers.flatMap(bookmaker => 
      bookmaker.markets.filter(market => market.key === 'spreads')
    );
    
    if (spreadsMarkets.length > 0) {
      spreadsMarkets.forEach((market, index) => {
        console.log(`\n📈 ${market.bookmaker_name}:`);
        market.outcomes.forEach(outcome => {
          console.log(`  ${outcome.name}: ${outcome.price} (${outcome.point})`);
        });
      });
    } else {
      console.log('❌ 핸디캡 배당율이 없습니다.');
    }
    
    // 전체 마켓 정보 출력
    console.log('\n📋 전체 마켓 정보:');
    targetGame.bookmakers.forEach(bookmaker => {
      console.log(`\n🏪 ${bookmaker.title}:`);
      bookmaker.markets.forEach(market => {
        console.log(`  📊 ${market.key}:`);
        market.outcomes.forEach(outcome => {
          console.log(`    ${outcome.name}: ${outcome.price}${outcome.point ? ` (${outcome.point})` : ''}`);
        });
      });
    });
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.response) {
      console.error('📡 응답 상태:', error.response.status);
      console.error('📄 응답 데이터:', error.response.data);
    }
  }
}

// 스크립트 실행
fetchJuventudeSaoPauloOdds(); 