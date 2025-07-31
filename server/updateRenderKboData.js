import oddsApiService from './services/oddsApiService.js';
import OddsCache from './models/oddsCacheModel.js';
import { Op } from 'sequelize';

async function updateRenderKboData() {
  try {
    console.log('🚀 Render 서버 KBO 배당율 데이터 업데이트 시작...\n');
    
    // 1. API 키 확인
    if (!process.env.ODDS_API_KEY) {
      console.error('❌ ODDS_API_KEY 환경변수가 설정되지 않았습니다.');
      return;
    }
    
    console.log('✅ API 키 확인됨');
    
    // 2. 기존 KBO 데이터 확인
    const existingKboCount = await OddsCache.count({
      where: {
        sportKey: 'baseball_kbo'
      }
    });
    
    console.log(`📊 기존 KBO 데이터: ${existingKboCount}개`);
    
    // 3. KBO 배당율 API 호출
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
    
    // 4. 경기 시간별 분류
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
    
    // 5. 모든 경기 데이터베이스에 저장/업데이트
    console.log('\n💾 데이터베이스에 저장 중...');
    
    let newCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    
    for (const game of response.data) {
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
        
        const gameTime = new Date(game.commence_time);
        const isFuture = gameTime > now;
        
        if (existingGame) {
          // 기존 데이터 업데이트
          await existingGame.update({
            bookmakers: game.bookmakers,
            lastUpdated: new Date()
          });
          console.log(`   ✅ 업데이트: ${game.home_team} vs ${game.away_team} (${isFuture ? '미래' : '과거'})`);
          updateCount++;
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
          console.log(`   ✅ 새로 생성: ${game.home_team} vs ${game.away_team} (${isFuture ? '미래' : '과거'})`);
          newCount++;
        }
      } catch (error) {
        console.error(`   ❌ 저장 실패: ${game.home_team} vs ${game.away_team}`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 완료!`);
    console.log(`- 새로 생성: ${newCount}개`);
    console.log(`- 업데이트: ${updateCount}개`);
    console.log(`- 오류: ${errorCount}개`);
    
    // 6. 최종 확인
    const finalKboCount = await OddsCache.count({
      where: {
        sportKey: 'baseball_kbo'
      }
    });
    
    const finalFutureCount = await OddsCache.count({
      where: {
        sportKey: 'baseball_kbo',
        commenceTime: {
          [Op.gt]: now
        }
      }
    });
    
    console.log(`\n📊 최종 결과:`);
    console.log(`- 전체 KBO 데이터: ${finalKboCount}개`);
    console.log(`- 미래 경기: ${finalFutureCount}개`);
    
    if (finalFutureCount > 0) {
      console.log('✅ Render 서버에 미래 KBO 경기 데이터가 업데이트되었습니다!');
    } else {
      console.log('⚠️ 여전히 미래 KBO 경기 데이터가 없습니다.');
    }
    
  } catch (error) {
    console.error('❌ KBO 데이터 업데이트 중 오류:', error.message);
    if (error.response) {
      console.error('API 응답 오류:', error.response.status, error.response.data);
    }
  }
}

updateRenderKboData(); 