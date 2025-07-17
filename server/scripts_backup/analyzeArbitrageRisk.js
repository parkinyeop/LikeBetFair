import axios from 'axios';

async function analyzeArbitrageRisk() {
  try {
    console.log('=== 🚨 아비트라지 위험성 분석 ===\n');
    
    const API_KEY = '834968b1a5a86225609bad8b97d7fcb5';
    const url = `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=${API_KEY}&regions=us&markets=h2h&oddsFormat=decimal&dateFormat=iso`;
    
    const response = await axios.get(url);
    const games = response.data.slice(0, 4); // 처음 4경기만 분석
    
    console.log(`📊 분석 대상: ${games.length}개 경기\n`);
    
    let totalRiskGames = 0;
    let totalSafeGames = 0;
    
    for (const [index, game] of games.entries()) {
      console.log(`${index + 1}. 🏟️ ${game.away_team} @ ${game.home_team}`);
      console.log(`⏰ ${new Date(game.commence_time).toLocaleString('ko-KR')}`);
      console.log('─'.repeat(60));
      
      // 모든 북메이커의 배당율 수집
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
              awayOdds: awayOdds.price,
              margin: (1/homeOdds.price + 1/awayOdds.price - 1) * 100
            });
          }
        }
      });
      
      if (allOdds.length === 0) {
        console.log('❌ 배당율 데이터 없음\n');
        continue;
      }
      
      // 각 팀별 최고/최저/평균 배당율
      const homeOddsArray = allOdds.map(o => o.homeOdds);
      const awayOddsArray = allOdds.map(o => o.awayOdds);
      
      const homeMax = Math.max(...homeOddsArray);
      const homeMin = Math.min(...homeOddsArray);
      const homeAvg = homeOddsArray.reduce((a,b) => a+b, 0) / homeOddsArray.length;
      
      const awayMax = Math.max(...awayOddsArray);
      const awayMin = Math.min(...awayOddsArray);
      const awayAvg = awayOddsArray.reduce((a,b) => a+b, 0) / awayOddsArray.length;
      
      console.log(`📊 ${game.home_team} (홈팀):`);
      console.log(`   최고: ${homeMax.toFixed(3)} | 평균: ${homeAvg.toFixed(3)} | 최저: ${homeMin.toFixed(3)}`);
      console.log(`   스프레드: ${((homeMax - homeMin) / homeAvg * 100).toFixed(1)}%`);
      
      console.log(`📊 ${game.away_team} (원정팀):`);
      console.log(`   최고: ${awayMax.toFixed(3)} | 평균: ${awayAvg.toFixed(3)} | 최저: ${awayMin.toFixed(3)}`);
      console.log(`   스프레드: ${((awayMax - awayMin) / awayAvg * 100).toFixed(1)}%`);
      
      // 🚨 아비트라지 위험 계산
      const ourImpliedProb = 1/homeMax + 1/awayMax; // 우리가 최고배당 제공시
      const marketAvgImpliedProb = 1/homeAvg + 1/awayAvg; // 시장 평균
      const marketWorstImpliedProb = 1/homeMin + 1/awayMin; // 시장 최저배당
      
      console.log(`\n🔍 아비트라지 위험 분석:`);
      console.log(`   우리 배당율(최고): 홈 ${homeMax.toFixed(3)} / 원정 ${awayMax.toFixed(3)}`);
      console.log(`   시장 평균 배당율: 홈 ${homeAvg.toFixed(3)} / 원정 ${awayAvg.toFixed(3)}`);
      console.log(`   시장 최저 배당율: 홈 ${homeMin.toFixed(3)} / 원정 ${awayMin.toFixed(3)}`);
      console.log(`   우리 총 확률: ${(ourImpliedProb * 100).toFixed(1)}%`);
      console.log(`   시장 평균 확률: ${(marketAvgImpliedProb * 100).toFixed(1)}%`);
      console.log(`   시장 최저 확률: ${(marketWorstImpliedProb * 100).toFixed(1)}%`);
      
      // 아비트라지 기회 존재 여부
      if (ourImpliedProb < 1.0) {
        const arbitrageProfit = (1 - ourImpliedProb) * 100;
        console.log(`   🚨 CRITICAL: 아비트라지 기회 ${arbitrageProfit.toFixed(2)}% 이익!`);
        console.log(`   💸 10만원 베팅시 무위험 수익: ${(100000 * arbitrageProfit / 100).toFixed(0)}원`);
        console.log(`   ⚠️  우리 사이트는 차익거래 공격에 취약합니다!`);
        totalRiskGames++;
      } else {
        console.log(`   ✅ 아비트라지 기회 없음 (${((ourImpliedProb - 1) * 100).toFixed(2)}% 마진 존재)`);
        totalSafeGames++;
      }
      
      // 최고 배당율 제공하는 북메이커들
      const homeMaxBookmaker = allOdds.find(o => o.homeOdds === homeMax)?.bookmaker;
      const awayMaxBookmaker = allOdds.find(o => o.awayOdds === awayMax)?.bookmaker;
      
      console.log(`\n📈 최고 배당율 제공 업체:`);
      console.log(`   ${game.home_team}: ${homeMaxBookmaker} (${homeMax.toFixed(3)})`);
      console.log(`   ${game.away_team}: ${awayMaxBookmaker} (${awayMax.toFixed(3)})`);
      
      // 마진이 가장 낮은 북메이커 (가장 관대한)
      const lowestMarginBookmaker = allOdds.reduce((best, current) => 
        current.margin < best.margin ? current : best, allOdds[0]);
      
      console.log(`\n🎯 가장 관대한 북메이커: ${lowestMarginBookmaker.bookmaker}`);
      console.log(`   마진: ${lowestMarginBookmaker.margin.toFixed(2)}% (홈:${lowestMarginBookmaker.homeOdds.toFixed(2)} 원정:${lowestMarginBookmaker.awayOdds.toFixed(2)})`);
      
      console.log('\n' + '='.repeat(60) + '\n');
    }
    
    // 전체 요약
    console.log('🚨 아비트라지 위험성 종합 분석:');
    console.log('─'.repeat(60));
    console.log(`📊 분석 결과: ${totalRiskGames + totalSafeGames}개 경기 중`);
    console.log(`   🚨 위험 경기: ${totalRiskGames}개 (${(totalRiskGames/(totalRiskGames + totalSafeGames)*100).toFixed(1)}%)`);
    console.log(`   ✅ 안전 경기: ${totalSafeGames}개 (${(totalSafeGames/(totalRiskGames + totalSafeGames)*100).toFixed(1)}%)`);
    
    console.log('\n💡 위험 완화 방안:');
    console.log('1. 최고배당 → 평균배당 또는 상위 75% 배당으로 변경');
    console.log('2. 마진 추가: 모든 배당율에 2-5% 마진 적용');
    console.log('3. 동적 마진: 아비트라지 위험 감지시 자동 마진 증가');
    console.log('4. 베팅 한도: 의심스러운 패턴 감지시 한도 제한');
    console.log('5. 지연 업데이트: 실시간이 아닌 5-10분 지연 배당율 제공');
    
    if (totalRiskGames > 0) {
      console.log('\n⚠️  현재 시스템은 아비트라지 공격에 취약합니다!');
      console.log('🔧 즉시 배당율 정책 수정이 필요합니다.');
    }
    
  } catch (error) {
    console.error('❌ 분석 중 오류:', error.message);
  }
}

analyzeArbitrageRisk(); 