# 부분 매치된 주문의 남은 금액 매치 버튼 비활성화 버그 보고서

**작성일**: 2025-10-09
**버그 심각도**: 🔴 High (사용자 경험 저해)
**영향 범위**: Exchange 거래소 오더북 매칭 기능

---

## 📋 버그 요약

부분 매칭된 주문(`partiallyFilled: true`, `remainingAmount > 0`)의 남은 금액에 대해 매치 버튼이 비활성화되어, 사용자가 추가 매칭을 할 수 없는 문제가 발생하고 있습니다.

---

## 🔍 재현 방법

1. 사용자 A: Exchange에서 Back 주문 100,000원 생성
2. 사용자 B: 해당 주문에 30,000원만 부분 매칭
3. **결과**: 주문 #351의 남은 금액 70,000원에 대한 매치 버튼이 비활성화됨

### 로그 확인
```javascript
🔍 개별 주문 변환: {
  id: 351,
  side: 'back',
  amount: 100000,
  status: 'matched',  // ❌ 잘못된 상태
  partiallyFilled: true,
  remainingAmount: 70000  // ✅ 남은 금액 존재
}
```

---

## 🐛 근본 원인

### 1️⃣ **백엔드 버그**: 부분 매칭 시 잘못된 상태 설정

**파일**: `server/routes/exchange.js`
**라인**: 314-330

```javascript
// ❌ 문제 코드
} else {
  // 부분 매칭
  targetOrder.originalAmount = targetOrder.originalAmount || targetOrder.amount;
  targetOrder.partiallyFilled = true;
  targetOrder.filledAmount = (targetOrder.filledAmount || 0) + actualMatchAmount;
  targetOrder.remainingAmount = (targetOrder.remainingAmount || targetOrder.amount) - actualMatchAmount;

  // 🆕 멀티베팅 주문은 부분 매칭 시에도 matched 상태로 설정
  if (targetOrder.isMultibet) {
    targetOrder.status = 'matched'; // ❌ 멀티베팅 주문은 부분 매칭되어도 matched 상태
  } else {
    // 일반 주문: Back과 Lay 구분 상태 설정
    if (targetOrder.side === 'lay') {
      targetOrder.status = 'active'; // Lay 매치는 부분 매칭되어도 active 상태 유지
    } else {
      targetOrder.status = 'partially_matched'; // ✅ Back 주문은 partially_matched 상태
    }
  }
}
```

**문제점**:
- **멀티베팅 주문**의 경우 부분 매칭되어도 `status: 'matched'`로 설정됨
- `matched` 상태는 "완전히 체결됨"을 의미하므로 매치 버튼이 비활성화됨
- `partiallyFilled: true`, `remainingAmount > 0`이지만 상태 불일치 발생

### 2️⃣ **프론트엔드 로직**: 상태 기반 버튼 비활성화

**파일**: `pages/exchange/orderbook.tsx`
**라인**: 172-175

```typescript
// 주문 상태 확인 - 🆕 부분 매칭된 주문도 매칭 가능
if (targetOrder.status !== 'open' && targetOrder.status !== 'partially_matched') {
  alert('이미 완전히 체결되었거나 취소된 주문입니다.');
  return;
}
```

**문제점**:
- 프론트엔드는 `status` 필드를 신뢰
- `status === 'matched'`이면 "완전히 체결됨"으로 간주하여 매칭 거부
- `remainingAmount > 0`인지 확인하지 않음

---

## 🔧 해결 방안

### ✅ 옵션 1: 백엔드 수정 (권장)

**파일**: `server/routes/exchange.js:314-330`

```javascript
} else {
  // 부분 매칭
  targetOrder.originalAmount = targetOrder.originalAmount || targetOrder.amount;
  targetOrder.partiallyFilled = true;
  targetOrder.filledAmount = (targetOrder.filledAmount || 0) + actualMatchAmount;
  targetOrder.remainingAmount = (targetOrder.remainingAmount || targetOrder.amount) - actualMatchAmount;

  // ✅ 수정: 멀티베팅 주문도 부분 매칭 시 'partially_matched' 상태로 설정
  if (targetOrder.isMultibet) {
    targetOrder.status = 'partially_matched'; // ✅ 부분 매칭 시 partially_matched 상태
  } else {
    // 일반 주문: Back과 Lay 구분 상태 설정
    if (targetOrder.side === 'lay') {
      targetOrder.status = 'active'; // Lay 매치는 부분 매칭되어도 active 상태 유지
    } else {
      targetOrder.status = 'partially_matched'; // Back 주문은 partially_matched 상태
    }
  }

  // 🆕 소수점 문제 해결: 잔액이 100원 미만이면 0으로 처리
  if (targetOrder.remainingAmount < 100) {
    console.log('🧹 잔액 정리: remainingAmount가 100원 미만이므로 0으로 처리');
    targetOrder.remainingAmount = 0;
    targetOrder.partiallyFilled = false;

    // ✅ 수정: 잔액 정리 후에는 완전 매칭 상태로 설정
    if (targetOrder.isMultibet) {
      targetOrder.status = 'matched';
    } else {
      if (targetOrder.side === 'lay') {
        targetOrder.status = 'active';
      } else {
        targetOrder.status = 'matched';
      }
    }
  }
}
```

