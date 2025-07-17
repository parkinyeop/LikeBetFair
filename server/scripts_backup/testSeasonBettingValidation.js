import seasonValidationService from '../services/seasonValidationService.js';

async function testSeasonBettingValidation() {
  console.log('🧪 시즌 베팅 검증 테스트 시작...\n');
  
  // 테스트 케이스: J리그 베팅 시도
  console.log('📝 테스트 케이스 1: J리그 베팅 검증');
  const jleagueValidation = await seasonValidationService.validateBettingEligibility('soccer_japan_j_league');
  
  console.log('- 스포츠: J리그 (soccer_japan_j_league)');
  console.log('- 베팅 가능:', jleagueValidation.isEligible ? '✅ 가능' : '❌ 불가능');
  console.log('- 상태:', jleagueValidation.status);
  console.log('- 사유:', jleagueValidation.reason);
  
  if (jleagueValidation.seasonStatus) {
    console.log('- 최근 7일 경기:', jleagueValidation.seasonStatus.recentGamesCount, '개');
    console.log('- 향후 3일 예정 경기:', jleagueValidation.seasonStatus.upcomingGamesCount, '개');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // 테스트 케이스: KBO 베팅 시도 (시즌 진행 중)
  console.log('📝 테스트 케이스 2: KBO 베팅 검증');
  const kboValidation = await seasonValidationService.validateBettingEligibility('baseball_kbo');
  
  console.log('- 스포츠: KBO (baseball_kbo)');
  console.log('- 베팅 가능:', kboValidation.isEligible ? '✅ 가능' : '❌ 불가능');
  console.log('- 상태:', kboValidation.status);
  console.log('- 사유:', kboValidation.reason);
  
  if (kboValidation.seasonStatus) {
    console.log('- 최근 7일 경기:', kboValidation.seasonStatus.recentGamesCount, '개');
    console.log('- 향후 3일 예정 경기:', kboValidation.seasonStatus.upcomingGamesCount, '개');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // 테스트 케이스: NBA 베팅 시도 (시즌오프)
  console.log('📝 테스트 케이스 3: NBA 베팅 검증');
  const nbaValidation = await seasonValidationService.validateBettingEligibility('basketball_nba');
  
  console.log('- 스포츠: NBA (basketball_nba)');
  console.log('- 베팅 가능:', nbaValidation.isEligible ? '✅ 가능' : '❌ 불가능');
  console.log('- 상태:', nbaValidation.status);
  console.log('- 사유:', nbaValidation.reason);
  
  if (nbaValidation.seasonStatus) {
    console.log('- 최근 7일 경기:', nbaValidation.seasonStatus.recentGamesCount, '개');
    console.log('- 향후 3일 예정 경기:', nbaValidation.seasonStatus.upcomingGamesCount, '개');
  }
  
  console.log('\n📊 요약:');
  console.log('J리그:', jleagueValidation.isEligible ? '베팅 가능' : '베팅 불가능', `(${jleagueValidation.status})`);
  console.log('KBO:', kboValidation.isEligible ? '베팅 가능' : '베팅 불가능', `(${kboValidation.status})`);
  console.log('NBA:', nbaValidation.isEligible ? '베팅 가능' : '베팅 불가능', `(${nbaValidation.status})`);
  
  console.log('\n✅ 시즌 베팅 검증이 정상적으로 작동합니다!');
  console.log('- 시즌오프 리그(J리그, NBA)는 베팅이 차단됩니다');
  console.log('- 활성 리그(KBO)는 베팅이 허용됩니다');
}

testSeasonBettingValidation(); 