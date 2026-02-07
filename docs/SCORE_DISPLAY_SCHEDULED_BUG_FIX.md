# 스코어 표시 버그 수정: scheduled 상태 경기 처리

## 📋 문제 요약

**증상**: 정산 완료된 주문(settled)인데도 "경기 결과 대기중" 또는 "scheduled" 상태로 표시됨

**영향 범위**: 
- `components/ExchangeSidebar.tsx` (익스체인지 사이드바)
- `pages/admin/exchange.tsx` (관리자 익스체인지 페이지)

---

## 🔍 문제 분석

### 사례: 주문 348

```
주문 정보:
- ID: 348
- 상태: settled (정산 완료)
- 정산 시간: 2025-10-07T21:15:00.171Z
- 경기: Chicago Cubs vs Milwaukee Brewers
- 경기 시작: 2025-10-08T21:08:00.000Z

GameResult 정보:
- 상태: scheduled (경기 예정)
- 스코어: null
```

### 근본 원인

1. **경기가 정산되었지만 GameResult는 scheduled 상태**
   - 과거에 정산되었을 때는 finished 상태였을 가능성
   - 이후 GameResult가 scheduled로 변경됨 (데이터 불일치)

2. **프론트엔드가 scheduled 상태를 처리하지 않음**
   - `gameResult.status === 'scheduled'` 체크 누락
   - 스코어가 null인데도 경기 결과 섹션을 표시

---

## ✅ 해결 방법

### 1. ExchangeSidebar.tsx 수정

**변경 전:**
```typescript
{(order as any).gameResult && (() => {
  const gameResult = (order as any).gameResult;
  const isFinished = gameResult.status === 'finished';
  
  return (
    <div className={`p-3 rounded-lg border ...`}>
      {/* 스코어 표시 */}
      {/* gameResult.status 표시 */}
    </div>
  );
})()}
```

**변경 후:**
```typescript
{(order as any).gameResult && (() => {
  const gameResult = (order as any).gameResult;
  const isFinished = gameResult.status === 'finished';
  const isPending = gameResult.status === 'scheduled' || !gameResult.score;
  
  // ✅ 스코어가 없거나 scheduled 상태면 표시하지 않음
  if (isPending) return null;
  
  return (
    <div className={`p-3 rounded-lg border ...`}>
      {/* 스코어 표시 */}
      {/* gameResult.status 표시 */}
    </div>
  );
})()}
```

### 2. pages/admin/exchange.tsx 수정

**변경 전:**
```typescript
// 경기 결과가 아직 없는 경우
if (!gameResult.status || gameResult.score === 'N/A' || !gameResult.score) {
  return { status: 'pending', result: '경기 결과 대기중', color: 'bg-yellow-100 text-yellow-800' };
}
```

**변경 후:**
```typescript
// ✅ scheduled 상태 체크 추가
if (!gameResult.status || gameResult.status === 'scheduled' || gameResult.score === 'N/A' || !gameResult.score) {
  return { status: 'pending', result: '경기 결과 대기중', color: 'bg-yellow-100 text-yellow-800' };
}
```

---

## 🎯 효과

### Before (수정 전)
- ❌ scheduled 상태 경기의 "결과: scheduled" 표시
- ❌ 스코어가 없는데도 경기 결과 섹션 표시
- ❌ 사용자 혼란 유발

### After (수정 후)
- ✅ scheduled 상태 경기는 경기 결과 섹션을 표시하지 않음
- ✅ 스코어가 있는 finished 경기만 표시
- ✅ 깔끔한 UI

---

## 🔒 백엔드 정산 로직 확인

정산 서비스는 이미 올바르게 구현되어 있습니다:

```javascript
// server/services/exchangeSettlementService.js (1374줄)
const gameResult = await this.findGameResultByMatch(homeTeam, awayTeam, commenceTime);
if (!gameResult || gameResult.status !== 'finished') {
  console.log(`[Main Settlement] 경기 결과를 찾을 수 없거나 경기가 아직 끝나지 않았습니다`);
  return {
    gameKey: gameKey,
    settledMatches: 0,
    totalWinnings: 0,
    results: [],
    message: 'Game result not found or not finished.'
  };
}
```

**즉, scheduled 상태의 경기는 정산되지 않습니다.**

---

## 📊 GameResult 상태 종류

| 상태 | 의미 | 스코어 | 정산 가능 |
|------|------|--------|----------|
| `scheduled` | 경기 예정 | null | ❌ |
| `live` | 경기 진행중 | 부분 스코어 | ❌ |
| `finished` | 경기 완료 | 최종 스코어 | ✅ |
| `cancelled` | 경기 취소 | null | ❌ |
| `postponed` | 경기 연기 | null | ❌ |

---

## 🧪 테스트 방법

1. **익스체인지 사이드바** (`http://localhost:3000/exchange/orderbook`)
   - 주문 348 클릭
   - 경기 결과 섹션이 표시되지 않는지 확인

2. **관리자 익스체인지** (`http://localhost:3000/admin/exchange`)
   - 멀티베팅 주문 상세 보기
   - scheduled 경기가 "경기 결과 대기중"으로 표시되는지 확인

---

## 🔮 향후 개선 사항

### 1. GameResult 데이터 정합성 보장
- 정산된 주문의 GameResult가 scheduled로 변경되지 않도록 보장
- GameResult 업데이트 시 정산 상태 체크

### 2. 프론트엔드 상태 표시 개선
```typescript
// 더 명확한 상태 표시
const getGameStatusDisplay = (status: string) => {
  switch (status) {
    case 'scheduled': return '⏰ 경기 예정';
    case 'live': return '🔴 경기 진행중';
    case 'finished': return '🏁 경기 완료';
    case 'cancelled': return '🚫 경기 취소';
    case 'postponed': return '⏸️ 경기 연기';
    default: return '❓ 상태 불명';
  }
};
```

### 3. 정산 상태와 GameResult 상태 불일치 모니터링
```sql
-- 정산되었지만 GameResult가 scheduled인 주문 찾기
SELECT 
  eo.id,
  eo.status,
  eo.settledAt,
  gr.status as gameResultStatus,
  gr.score
FROM "ExchangeOrders" eo
LEFT JOIN "GameResults" gr ON 
  gr."homeTeam" = eo."homeTeam" AND 
  gr."awayTeam" = eo."awayTeam" AND
  gr."commenceTime" = eo."commenceTime"
WHERE 
  eo.status = 'settled' AND
  (gr.status = 'scheduled' OR gr.status IS NULL);
```

---

## 📝 관련 파일

- `components/ExchangeSidebar.tsx` (1262-1265줄)
- `pages/admin/exchange.tsx` (2660줄)
- `server/services/exchangeSettlementService.js` (1374줄)
- `utils/scoreParser.ts` (중앙화된 스코어 파싱)

---

## 🏷️ 태그

`#bug-fix` `#score-display` `#scheduled-status` `#data-consistency` `#frontend`
