// finished+pending 상태 경기들의 실제 API 응답 확인
import GameResult from './models/gameResultModel.js';
import gameResultService from './services/gameResultService.js';
import { Op } from 'sequelize';

(async () => {
  try {
    console.log('🔍 finished+pending 경기들의 실제 API 응답 확인\n');
    
    // finished+pending 상태 경기들 조회
    const finishedPendingGames = await GameResult.findAll({
      where: {
        status: 'finished',
        result: 'pending'
      },
      order: [['createdAt', 'DESC']],
      limit: 3
    });
    
    console.log(`📊 분석 대상: ${finishedPendingGames.length}개 경기\n`);
    
    for (const [index, game] of finishedPendingGames.entries()) {
      console.log(`🎯 경기 ${index + 1}: ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`   현재 DB 상태: ${game.status} + ${game.result}`);
      console.log(`   현재 스코어: ${JSON.stringify(game.score)}`);
      console.log(`   경기시간: ${game.commenceTime}`);
      console.log(`   생성: ${game.createdAt.toISOString()}`);
      
      // 스포츠별로 다른 API 엔드포인트 사용
      let sportKey = 'americanfootball_nfl'; // 기본값
      
      // 팀명으로 스포츠 추정
      if (game.homeTeam.includes('Tigers') || game.homeTeam.includes('Royals') || 
          game.homeTeam.includes('Angels') || game.homeTeam.includes('Cardinals')) {
        sportKey = 'baseball_mlb';
      } else if (game.homeTeam.includes('Eagles') || game.homeTeam.includes('Chiefs') ||
                game.homeTeam.includes('Chargers')) {
        sportKey = 'americanfootball_nfl';
      }
      
      console.log(`   추정 sportKey: ${sportKey}`);
      
      try {
        // 실제 API 재요청
        console.log('   📡 TheSportsDB API 재요청 중...');
        
        const apiResponse = await gameResultService.fetchResultsWithSportsDB(sportKey, 15, true);
        const events = apiResponse.data || [];
        
        console.log(`   📊 API 응답: ${events.length}개 경기`);
        
        // 매칭되는 경기 찾기
        const matchingEvents = events.filter(event => {
          const homeMatch = event.home_team === game.homeTeam;
          const awayMatch = event.away_team === game.awayTeam;
          return homeMatch && awayMatch;
        });
        
        console.log(`   🎯 매칭된 경기: ${matchingEvents.length}개`);
        
        if (matchingEvents.length > 0) {
          const event = matchingEvents[0];
          console.log('   ✅ 매칭된 API 응답:');
          console.log(`      status: ${event.status || 'N/A'}`);
          console.log(`      completed: ${event.completed}`);
          console.log(`      scores: ${JSON.stringify(event.scores)}`);
          console.log(`      home_team: ${event.home_team}`);
          console.log(`      away_team: ${event.away_team}`);
          console.log(`      commence_time: ${event.commence_time}`);
          
          // 우리 로직으로 재판정
          const determinedStatus = gameResultService.determineGameStatus(event);
          const determinedResult = gameResultService.determineGameResult(event);
          
          console.log('   🔄 재판정 결과:');
          console.log(`      status: ${determinedStatus}`);
          console.log(`      result: ${determinedResult}`);
          
          if (determinedResult !== 'pending') {
            console.log('   🎉 재판정으로 결과 확정 가능!');
          } else {
            console.log('   ⚠️  재판정해도 여전히 pending');
            console.log('   🔍 API가 실제로 스코어를 제공하지 않음');
          }
        } else {
          console.log('   ❌ API 응답에서 해당 경기를 찾을 수 없음');
          
          // 유사한 팀명으로 검색
          const similarEvents = events.filter(event => {
            const homeWords = game.homeTeam.toLowerCase().split(' ');
            const awayWords = game.awayTeam.toLowerCase().split(' ');
            const eventHome = event.home_team.toLowerCase();
            const eventAway = event.away_team.toLowerCase();
            
            const homeMatch = homeWords.some(word => eventHome.includes(word));
            const awayMatch = awayWords.some(word => eventAway.includes(word));
            
            return homeMatch && awayMatch;
          });
          
          if (similarEvents.length > 0) {
            console.log('   💡 유사한 경기들:');
            similarEvents.slice(0, 3).forEach(event => {
              console.log(`      - ${event.home_team} vs ${event.away_team}`);
              console.log(`        status: ${event.status}, scores: ${JSON.stringify(event.scores)}`);
            });
          }
        }
        
      } catch (error) {
        console.error(`   ❌ API 요청 실패: ${error.message}`);
      }
      
      console.log('='.repeat(80));
    }
    
    console.log('\n📋 분석 결론:');
    console.log('  1. finished+pending 경기들의 실제 API 응답 상태 확인');
    console.log('  2. API가 정말 스코어를 제공하지 않는지 검증');
    console.log('  3. 팀명 매칭 이슈인지 스코어 누락 이슈인지 구분');
    
    process.exit(0);
  } catch (error) {
    console.error('분석 오류:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();