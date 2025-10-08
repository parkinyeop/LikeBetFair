# 제미나이 상담: 주문 348 버그 분석

## 🚨 버그 요약

**주문 348이 경기 결과 없이 정산 완료되었으며, 지급 내역도 없음**

---

## 📊 실제 데이터 (2025-10-08 조사 결과)

### 주문 348 정보

```
┌──────────────────────┬─────────────────────────────────────┐
│ 필드                 │ 값                                   │
├──────────────────────┼─────────────────────────────────────┤
│ ID                   │ 348                                  │
│ 상태                 │ settled ⚠️                           │
│ 사이드               │ lay (레이 주문)                      │
│ 배당                 │ 79.13                                │
│ 베팅 금액            │ 125,000                              │
│ 스테이크             │ 9,765,753 (약 977만원!)              │
│ 예상 수익            │ 125,000                              │
│ 예상 상금            │ 79,126,024 (약 7900만원!)            │
│ 멀티베팅             │ true ⚠️                              │
│ 매칭 주문 ID         │ 344                                  │
│ 생성 시간            │ 2025-10-07 20:24:25                  │
│ 정산 시간            │ 2025-10-07 21:15:00 ⚠️               │
│ 경기 시작            │ 2025-10-08 21:08:00 (미래!)          │
└──────────────────────┴─────────────────────────────────────┘
```

### GameResult 정보

```
┌──────────────────────┬─────────────────────────────────────┐
│ 필드                 │ 값                                   │
├──────────────────────┼─────────────────────────────────────┤
│ ID                   │ 52593b20-bb09-4fb1-816a-dfa8b0e33562 │
│ 홈팀                 │ Chicago Cubs                         │
│ 어웨이팀             │ Milwaukee Brewers                    │
│ 경기 시작            │ 2025-10-08 21:08:00                  │
│ 상태                 │ scheduled ⚠️                         │
│ 스코어               │ null ⚠️                              │
│ 생성 시간            │ 2025-10-07 21:13:29                  │
│ 수정 시간            │ 2025-10-08 20:30:49                  │
└──────────────────────┴─────────────────────────────────────┘
```

### PaymentHistory 정보

```
⚠️ PaymentHistory에 기록이 없습니다!
→ 정산은 완료되었지만 지급 내역이 없음
```

### 같은 경기의 다른 주문들

```
주문 344: settled, back, 정산 시간: 2025-10-08 06:15:00
주문 345: active, lay, 정산 시간: N/A
주문 346: active, lay, 정산 시간: N/A
주문 348: settled, lay, 정산 시간: 2025-10-08 06:15:00 ⚠️
```

---

## 🔍 버그 분석

### 1. 타임라인 분석

```
2025-10-07 20:24:25 - 주문 348 생성 (lay, 멀티베팅)
2025-10-07 21:13:29 - GameResult 생성 (scheduled 상태)
2025-10-07 21:15:00 - 주문 348 정산 완료 ⚠️
2025-10-08 21:08:00 - 경기 시작 예정 (미래)
```

**문제점:**
- 경기 시작 **24시간 전**에 정산됨
- GameResult는 **scheduled 상태** (경기 예정)
- 스코어는 **null**

### 2. 멀티베팅 Lay 주문의 특수성

**Lay 주문이란?**
- 사용자가 "이 결과가 나오지 않을 것"에 베팅
- 배당 79.13 → 사용자가 125,000원 걸면, 상대방은 977만원 리스크
- 사용자가 이기면: 125,000원 수익
- 사용자가 지면: 977만원 손실

**멀티베팅 Lay의 정산 로직:**
- 모든 선택사항이 **실패**해야 사용자가 승리
- 하나라도 **성공**하면 사용자가 패배

### 3. 🚨 심각한 문제점

1. **경기 결과 없이 정산됨**
   - GameResult가 scheduled 상태
   - 스코어가 null
   - 승패를 판단할 수 없는 상태

2. **PaymentHistory 없음**
   - 정산 플래그만 `settled`로 변경
   - 실제 지급/차감 내역 없음
   - 사용자 잔액 변동 없음?

3. **경기 시작 전 정산**
   - 정산 시간: 2025-10-07 21:15
   - 경기 시작: 2025-10-08 21:08
   - **24시간 전에 정산됨!**

---

## 🔍 의심되는 코드 구조

### 1. 멀티베팅 정산 로직

**📁 `server/services/exchangeSettlementService.js` (1680-1750줄)**