**변경 사항**:
1. **Line 322**: `targetOrder.status = 'matched'` → `targetOrder.status = 'partially_matched'`
2. **주석 수정**: "부분 매칭되어도 matched 상태" → "부분 매칭 시 partially_matched 상태"
3. **잔액 정리 로직 유지**: `remainingAmount < 100`일 때는 완전 매칭으로 처리 (기존 로직 유지)

**영향 범위**:
- ✅ 멀티베팅 주문의 부분 매칭 상태 정확히 표시
- ✅ 프론트엔드에서 매치 버튼 활성화
- ✅ 기존 완전 매칭 로직에는 영향 없음

---

### ⚠️ 옵션 2: 프론트엔드 수정 (임시 방편)

**파일**: `pages/exchange/orderbook.tsx:172-175`

```typescript
// ⚠️ 임시 방편: remainingAmount도 함께 확인
if ((targetOrder.status !== 'open' && targetOrder.status !== 'partially_matched')
    && (!targetOrder.remainingAmount || targetOrder.remainingAmount <= 0)) {
  alert('이미 완전히 체결되었거나 취소된 주문입니다.');
  return;
}
```

**문제점**:
- 근본 원인 해결이 아님
- 백엔드 상태와 프론트엔드 로직 불일치 지속
- 다른 곳에서 같은 문제 재발 가능

**권장하지 않음**: 백엔드를 수정하는 것이 정확한 해결책입니다.

---

## 📊 영향 분석

### 현재 상태
| 주문 타입 | 부분 매칭 시 상태 | 매치 버튼 | 문제 여부 |
|----------|----------------|----------|---------|
| 일반 Back | `partially_matched` | ✅ 활성화 | ✅ 정상 |
| 일반 Lay | `active` | ✅ 활성화 | ✅ 정상 |
| **멀티베팅** | **`matched`** | **❌ 비활성화** | **🔴 버그** |

### 수정 후 상태
| 주문 타입 | 부분 매칭 시 상태 | 매치 버튼 | 문제 여부 |
|----------|----------------|----------|---------|
| 일반 Back | `partially_matched` | ✅ 활성화 | ✅ 정상 |
| 일반 Lay | `active` | ✅ 활성화 | ✅ 정상 |
| **멀티베팅** | **`partially_matched`** | **✅ 활성화** | **✅ 수정됨** |

---

## 🎯 권장 조치

1. **즉시 조치**: `server/routes/exchange.js:322` 수정
   ```javascript
   targetOrder.status = 'partially_matched'; // ✅ 수정
   ```

2. **테스트**:
   - 멀티베팅 주문 생성 → 부분 매칭 → 남은 금액 매치 버튼 확인
   - 일반 주문 부분 매칭 동작 정상 확인
   - 완전 매칭 동작 정상 확인

3. **추가 검증**:
   ```sql
   -- 현재 부분 매칭된 멀티베팅 주문 확인
   SELECT id, "isMultibet", status, "partiallyFilled", "remainingAmount"
   FROM "ExchangeOrders"
   WHERE "isMultibet" = true
     AND "partiallyFilled" = true
     AND "remainingAmount" > 0;
   ```

---

## 📝 관련 코드 위치

### 백엔드
- `server/routes/exchange.js:314-350` - 부분 매칭 상태 설정 로직
- `server/routes/exchange.js:295-312` - 완전 매칭 상태 설정 로직

### 프론트엔드
- `pages/exchange/orderbook.tsx:156-206` - handleMatchBet 함수
- `pages/exchange/orderbook.tsx:172-175` - 주문 상태 확인 로직
- `pages/exchange/orderbook.tsx:354-420` - 필터링 로직

---

## ✅ 결론

**근본 원인**: 멀티베팅 주문의 부분 매칭 시 `status`를 `'matched'`로 설정하는 백엔드 버그

**해결 방법**: `server/routes/exchange.js:322`를 `'partially_matched'`로 수정

**예상 소요 시간**: 5분 (코드 수정 1줄)

**테스트 필요**: 멀티베팅 부분 매칭 시나리오

---

**작성자**: Claude Code
**검토 상태**: ✅ 수정 방안 제시 완료
