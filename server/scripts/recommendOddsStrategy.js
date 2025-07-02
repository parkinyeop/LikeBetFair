import axios from 'axios';

async function recommendOddsStrategy() {
  try {
    console.log('=== 📊 배당율 전략 개선 방안 ===\n');
    
    const API_KEY = '834968b1a5a86225609bad8b97d7fcb5';
    const url = `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=${API_KEY}&regions=us&markets=h2h&oddsFormat=decimal&dateFormat=iso`;
    
    const response = await axios.get(url);
    const games = response.data.slice(0, 6);
    
    console.log('🔍 현재 시장 분석...\n');
    
    let strategiesData = [];
    
    for (const game of games) {
      const allOdds = [];
      game.bookmakers.forEach(bookmaker => {
        const h2hMarket = bookmaker.markets.find(market => market.key === 'h2h');
        if (h2hMarket) {
          const homeOdds = h2hMarket.outcomes.find(outcome => outcome.name === game.home_team);
          const awayOdds = h2hMarket.outcomes.find(outcome => outcome.name === game.away_team);
          
          if (homeOdds && awayOdds) {
            allOdds.push({
              bookmaker: bookmaker.title,
              homeOdds: homeOdds.price,
              awayOdds: awayOdds.price
            });
          }
        }
      });
      
      if (allOdds.length === 0) continue;
      
      const homeOddsArray = allOdds.map(o => o.homeOdds);
      const awayOddsArray = allOdds.map(o => o.awayOdds);
      
      const homeMax = Math.max(...homeOddsArray);
      const awayMax = Math.max(...awayOddsArray);
      const homeAvg = homeOddsArray.reduce((a,b) => a+b, 0) / homeOddsArray.length;
      const awayAvg = awayOddsArray.reduce((a,b) => a+b, 0) / awayOddsArray.length;
      
      // 상위 75% 배당율 계산 (25% 지점)
      const homeSorted = [...homeOddsArray].sort((a,b) => b-a);
      const awaySorted = [...awayOddsArray].sort((a,b) => b-a);
      const home75th = homeSorted[Math.floor(homeSorted.length * 0.25)];
      const away75th = awaySorted[Math.floor(awaySorted.length * 0.25)];
      
      // 다양한 전략별 마진 계산
      const strategies = {
        max: { prob: 1/homeMax + 1/awayMax, home: homeMax, away: awayMax },
        avg: { prob: 1/homeAvg + 1/awayAvg, home: homeAvg, away: awayAvg },
        p75: { prob: 1/home75th + 1/away75th, home: home75th, away: away75th },
        avg2: { prob: 1/(homeAvg * 0.98) + 1/(awayAvg * 0.98), home: homeAvg * 0.98, away: awayAvg * 0.98 },
        avg5: { prob: 1/(homeAvg * 0.95) + 1/(awayAvg * 0.95), home: homeAvg * 0.95, away: awayAvg * 0.95 }
      };
      
      strategiesData.push({
        game: `${game.away_team} @ ${game.home_team}`,
        strategies
      });
    }
    
    console.log('📊 전략별 마진 분석:');
    console.log('─'.repeat(80));
    
    const strategyNames = {
      max: '최고배당 (현재)',
      avg: '평균배당',
      p75: '상위 25% 배당',
      avg2: '평균배당 + 2% 마진',
      avg5: '평균배당 + 5% 마진'
    };
    
    Object.keys(strategyNames).forEach(strategy => {
      const probs = strategiesData.map(g => g.strategies[strategy].prob);
      const avgMargin = (probs.reduce((a,b) => a+b, 0) / probs.length - 1) * 100;
      const riskGames = probs.filter(p => p < 1.0).length;
      
      console.log(`${strategyNames[strategy].padEnd(20)}: 평균 마진 ${avgMargin.toFixed(2)}% | 위험 경기 ${riskGames}/${probs.length}`);
    });
    
    console.log('\n🎯 권장 전략:');
    console.log('─'.repeat(80));
    
    const maxRiskGames = strategiesData.filter(g => g.strategies.max.prob < 1.0).length;
    const riskPercentage = (maxRiskGames / strategiesData.length) * 100;
    
    if (riskPercentage > 20) {
      console.log('🚨 HIGH RISK: 현재 전략은 매우 위험합니다!');
      console.log('✅ 즉시 평균배당 + 5% 마진 적용 권장');
    } else if (riskPercentage > 5) {
      console.log('⚠️  MEDIUM RISK: 주의가 필요합니다.');
      console.log('✅ 상위 25% 배당 + 2% 마진 권장');
    } else {
      console.log('✅ LOW RISK: 현재 전략이 상대적으로 안전합니다.');
      console.log('💡 하지만 장기적 안정성을 위해 소폭 마진 적용 고려');
    }
    
    console.log('\n🔧 구현 방안:');
    console.log('1. 일반 경기: 상위 25% 배당율');
    console.log('2. 인기 경기: 평균 배당율 + 2% 마진');
    console.log('3. 실시간 아비트라지 모니터링');
    console.log('4. 의심 패턴 감지시 자동 마진 증가');
    
    console.log('\n💡 결론:');
    console.log('현재 최고배당 전략은 사용자 친화적이지만 위험 요소가 존재합니다.');
    console.log('균형잡힌 접근법으로 안전성과 경쟁력을 모두 확보하는 것이 바람직합니다.');
    
  } catch (error) {
    console.error('❌ 분석 중 오류:', error.message);
  }
}

recommendOddsStrategy(); 