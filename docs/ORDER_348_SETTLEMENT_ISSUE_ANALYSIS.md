# Order 348 정산 문제 코드 단위 분석 보고서

## 📋 문제 개요

**Order 348**은 멀티배팅 Lay 주문으로, 상대방 Order 344가 정산되었음에도 불구하고 자신은 정산되지 않은 고아 주문 상태입니다.

### 🔍 핵심 문제점
1. **정산 스케줄러**: "Atletico Mineiro vs Sport Recife" 경기 결과 없음으로 정산 실패
2. **프론트엔드 표시**: 모든 경기가 패배로 표시 (잘못된 표시)
3. **데이터 불일치**: 백엔드 로그와 프론트엔드 표시가 상반됨

---

## 🔬 코드 단위 분석

### 1. 고아 주문 탐지 로직 (✅ 정상 작동)

**파일**: `server/services/exchangeSettlementService.js:2767`

```javascript
async settleOrphanedOrders() {
  // ✅ 'matched' 상태 추가: 트랜잭션 부분 실패로 인한 고아 주문 탐지
  const activeOrders = await ExchangeOrder.findAll({
    where: {
      status: { [Op.in]: ['active', 'partially_matched', 'matched'] }, // ✅ 'matched' 추가
      matchedOrderId: { [Op.ne]: null },
      settledAt: null
    }
  });
}
```

**분석**: Order 348은 `status='matched'`이므로 고아 주문 탐지 조건에 포함됩니다.

### 2. 멀티배팅 정산 로직 (❌ 문제 발생)

**파일**: `server/services/multibetSettlementService.js:27`

```javascript
async settleMultibetOrder(order) {
  // 2단계: 모든 경기 결과 수집
  const gameResults = await this.collectAllGameResults(order.selectionDetails.selections);
  
  // 3단계: 멀티배팅 승패 판정
  const settlementResult = this.determineMultibetResult(gameResults);
}
```

**문제점**: `collectAllGameResults`에서 경기 결과를 찾지 못하면 `pending` 상태로 처리됩니다.

### 3. 경기 결과 수집 로직 (❌ 핵심 문제)

**파일**: `server/services/multibetSettlementService.js:156`

```javascript
async collectAllGameResults(selections) {
  for (const [index, selection] of selections.entries()) {
    try {
      const gameResult = await this.findGameResult(selection);
      
      gameResults.push({
        selection,
        // ✅ Null 방어: gameResult가 null이면 pending 상태 객체로 대체
        gameResult: gameResult || { result: 'pending', status: 'scheduled' },
        index: index + 1
      });
      
      if (!gameResult) {
        console.log(`❌ 경기 ${index + 1}/${selections.length}: ${selection.homeTeam} vs ${selection.awayTeam} - 결과 없음 (pending 처리)`);
      }
    }
  }
}
```

**문제점**: `findGameResult`가 null을 반환하면 해당 경기는 `pending`으로 처리되어 전체 멀티배팅이 정산되지 않습니다.

### 4. 개별 경기 결과 찾기 로직 (❌ 핵심 문제)

**파일**: `server/services/multibetSettlementService.js:195`

```javascript
async findGameResult(selection) {
  const { homeTeam, awayTeam, commenceTime } = selection;
  
  // 🚀 중앙화된 경기 결과 조회 사용
  const config = getLocationConfig('multibetSettlement');
  
  if (config.FEATURE_FLAGS?.USE_CENTRALIZED_QUERY) {
    gameResult = await GameResultQuery.findByTeamsAndTime(
      homeTeam,
      awayTeam,
      commenceTime,
      'multibetSettlement'
    );
  } else {
    // 레거시 로직
    gameResult = await GameResult.findOne({
      where: {
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        commenceTime: commenceTime,
        status: 'finished'
      }
    });
  }
}
```

**문제점**: 
1. **팀명 불일치**: "Atletico Mineiro vs Sport Recife" vs "Atlético Mineiro vs Sport Club do Recife"
2. **시간 불일치**: 정확한 시간 매칭 실패
3. **Feature Flag**: 중앙화된 쿼리 사용 시 다른 로직으로 경기 결과를 찾지 못할 수 있음

### 5. 승패 판정 로직 (❌ 문제 발생)

**파일**: `server/services/multibetSettlementService.js:401`

```javascript
determineMultibetResult(gameResults) {
  // ✅ [Phase 2] 각 선택의 최종 결과 추출
  const results = gameResults.map(gr => gr.gameResult?.result || 'pending');
  
  console.log(`[Multibet] 📊 경기별 결과 집계: ${results.join(', ')}`);
  
  // ⏳ pending 경기가 하나라도 있으면 정산하지 않음
  if (results.includes('pending')) {
    console.log(`[Multibet] ⏳ pending 경기가 포함되어 있어 정산을 대기합니다.`);
    return { finalResult: 'pending' };
  }
}
```

**문제점**: 하나의 경기라도 `pending`이면 전체 멀티배팅이 정산되지 않습니다.

---

## 🚨 근본 원인 분석

### 1. 팀명 정규화 문제
- **주문 데이터**: "Atletico Mineiro vs Sport Recife"
- **실제 데이터**: "Atlético Mineiro vs Sport Club do Recife"
- **문제**: 특수문자(é)와 팀명 축약 형태 불일치

