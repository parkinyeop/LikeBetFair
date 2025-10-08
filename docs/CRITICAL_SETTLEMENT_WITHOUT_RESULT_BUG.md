# 🚨 치명적 버그: 경기 결과 없이 정산 완료

## 📋 버그 요약

**심각도**: 🔴 CRITICAL (최고 심각도)

**증상**: 경기 결과가 없는데도 정산이 완료되어 사용자에게 상금이 지급됨

**영향**: 
- 잘못된 정산으로 인한 금전적 손실
- 데이터 무결성 파괴
- 사용자 신뢰도 하락

---

## 🔍 버그 사례: 주문 348

### 데이터베이스 실제 상태

```
주문 정보 (ExchangeOrders):
┌──────────────────┬─────────────────────────────────┐
│ 필드             │ 값                               │
├──────────────────┼─────────────────────────────────┤
│ ID               │ 348                              │
│ 상태             │ settled (정산 완료) ⚠️           │
│ 정산 시간        │ 2025-10-07T21:15:00.171Z         │
│ 홈팀             │ Chicago Cubs                     │
│ 어웨이팀         │ Milwaukee Brewers                │
│ 경기 시작        │ 2025-10-08T21:08:00.000Z         │
│ 배당             │ (데이터 필요)                    │
│ 베팅 금액        │ (데이터 필요)                    │
└──────────────────┴─────────────────────────────────┘

경기 결과 (GameResults):
┌──────────────────┬─────────────────────────────────┐
│ 필드             │ 값                               │
├──────────────────┼─────────────────────────────────┤
│ ID               │ 52593b20-bb09-4fb1-816a-dfa8b0e33562 │
│ 상태             │ scheduled (경기 예정) ⚠️         │
│ 스코어           │ null ⚠️                          │
│ 경기 시작        │ 2025-10-08T21:08:00.000Z         │
│ 홈팀             │ Chicago Cubs                     │
│ 어웨이팀         │ Milwaukee Brewers                │
└──────────────────┴─────────────────────────────────┘
```

### 🚨 문제점

1. **경기 결과가 `scheduled` 상태** → 경기가 아직 시작되지 않음
2. **스코어가 `null`** → 승패를 판단할 수 없음
3. **그런데 정산이 완료됨** → 무슨 근거로 정산했는가?
4. **정산 시간이 경기 시작 전** → 2025-10-07에 정산, 경기는 2025-10-08

---

## 🔍 의심되는 코드 및 구조

### 1. 정산 서비스 로직

#### 📁 `server/services/exchangeSettlementService.js`

**의심 포인트 1: 경기 결과 조회 로직 (1373-1386줄)**

```javascript
// 경기 결과 조회 (시간 범위 고려)
const gameResult = await this.findGameResultByMatch(homeTeam, awayTeam, commenceTime);
if (!gameResult || gameResult.status !== 'finished') {
  // gameResult.id가 없으면 gameId를 생성할 수 없으므로 gameResult.id를 사용하도록 수정
  const gameKey = gameResult ? `${gameResult.homeTeam}|${gameResult.awayTeam}|${gameResult.commenceTime}` : `${homeTeam}|${awayTeam}|${commenceTime}`;
  console.log(`[Main Settlement] 경기 결과를 찾을 수 없거나 경기가 아직 끝나지 않았습니다: ${gameKey}`);
  // 오류를 던지는 대신 빈 결과를 반환하여 다른 경기 정산에 영향을 주지 않도록 처리
  return {
    gameKey: gameKey,
    settledMatches: 0,
    totalWinnings: 0,
    results: [],
    message: 'Game result not found or not finished.'
  };
}
```

**✅ 이 코드는 정상입니다.** `status !== 'finished'` 체크가 있어서 scheduled 상태는 정산하지 않습니다.

---

**의심 포인트 2: `findGameResultByMatch` 함수 (1495-1580줄)**