```javascript
async settleMultibetOrder(order, transaction) {
  try {
    const selections = order.selectionDetails?.selections || [];
    let allSelectionsWon = true;
    
    // 각 선택사항의 경기 결과 조회
    for (const selection of selections) {
      const selectionGameResult = await this.findGameResultByMatch(
        selection.homeTeam,
        selection.awayTeam,
        selection.commenceTime
      );
      
      // ✅ 이 체크가 있어야 함
      if (!selectionGameResult || selectionGameResult.status !== 'finished') {
        console.log(`❌ 선택사항 경기 결과 없음`);
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
  }
}
```

**질문:**
1. 이 로직이 실제로 실행되었는가?
2. `status !== 'finished'` 체크를 우회할 방법이 있는가?
3. Lay 멀티베팅의 경우 다른 로직을 사용하는가?

---

### 2. 매칭 주문 정산 로직

**주문 348은 주문 344와 매칭됨**

```
주문 344: back, settled
주문 348: lay, settled (매칭 주문 ID: 344)
```

**📁 `server/services/exchangeSettlementService.js` (1350-1450줄)**

```javascript
async settleExchangeOrdersByMatch(homeTeam, awayTeam, commenceTime, transaction = null) {
  // 경기 결과 조회
  const gameResult = await this.findGameResultByMatch(homeTeam, awayTeam, commenceTime);
  
  // ✅ 이 체크가 있어야 함
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
  
  // ... 정산 로직
}
```

**질문:**
1. 이 함수가 호출되었는가?
2. 호출되었다면 `status !== 'finished'` 체크를 통과했는가?
3. 로그에 어떤 메시지가 남았는가?

---

### 3. 🚨 의심되는 시나리오

#### 시나리오 A: 과거 데이터 변경 (가능성 40%)

```
1. 2025-10-07 21:13 - GameResult가 finished 상태로 잘못 생성됨
2. 2025-10-07 21:15 - 정산 로직이 finished를 보고 정산 실행
3. 2025-10-08 이후 - 크롤러가 scheduled로 업데이트
```

**검증 방법:**
- 서버 로그에서 2025-10-07 21:15 전후 로그 확인
- GameResult의 `updatedAt` 확인 (2025-10-08 20:30:49)

---

#### 시나리오 B: Lay 멀티베팅 정산 버그 (가능성 50%)

```
1. Lay 멀티베팅은 특수한 정산 로직 사용
2. 경기 결과 체크를 건너뛰는 버그 존재
3. 정산 플래그만 변경하고 실제 지급은 안 함
```

**검증 방법:**
- Lay 멀티베팅 정산 코드 확인
- 주문 344 (back)의 정산 로직과 비교

---

#### 시나리오 C: 매칭 주문 정산 버그 (가능성 10%)

```
1. 주문 344 (back)가 정산될 때
2. 매칭된 주문 348 (lay)도 자동으로 정산
3. 경기 결과 체크 없이 정산됨
```

**검증 방법:**
- 매칭 주문 정산 로직 확인
- 주문 344의 정산 시간과 348의 정산 시간 비교

---

## 🔍 필요한 추가 조사

### 1. 서버 로그 분석 (최우선)

```bash
# 2025-10-07 21:15 전후 로그
grep -A 100 "2025-10-07T21:15" server/logs/server.log

# 주문 348 관련 로그
grep -A 50 "주문 348\|order 348\|orderId.*348" server/logs/server.log

# Chicago Cubs vs Milwaukee Brewers 관련 로그
grep -A 50 "Chicago Cubs.*Milwaukee Brewers" server/logs/server.log
```

### 2. 주문 344 상세 정보

```sql
SELECT * FROM "ExchangeOrders" WHERE id = 344;
SELECT * FROM "PaymentHistory" WHERE "betId" = '344';
```

### 3. Lay 멀티베팅 정산 코드 확인

```bash
grep -A 50 "lay.*multibet\|multibet.*lay" server/services/exchangeSettlementService.js
grep -A 50 "side.*===.*'lay'" server/services/exchangeSettlementService.js
```

---

## 🎯 제미나이에게 질문할 사항

### 1. 데이터 무결성 관점

**Q1:** 주문이 `settled` 상태인데 PaymentHistory가 없는 것이 가능한가?
- 정상적인 시나리오인가?
- 아니면 심각한 버그인가?

**Q2:** 경기 시작 24시간 전에 정산되는 것이 가능한가?
- 어떤 로직이 이를 허용하는가?

### 2. 정산 로직 검증

