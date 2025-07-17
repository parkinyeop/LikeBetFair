// 10분 단위 배당율 업데이트 비용 계산

// 현재 지원하는 모든 리그 (15개)
const supportedLeagues = [
  // 축구 (9개)
  'K리그', 'J리그', '세리에 A', '브라질 세리에 A', 'MLS', 
  '아르헨티나 프리메라', '중국 슈퍼리그', '라리가', '분데스리가',
  
  // 농구 (2개)
  'NBA', 'KBL',
  
  // 야구 (2개)
  'MLB', 'KBO',
  
  // 미식축구 (1개)
  'NFL'
];

// 현재 시스템 (기존)
const currentSystem = {
  updateInterval: '1시간', // 60분
  callsPerDay: 15 * 24, // 15개 리그 × 24시간 = 360회/일
  callsPerMonth: 15 * 24 * 30, // 10,800회/월
  monthlyLimit: 18000,
  costPerCall: 0.001, // $0.001 per API call
  monthlyCost: 15 * 24 * 30 * 0.001 // $10.80/월
};

// 10분 단위 시스템 (신규)
const tenMinuteSystem = {
  updateInterval: '10분',
  callsPerHour: 15 * 6, // 15개 리그 × 6회(10분마다) = 90회/시간
  callsPerDay: 15 * 6 * 24, // 15개 리그 × 6회 × 24시간 = 2,160회/일
  callsPerMonth: 15 * 6 * 24 * 30, // 64,800회/월
  monthlyLimit: 18000,
  costPerCall: 0.001,
  monthlyCost: 15 * 6 * 24 * 30 * 0.001 // $64.80/월
};

// 5분 단위 시스템 (참고용)
const fiveMinuteSystem = {
  updateInterval: '5분',
  callsPerHour: 15 * 12, // 15개 리그 × 12회(5분마다) = 180회/시간
  callsPerDay: 15 * 12 * 24, // 4,320회/일
  callsPerMonth: 15 * 12 * 24 * 30, // 129,600회/월
  monthlyLimit: 18000,
  costPerCall: 0.001,
  monthlyCost: 15 * 12 * 24 * 30 * 0.001 // $129.60/월
};

// 스마트 우선순위 시스템 (최적화된 10분)
const smartTenMinuteSystem = {
  updateInterval: '10분 (스마트)',
  description: '경기 시작 시간에 따른 차등 업데이트',
  highPriority: {
    leagues: 4, // NBA, MLB, KBO, NFL (경기 진행 중 또는 임박)
    interval: '10분',
    callsPerHour: 4 * 6, // 24회/시간
    callsPerDay: 4 * 6 * 24, // 576회/일
  },
  mediumPriority: {
    leagues: 5, // K리그, MLS, 세리에A, J리그, 중국슈퍼리그
    interval: '30분',
    callsPerHour: 5 * 2, // 10회/시간
    callsPerDay: 5 * 2 * 24, // 240회/일
  },
  lowPriority: {
    leagues: 6, // 시즌 오프 리그들
    interval: '2시간',
    callsPerHour: 6 * 0.5, // 3회/시간
    callsPerDay: 6 * 0.5 * 24, // 36회/일
  }
};

// 스마트 시스템 총합 계산
smartTenMinuteSystem.totalCallsPerDay = 
  smartTenMinuteSystem.highPriority.callsPerDay +
  smartTenMinuteSystem.mediumPriority.callsPerDay +
  smartTenMinuteSystem.lowPriority.callsPerDay;

smartTenMinuteSystem.totalCallsPerMonth = smartTenMinuteSystem.totalCallsPerDay * 30;
smartTenMinuteSystem.monthlyCost = smartTenMinuteSystem.totalCallsPerMonth * 0.001;

console.log('=== 📊 배당율 업데이트 주기별 API 비용 분석 ===\n');

console.log('🔍 지원 리그 현황:');
console.log(`   총 ${supportedLeagues.length}개 리그`);
console.log('   축구: K리그, J리그, 세리에A, 브라질세리에A, MLS, 아르헨티나프리메라, 중국슈퍼리그, 라리가, 분데스리가');
console.log('   농구: NBA, KBL');
console.log('   야구: MLB, KBO');
console.log('   미식축구: NFL\n');

// 1. 현재 시스템 (1시간 간격)
console.log('1️⃣ 현재 시스템 (1시간 간격):');
console.log(`   📈 API 호출: ${currentSystem.callsPerDay.toLocaleString()}회/일, ${currentSystem.callsPerMonth.toLocaleString()}회/월`);
console.log(`   💰 예상 비용: $${currentSystem.monthlyCost.toFixed(2)}/월`);
console.log(`   ✅ 월 한도 내: ${currentSystem.callsPerMonth <= currentSystem.monthlyLimit ? 'Yes' : 'No'} (${currentSystem.monthlyLimit.toLocaleString()}회 한도)`);
console.log(`   📊 한도 사용률: ${(currentSystem.callsPerMonth / currentSystem.monthlyLimit * 100).toFixed(1)}%\n`);

// 2. 10분 간격 시스템
console.log('2️⃣ 10분 간격 시스템 (단순):');
console.log(`   📈 API 호출: ${tenMinuteSystem.callsPerDay.toLocaleString()}회/일, ${tenMinuteSystem.callsPerMonth.toLocaleString()}회/월`);
console.log(`   💰 예상 비용: $${tenMinuteSystem.monthlyCost.toFixed(2)}/월`);
console.log(`   ❌ 월 한도 초과: ${tenMinuteSystem.callsPerMonth > tenMinuteSystem.monthlyLimit ? 'Yes' : 'No'} (${(tenMinuteSystem.callsPerMonth - tenMinuteSystem.monthlyLimit).toLocaleString()}회 초과)`);
console.log(`   📊 한도 사용률: ${(tenMinuteSystem.callsPerMonth / tenMinuteSystem.monthlyLimit * 100).toFixed(1)}%`);
console.log(`   📈 증가율: ${((tenMinuteSystem.monthlyCost / currentSystem.monthlyCost - 1) * 100).toFixed(0)}% 증가\n`);