```javascript
async findGameResultByMatch(homeTeam, awayTeam, commenceTime, transaction = null) {
  try {
    const commenceDate = new Date(commenceTime);
    
    // 1. 정확한 시간 매칭 시도 (±1분)
    const startTime = new Date(commenceDate.getTime() - 60000);
    const endTime = new Date(commenceDate.getTime() + 60000);
    
    let gameResult = await GameResult.findOne({
      where: {
        homeTeam,
        awayTeam,
        commenceTime: {
          [Op.between]: [startTime, endTime]
        },
        status: 'finished' // ✅ finished 체크
      },
      order: [['commenceTime', 'ASC']]
    });
    
    if (gameResult) {
      return gameResult;
    }
    
    // 2. 넓은 시간 범위 매칭 (±6시간)
    const wideStartTime = new Date(commenceDate.getTime() - 6 * 60 * 60 * 1000);
    const wideEndTime = new Date(commenceDate.getTime() + 6 * 60 * 60 * 1000);
    
    gameResult = await GameResult.findOne({
      where: {
        homeTeam,
        awayTeam,
        commenceTime: {
          [Op.between]: [wideStartTime, wideEndTime]
        },
        status: 'finished' // ✅ finished 체크
      },
      order: [['commenceTime', 'ASC']]
    });
    
    return gameResult || null;
  } catch (error) {
    console.error(`❌ [findGameResultByMatch] 에러:`, error);
    return null;
  }
}
```

**✅ 이 코드도 정상입니다.** `status: 'finished'` 조건이 명확히 있습니다.

---

### 2. 🚨 의심되는 부분: 스케줄러 또는 수동 정산

**의심 포인트 3: 자동 정산 스케줄러 (1225-1280줄)**

```javascript
async settleExchangeOrders(transaction = null) {
  const shouldCommit = !transaction;
  transaction = transaction || await sequelize.transaction();
  
  try {
    console.log('\n🎯 [Exchange Settlement] 익스체인지 주문 자동 정산 시작');
    
    // 1. 완료된 경기 조회
    const finishedGames = await GameResult.findAll({
      where: {
        status: 'finished', // ✅ finished만 조회
        result: { [Op.ne]: 'pending' }
      }
    });
    
    console.log(`📊 완료된 경기 수: ${finishedGames.length}`);
    
    // ... 정산 로직
  } catch (error) {
    // ...
  }
}
```

**✅ 이 코드도 정상입니다.**

---

**의심 포인트 4: 🔥 수동 정산 API 또는 관리자 기능**

```javascript
// 📁 server/routes/exchange.js 또는 admin 라우트
// 수동 정산 기능이 있는가?
// 경기 결과 검증 없이 정산하는 엔드포인트가 있는가?
```

**⚠️ 확인 필요:**
1. 관리자가 수동으로 정산할 수 있는 API가 있는가?
2. 그 API가 경기 결과를 검증하는가?
3. 테스트 코드나 스크립트가 정산 로직을 우회하는가?

---

### 3. 🚨 의심되는 부분: 과거 데이터 변경

**시나리오 1: 과거에는 finished였다가 scheduled로 변경됨**

```
타임라인:
1. 2025-10-07 21:15 - GameResult가 finished 상태로 존재
2. 2025-10-07 21:15 - 정산 실행 (정상)
3. 2025-10-08 이후 - GameResult가 scheduled로 변경됨 (크롤러 재수집?)
```

**확인 방법:**
```sql
-- PaymentHistory에서 주문 348 관련 지급 내역 확인
SELECT 
  id,
  "userId",
  "betId",
  amount,
  "balanceBefore",
  "balanceAfter",
  type,
  memo,
  "createdAt"
FROM "PaymentHistory"
WHERE "betId" = 348
ORDER BY "createdAt" DESC;
```

---

### 4. 🚨 의심되는 부분: 멀티베팅 정산 로직

**의심 포인트 5: 멀티베팅 정산 (1680-1750줄)**

```javascript
async settleMultibetOrder(order, transaction) {
  try {
    // 각 선택사항의 경기 결과 조회
    for (const selection of selections) {
      const selectionGameResult = await this.findGameResultByMatch(
        selection.homeTeam,
        selection.awayTeam,
        selection.commenceTime
      );
      
      if (!selectionGameResult || selectionGameResult.status !== 'finished') {
        console.log(`❌ 선택사항 경기 결과 없음: ${selection.homeTeam} vs ${selection.awayTeam}`);
        allSelectionsWon = false;
        break;
      }
      
      // 승패 판정
      const won = this.checkSelectionWin(selection, selectionGameResult);
      if (!won) {
        allSelectionsWon = false;
        break;
      }
    }
    
    // ... 정산 처리
  } catch (error) {
    // ...
  }
}
```

