# 취소된 경기 처리 시스템

## 📋 개요

LikeBetFair 플랫폼에서 경기가 취소되거나 연기될 때의 베팅 처리 방식을 설명합니다.

## 🏆 베팅 업계 표준 규칙

### 1. 완전 취소 (Complete Cancellation)
- **상황**: 경기가 시작되지 않고 완전히 취소
- **처리**: **전액 환불**
- **예시**: 악천후, 시설 문제, 기타 불가항력으로 인한 경기 취소

### 2. 연기 후 재개 (Postponement with Rescheduling)
- **상황**: 경기가 48시간 이내에 재개 예정
- **처리**: **베팅 유지** (경기 재개 시까지 대기)
- **예시**: 단기 연기 후 재일정

### 3. 무기한 연기 (Indefinite Postponement)
- **상황**: 경기가 48시간을 초과하여 연기되거나 무기한 연기
- **처리**: **전액 환불**
- **예시**: 장기 연기, 무기한 연기

### 4. 혼합 베팅 중 일부 취소 (Partial Cancellation in Combo Bets)
- **상황**: 여러 경기 중 일부만 취소
- **처리**: **취소된 경기는 배당률 1.0으로 처리** (무효 처리)
- **예시**: 3경기 혼합 베팅 중 1경기 취소 → 나머지 2경기로 베팅 계속

## 🔧 시스템 구현

### 1. 데이터베이스 구조

#### GameResult 테이블
```sql
status ENUM('scheduled', 'live', 'finished', 'cancelled')
result ENUM('home_win', 'away_win', 'draw', 'cancelled', 'pending')
```

#### Bet 테이블
```sql
status ENUM('pending', 'won', 'lost', 'cancelled')
selections JSONB -- 각 selection에 result 필드 포함
```

### 2. 처리 로직

#### 2.1 개별 Selection 판정
```javascript
// betResultService.js - determineSelectionResult()
if (gameResult.status === 'cancelled' || gameResult.result === 'cancelled') {
  return 'cancelled';
}
```

#### 2.2 전체 베팅 상태 결정
```javascript
// betResultService.js - determineBetStatus()
determineBetStatus(hasPending, hasWon, hasLost, hasCancelled, selections) {
  // 모든 selection이 취소된 경우
  if (hasCancelled && !hasWon && !hasLost && !hasPending) {
    return 'cancelled';
  }
  
  // 일부만 취소된 경우 - 계속 진행
  // 실패가 있으면 전체 실패
  if (hasLost) {
    return 'lost';
  }
  
  // 성공 + 취소 조합 처리
  // ...
}
```

#### 2.3 환불 처리
```javascript
// betResultService.js - processBetRefund()
async processBetRefund(bet, transaction, memo = '경기 취소로 인한 환불') {
  const user = await User.findByPk(bet.userId, { transaction, lock: transaction.LOCK.UPDATE });
  
  user.balance = Number(user.balance) + Number(bet.stake);
  await user.save({ transaction });
  
  await PaymentHistory.create({
    userId: user.id,
    betId: bet.id,
    amount: bet.stake,
    balanceAfter: user.balance,
    memo: memo,
    paidAt: new Date()
  }, { transaction });
}
```

#### 2.4 혼합 베팅 배당률 재계산
```javascript
// betResultService.js - calculateAdjustedWinnings()
calculateAdjustedWinnings(bet) {
  const selections = bet.selections;
  let adjustedOdds = 1.0;
  
  for (const selection of selections) {
    if (selection.result === 'won') {
      adjustedOdds *= selection.odds || 1.0;  // 승리 시 배당률 적용
    } else if (selection.result === 'cancelled') {
      adjustedOdds *= 1.0;  // 취소 시 배당률 1.0 (무효)
    }
  }
  
  return Number(bet.stake) * adjustedOdds;
}
```

## 🎯 처리 시나리오

### 시나리오 1: 단독 베팅 취소
- **베팅**: Chelsea vs Arsenal (Chelsea 승리, 배당률 2.5, 베팅금 10,000원)
- **상황**: 경기 완전 취소
- **결과**: 
  - `selection.result = 'cancelled'`
  - `bet.status = 'cancelled'`
  - **10,000원 전액 환불**