### 2. 시간 매칭 문제
- **주문 시간**: `2025-10-08T22:00:00.000Z`
- **실제 경기 시간**: `2025-10-09T07:00:00+09` (UTC로 변환 시 `2025-10-08T22:00:00.000Z`)
- **문제**: 시간대 변환 또는 정확한 시간 매칭 실패

### 3. Feature Flag 의존성
- **중앙화된 쿼리**: `GameResultQuery.findByTeamsAndTime` 사용
- **레거시 쿼리**: `GameResult.findOne` 사용
- **문제**: Feature Flag 설정에 따라 다른 로직이 실행되어 일관성 부족

---

## 🔧 제미나이와 상의할 해결 방안

### 1. 팀명 매칭 개선
```javascript
// 현재: 정확한 팀명 매칭
homeTeam: homeTeam,
awayTeam: awayTeam,

// 제안: 유사도 기반 매칭
homeTeam: { [Op.iLike]: `%${normalizeTeamName(homeTeam)}%` },
awayTeam: { [Op.iLike]: `%${normalizeTeamName(awayTeam)}%` },
```

### 2. 시간 범위 확장
```javascript
// 현재: 정확한 시간 매칭
commenceTime: commenceTime,

// 제안: 시간 범위 매칭
commenceTime: {
  [Op.between]: [
    new Date(commenceTime.getTime() - 30 * 60 * 1000), // 30분 전
    new Date(commenceTime.getTime() + 30 * 60 * 1000)  // 30분 후
  ]
}
```

### 3. Feature Flag 통합
```javascript
// 제안: Feature Flag와 무관하게 일관된 로직 사용
async findGameResult(selection) {
  // 1단계: 정확한 매칭 시도
  let gameResult = await this.exactMatch(selection);
  
  // 2단계: 유사도 기반 매칭 시도
  if (!gameResult) {
    gameResult = await this.fuzzyMatch(selection);
  }
  
  return gameResult;
}
```

### 4. 멀티배팅 정산 로직 개선
```javascript
// 제안: 부분 정산 허용 옵션
determineMultibetResult(gameResults, allowPartialSettlement = false) {
  const results = gameResults.map(gr => gr.gameResult?.result || 'pending');
  
  if (allowPartialSettlement) {
    // 완료된 경기만으로 정산 진행
    const completedResults = results.filter(r => r !== 'pending');
    if (completedResults.length > 0) {
      return { finalResult: 'partial', completedResults };
    }
  }
  
  // 기존 로직: 모든 경기 완료 필요
  if (results.includes('pending')) {
    return { finalResult: 'pending' };
  }
}
```

---

## 📊 테스트 시나리오

### 1. 팀명 매칭 테스트
```javascript
// 테스트 케이스
const testCases = [
  { input: "Atletico Mineiro", expected: "Atlético Mineiro" },
  { input: "Sport Recife", expected: "Sport Club do Recife" },
  { input: "Chicago Cubs", expected: "Chicago Cubs" }
];
```

### 2. 시간 매칭 테스트
```javascript
// 테스트 케이스
const timeTestCases = [
  { 
    orderTime: "2025-10-08T22:00:00.000Z",
    gameTime: "2025-10-09T07:00:00+09",
    expected: true // 매칭되어야 함
  }
];
```

### 3. 멀티배팅 정산 테스트
```javascript
// 테스트 케이스
const multibetTestCases = [
  {
    selections: [
      { result: 'won' },
      { result: 'won' },
      { result: 'pending' }, // 하나만 pending
      { result: 'won' },
      { result: 'won' }
    ],
    expected: 'pending' // 전체 정산 안됨
  }
];
```

---

## 🎯 우선순위 권장사항

### 높은 우선순위 (즉시 수정)
1. **팀명 정규화 함수 개선**: 특수문자 및 축약 형태 처리
2. **시간 범위 매칭**: ±30분 범위로 확장
3. **Feature Flag 통합**: 일관된 로직 사용

### 중간 우선순위 (단기 수정)
1. **멀티배팅 부분 정산**: 완료된 경기만으로 정산 옵션
2. **로깅 개선**: 매칭 실패 시 상세 정보 출력
3. **에러 핸들링**: 정산 실패 시 복구 로직

### 낮은 우선순위 (장기 개선)
1. **성능 최적화**: 경기 결과 조회 쿼리 최적화
2. **모니터링**: 정산 실패 알림 시스템
3. **자동 복구**: 정산 실패 시 자동 재시도 로직

---

## 📝 결론

Order 348 정산 문제는 **팀명 매칭 실패**가 근본 원인입니다. 제미나이와 상의하여 팀명 정규화 로직을 개선하고, 시간 매칭 범위를 확장하는 것이 가장 효과적인 해결책입니다.

**핵심 수정 포인트**:
1. `multibetSettlementService.js:195` - `findGameResult` 함수
2. `multibetSettlementService.js:156` - `collectAllGameResults` 함수  
3. `multibetSettlementService.js:401` - `determineMultibetResult` 함수

이 수정을 통해 Order 348 및 유사한 멀티배팅 주문들의 정산 문제를 해결할 수 있습니다.