**✅ 이 코드도 정상입니다.** `status !== 'finished'` 체크가 있습니다.

---

## 🔍 추가 조사 필요 사항

### 1. PaymentHistory 확인

```sql
-- 주문 348에 대한 모든 지급 내역
SELECT 
  ph.id,
  ph."userId",
  ph."betId",
  ph.amount,
  ph."balanceBefore",
  ph."balanceAfter",
  ph.type,
  ph.memo,
  ph."createdAt",
  u.username
FROM "PaymentHistory" ph
LEFT JOIN "Users" u ON ph."userId" = u.id
WHERE ph."betId" = 348
ORDER BY ph."createdAt" DESC;
```

**확인 사항:**
- 실제로 상금이 지급되었는가?
- 지급 금액은 얼마인가?
- 지급 시간은 정산 시간과 일치하는가?

---

### 2. 주문 348의 상세 정보

```sql
-- 주문 348의 모든 필드
SELECT 
  id,
  "userId",
  "gameId",
  market,
  line,
  side,
  price,
  amount,
  status,
  "stakeAmount",
  "potentialProfit",
  "potentialWinnings",
  "homeTeam",
  "awayTeam",
  "commenceTime",
  "sportKey",
  selection,
  "isMultibet",
  "selectionDetails",
  "totalOdds",
  "selectionCount",
  "matchedOrderId",
  "settledAt",
  "createdAt",
  "updatedAt"
FROM "ExchangeOrders"
WHERE id = 348;
```

---

### 3. 정산 로그 확인

```bash
# 2025-10-07 21:15 전후의 서버 로그
grep -A 50 -B 10 "주문 348" server/logs/server.log
grep -A 50 -B 10 "Chicago Cubs vs Milwaukee Brewers" server/logs/server.log
grep -A 50 -B 10 "2025-10-07T21:15" server/logs/server.log
```

**확인 사항:**
- 어떤 정산 로직이 실행되었는가?
- 경기 결과 조회 로그가 있는가?
- 에러나 경고 메시지가 있는가?

---

### 4. 수동 정산 API 확인

```javascript
// 📁 server/routes/exchange.js
// 수동 정산 엔드포인트가 있는가?

// 예상되는 엔드포인트:
// POST /api/exchange/settle/:orderId
// POST /api/admin/exchange/settle/:orderId
```

**확인 사항:**
- 수동 정산 API가 존재하는가?
- 경기 결과 검증을 하는가?
- 관리자 권한 체크를 하는가?

---

### 5. 테스트 스크립트 확인

```bash
# 테스트 스크립트 검색
find server -name "*test*settlement*.js"
find server -name "*manual*settlement*.js"
```

**확인 사항:**
- 테스트용 정산 스크립트가 있는가?
- 프로덕션 환경에서 실행되었을 가능성이 있는가?

---

## 🎯 의심되는 시나리오

### 시나리오 1: 과거 데이터 변경 (가능성 70%)

```
1. 2025-10-07 이전: GameResult가 finished 상태로 잘못 생성됨
2. 2025-10-07 21:15: 정산 로직이 finished 상태를 보고 정산 실행
3. 2025-10-08 이후: 크롤러가 경기 데이터를 재수집하여 scheduled로 업데이트
```

**검증 방법:**
- PaymentHistory에서 실제 지급 내역 확인
- 서버 로그에서 정산 시점의 GameResult 상태 확인

---

### 시나리오 2: 수동 정산 API 악용 (가능성 20%)

```
1. 관리자 또는 테스트 계정이 수동 정산 API 호출
2. API가 경기 결과 검증을 건너뛰고 정산 실행
```

**검증 방법:**
- 수동 정산 API 코드 확인
- API 호출 로그 확인

---

### 시나리오 3: 테스트 스크립트 실행 (가능성 10%)

