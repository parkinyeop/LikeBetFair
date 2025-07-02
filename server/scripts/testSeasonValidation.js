import seasonValidationService from '../services/seasonValidationService.js';

async function testSeasonValidation() {
  console.log('🔍 시즌 검증 서비스 테스트 시작...\n');
  
  try {
    // 전체 리그 베팅 가능 상태 체크
    const allLeaguesStatus = await seasonValidationService.checkAllLeaguesBettingStatus();
    
    console.log('📊 전체 리그 베팅 가능 상태:\n');
    
    const statusEmojis = {
      'active': '🟢',
      'break': '🟡',
      'offseason': '🔴',
      'preseason': '🟠',
      'error': '❌',
      'unknown': '❓'
    };
    
    // 베팅 가능한 리그와 불가능한 리그 분류
    const eligibleLeagues = [];
    const ineligibleLeagues = [];
    
    Object.entries(allLeaguesStatus).forEach(([sportKey, validation]) => {
      const emoji = statusEmojis[validation.status] || '❓';
      const statusText = validation.isEligible ? '✅ 베팅 가능' : '❌ 베팅 불가';
      
      const leagueInfo = {
        sportKey,
        emoji,
        statusText,
        status: validation.status,
        reason: validation.reason,
        recentGames: validation.seasonStatus?.recentGamesCount || 0,
        upcomingGames: validation.seasonStatus?.upcomingGamesCount || 0
      };
      
      if (validation.isEligible) {
        eligibleLeagues.push(leagueInfo);
      } else {
        ineligibleLeagues.push(leagueInfo);
      }
    });
    
    // 베팅 가능한 리그 출력
    if (eligibleLeagues.length > 0) {
      console.log('✅ 베팅 가능한 리그:');
      eligibleLeagues.forEach(league => {
        console.log(`   ${league.emoji} ${league.sportKey}`);
        console.log(`      상태: ${league.status} | ${league.statusText}`);
        console.log(`      사유: ${league.reason}`);
        console.log(`      최근 경기: ${league.recentGames}개 | 예정 경기: ${league.upcomingGames}개\n`);
      });
    }
    
    // 베팅 불가능한 리그 출력
    if (ineligibleLeagues.length > 0) {
      console.log('❌ 베팅 불가능한 리그:');
      ineligibleLeagues.forEach(league => {
        console.log(`   ${league.emoji} ${league.sportKey}`);
        console.log(`      상태: ${league.status} | ${league.statusText}`);
        console.log(`      사유: ${league.reason}`);
        console.log(`      최근 경기: ${league.recentGames}개 | 예정 경기: ${league.upcomingGames}개\n`);
      });
    }
    
    // 요약
    console.log('📈 요약:');
    console.log(`- 총 리그 수: ${Object.keys(allLeaguesStatus).length}개`);
    console.log(`- 베팅 가능: ${eligibleLeagues.length}개`);
    console.log(`- 베팅 불가: ${ineligibleLeagues.length}개`);
    
    // 특별히 J리그 상태 확인
    console.log('\n🔍 J리그 상세 분석:');
    const jleagueValidation = await seasonValidationService.validateBettingEligibility('soccer_japan_j_league');
    console.log('J리그 베팅 가능 여부:', jleagueValidation.isEligible ? '✅ 가능' : '❌ 불가능');
    console.log('상태:', jleagueValidation.status);
    console.log('사유:', jleagueValidation.reason);
    if (jleagueValidation.seasonStatus) {
      console.log('최근 7일 경기:', jleagueValidation.seasonStatus.recentGamesCount, '개');
      console.log('향후 3일 예정 경기:', jleagueValidation.seasonStatus.upcomingGamesCount, '개');
    }
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

testSeasonValidation(); 