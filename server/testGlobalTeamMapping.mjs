import { normalizeTeamName, normalizeTeamNameForComparison } from './normalizeUtils.js';

console.log('=== 글로벌 팀명 매칭 시스템 테스트 ===\n');

// 테스트 케이스들 (각 리그별로)
const testCases = [
  // === MLS 테스트 ===
  { league: 'MLS', betTeam: 'intermiamicf', dbTeam: 'Inter Miami', expected: true },
  { league: 'MLS', betTeam: 'newenglandrevolution', dbTeam: 'New England Revolution', expected: true },
  { league: 'MLS', betTeam: 'newyorkcityfc', dbTeam: 'New York City FC', expected: true },
  
  // === KBO 테스트 ===
  { league: 'KBO', betTeam: 'kiwoomhe', dbTeam: 'Kiwoom Heroes', expected: true },
  { league: 'KBO', betTeam: 'hanwhaea', dbTeam: 'Hanwha Eagles', expected: true },
  { league: 'KBO', betTeam: 'ncdinos', dbTeam: 'NC Dinos', expected: true },
  
  // === MLB 테스트 ===
  { league: 'MLB', betTeam: 'losangelesangels', dbTeam: 'Los Angeles Angels', expected: true },
  { league: 'MLB', betTeam: 'newyorkyankees', dbTeam: 'New York Yankees', expected: true },
  { league: 'MLB', betTeam: 'bostonredsox', dbTeam: 'Boston Red Sox', expected: true },
  
  // === NBA 테스트 ===
  { league: 'NBA', betTeam: 'lalakers', dbTeam: 'LA Lakers', expected: true },
  { league: 'NBA', betTeam: 'goldenstatewarriors', dbTeam: 'Golden State Warriors', expected: true },
  { league: 'NBA', betTeam: 'chicagobulls', dbTeam: 'Chicago Bulls', expected: true },
  
  // === KBL 테스트 ===
  { league: 'KBL', betTeam: 'seoulskknights', dbTeam: 'Seoul SK Knights', expected: true },
  { league: 'KBL', betTeam: 'changwonlgsakers', dbTeam: 'Changwon LG Sakers', expected: true },
  
  // === CSL 테스트 ===
  { league: 'CSL', betTeam: 'shanghaishenhuafc', dbTeam: 'Shanghai Shenhua FC', expected: true },
  { league: 'CSL', betTeam: 'qingdaohainiufc', dbTeam: 'Qingdao Hainiu FC', expected: true },
  { league: 'CSL', betTeam: 'zhejiang', dbTeam: 'Zhejiang Professional', expected: true },
  
  // === 북메이커 접미사 테스트 ===
  { league: 'CSL', betTeam: 'Shanghai Shenhua FCDraftKings', dbTeam: 'Shanghai Shenhua FC', expected: true },
  { league: 'CSL', betTeam: 'Qingdao Hainiu FCFanDuel', dbTeam: 'Qingdao Hainiu FC', expected: true },
  { league: 'CSL', betTeam: 'Tianjin Jinmen Tiger FCBetRivers', dbTeam: 'Tianjin Jinmen Tiger FC', expected: true },
];

console.log('1. 팀명 정규화 테스트:');
testCases.forEach((testCase, index) => {
  const betNormalized = normalizeTeamNameForComparison(testCase.betTeam);
  const dbNormalized = normalizeTeamNameForComparison(testCase.dbTeam);
  const isMatch = betNormalized === dbNormalized;
  const status = isMatch === testCase.expected ? '✅' : '❌';
  
  console.log(`   ${index + 1}. [${testCase.league}] ${status}`);
  console.log(`      베팅: "${testCase.betTeam}" → "${betNormalized}"`);
  console.log(`      DB: "${testCase.dbTeam}" → "${dbNormalized}"`);
  console.log(`      매칭: ${isMatch ? '성공' : '실패'} (예상: ${testCase.expected ? '성공' : '실패'})`);
  console.log('');
});

// 2. 첫 번째 경기 특별 테스트
console.log('2. 첫 번째 경기 특별 테스트:');
const firstGameTest = {
  betTeam: 'intermiamicf',
  dbTeam: 'Inter Miami',
  desc: 'New England Revolution vs Inter Miami CF'
};

const betNormalized = normalizeTeamNameForComparison(firstGameTest.betTeam);
const dbNormalized = normalizeTeamNameForComparison(firstGameTest.dbTeam);
const isMatch = betNormalized === dbNormalized;

console.log(`   베팅 팀: "${firstGameTest.betTeam}" → "${betNormalized}"`);
console.log(`   DB 팀: "${firstGameTest.dbTeam}" → "${dbNormalized}"`);
console.log(`   매칭 결과: ${isMatch ? '✅ 성공' : '❌ 실패'}`);
console.log(`   경기 설명: ${firstGameTest.desc}`);

// 3. 통계
const successCount = testCases.filter(tc => {
  const betNorm = normalizeTeamNameForComparison(tc.betTeam);
  const dbNorm = normalizeTeamNameForComparison(tc.dbTeam);
  return betNorm === dbNorm;
}).length;

console.log(`\n3. 테스트 결과 통계:`);
console.log(`   총 테스트: ${testCases.length}개`);
console.log(`   성공: ${successCount}개`);
console.log(`   실패: ${testCases.length - successCount}개`);
console.log(`   성공률: ${((successCount / testCases.length) * 100).toFixed(1)}%`);

if (successCount === testCases.length) {
  console.log('\n🎉 모든 테스트 통과! 글로벌 팀명 매칭 시스템이 정상 작동합니다.');
} else {
  console.log('\n⚠️ 일부 테스트 실패. 추가 매핑이 필요할 수 있습니다.');
} 