```
1. 개발자가 테스트용 정산 스크립트 실행
2. 스크립트가 검증 로직을 우회하고 정산 실행
```

**검증 방법:**
- 테스트 스크립트 존재 여부 확인
- 실행 로그 확인

---

## 🔧 제안하는 조사 순서

### 1단계: 데이터 확인 (즉시)
```sql
-- 1. 주문 348 상세 정보
SELECT * FROM "ExchangeOrders" WHERE id = 348;

-- 2. PaymentHistory 확인
SELECT * FROM "PaymentHistory" WHERE "betId" = 348;

-- 3. 같은 경기의 다른 주문들
SELECT id, status, "settledAt", "createdAt"
FROM "ExchangeOrders"
WHERE "homeTeam" = 'Chicago Cubs' 
  AND "awayTeam" = 'Milwaukee Brewers'
  AND "commenceTime" = '2025-10-08T21:08:00.000Z';
```

### 2단계: 로그 분석 (즉시)
```bash
# 정산 시점 로그
grep -A 100 "2025-10-07T21:15" server/logs/server.log

# 주문 348 관련 로그
grep -A 50 "주문 348" server/logs/server.log
grep -A 50 "order 348" server/logs/server.log
grep -A 50 "orderId.*348" server/logs/server.log
```

### 3단계: 코드 검토 (1시간 이내)
```bash
# 수동 정산 API 검색
grep -r "settle.*manual" server/routes/
grep -r "POST.*settle" server/routes/

# 테스트 스크립트 검색
find server -name "*test*settle*.js"
find server -name "*manual*settle*.js"
```

### 4단계: 재현 시도 (필요시)
```javascript
// 동일한 조건으로 정산 시도
// scheduled 상태의 경기로 정산이 실행되는지 확인
```

---

## 🚨 긴급 조치 필요 사항

### 1. 즉시 롤백 (선택적)
```sql
-- 주문 348의 정산 취소 (신중하게!)
UPDATE "ExchangeOrders"
SET status = 'matched', "settledAt" = NULL
WHERE id = 348;

-- PaymentHistory 롤백 (신중하게!)
-- 실제 지급된 금액을 확인 후 수동으로 조정
```

### 2. 정산 로직 강화
```javascript
// 모든 정산 로직에 추가 검증 추가
if (!gameResult || gameResult.status !== 'finished' || !gameResult.score) {
  throw new Error('Cannot settle order without valid game result');
}
```

### 3. 모니터링 추가
```sql
-- 정산되었지만 경기 결과가 없는 주문 찾기
SELECT 
  eo.id,
  eo.status,
  eo."settledAt",
  eo."homeTeam",
  eo."awayTeam",
  gr.status as "gameResultStatus",
  gr.score
FROM "ExchangeOrders" eo
LEFT JOIN "GameResults" gr ON 
  gr."homeTeam" = eo."homeTeam" AND 
  gr."awayTeam" = eo."awayTeam" AND
  ABS(EXTRACT(EPOCH FROM (gr."commenceTime" - eo."commenceTime"))) < 3600
WHERE 
  eo.status = 'settled' AND
  (gr.status != 'finished' OR gr.status IS NULL OR gr.score IS NULL);
```

---

## 📝 제미나이에게 질문할 사항

1. **데이터 무결성 관점**:
   - 정산된 주문의 GameResult가 scheduled 상태인 것이 가능한가?
   - 이것이 정상적인 시나리오인가, 아니면 버그인가?

2. **정산 로직 검증**:
   - 제공된 코드에서 scheduled 상태로 정산될 수 있는 경로가 있는가?
   - 어떤 추가 검증이 필요한가?

3. **롤백 전략**:
   - 이미 정산된 주문을 안전하게 롤백하는 방법은?
   - 사용자에게 지급된 금액을 어떻게 처리해야 하는가?

4. **재발 방지**:
   - 이런 버그를 방지하기 위한 추가 검증 로직은?
   - 데이터베이스 제약 조건이 필요한가?

---

## 🏷️ 태그

`#critical-bug` `#settlement` `#data-integrity` `#financial-impact` `#investigation-required`
