import simplifiedOddsValidation from './services/simplifiedOddsValidation.js';

// 테스트 케이스 - New England Revolution vs Inter Miami CF
const testSelection = {
  desc: 'New England Revolution vs Inter Miami CF',
  team: 'New England Revolution',
  market: '승/패',
  odds: 2.5,
  commence_time: '2025-07-09T23:30:00.000Z',
  mainCategory: 'soccer',
  subCategory: 'MLS'
};

console.log('=== 배당율 검증 테스트 ===');
console.log('경기:', testSelection.desc);
console.log('선택팀:', testSelection.team);
console.log('요청 배당율:', testSelection.odds);

try {
  const result = await simplifiedOddsValidation.validateBetOdds(testSelection);
  console.log('\n검증 결과:', result);
} catch (err) {
  console.error('오류:', err.message);
}

process.exit(0); 