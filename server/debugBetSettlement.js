import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import { normalizeTeamNameForComparison } from './normalizeUtils.js';

async function debugBetSettlement() {
  console.log('=== 베팅 정산 디버깅 시작 ===');
  
  // 1. pending 베팅 조회
  const pendingBets = await Bet.findAll({
    where: { status: 'pending' }
  });
  
  console.log(`총 ${pendingBets.length}개의 pending 베팅 발견`);
  
  // 2. 특정 베팅 선택 (Ulsan Hyundai FC vs Daejeon Citizen)
  const targetBet = pendingBets.find(bet => {
    const selection = bet.selections[0];
    return selection.desc.includes('Ulsan Hyundai FC') && selection.desc.includes('Daejeon Citizen');
  });
  
  if (!targetBet) {
    console.log('❌ 대상 베팅을 찾을 수 없습니다!');
    return;
  }
  
  console.log('\n=== 대상 베팅 정보 ===');
  const selection = targetBet.selections[0];
  console.log('Selection:', {
    desc: selection.desc,
    commence_time: selection.commence_time,
    team: selection.team,
    market: selection.market,
    result: selection.result
  });
  
  // 3. 베팅의 desc에서 팀명 추출
  const desc = selection.desc;
  const teams = desc.split(' vs ');
  const homeTeamFromDesc = teams[0].trim();
  const awayTeamFromDesc = teams[1].trim();
  
  console.log('\n=== 팀명 추출 ===');
  console.log(`홈팀 (desc에서): "${homeTeamFromDesc}"`);
  console.log(`원정팀 (desc에서): "${awayTeamFromDesc}"`);
  
  // 4. 정규화
  const homeTeamNorm = normalizeTeamNameForComparison(homeTeamFromDesc);
  const awayTeamNorm = normalizeTeamNameForComparison(awayTeamFromDesc);
  
  console.log('\n=== 정규화 결과 ===');
  console.log(`홈팀 정규화: "${homeTeamNorm}"`);
  console.log(`원정팀 정규화: "${awayTeamNorm}"`);
  
  // 5. commenceTime
  const commenceTime = new Date(selection.commence_time);
  console.log('\n=== 시간 정보 ===');
  console.log(`원본: ${selection.commence_time}`);
  console.log(`Date 객체: ${commenceTime.toISOString()}`);
  
  // 6. GameResults 조회
  const dayStart = new Date(commenceTime);
  dayStart.setUTCHours(0,0,0,0);
  const dayEnd = new Date(commenceTime);
  dayEnd.setUTCHours(23,59,59,999);
  
  console.log('\n=== GameResults 조회 범위 ===');
  console.log(`시작: ${dayStart.toISOString()}`);
  console.log(`끝: ${dayEnd.toISOString()}`);
  
  const gameResults = await GameResult.findAll({
    where: {
      commenceTime: { [Op.between]: [dayStart, dayEnd] },
      status: 'finished'
    }
  });
  
  console.log(`\n=== GameResults 조회 결과 ===`);
  console.log(`총 ${gameResults.length}개의 경기 발견`);
  
  // 7. resultMap 생성
  const resultMap = new Map();
  for (const gr of gameResults) {
    const key = `${gr.commenceTime.toISOString()}|${normalizeTeamNameForComparison(gr.homeTeam)}|${normalizeTeamNameForComparison(gr.awayTeam)}`;
    resultMap.set(key, gr);
    console.log(`Map 키: "${key}"`);
    console.log(`  홈팀: "${gr.homeTeam}" -> "${normalizeTeamNameForComparison(gr.homeTeam)}"`);
    console.log(`  원정팀: "${gr.awayTeam}" -> "${normalizeTeamNameForComparison(gr.awayTeam)}"`);
  }
  
  // 8. 매칭 시도
  const baseKey = `${homeTeamNorm}|${awayTeamNorm}`;
  const exactKey = `${commenceTime.toISOString()}|${baseKey}`;
  
  console.log('\n=== 매칭 시도 ===');
  console.log(`베팅 키: "${exactKey}"`);
  console.log(`Map에 존재: ${resultMap.has(exactKey)}`);
  
  if (resultMap.has(exactKey)) {
    const gameResult = resultMap.get(exactKey);
    console.log('✅ 매칭 성공!');
    console.log('GameResult:', {
      id: gameResult.id,
      homeTeam: gameResult.homeTeam,
      awayTeam: gameResult.awayTeam,
      commenceTime: gameResult.commenceTime,
      result: gameResult.result,
      score: gameResult.score
    });
  } else {
    console.log('❌ 정확한 매칭 실패');
    
    // 시간대 보정 시도
    console.log('\n=== 시간대 보정 시도 ===');
    for (let hourOffset = -9; hourOffset <= 9; hourOffset++) {
      const adjustedTime = new Date(commenceTime.getTime() + hourOffset * 60 * 60 * 1000);
      const adjustedKey = `${adjustedTime.toISOString()}|${baseKey}`;
      if (resultMap.has(adjustedKey)) {
        console.log(`✅ ${hourOffset}시간 조정으로 매칭 성공: "${adjustedKey}"`);
        break;
      }
    }
  }
  
  console.log('\n=== 디버깅 완료 ===');
}

// 스크립트 실행
debugBetSettlement()
  .then(() => {
    console.log('디버깅 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('디버깅 오류:', error);
    process.exit(1);
  }); 