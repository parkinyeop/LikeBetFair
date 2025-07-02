import axios from 'axios';

async function analyzeAverageOddsStrategy() {
  try {
    console.log('=== 📊 평균 배당율 전략 분석 ===\n');
    
    const API_KEY = '834968b1a5a86225609bad8b97d7fcb5';
    const url = `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=${API_KEY}&regions=us&markets=h2h&oddsFormat=decimal&dateFormat=iso`;
    
    const response = await axios.get(url);
    const games = response.data.slice(0, 8);
    
    console.log(`🔍 ${games.length}개 경기 분석 중...\n`);
    
    let analysisData = [];
    let totalMaxRisk = 0;
    let totalAvgRisk = 0;
    let userExperienceImpact = [];
    
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
      const homeMin = Math.min(...homeOddsArray);
      const homeAvg = homeOddsArray.reduce((a,b) => a+b, 0) / homeOddsArray.length;
      
      const awayMax = Math.max(...awayOddsArray);
      const awayMin = Math.min(...awayOddsArray);
      const awayAvg = awayOddsArray.reduce((a,b) => a+b, 0) / awayOddsArray.length;
      
      // 아비트라지 위험 계산
      const maxProb = 1/homeMax + 1/awayMax; // 최고배당 전략
      const avgProb = 1/homeAvg + 1/awayAvg; // 평균배당 전략
      const minProb = 1/homeMin + 1/awayMin; // 최저배당 (시장 최악)
      
      // 사용자 경험 영향 계산
      const homeOddsLoss = ((homeMax - homeAvg) / homeMax * 100);
      const awayOddsLoss = ((awayMax - awayAvg) / awayMax * 100);
      const avgOddsLoss = (homeOddsLoss + awayOddsLoss) / 2;
      
      userExperienceImpact.push(avgOddsLoss);
      
      if (maxProb < 1.0) totalMaxRisk++;
      if (avgProb < 1.0) totalAvgRisk++;
      
      analysisData.push({
        game: `${game.away_team} @ ${game.home_team}`,
        maxStrategy: { prob: maxProb, margin: (maxProb - 1) * 100, home: homeMax, away: awayMax },
        avgStrategy: { prob: avgProb, margin: (avgProb - 1) * 100, home: homeAvg, away: awayAvg },
        userLoss: avgOddsLoss,
        spreads: {
          home: ((homeMax - homeMin) / homeAvg * 100),
          away: ((awayMax - awayMin) / awayAvg * 100)
        }
      });
    }
    
    console.log('📊 전략 비교 분석:');
    console.log('─'.repeat(80));
    console.log('경기별 상세 분석:');
    
    analysisData.forEach((data, idx) => {
      console.log(`\n${idx + 1}. ${data.game}`);
      console.log(`   최고배당: 홈 ${data.maxStrategy.home.toFixed(3)} / 원정 ${data.maxStrategy.away.toFixed(3)} (마진: ${data.maxStrategy.margin.toFixed(2)}%)`);
      console.log(`   평균배당: 홈 ${data.avgStrategy.home.toFixed(3)} / 원정 ${data.avgStrategy.away.toFixed(3)} (마진: ${data.avgStrategy.margin.toFixed(2)}%)`);
      console.log(`   사용자 손실: ${data.userLoss.toFixed(2)}% (최고배당 → 평균배당시)`);
      console.log(`   시장 스프레드: 홈 ${data.spreads.home.toFixed(1)}% / 원정 ${data.spreads.away.toFixed(1)}%`);
    });
    
    // 전체 통계
    const avgUserLoss = userExperienceImpact.reduce((a,b) => a+b, 0) / userExperienceImpact.length;
    const avgMaxMargin = analysisData.reduce((sum, d) => sum + d.maxStrategy.margin, 0) / analysisData.length;
    const avgAvgMargin = analysisData.reduce((sum, d) => sum + d.avgStrategy.margin, 0) / analysisData.length;
    
    console.log('\n📈 종합 통계:');
    console.log('─'.repeat(80));
    console.log(`분석 경기 수: ${analysisData.length}개`);
    console.log(`\n🚨 아비트라지 위험:`);
    console.log(`   최고배당 전략: ${totalMaxRisk}개 경기 위험 (${(totalMaxRisk/analysisData.length*100).toFixed(1)}%)`);
    console.log(`   평균배당 전략: ${totalAvgRisk}개 경기 위험 (${(totalAvgRisk/analysisData.length*100).toFixed(1)}%)`);
    
    console.log(`\n💰 수익성 (마진):`);
    console.log(`   최고배당 전략: 평균 ${avgMaxMargin.toFixed(2)}%`);
    console.log(`   평균배당 전략: 평균 ${avgAvgMargin.toFixed(2)}%`);
    console.log(`   마진 증가: +${(avgAvgMargin - avgMaxMargin).toFixed(2)}%p`);
    
    console.log(`\n👤 사용자 경험:`);
    console.log(`   평균 배당율 손실: ${avgUserLoss.toFixed(2)}%`);
    console.log(`   10만원 베팅시 손실: ${(100000 * avgUserLoss / 100).toFixed(0)}원`);
    
    console.log('\n🎯 평균 배당율 전략의 장점:');
    console.log('─'.repeat(80));
    console.log('✅ 1. 아비트라지 위험 대폭 감소');
    console.log('✅ 2. 안정적인 마진 확보');
    console.log('✅ 3. 시장 변동성에 덜 민감');
    console.log('✅ 4. 운영 예측 가능성 증대');
    console.log('✅ 5. 북메이커들의 평균적 가격 정책');
    
    console.log('\n⚠️  평균 배당율 전략의 단점:');
    console.log('─'.repeat(80));
    console.log(`❌ 1. 사용자 배당율 ${avgUserLoss.toFixed(2)}% 감소`);
    console.log('❌ 2. 경쟁사 대비 매력도 하락 가능');
    console.log('❌ 3. 마케팅 포인트 약화 ("최고배당" 어필 불가)');
    
    console.log('\n💡 평균 배당율 최적화 방안:');
    console.log('─'.repeat(80));
    console.log('1. **가중 평균**: 상위 북메이커에 더 높은 가중치');
    console.log('2. **스마트 평균**: 이상치 제외한 조정 평균');
    console.log('3. **시간별 조정**: 경기 시간 접근시 배당율 상향');
    console.log('4. **사용자 그룹별**: VIP는 높은 배당, 일반은 평균');
    
    console.log('\n🔍 권장 구현 방식:');
    console.log('─'.repeat(80));
    
    if (avgUserLoss < 3.0) {
      console.log('✅ 평균 배당율 전략을 권장합니다!');
      console.log(`   사용자 손실(${avgUserLoss.toFixed(2)}%)이 허용 범위 내입니다.`);
      console.log('   안정성과 경쟁력의 균형점을 제공합니다.');
    } else if (avgUserLoss < 5.0) {
      console.log('⚖️  조건부 평균 배당율 전략을 권장합니다.');
      console.log('   가중 평균이나 상위 70% 평균을 고려하세요.');
    } else {
      console.log('❌ 평균 배당율은 너무 보수적일 수 있습니다.');
      console.log('   상위 75% 배당율이나 가중 평균을 고려하세요.');
    }
    
    console.log('\n📋 구체적 구현 코드:');
    console.log('─'.repeat(80));
    console.log('```javascript');
    console.log('// 평균 배당율 계산');
    console.log('const avgOdds = outcomes.reduce((sum, outcome) => sum + outcome.price, 0) / outcomes.length;');
    console.log('');
    console.log('// 가중 평균 (상위 북메이커 우대)');
    console.log('const weights = { "DraftKings": 1.2, "FanDuel": 1.2, "BetMGM": 1.1 };');
    console.log('const weightedAvg = outcomes.reduce((sum, outcome) => {');
    console.log('  const weight = weights[outcome.bookmaker] || 1.0;');
    console.log('  return sum + (outcome.price * weight);');
    console.log('}, 0) / totalWeight;');
    console.log('```');
    
    console.log('\n🏁 최종 결론:');
    console.log('평균 배당율 전략은 장기적 안정성과 지속가능성을 제공합니다.');
    console.log('단기적 사용자 매력도는 약간 감소하지만, 건전한 비즈니스 운영에는 더 적합합니다.');
    
  } catch (error) {
    console.error('❌ 분석 중 오류:', error.message);
  }
}

analyzeAverageOddsStrategy(); 