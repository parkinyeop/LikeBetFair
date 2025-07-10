import { normalizeTeamName, normalizeTeamNameForComparison } from './normalizeUtils.js';

console.log('=== 팀명 정규화 테스트 ===\n');

// 테스트 케이스들
const testCases = [
  'intermiamicf',
  'Inter Miami',
  'Inter Miami CF',
  'New England Revolution',
  'newenglandrevolution',
  'Shanghai Shenhua FCDraftKings',
  'Shanghai Shenhua FC',
  'Qingdao Hainiu FCFanDuel',
  'Qingdao Hainiu FC'
];

console.log('1. normalizeTeamName 결과:');
testCases.forEach(team => {
  const normalized = normalizeTeamName(team);
  console.log(`   "${team}" → "${normalized}"`);
});

console.log('\n2. normalizeTeamNameForComparison 결과:');
testCases.forEach(team => {
  const normalized = normalizeTeamNameForComparison(team);
  console.log(`   "${team}" → "${normalized}"`);
});

console.log('\n3. 매칭 테스트:');
const betTeam = 'intermiamicf';
const dbTeam = 'Inter Miami';

const betNormalized = normalizeTeamNameForComparison(betTeam);
const dbNormalized = normalizeTeamNameForComparison(dbTeam);

console.log(`   베팅 팀: "${betTeam}" → "${betNormalized}"`);
console.log(`   DB 팀: "${dbTeam}" → "${dbNormalized}"`);
console.log(`   매칭 결과: ${betNormalized === dbNormalized ? '✅ 성공' : '❌ 실패'}`);

console.log('\n4. 문제 분석:');
console.log('   - intermiamicf → intermiamicf (CF 접미사 제거 안됨)');
console.log('   - Inter Miami → intermiami (공백 제거됨)');
console.log('   - 결과: 매칭 실패');
console.log('\n   해결책: MLS 팀명 매핑 추가 필요'); 