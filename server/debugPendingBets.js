import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import { normalizeTeamNameForComparison } from './normalizeUtils.js';
import { Op } from 'sequelize';

async function debugPendingBets() {
  console.log('=== Pending 베팅 정산 디버깅 ===');
  
  // 1. 모든 pending 베팅 조회
  const pendingBets = await Bet.findAll({
    where: { status: 'pending' }
  });
  
  console.log(`총 ${pendingBets.length}개의 pending 베팅 발견`);
  
  for (let i = 0; i < pendingBets.length; i++) {
    const bet = pendingBets[i];
    const selection = bet.selections[0];
    
    console.log(`\n=== 베팅 ${i + 1} 분석 ===`);
    console.log('베팅 ID:', bet.id);
    console.log('Desc:', selection.desc);
    console.log('Team:', selection.team);
    console.log('Commence Time:', selection.commence_time);
    
    // 2. desc에서 팀명 추출
    const desc = selection.desc;
    const teams = desc.split(' vs ');
    const homeTeamFromDesc = teams[0].trim();
    const awayTeamFromDesc = teams[1].trim();
    
    console.log('팀명 추출:');
    console.log(`  홈팀: "${homeTeamFromDesc}"`);
    console.log(`  원정팀: "${awayTeamFromDesc}"`);
    
    // 3. 정규화
    const homeTeamNorm = normalizeTeamNameForComparison(homeTeamFromDesc);
    const awayTeamNorm = normalizeTeamNameForComparison(awayTeamFromDesc);
    
    console.log('정규화 결과:');
    console.log(`  홈팀: "${homeTeamNorm}"`);
    console.log(`  원정팀: "${awayTeamNorm}"`);
    
    // 4. GameResult 찾기
    const commenceTime = new Date(selection.commence_time);
    const gameResult = await GameResult.findOne({
      where: {
        homeTeam: homeTeamFromDesc,
        awayTeam: awayTeamFromDesc,
        commenceTime: commenceTime,
        status: 'finished'
      }
    });
    
    if (gameResult) {
      console.log('✅ GameResult 발견!');
      console.log('  ID:', gameResult.id);
      console.log('  홈팀:', gameResult.homeTeam);
      console.log('  원정팀:', gameResult.awayTeam);
      console.log('  결과:', gameResult.result);
      console.log('  스코어:', gameResult.score);
      
      // 5. 매칭 키 생성
      const grHomeTeamNorm = normalizeTeamNameForComparison(gameResult.homeTeam);
      const grAwayTeamNorm = normalizeTeamNameForComparison(gameResult.awayTeam);
      
      const betKey = `${commenceTime.toISOString()}|${homeTeamNorm}|${awayTeamNorm}`;
      const grKey = `${commenceTime.toISOString()}|${grHomeTeamNorm}|${grAwayTeamNorm}`;
      
      console.log('매칭 키:');
      console.log(`  베팅 키: "${betKey}"`);
      console.log(`  GameResult 키: "${grKey}"`);
      console.log(`  매칭 여부: ${betKey === grKey ? '✅ 성공' : '❌ 실패'}`);
      
      // 6. 승/패 판정 시뮬레이션
      const selectedTeam = selection.team;
      const selectedTeamNorm = normalizeTeamNameForComparison(selectedTeam);
      
      console.log('승/패 판정:');
      console.log(`  베팅한 팀: "${selectedTeam}" -> "${selectedTeamNorm}"`);
      console.log(`  경기 결과: ${gameResult.result}`);
      
      if (gameResult.result === 'home_win') {
        const result = selectedTeamNorm === grHomeTeamNorm ? 'won' : 'lost';
        console.log(`  판정: ${result} (${selectedTeamNorm} === ${grHomeTeamNorm} = ${selectedTeamNorm === grHomeTeamNorm})`);
      } else if (gameResult.result === 'away_win') {
        const result = selectedTeamNorm === grAwayTeamNorm ? 'won' : 'lost';
        console.log(`  판정: ${result} (${selectedTeamNorm} === ${grAwayTeamNorm} = ${selectedTeamNorm === grAwayTeamNorm})`);
      } else {
        console.log(`  판정: 알 수 없는 결과 "${gameResult.result}"`);
      }
      
    } else {
      console.log('❌ GameResult 없음!');
      
      // 시간대 보정으로 찾기 시도
      console.log('시간대 보정으로 찾기 시도...');
      for (let hourOffset = -9; hourOffset <= 9; hourOffset++) {
        const adjustedTime = new Date(commenceTime.getTime() + hourOffset * 60 * 60 * 1000);
        const adjustedGameResult = await GameResult.findOne({
          where: {
            homeTeam: homeTeamFromDesc,
            awayTeam: awayTeamFromDesc,
            commenceTime: adjustedTime,
            status: 'finished'
          }
        });
        
        if (adjustedGameResult) {
          console.log(`✅ ${hourOffset}시간 조정으로 GameResult 발견!`);
          console.log('  조정된 시간:', adjustedTime.toISOString());
          console.log('  결과:', adjustedGameResult.result);
          break;
        }
      }
    }
  }
  
  console.log('\n=== 디버깅 완료 ===');
}

// 스크립트 실행
debugPendingBets()
  .then(() => {
    console.log('디버깅 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('디버깅 오류:', error);
    process.exit(1);
  }); 