import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import { normalizeTeamNameForComparison } from './normalizeUtils.js';
import { Op } from 'sequelize';

async function debugBetSettlementLogic() {
  console.log('=== 베팅 정산 로직 상세 디버깅 ===');
  
  // 과거 경기가 있는 pending 베팅 찾기
  const pendingBets = await Bet.findAll({
    where: { status: 'pending' }
  });
  
  console.log(`총 ${pendingBets.length}개의 pending 베팅 발견`);
  
  for (const bet of pendingBets) {
    console.log(`\n=== 베팅 ID: ${bet.id} ===`);
    console.log(`스테이크: ${bet.stake}원, 배당: ${bet.totalOdds}`);
    
    // 과거 경기가 있는지 확인
    const pastSelections = bet.selections.filter(selection => {
      const gameTime = new Date(selection.commence_time);
      const now = new Date();
      return gameTime < now;
    });
    
    if (pastSelections.length === 0) {
      console.log('  → 미래 경기만 포함 (정상적으로 pending)');
      continue;
    }
    
    console.log(`  → 과거 경기 ${pastSelections.length}개 포함`);
    
    for (const selection of pastSelections) {
      console.log(`\n  --- 경기: ${selection.desc} ---`);
      console.log(`  선택팀: ${selection.team}`);
      console.log(`  경기시간: ${selection.commence_time}`);
      console.log(`  현재결과: ${selection.result}`);
      
      // 1. GameResult 찾기
      const teams = selection.desc.split(' vs ');
      const homeTeam = teams[0].trim();
      const awayTeam = teams[1].trim();
      const commenceTime = new Date(selection.commence_time);
      
      const gameResult = await GameResult.findOne({
        where: {
          homeTeam: homeTeam,
          awayTeam: awayTeam,
          commenceTime: {
            [Op.between]: [
              new Date(commenceTime.getTime() - 9 * 60 * 60 * 1000),
              new Date(commenceTime.getTime() + 9 * 60 * 60 * 1000)
            ]
          }
        }
      });
      
      if (!gameResult) {
        console.log(`  ❌ GameResult 없음`);
        continue;
      }
      
      console.log(`  ✅ GameResult 발견:`);
      console.log(`    홈팀: ${gameResult.homeTeam}`);
      console.log(`    원정팀: ${gameResult.awayTeam}`);
      console.log(`    경기시간: ${gameResult.commenceTime}`);
      console.log(`    상태: ${gameResult.status}`);
      console.log(`    결과: ${gameResult.result}`);
      console.log(`    스코어: ${JSON.stringify(gameResult.score)}`);
      
      // 2. 팀명 정규화 비교
      const homeTeamNorm = normalizeTeamNameForComparison(homeTeam);
      const awayTeamNorm = normalizeTeamNameForComparison(awayTeam);
      const selectedTeamNorm = normalizeTeamNameForComparison(selection.team);
      const grHomeNorm = normalizeTeamNameForComparison(gameResult.homeTeam);
      const grAwayNorm = normalizeTeamNameForComparison(gameResult.awayTeam);
      
      console.log(`\n  팀명 정규화:`);
      console.log(`    베팅 홈팀: ${homeTeam} → ${homeTeamNorm}`);
      console.log(`    베팅 원정팀: ${awayTeam} → ${awayTeamNorm}`);
      console.log(`    베팅 선택팀: ${selection.team} → ${selectedTeamNorm}`);
      console.log(`    DB 홈팀: ${gameResult.homeTeam} → ${grHomeNorm}`);
      console.log(`    DB 원정팀: ${gameResult.awayTeam} → ${grAwayNorm}`);
      
      // 3. 승/패 판정 시뮬레이션
      if (selection.market === '승/패') {
        console.log(`\n  승/패 판정 시뮬레이션:`);
        
        if (gameResult.result === 'home_win') {
          const isHomeWin = selectedTeamNorm === grHomeNorm;
          console.log(`    경기결과: home_win`);
          console.log(`    선택팀이 홈팀인가? ${selectedTeamNorm} === ${grHomeNorm} = ${isHomeWin}`);
          console.log(`    예상 결과: ${isHomeWin ? 'won' : 'lost'}`);
        } else if (gameResult.result === 'away_win') {
          const isAwayWin = selectedTeamNorm === grAwayNorm;
          console.log(`    경기결과: away_win`);
          console.log(`    선택팀이 원정팀인가? ${selectedTeamNorm} === ${grAwayNorm} = ${isAwayWin}`);
          console.log(`    예상 결과: ${isAwayWin ? 'won' : 'lost'}`);
        } else if (gameResult.result === 'draw') {
          console.log(`    경기결과: draw`);
          console.log(`    예상 결과: lost (무승부는 베팅에서 lost)`);
        } else {
          console.log(`    경기결과: ${gameResult.result} (알 수 없는 결과)`);
        }
      }
      
      // 4. 베팅 정산 서비스 로직 시뮬레이션
      console.log(`\n  베팅 정산 서비스 로직 시뮬레이션:`);
      
      // determineSelectionResult 시뮬레이션
      let marketType = selection.market;
      if (marketType === 'h2h') marketType = '승/패';
      if (marketType === 'totals') marketType = '언더/오버';
      if (marketType === 'spreads') marketType = '핸디캡';
      
      console.log(`    마켓 타입: ${selection.market} → ${marketType}`);
      
      if (marketType === '승/패') {
        // determineWinLoseResult 로직 시뮬레이션
        if (gameResult.result === 'cancelled' || gameResult.status === 'cancelled' ||
            gameResult.result === 'postponed' || gameResult.status === 'postponed') {
          console.log(`    → 경기 취소/연기 → cancelled`);
        } else if (gameResult.result === 'pending') {
          console.log(`    → 경기 결과 pending → pending`);
        } else {
          const selectedTeam = normalizeTeamNameForComparison(selection.team);
          const homeTeam = normalizeTeamNameForComparison(gameResult.homeTeam);
          const awayTeam = normalizeTeamNameForComparison(gameResult.awayTeam);
          
          if (gameResult.result === 'home_win') {
            const result = selectedTeam === homeTeam ? 'won' : 'lost';
            console.log(`    → 홈팀 승리, 선택팀: ${selectedTeam}, 홈팀: ${homeTeam} → ${result}`);
          } else if (gameResult.result === 'away_win') {
            const result = selectedTeam === awayTeam ? 'won' : 'lost';
            console.log(`    → 원정팀 승리, 선택팀: ${selectedTeam}, 원정팀: ${awayTeam} → ${result}`);
          } else if (gameResult.result === 'draw') {
            console.log(`    → 무승부 → lost`);
          } else {
            console.log(`    → 알 수 없는 결과: ${gameResult.result} → pending`);
          }
        }
      }
    }
  }
}

// 스크립트 실행
debugBetSettlementLogic()
  .catch(error => {
    console.error('오류 발생:', error);
  })
  .finally(() => {
    process.exit(0);
  }); 