**Q3:** 제공된 코드에서 scheduled 상태로 정산될 수 있는 경로가 있는가?
- 모든 정산 로직에 `status !== 'finished'` 체크가 있는가?
- Lay 멀티베팅의 경우 다른 로직을 사용하는가?

**Q4:** 매칭 주문 정산 시 상대방 주문도 자동으로 정산되는가?
- 그 경우 경기 결과 체크를 건너뛰는가?

### 3. 버그 재현 및 수정

**Q5:** 이 버그를 재현할 수 있는 방법은?
- 테스트 케이스를 어떻게 작성해야 하는가?

**Q6:** 어떤 추가 검증 로직이 필요한가?
- 정산 전 필수 체크 항목은?
- 데이터베이스 제약 조건이 필요한가?

### 4. 롤백 전략

**Q7:** 이미 정산된 주문을 안전하게 롤백하는 방법은?
- PaymentHistory가 없는 경우 어떻게 처리해야 하는가?
- 사용자 잔액 조정이 필요한가?

---

## 📝 의심되는 코드 파일 목록

### 우선순위 1 (즉시 확인)

1. **`server/services/exchangeSettlementService.js`**
   - `settleMultibetOrder()` 함수 (1680-1750줄)
   - `settleExchangeOrdersByMatch()` 함수 (1350-1450줄)
   - `findGameResultByMatch()` 함수 (1495-1580줄)

2. **`server/services/multibetSettlementService.js`**
   - Lay 멀티베팅 정산 로직
   - 경기 결과 검증 로직

3. **`server/routes/exchange.js`**
   - 수동 정산 API (있다면)
   - 매칭 주문 생성 로직

### 우선순위 2 (필요시 확인)

4. **`server/jobs/settlementScheduler.js`**
   - 자동 정산 스케줄러
   - 정산 트리거 조건

5. **`server/logs/server.log`**
   - 2025-10-07 21:15 전후 로그
   - 주문 348 관련 모든 로그

---

## 🚨 긴급 조치 필요 사항

### 1. 즉시 확인 (5분 이내)

```sql
-- 동일한 문제를 가진 다른 주문 찾기
SELECT 
  eo.id,
  eo.status,
  eo."settledAt",
  eo."homeTeam",
  eo."awayTeam",
  eo."commenceTime",
  gr.status as "gameResultStatus",
  gr.score,
  (SELECT COUNT(*) FROM "PaymentHistory" WHERE "betId" = eo.id::text) as "paymentCount"
FROM "ExchangeOrders" eo
LEFT JOIN "GameResults" gr ON 
  gr."homeTeam" = eo."homeTeam" AND 
  gr."awayTeam" = eo."awayTeam" AND
  ABS(EXTRACT(EPOCH FROM (gr."commenceTime" - eo."commenceTime"))) < 3600
WHERE 
  eo.status = 'settled' AND
  (gr.status != 'finished' OR gr.status IS NULL OR gr.score IS NULL);
```

### 2. 정산 로직 강화 (1시간 이내)

```javascript
// 모든 정산 로직에 추가 검증 추가
async function validateSettlement(order, gameResult) {
  // 1. GameResult 존재 확인
  if (!gameResult) {
    throw new Error(`Cannot settle order ${order.id}: GameResult not found`);
  }
  
  // 2. 경기 완료 확인
  if (gameResult.status !== 'finished') {
    throw new Error(`Cannot settle order ${order.id}: Game not finished (status: ${gameResult.status})`);
  }
  
  // 3. 스코어 존재 확인
  if (!gameResult.score) {
    throw new Error(`Cannot settle order ${order.id}: Score not available`);
  }
  
  // 4. 경기 시작 시간 확인 (미래 경기는 정산 불가)
  const now = new Date();
  const commenceTime = new Date(gameResult.commenceTime);
  if (commenceTime > now) {
    throw new Error(`Cannot settle order ${order.id}: Game has not started yet`);
  }
  
  return true;
}
```

### 3. 모니터링 추가 (지속적)

```javascript
// 정산 후 검증
async function verifySettlement(order) {
  const payments = await PaymentHistory.findAll({
    where: { betId: order.id.toString() }
  });
  
  if (payments.length === 0) {
    console.error(`🚨 정산 검증 실패: 주문 ${order.id}의 PaymentHistory 없음`);
    // 알림 발송 또는 롤백
  }
}
```

---

## 🏷️ 태그

`#critical-bug` `#settlement` `#multibet` `#lay-order` `#data-integrity` `#financial-impact` `#gemini-consultation`
