import oddsApiService from './services/oddsApiService.js';
import OddsCache from './models/oddsCacheModel.js';
import { Op } from 'sequelize';

async function fetchKboLatestOdds() {
  try {
    console.log('🔍 KBO 최신 배당율 데이터 5개 수집 시작...\n');
    
    // 1. API 키 확인
    if (!process.env.ODDS_API_KEY) {
      console.error('❌ ODDS_API_KEY 환경변수가 설정되지 않았습니다.');
      return;
    }
    
    console.log('✅ API 키 확인됨');
    
    // 2. KBO 배당율 API 호출
    console.log('\n📡 KBO 배당율 API 호출 중...');
    
    const axios = (await import('axios')).default;
    const baseUrl = 'https://api.the-odds-api.com/v4/sports';
    const apiKey = process.env.ODDS_API_KEY;
    
    const response = await axios.get(`${baseUrl}/baseball_kbo/odds`, {
      params: {
        apiKey: apiKey,
        regions: 'us',
        markets: 'h2h,spreads,totals',
        oddsFormat: 'decimal',
        dateFormat: 'iso'
      },
      timeout: 30000,
      headers: {
        'User-Agent': 'LikeBetFair/1.0'
      }
    });
    
    console.log(`📊 API 응답: ${response.data.length}개 경기 발견`);
    
    // 3. 최신 5개 경기만 필터링 (미래 경기 우선)
    const now = new Date();
    const futureGames = response.data.filter(game => {
      const gameTime = new Date(game.commence_time);
      return gameTime > now;
    });
    
    const pastGames = response.data.filter(game => {
      const gameTime = new Date(game.commence_time);
      return gameTime <= now;
    });
    
    console.log(`📅 미래 경기: ${futureGames.length}개`);
    console.log(`📅 과거 경기: ${pastGames.length}개`);
    
    // 미래 경기 우선, 부족하면 과거 경기로 채움
    let selectedGames = [];
    if (futureGames.length >= 5) {
      selectedGames = futureGames.slice(0, 5);
    } else {
      selectedGames = [...futureGames, ...pastGames.slice(0, 5 - futureGames.length)];
    }
    
    console.log(`🎯 선택된 경기: ${selectedGames.length}개`);
    
    // 4. 선택된 경기 상세 정보 출력
    console.log('\n=== 선택된 KBO 경기 상세 ===');
    selectedGames.forEach((game, index) => {
      const gameTime = new Date(game.commence_time);
      const isFuture = gameTime > now;
      
      console.log(`${index + 1}. ${game.home_team} vs ${game.away_team}`);
      console.log(`   경기시간: ${gameTime.toLocaleString('ko-KR')}`);
      console.log(`   상태: ${isFuture ? '미래' : '과거'}`);
      console.log(`   북메이커: ${game.bookmakers ? game.bookmakers.length : 0}개`);
      
      // h2h 배당율 표시
      if (game.bookmakers && game.bookmakers.length > 0) {
        const h2hMarket = game.bookmakers[0].markets?.find(m => m.key === 'h2h');
        if (h2hMarket) {
          console.log(`   배당율:`);
          h2hMarket.outcomes.forEach(outcome => {
            console.log(`     ${outcome.name}: ${outcome.price}`);
          });
        }
      }
      console.log('');
    });
    
    // 5. 데이터베이스에 저장 (선택사항)
    console.log('💾 데이터베이스에 저장 중...');
    
    let savedCount = 0;
    for (const game of selectedGames) {
      try {
        // 기존 데이터 확인
        const existingGame = await OddsCache.findOne({
          where: {
            sportKey: 'baseball_kbo',
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            commenceTime: game.commence_time
          }
        });
        
        if (existingGame) {
          // 기존 데이터 업데이트
          await existingGame.update({
            bookmakers: game.bookmakers,
            lastUpdated: new Date()
          });
          console.log(`   ✅ 업데이트: ${game.home_team} vs ${game.away_team}`);
        } else {
          // 새 데이터 생성
          await OddsCache.create({
            sportKey: 'baseball_kbo',
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            commenceTime: game.commence_time,
            bookmakers: game.bookmakers,
            mainCategory: 'baseball',
            subCategory: 'KBO',
            lastUpdated: new Date()
          });
          console.log(`   ✅ 새로 생성: ${game.home_team} vs ${game.away_team}`);
        }
        savedCount++;
      } catch (error) {
        console.error(`   ❌ 저장 실패: ${game.home_team} vs ${game.away_team}`, error.message);
      }
    }
    
    console.log(`\n🎉 완료! ${savedCount}개 경기 저장됨`);
    
    // 6. 최종 확인
    const finalCount = await OddsCache.count({
      where: {
        sportKey: 'baseball_kbo'
      }
    });
    
    console.log(`📊 최종 KBO 데이터베이스: ${finalCount}개 경기`);
    
  } catch (error) {
    console.error('❌ KBO 배당율 수집 중 오류:', error.message);
    if (error.response) {
      console.error('API 응답 오류:', error.response.status, error.response.data);
    }
  }
}

fetchKboLatestOdds(); 