### 시나리오 2: 혼합 베팅 중 일부 취소
- **베팅**: 3경기 혼합 (A팀 승 @ 2.0, B팀 승 @ 1.5, C팀 승 @ 3.0)
- **베팅금**: 10,000원
- **원래 배당률**: 2.0 × 1.5 × 3.0 = 9.0
- **상황**: B팀 경기 취소, A팀 승리, C팀 승리
- **결과**:
  - A팀: `result = 'won'` (배당률 2.0)
  - B팀: `result = 'cancelled'` (배당률 1.0)
  - C팀: `result = 'won'` (배당률 3.0)
  - **조정된 배당률**: 2.0 × 1.0 × 3.0 = 6.0
  - **상금**: 10,000원 × 6.0 = 60,000원

### 시나리오 3: 연기 후 재개
- **베팅**: Real Madrid vs Barcelona
- **상황**: 6시간 연기 후 재개
- **결과**: 베팅 유지, 재개된 경기 결과로 정산

## 🖥️ 프론트엔드 표시

### 베팅 상태 표시
```typescript
const statusLabel = (status: string) => {
  if (status === 'cancelled') return '배팅취소';
  // ...
};

const statusColor = (status: string) => {
  if (status === 'cancelled') return 'text-gray-400';
  // ...
};
```

### Selection 결과 표시
```typescript
// 개별 selection 아이콘 및 색상
if (sel.result === 'cancelled') { 
  icon = '🚫'; 
  color = 'text-orange-500'; 
  label = '경기취소'; 
}

// 혼합 베팅에서 일부 취소 시 추가 안내
{sel.result === 'cancelled' && bet.status !== 'cancelled' && (
  <span className="ml-2 text-xs text-orange-500 font-semibold">
    경기 취소 (무효처리)
  </span>
)}
```

## 📊 PaymentHistory 기록

### 전액 환불 시
```json
{
  "userId": "user-id",
  "betId": "bet-id", 
  "amount": 10000,
  "balanceAfter": 50000,
  "memo": "경기 취소로 인한 환불",
  "paidAt": "2025-01-01T12:00:00Z"
}
```

### 혼합 베팅 적중 시 (일부 취소 포함)
```json
{
  "userId": "user-id",
  "betId": "bet-id",
  "amount": 60000,
  "balanceAfter": 110000, 
  "memo": "베팅 적중 지급 (일부 경기 취소 반영)",
  "paidAt": "2025-01-01T12:00:00Z"
}
```

## 🧪 테스트

### 테스트 스크립트 실행
```bash
node scripts/testCancelledGameHandling.js
```

### 수동 테스트 절차
1. 테스트 경기를 `cancelled` 상태로 생성
2. 해당 경기에 베팅 생성
3. `betResultService.updateBetResults()` 실행
4. 베팅 상태 및 환불 확인

## ⚠️ 주의사항

### 1. 트랜잭션 보장
- 베팅 상태 변경과 환불이 하나의 트랜잭션으로 처리
- 실패 시 롤백으로 데이터 일관성 보장

### 2. 중복 환불 방지
```javascript
if (betStatus === 'cancelled' && prevStatus !== 'cancelled') {
  await this.processBetRefund(bet, t, '경기 취소로 인한 환불');
}
```

### 3. 배당률 계산 안전장치
```javascript
const adjustedWinnings = Number(bet.stake) * adjustedOdds;
return Math.min(adjustedWinnings, Number(bet.potentialWinnings));
```

## 🔄 자동화 고려사항

### 1. 실시간 모니터링
- 스포츠 API에서 취소 상태 실시간 감지
- 자동 베팅 결과 업데이트

### 2. 알림 시스템
- 사용자에게 취소 안내 알림
- 환불 완료 알림

### 3. 관리자 대시보드
- 취소된 경기 현황 모니터링
- 환불 내역 관리

---

**마지막 업데이트**: 2025-06-30
**작성자**: LikeBetFair Development Team 