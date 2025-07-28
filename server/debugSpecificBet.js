import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import { normalizeTeamNameForComparison } from './normalizeUtils.js';
import { Op } from 'sequelize';

async function debugSpecificBet() {
  console.log('=== 특정 베팅 정산 디버깅 ===');
  
  // 첫 번째 pending 베팅 조회
  const pendingBet = await Bet.findOne({
    where: { status: 'pending' }
  });
  
  if (!pendingBet) {
    console.log('Pending 베팅이 없습니다.');
    return;
  }
  
  console.log(`\n베팅 ID: ${pendingBet.id}`);
  console.log(`스테이크: ${pendingBet.stake}원`);
  console.log(`배당: ${pendingBet.totalOdds}`);
  console.log(`선택 수: ${pendingBet.selections.length}개`);
  
  for (let i = 0; i < pendingBet.selections.length; i++) {
    const selection = pendingBet.selections[i];
    console.log(`\n--- 선택 ${i + 1} ---`);
    console.log(`설명: ${selection.desc}`);
    console.log(`팀: ${selection.team}`);
    console.log(`마켓: ${selection.market}`);
    console.log(`배당: ${selection.odds}`);
    console.log(`경기시간: ${selection.commence_time}`);
    console.log(`현재 결과: ${selection.result}`);
    
    // 팀명 정규화 확인
    const teams = selection.desc.split(' vs ');
    const homeTeamNorm = normalizeTeamNameForComparison(teams[0].trim());
    const awayTeamNorm = normalizeTeamNameForComparison(teams[1].trim());
    const selectedTeamNorm = normalizeTeamNameForComparison(selection.team);
    
    console.log(`\n팀명 정규화:`);
    console.log(`  홈팀: ${teams[0].trim()} → ${homeTeamNorm}`);
    console.log(`  원정팀: ${teams[1].trim()} → ${awayTeamNorm}`);
    console.log(`  선택팀: ${selection.team} → ${selectedTeamNorm}`);
    
    // GameResult 찾기
    const commenceTime = new Date(selection.commence_time);
    const gameResult = await GameResult.findOne({
      where: {
        homeTeam: teams[0].trim(),
        awayTeam: teams[1].trim(),
        commenceTime: {
          [Op.between]: [
            new Date(commenceTime.getTime() - 9 * 60 * 60 * 1000),
            new Date(commenceTime.getTime() + 9 * 60 * 60 * 1000)
          ]
        }
      }
    });
    
    if (gameResult) {
      console.log(`\nGameResult 발견:`);
      console.log(`  홈팀: ${gameResult.homeTeam}`);
      console.log(`  원정팀: ${gameResult.awayTeam}`);
      console.log(`  경기시간: ${gameResult.commenceTime}`);
      console.log(`  상태: ${gameResult.status}`);
      console.log(`  결과: ${gameResult.result}`);
      console.log(`  스코어: ${JSON.stringify(gameResult.score)}`);
      
      // 정규화된 팀명 비교
      const grHomeNorm = normalizeTeamNameForComparison(gameResult.homeTeam);
      const grAwayNorm = normalizeTeamNameForComparison(gameResult.awayTeam);
      
      console.log(`\nGameResult 팀명 정규화:`);
      console.log(`  홈팀: ${gameResult.homeTeam} → ${grHomeNorm}`);
      console.log(`  원정팀: ${gameResult.awayTeam} → ${grAwayNorm}`);
      
      // 승/패 판정 시뮬레이션
      if (selection.market === '승/패') {
        console.log(`\n승/패 판정 시뮬레이션:`);
        console.log(`  선택팀 정규화: ${selectedTeamNorm}`);
        console.log(`  홈팀 정규화: ${grHomeNorm}`);
        console.log(`  원정팀 정규화: ${grAwayNorm}`);
        console.log(`  경기 결과: ${gameResult.result}`);
        
        if (gameResult.result === 'home_win') {
          const isHomeWin = selectedTeamNorm === grHomeNorm;
          console.log(`  홈팀 승리 → 선택팀이 홈팀인가? ${isHomeWin} → ${isHomeWin ? 'won' : 'lost'}`);
        } else if (gameResult.result === 'away_win') {
          const isAwayWin = selectedTeamNorm === grAwayNorm;
          console.log(`  원정팀 승리 → 선택팀이 원정팀인가? ${isAwayWin} → ${isAwayWin ? 'won' : 'lost'}`);
        } else if (gameResult.result === 'draw') {
          console.log(`  무승부 → lost`);
        }
      }
    } else {
      console.log(`\n❌ GameResult를 찾을 수 없습니다.`);
    }
  }
}

// 스크립트 실행
debugSpecificBet()
  .catch(error => {
    console.error('오류 발생:', error);
  })
  .finally(() => {
    process.exit(0);
  }); 