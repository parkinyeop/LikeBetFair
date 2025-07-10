import axios from 'axios';

(async () => {
  try {
    console.log('=== The Odds API vs TheSportsDB API 분석 ===\n');
    
    // 1. The Odds API 분석
    console.log('🔍 The Odds API 분석:');
    console.log('');
    console.log('📊 **용도**:');
    console.log('   - 주로 배당률(odds) 제공에 특화');
    console.log('   - 실시간 배당률, 스프레드, 토탈 등');
    console.log('   - 게임 결과는 부차적 기능');
    console.log('');
    console.log('💰 **비용**:');
    console.log('   - 유료 API (월 구독료)');
    console.log('   - API 호출 제한 있음');
    console.log('   - 무료 티어: 월 500회 호출');
    console.log('');
    console.log('📋 **게임 결과 데이터 구조**:');
    console.log('   - 형식: ["score1", "score2"] (문자열 배열)');
    console.log('   - 예시: ["5", "3"]');
    console.log('   - 팀명 정보 없음');
    console.log('   - 단순한 점수만 제공');
    console.log('');
    console.log('⚠️ **게임 결과의 한계**:');
    console.log('   - 완료된 경기만 결과 제공');
    console.log('   - 실시간 업데이트 지연');
    console.log('   - 일부 리그는 결과 미제공');
    console.log('   - 상세한 경기 정보 부족');
    console.log('');
    
    // 2. TheSportsDB API 분석
    console.log('🔍 TheSportsDB API 분석:');
    console.log('');
    console.log('📊 **용도**:');
    console.log('   - 게임 결과 및 경기 정보에 특화');
    console.log('   - 상세한 경기 데이터 제공');
    console.log('   - 팀 정보, 선수 정보 등');
    console.log('');
    console.log('💰 **비용**:');
    console.log('   - 무료 API');
    console.log('   - API 호출 제한 없음');
    console.log('   - 광고 수익으로 운영');
    console.log('');
    console.log('📋 **게임 결과 데이터 구조**:');
    console.log('   - 형식: {intHomeScore, intAwayScore, strHomeTeam, strAwayTeam}');
    console.log('   - 예시: {intHomeScore: 5, intAwayScore: 3, strHomeTeam: "Yankees", strAwayTeam: "Red Sox"}');
    console.log('   - 팀명과 점수 모두 제공');
    console.log('   - 상세한 경기 정보');
    console.log('');
    console.log('✅ **게임 결과의 장점**:');
    console.log('   - 실시간 결과 업데이트');
    console.log('   - 모든 주요 리그 지원');
    console.log('   - 경기 상태 상세 정보');
    console.log('   - 팀명 정확성 높음');
    console.log('');
    
    // 3. 실제 API 응답 비교
    console.log('🔍 실제 API 응답 비교:');
    console.log('');
    
    // The Odds API 응답 예시
    console.log('📡 The Odds API 응답 예시:');
    console.log('   {');
    console.log('     "id": "123456",');
    console.log('     "sport_key": "baseball_mlb",');
    console.log('     "home_team": "New York Yankees",');
    console.log('     "away_team": "Boston Red Sox",');
    console.log('     "commence_time": "2025-07-10T19:00:00Z",');
    console.log('     "completed": true,');
    console.log('     "scores": ["5", "3"],  ← 단순 배열');
    console.log('     "last_update": "2025-07-10T22:30:00Z"');
    console.log('   }');
    console.log('');
    
    // TheSportsDB API 응답 예시
    console.log('📡 TheSportsDB API 응답 예시:');
    console.log('   {');
    console.log('     "idEvent": "123456",');
    console.log('     "strEvent": "New York Yankees vs Boston Red Sox",');
    console.log('     "strHomeTeam": "New York Yankees",');
    console.log('     "strAwayTeam": "Boston Red Sox",');
    console.log('     "dateEvent": "2025-07-10",');
    console.log('     "strTime": "19:00:00",');
    console.log('     "strStatus": "Match Finished",');
    console.log('     "intHomeScore": "5",');
    console.log('     "intAwayScore": "3",');
    console.log('     "strLeague": "MLB",');
    console.log('     "strSeason": "2025"');
    console.log('   }');
    console.log('');
    
    // 4. 왜 TheSportsDB API를 사용하는가?
    console.log('🎯 왜 TheSportsDB API를 사용하는가?');
    console.log('');
    console.log('1. **게임 결과에 특화**:');
    console.log('   - The Odds API는 배당률에 특화, 게임 결과는 부차적');
    console.log('   - TheSportsDB API는 게임 결과에 특화');
    console.log('');
    console.log('2. **비용 효율성**:');
    console.log('   - The Odds API: 유료 (월 구독료)');
    console.log('   - TheSportsDB API: 무료');
    console.log('');
    console.log('3. **데이터 품질**:');
    console.log('   - The Odds API: ["5", "3"] (팀명 정보 없음)');
    console.log('   - TheSportsDB API: {team: "Yankees", score: "5"} (팀명 포함)');
    console.log('');
    console.log('4. **업데이트 빈도**:');
    console.log('   - The Odds API: 배당률 업데이트에 집중');
    console.log('   - TheSportsDB API: 게임 결과 실시간 업데이트');
    console.log('');
    console.log('5. **리그 커버리지**:');
    console.log('   - The Odds API: 주요 리그만');
    console.log('   - TheSportsDB API: 더 많은 리그 지원');
    console.log('');
    
    // 5. 현재 시스템의 Fallback 구조
    console.log('🔄 현재 시스템의 Fallback 구조:');
    console.log('');
    console.log('1차 시도: TheSportsDB API (게임 결과 전용)');
    console.log('   ↓ 실패 시');
    console.log('2차 시도: The Odds API (배당률 API, 게임 결과 제한적)');
    console.log('   ↓ 실패 시');
    console.log('3차 시도: 로컬 스케줄 기반 추정');
    console.log('');
    
    // 6. 권장사항
    console.log('💡 권장사항:');
    console.log('');
    console.log('✅ **게임 결과용**: TheSportsDB API');
    console.log('   - 무료, 실시간, 상세 정보');
    console.log('   - 게임 결과에 특화');
    console.log('');
    console.log('✅ **배당률용**: The Odds API');
    console.log('   - 실시간 배당률');
    console.log('   - 다양한 베팅 마켓');
    console.log('');
    console.log('🔄 **Fallback 시스템 유지**:');
    console.log('   - TheSportsDB API 실패 시 The Odds API 사용');
    console.log('   - 안정성과 정확성 보장');
    
  } catch (error) {
    console.error('분석 중 오류:', error);
  }
})(); 