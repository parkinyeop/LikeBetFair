import { normalizeTeamNameForComparison } from './normalizeUtils.js';

console.log('=== 승/패 베팅 정산 테스트 ===');

// 베팅 데이터
const betTeam = "Ulsan Hyundai FC";
const gameResult = {
  homeTeam: "Ulsan Hyundai FC",
  awayTeam: "Daejeon Citizen", 
  result: "home_win"
};

console.log('베팅 데이터:');
console.log(`  베팅한 팀: "${betTeam}"`);
console.log(`  홈팀: "${gameResult.homeTeam}"`);
console.log(`  원정팀: "${gameResult.awayTeam}"`);
console.log(`  경기 결과: "${gameResult.result}"`);

// 정규화
const selectedTeamNorm = normalizeTeamNameForComparison(betTeam);
const homeTeamNorm = normalizeTeamNameForComparison(gameResult.homeTeam);
const awayTeamNorm = normalizeTeamNameForComparison(gameResult.awayTeam);

console.log('\n정규화 결과:');
console.log(`  베팅한 팀: "${selectedTeamNorm}"`);
console.log(`  홈팀: "${homeTeamNorm}"`);
console.log(`  원정팀: "${awayTeamNorm}"`);

// 승/패 판정 로직
if (gameResult.result === 'home_win') {
  const result = selectedTeamNorm === homeTeamNorm ? 'won' : 'lost';
  console.log(`\n판정 결과: ${result}`);
  console.log(`  비교: "${selectedTeamNorm}" === "${homeTeamNorm}" = ${selectedTeamNorm === homeTeamNorm}`);
} else if (gameResult.result === 'away_win') {
  const result = selectedTeamNorm === awayTeamNorm ? 'won' : 'lost';
  console.log(`\n판정 결과: ${result}`);
  console.log(`  비교: "${selectedTeamNorm}" === "${awayTeamNorm}" = ${selectedTeamNorm === awayTeamNorm}`);
} else {
  console.log(`\n판정 결과: 알 수 없는 결과 "${gameResult.result}"`);
}

console.log('\n=== 테스트 완료 ==='); 