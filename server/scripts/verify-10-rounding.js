/**
 * 10원 단위 올림 적용 검증
 */

console.log('✅ 10원 단위 올림 최종 검증\n');
console.log('=' .repeat(60));

// 실제 코드와 동일한 함수
function calculate10RoundUp(amount, odds) {
  return Math.ceil(amount * (odds - 1) / 10) * 10;
}

// 실전 테스트 케이스
const testCases = [
  { amount: 499999, odds: 2.284, description: '문제였던 499,999원' },
  { amount: 500000, odds: 2.284, description: '50만원' },
  { amount: 375000, odds: 3.208, description: '37.5만원 (DB 데이터)' },
  { amount: 250000, odds: 4.245, description: '25만원' },
  { amount: 333333, odds: 2.777, description: '이상한 금액' },
  { amount: 123456, odds: 1.95, description: '랜덤 금액 1' },
  { amount: 987654, odds: 3.14, description: '랜덤 금액 2' },
];

console.log('\n📊 Lay 담보금 계산 결과\n');

let allPass = true;

testCases.forEach(({ amount, odds, description }) => {
  const originalCalc = amount * (odds - 1);
  const result = calculate10RoundUp(amount, odds);
  
  const lastDigit = result.toString().slice(-1);
  const isValid = lastDigit === '0'; // 끝자리가 0이어야 함
  
  if (!isValid) allPass = false;
  
  console.log(`\n[${description}]`);
  console.log(`  배팅금: ${amount.toLocaleString()}원`);
  console.log(`  배당률: ${odds}`);
  console.log(`  원본 계산: ${originalCalc.toLocaleString()}`);
  console.log(`  10원 올림: ${result.toLocaleString()}원 ${isValid ? '✅' : '❌ 실패!'}`);
  console.log(`  끝자리: ${lastDigit} ${isValid ? '(0으로 끝남 ✅)' : '(9가 아님 확인)'}`);
  console.log(`  추가 비용: +${(result - originalCalc).toFixed(2)}원`);
});

console.log('\n\n🔍 대량 검증 (1000개 샘플)\n');
console.log('=' .repeat(60));

let nineCount = 0;
let zeroCount = 0;
let totalAdditionalCost = 0;

for (let i = 0; i < 1000; i++) {
  const amount = Math.floor(Math.random() * 1000000) + 10000; // 1만~100만
  const odds = (Math.random() * 4 + 1.5); // 1.5~5.5
  
  const originalCalc = amount * (odds - 1);
  const result = calculate10RoundUp(amount, odds);
  
  const lastDigit = result.toString().slice(-1);
  
  if (lastDigit === '9') nineCount++;
  if (lastDigit === '0') zeroCount++;
  
  totalAdditionalCost += (result - originalCalc);
}

console.log(`\n  총 1000개 샘플 테스트`);
console.log(`  ---`);
console.log(`  끝자리 0: ${zeroCount}개 (${(zeroCount/10).toFixed(1)}%) ✅`);
console.log(`  끝자리 9: ${nineCount}개 (${(nineCount/10).toFixed(1)}%) ${nineCount === 0 ? '✅ 완벽!' : '❌'}`);
console.log(`  평균 추가 비용: ${(totalAdditionalCost / 1000).toFixed(2)}원/건`);
console.log(`  총 추가 비용: ${totalAdditionalCost.toFixed(0)}원 (1000건 기준)`);

console.log('\n\n🎯 실제 DB 데이터 역계산\n');
console.log('=' .repeat(60));

// 실제 DB에서 발견한 데이터 역검증
const dbCases = [
  { backStake: 499999, layStake: 641998, description: 'ID 286 (이전 데이터)' },
  { backStake: 375000, layStake: 828001, description: 'ID 310 (현재 Math.ceil)' },
  { backStake: 500000, layStake: 1104000, description: 'ID 305' },
];

console.log('\n예상 결과 (10원 올림 적용 시):');
dbCases.forEach(({ backStake, layStake, description }) => {
  // 배당률 역계산
  const odds = (layStake / backStake) + 1;
  const new10Round = calculate10RoundUp(backStake, odds);
  
  console.log(`\n[${description}]`);
  console.log(`  Back: ${backStake.toLocaleString()}원`);
  console.log(`  이전 Lay: ${layStake.toLocaleString()}원 (끝자리: ${layStake.toString().slice(-1)})`);
  console.log(`  새 Lay: ${new10Round.toLocaleString()}원 (끝자리: ${new10Round.toString().slice(-1)}) ${new10Round.toString().slice(-1) === '0' ? '✅' : '❌'}`);
  console.log(`  차이: ${new10Round - layStake > 0 ? '+' : ''}${new10Round - layStake}원`);
});

console.log('\n\n' + '=' .repeat(60));
if (allPass && nineCount === 0) {
  console.log('🎉 검증 완료: 모든 테스트 통과!');
  console.log('✅ 9원 끝자리 100% 차단');
  console.log('✅ 모든 금액이 10원 단위로 끝남');
  console.log('✅ 평균 추가 비용: 약 5원/건');
} else {
  console.log('❌ 검증 실패: 일부 테스트 실패');
}
console.log('=' .repeat(60));

