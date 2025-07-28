import { normalizeTeamNameForComparison } from './normalizeUtils.js';

console.log('=== 팀명 정규화 테스트 ===');

// 베팅의 desc에서 추출한 팀명들
const betDesc = "Pohang Steelers vs Suwon FC";
const teams = betDesc.split(' vs ');
const homeTeamFromDesc = teams[0].trim();
const awayTeamFromDesc = teams[1].trim();

console.log('베팅 desc에서 추출:');
console.log(`  홈팀: "${homeTeamFromDesc}"`);
console.log(`  원정팀: "${awayTeamFromDesc}"`);

// 정규화
const homeTeamNorm = normalizeTeamNameForComparison(homeTeamFromDesc);
const awayTeamNorm = normalizeTeamNameForComparison(awayTeamFromDesc);

console.log('\n정규화 결과:');
console.log(`  홈팀: "${homeTeamNorm}"`);
console.log(`  원정팀: "${awayTeamNorm}"`);

// GameResults의 팀명들
const gameResultHomeTeam = "Pohang Steelers";
const gameResultAwayTeam = "Suwon FC";

console.log('\nGameResults 팀명:');
console.log(`  홈팀: "${gameResultHomeTeam}"`);
console.log(`  원정팀: "${gameResultAwayTeam}"`);

// 정규화
const grHomeTeamNorm = normalizeTeamNameForComparison(gameResultHomeTeam);
const grAwayTeamNorm = normalizeTeamNameForComparison(gameResultAwayTeam);

console.log('\nGameResults 정규화 결과:');
console.log(`  홈팀: "${grHomeTeamNorm}"`);
console.log(`  원정팀: "${grAwayTeamNorm}"`);

// 매칭 키 생성
const commenceTime = new Date('2025-07-22T10:30:00.000Z');
const betKey = `${commenceTime.toISOString()}|${homeTeamNorm}|${awayTeamNorm}`;
const grKey = `${commenceTime.toISOString()}|${grHomeTeamNorm}|${grAwayTeamNorm}`;

console.log('\n매칭 키:');
console.log(`  베팅 키: "${betKey}"`);
console.log(`  GameResult 키: "${grKey}"`);
console.log(`  매칭 여부: ${betKey === grKey ? '✅ 성공' : '❌ 실패'}`);

// 베팅의 team 필드
const betTeam = "Pohang Steelers";
const betTeamNorm = normalizeTeamNameForComparison(betTeam);

console.log('\n베팅 team 필드:');
console.log(`  원본: "${betTeam}"`);
console.log(`  정규화: "${betTeamNorm}"`);

console.log('\n=== 테스트 완료 ==='); 