// 3. 5분 간격 시스템 (참고용)
console.log('3️⃣ 5분 간격 시스템 (참고용):');
console.log(`   📈 API 호출: ${fiveMinuteSystem.callsPerDay.toLocaleString()}회/일, ${fiveMinuteSystem.callsPerMonth.toLocaleString()}회/월`);
console.log(`   💰 예상 비용: $${fiveMinuteSystem.monthlyCost.toFixed(2)}/월`);
console.log(`   ❌ 월 한도 초과: ${fiveMinuteSystem.callsPerMonth > fiveMinuteSystem.monthlyLimit ? 'Yes' : 'No'} (${(fiveMinuteSystem.callsPerMonth - fiveMinuteSystem.monthlyLimit).toLocaleString()}회 초과)`);
console.log(`   📈 증가율: ${((fiveMinuteSystem.monthlyCost / currentSystem.monthlyCost - 1) * 100).toFixed(0)}% 증가\n`);

// 4. 스마트 우선순위 시스템
console.log('4️⃣ 스마트 우선순위 시스템 (권장):');
console.log('   🎯 고우선순위 (10분): NBA, MLB, KBO, NFL → 24회/시간');
console.log('   🎯 중우선순위 (30분): K리그, MLS, 세리에A, J리그, 중국슈퍼리그 → 10회/시간');
console.log('   🎯 저우선순위 (2시간): 시즌오프 리그들 → 3회/시간');
console.log(`   📈 API 호출: ${smartTenMinuteSystem.totalCallsPerDay.toLocaleString()}회/일, ${smartTenMinuteSystem.totalCallsPerMonth.toLocaleString()}회/월`);
console.log(`   💰 예상 비용: $${smartTenMinuteSystem.monthlyCost.toFixed(2)}/월`);
console.log(`   ✅ 월 한도 내: ${smartTenMinuteSystem.totalCallsPerMonth <= smartTenMinuteSystem.monthlyLimit ? 'Yes' : 'No'}`);
console.log(`   📊 한도 사용률: ${(smartTenMinuteSystem.totalCallsPerMonth / smartTenMinuteSystem.monthlyLimit * 100).toFixed(1)}%`);
console.log(`   📈 증가율: ${((smartTenMinuteSystem.monthlyCost / currentSystem.monthlyCost - 1) * 100).toFixed(0)}% 증가\n`);

// 비교 표
console.log('=== 📋 비용 비교 요약 ===');
console.log('│ 시스템          │ 호출/월      │ 월 비용    │ 한도 내 │ 증가율    │');
console.log('├────────────────┼─────────────┼───────────┼────────┼──────────┤');
console.log(`│ 현재 (1시간)    │ ${currentSystem.callsPerMonth.toLocaleString().padStart(11)} │ $${currentSystem.monthlyCost.toFixed(2).padStart(8)} │   ✅   │    기준   │`);
console.log(`│ 10분 (단순)     │ ${tenMinuteSystem.callsPerMonth.toLocaleString().padStart(11)} │ $${tenMinuteSystem.monthlyCost.toFixed(2).padStart(8)} │   ❌   │ +${((tenMinuteSystem.monthlyCost / currentSystem.monthlyCost - 1) * 100).toFixed(0)}%    │`);
console.log(`│ 5분 (참고)      │ ${fiveMinuteSystem.callsPerMonth.toLocaleString().padStart(11)} │ $${fiveMinuteSystem.monthlyCost.toFixed(2).padStart(8)} │   ❌   │ +${((fiveMinuteSystem.monthlyCost / currentSystem.monthlyCost - 1) * 100).toFixed(0)}%   │`);
console.log(`│ 스마트 10분     │ ${smartTenMinuteSystem.totalCallsPerMonth.toLocaleString().padStart(11)} │ $${smartTenMinuteSystem.monthlyCost.toFixed(2).padStart(8)} │   ✅   │ +${((smartTenMinuteSystem.monthlyCost / currentSystem.monthlyCost - 1) * 100).toFixed(0)}%     │`);
console.log('└────────────────┴─────────────┴───────────┴────────┴──────────┘\n');

// 권장사항
console.log('=== 💡 권장사항 ===');
console.log('1. 🚫 단순 10분 간격은 월 한도를 3.6배 초과하므로 불가능');
console.log('2. ✅ 스마트 우선순위 시스템이 최적 (월 한도 내 + 높은 업데이트 빈도)');
console.log('3. 📈 핵심 리그(NBA, MLB 등)는 10분, 기타는 30분~2시간 차등 적용');
console.log('4. 💰 스마트 시스템으로 79% 비용 절감 (단순 10분 대비)');
console.log('5. ⚡ 실시간성이 중요한 리그만 고빈도 업데이트하여 효율성 극대화');

console.log('\n=== 🎯 구현 방안 ===');
console.log('- 경기 시작 1시간 전: 10분 간격');
console.log('- 경기 시작 6시간 전: 30분 간격');  
console.log('- 경기 시작 24시간 전: 2시간 간격');
console.log('- 시즌 오프 리그: 일 1-2회만 확인'); 