# 정산 버그 분석 요청 (Gemini용)

## 🚨 발견된 버그

**베팅 ID**: `c27e2ed2-b2f4-4cbd-af93-2932467dea4b`

### 증상
경기 결과가 없는데도 상금이 지급됨

### 로그 증거
```
[적중 지급] 베팅 c27e2ed2-b2f4-4cbd-af93-2932467dea4b: 총 46720원 → 수수료 1836원 차감 → 실제 지급 44884원
```

하지만 이 베팅의 멀티베팅 정보를 보면, 모든 선택이 pending 상태임.

---

## 핵심 의심 코드 1: determineBetStatus() - 빈 배열 버그

**파일**: `server/services/betResultService.js:391-427`

```javascript
determineBetStatus(hasPending, hasWon, hasLost, hasCancelled, selections) {
  // 모든 selection이 취소된 경우
  if (hasCancelled && !hasWon && !hasLost && !hasPending) {
    return 'cancelled';
  }

  // pending이 있으면 대기
  if (hasPending) {
    return 'pending';
  }

  // 멀티베팅: 하나라도 실패하면 전체 실패
  const hasAnyFailure = selections.some(s => s.result === 'lost' || s.result === 'draw');
  
  if (hasAnyFailure) {
    return 'lost';
  }

  // 🚨 문제 의심 구간!
  const allNonCancelledSelections = selections.filter(s => s.result !== 'cancelled');
  const allWonSelections = allNonCancelledSelections.filter(s => s.result === 'won');
  
  // 만약 모든 selection이 cancelled면:
  // - allNonCancelledSelections = []
  // - allWonSelections = []
  // - allWonSelections.length === allNonCancelledSelections.length → 0 === 0 → true!
  // 하지만 allNonCancelledSelections.length > 0 조건이 있어서 방지되어야 함...
  
  if (allNonCancelledSelections.length > 0 && allWonSelections.length === allNonCancelledSelections.length) {
    return 'won';  // ⚠️ 여기서 won 반환?
  }

  // 모든 selection이 취소된 경우
  if (selections.every(s => s.result === 'cancelled')) {
    return 'cancelled';
  }

  return 'pending';
}
```

**의심 시나리오**:
- `hasPending = true`여야 하는데 `false`로 잘못 전달됨?
- 또는 `allWonSelections.length === allNonCancelledSelections.length` 비교 로직 오류?

---

## 핵심 의심 코드 2: processBetResult() - gameResult 없을 때 처리

**파일**: `server/services/betResultService.js:310-324`

```javascript
// 🔍 스코어 검증
if (!gameResult || !gameResult.score || !Array.isArray(gameResult.score) || gameResult.score.length === 0) {
  // 경기 시간이 지났고 스코어가 없으면 cancelled로 처리
  const gameTime = new Date(selection.commence_time + 'Z');
  const now = new Date();
  const hoursSinceGame = (now - gameTime) / (1000 * 60 * 60);

  if (hoursSinceGame > 2) {
    selection.result = 'cancelled';  // 2시간 이상 지나면 cancelled
    hasCancelled = true;
  } else {
    selection.result = 'pending';    // 2시간 이내면 pending
    hasPending = true;
  }
  continue;  // ⚠️ 루프 다음으로 진행
}
```

**의심 시나리오**:
- `hoursSinceGame` 계산 오류로 경기 시작 전인데 2시간 이상으로 판단?
- `selection.commence_time + 'Z'` 시간 파싱 오류?

---

## 핵심 의심 코드 3: calculateAdjustedWinnings() - 취소 시 배당 계산

**파일**: `server/services/betResultService.js:576-595`

```javascript
calculateAdjustedWinnings(bet) {
  const selections = bet.selections;
  let adjustedOdds = 1.0;
  
  for (const selection of selections) {
    if (selection.result === 'won') {
      adjustedOdds *= selection.odds || 1.0;
    } else if (selection.result === 'cancelled') {
      adjustedOdds *= 1.0;  // 취소는 배당률 1.0 (무효)
    }
    // ⚠️ pending, lost는 여기서 처리 안 함!
  }
  
  // 🚨 만약 모든 selection이 pending이면?
  // adjustedOdds = 1.0 * 1.0 * 1.0 = 1.0
  // adjustedWinnings = stake * 1.0 = stake (원금만 반환)
  
  const adjustedWinnings = Number(bet.stake) * adjustedOdds;
  return Math.min(adjustedWinnings, Number(bet.potentialWinnings));
}
```

**의심 시나리오**:
- 모든 selection이 `pending`이어도 `adjustedOdds = 1.0`이 되어 원금만 계산됨
- 하지만 왜 46720원이 지급되었나? (원금보다 훨씬 큼)
- 이전에 `won`으로 잘못 설정된 데이터가 재처리된 것인가?

---

## Gemini에게 분석 요청할 질문

### 질문 1: determineBetStatus() 로직 버그
```
입력:
- hasPending = false (잘못된 값)
- hasWon = false
- hasLost = false
- hasCancelled = true
- selections = [{result: 'cancelled'}, {result: 'cancelled'}, {result: 'cancelled'}]

이 경우 함수가 'won'을 반환할 수 있는가?
```

### 질문 2: hoursSinceGame 계산 오류
```
selection.commence_time = "2025-10-03T05:00:00.000Z"
현재 시간 = 2025-10-02T16:45:31.187Z

hoursSinceGame = (현재 - 경기시간) / (1000 * 60 * 60)
             = (2025-10-02 - 2025-10-03) / 3600000
             = 음수!

음수면 경기가 아직 시작하지 않았는데, if (hoursSinceGame > 2)가 true일 수 있는가?
```

### 질문 3: 데이터 일관성 문제
```
베팅 c27e2ed2... 가 이전에 won으로 설정되어 지급되었고,
나중에 pending으로 재처리되었을 가능성은?

processBetResult() 시작 부분:
if (bet.status === 'won' || bet.status === 'lost' || bet.status === 'cancelled') {
  return true;  // 이미 완료된 베팅은 건너뛰기
}

만약 베팅이 이미 won 상태면 재처리하지 않음.
```

---

## 필요한 추가 정보

1. **베팅 `c27e2ed2-...`의 현재 DB 상태**
```sql
SELECT id, status, stake, "potentialWinnings", selections, "createdAt", "updatedAt"
FROM "Bets"
WHERE id = 'c27e2ed2-b2f4-4cbd-af93-2932467dea4b';
```

2. **해당 베팅의 결제 내역**
```sql
SELECT *
FROM "PaymentHistory"
WHERE "betId" = 'c27e2ed2-b2f4-4cbd-af93-2932467dea4b'
ORDER BY "createdAt" DESC;
```

3. **로그에서 해당 베팅의 전체 처리 과정**
```bash
grep "c27e2ed2-b2f4-4cbd-af93-2932467dea4b" server/logs/server.log
```

---

## 제안: 즉시 확인할 핵심 코드 부분

### 1. betResultService.js의 processBetResult() 함수 (99-387줄)
- 특히 310-324줄: gameResult 없을 때 처리
- 특히 354-387줄: betStatus 결정 및 상금 지급

### 2. betResultService.js의 determineBetStatus() 함수 (391-427줄)
- 논리적 허점 확인

### 3. betResultService.js의 processBetWinnings() 함수 (430-534줄)
- 중복 지급 방지 로직 확인

총 약 300줄 정도만 분석하면 됩니다.

