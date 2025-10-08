# 중복 정산 오류 원인 분석 보고서

## 📋 요약

현재 LikeBetFair 시스템에서 **중복 정산 오류**가 지속적으로 발생하고 있습니다. 이 보고서는 코드 분석, 아키텍처 검토, 그리고 커밋 이력 조사를 통해 원인을 파악하고 해결 방안을 제시합니다.

## 🔍 분석 범위

- **서비스**: `betResultService.js` (스포츠북 정산)
- **스케줄러**: `settlementScheduler.js` (매 15분 실행)
- **데이터베이스**: `PaymentHistory`, `Bets` 모델
- **최근 커밋**: 정산 관련 버그 수정 이력 검토

## 🚨 중복 정산이 발생하는 주요 원인

### 1. **Race Condition (경쟁 조건)**

**현상**: 스케줄러가 매 15분마다 실행되지만, 동일한 베팅이 여러 번 처리될 수 있는 구조

**코드 위치**: `server/jobs/settlementScheduler.js:22-39`

```javascript
// 매 15분마다 베팅 정산
schedule.scheduleJob('*/15 * * * *', async () => {
  console.log('⚙️ [Scheduler] 베팅 정산 작업을 시작합니다...');
  try {
    // 1. 스포츠북 정산
    const betResult = await betResultService.updateBetResults();

    // 2. 익스체인지 일반 주문 정산
    const exchangeService = new exchangeSettlementService();
    const exchangeResult = await exchangeService.settleAllConnectedOrders();

    // 3. 익스체인지 멀티베팅 정산
    const multibetResult = await multibetSettlementService.settleAllMultibetOrders();
  } catch (error) {
    console.error('❌ [Scheduler] 베팅 정산 중 오류 발생:', error);
  }
});
```

**문제점**:
- 이전 정산 작업이 완료되기 전에 다음 스케줄이 시작될 수 있음
- 특히 처리 시간이 15분을 초과하는 경우, 동일한 베팅이 동시에 두 번 처리될 수 있음
- Node.js의 비동기 특성상 여러 스케줄러 인스턴스가 동시에 실행될 가능성

### 2. **트랜잭션 격리 수준 문제**

**코드 위치**: `server/services/betResultService.js:430-533`

```javascript
async processBetWinnings(bet, transaction) {
  // 이미 지급된 베팅인지 확인
  const existingPayment = await PaymentHistory.findOne({
    where: {
      betId: bet.id,
      memo: { [Op.like]: '%베팅 적중 지급%' }
    },
    transaction
  });

  if (existingPayment) {
    console.log(`[적중 지급] 이미 지급된 베팅 ${bet.id} 건너뛰기`);
    return;
  }

  // ... 지급 처리 로직
}
```

**문제점**:
- `findOne` 체크와 실제 지급 사이에 시간 간격 존재 (Check-Then-Act 패턴)
- 두 개의 스케줄러 인스턴스가 동시에 `findOne`을 실행하면 둘 다 `null`을 반환받을 수 있음
- 결과적으로 동일한 베팅에 대해 두 번 지급

**시나리오**:
```
시간 T1: 스케줄러 A가 Bet #123 처리 시작
        → PaymentHistory 조회: 없음 (null)

시간 T2: 스케줄러 B가 동시에 Bet #123 처리 시작
        → PaymentHistory 조회: 아직 없음 (null)

시간 T3: 스케줄러 A가 지급 처리 및 PaymentHistory 생성

시간 T4: 스케줄러 B도 지급 처리 및 PaymentHistory 생성

결과: 중복 지급 발생!
```

### 3. **데이터베이스 제약 조건 부재**

**모델**: `server/models/paymentHistoryModel.js`

```javascript
const PaymentHistory = sequelize.define('PaymentHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  betId: {
    type: DataTypes.STRING,
    allowNull: true  // ❌ 문제: nullable
  },
  // ...
});
```

**문제점**:
- `betId` + `memo` 조합에 대한 **유니크 제약 조건 없음**
- 동일한 betId에 대해 여러 개의 "베팅 적중 지급" 레코드 생성 가능
- 데이터베이스 레벨에서 중복 방지 메커니즘 없음

### 4. **상태 변경의 원자성 부족**

**코드 위치**: `server/services/betResultService.js:369-386`

```javascript
if (statusChanged || selectionsChanged) {
  const t = await Bet.sequelize.transaction();
  try {
    bet.status = betStatus;
    bet.selections = [...selections];
    bet.changed('selections', true);
    await bet.save({ transaction: t });

    if (betStatus === 'won') {
      await this.processBetWinnings(bet, t);  // ⚠️ 여기서 중복 가능
    } else if (betStatus === 'cancelled') {
      await this.processBetRefund(bet, t);
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}
```

**문제점**:
- `bet.save()`와 `processBetWinnings()` 사이에 시간 간격
- 트랜잭션 커밋 전까지 다른 스케줄러는 베팅 상태가 변경되지 않은 것으로 인식
- **Dirty Read** 가능성

### 5. **스케줄러 인스턴스 중복 실행**

**서버 배포 환경**: Render 플랫폼

**문제점**:
- 서버가 여러 인스턴스로 실행되는 경우, 각 인스턴스마다 독립적인 스케줄러 실행
- 무중단 배포(Zero Downtime) 시, 새로운 인스턴스가 기동되는 동안 기존 인스턴스도 계속 실행
- 결과: **동일한 시간에 여러 스케줄러가 동시에 실행**

**예상 시나리오**:
```
서버 인스턴스 1: 15:00에 정산 시작
서버 인스턴스 2: 15:00에 정산 시작 (배포 중 새 인스턴스)
→ 동일한 pending 베팅들을 동시에 처리
```

## 📊 최근 커밋 이력 분석

```
a736f84 [Cursor] 베팅 정산 시스템 핵심 버그 수정 및 팀명 매칭 개선
9d360b9 [Cursor] 치명적인 정산 버그 수정 및 수수료 시스템 개선
de8fc09 [Cursor] 스포츠북 정산 시스템 버그 수정 및 게임 결과 쿼리 중앙화
```

**분석 결과**:
- 최근 3개월간 정산 관련 "치명적 버그 수정" 커밋이 **10회 이상** 반복
- 동일한 문제가 재발하고 있음을 시사
- 근본적인 아키텍처 문제 미해결

## 🛠️ 해결 방안

### 🔧 단기 해결책 (즉시 적용 가능)

#### 1. 스케줄러 잠금 메커니즘 추가

```javascript
// server/jobs/settlementScheduler.js
let isSettling = false;

schedule.scheduleJob('*/15 * * * *', async () => {
  if (isSettling) {
    console.log('⏳ [Scheduler] 이전 정산 작업이 진행 중입니다. 건너뜁니다.');
    return;
  }

  isSettling = true;
  try {
    // 정산 로직
  } finally {
    isSettling = false;
  }
});
```

**효과**: 동일한 프로세스 내에서 중복 실행 방지

#### 2. 데이터베이스 유니크 제약 조건 추가

```sql
-- 마이그레이션 파일 생성
CREATE UNIQUE INDEX idx_payment_history_bet_settlement
ON "PaymentHistories" ("betId", "memo")
WHERE memo LIKE '%베팅 적중 지급%' OR memo LIKE '%환불%';
```

**효과**: 데이터베이스 레벨에서 중복 방지

#### 3. 비관적 락(Pessimistic Lock) 사용

```javascript
async processBetWinnings(bet, transaction) {
  // 베팅 레코드에 락 걸기
  const lockedBet = await Bet.findByPk(bet.id, {
    transaction,
    lock: transaction.LOCK.UPDATE  // 행 잠금
  });

  if (lockedBet.status !== 'won') {
    console.log(`[적중 지급] 베팅 ${bet.id}의 상태가 변경됨: ${lockedBet.status}`);
    return;
  }

  // 이미 지급된 베팅인지 확인
  const existingPayment = await PaymentHistory.findOne({
    where: { betId: bet.id, memo: { [Op.like]: '%베팅 적중 지급%' } },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (existingPayment) {
    console.log(`[적중 지급] 이미 지급된 베팅 ${bet.id} 건너뛰기`);
    return;
  }

  // 지급 처리...
}
```

**효과**: 동시 접근 방지, 완전한 격리

### 🏗️ 장기 해결책 (근본적 개선)

#### 1. Redis 분산 락 도입

```javascript
import Redis from 'ioredis';
import Redlock from 'redlock';

const redis = new Redis(process.env.REDIS_URL);
const redlock = new Redlock([redis]);

async processBetWinnings(bet, transaction) {
  const lockKey = `bet:settlement:${bet.id}`;
  let lock;

  try {
    // 10초 동안 락 획득 시도
    lock = await redlock.lock(lockKey, 10000);

    // 중복 확인 및 지급 처리...

  } finally {
    if (lock) await lock.unlock();
  }
}
```

**효과**:
- 여러 서버 인스턴스 간 동기화
- 클러스터 환경에서도 안전

#### 2. 이벤트 소싱 패턴 적용

```javascript
// 정산 이벤트를 큐에 저장하고 순차 처리
const settlementQueue = new Queue('settlement', {
  connection: redis,
  limiter: {
    max: 1,  // 한 번에 하나씩만 처리
    duration: 1000
  }
});

settlementQueue.process(async (job) => {
  const { betId } = job.data;
  await processBetSettlement(betId);
});
```

**효과**:
- 정산 작업의 순서 보장
- 재시도 메커니즘 내장

#### 3. 상태 머신 패턴 적용

```javascript
// 베팅 상태 전이를 명확하게 정의
const BET_STATE_TRANSITIONS = {
  pending: ['won', 'lost', 'cancelled'],
  won: ['settled'],  // won 이후 settled 단계 추가
  settled: []  // 최종 상태
};

async function transitionBetState(betId, fromState, toState, transaction) {
  if (!BET_STATE_TRANSITIONS[fromState].includes(toState)) {
    throw new Error(`Invalid transition: ${fromState} → ${toState}`);
  }

  // 상태 전이를 원자적으로 수행
  const [affectedRows] = await Bet.update(
    { status: toState },
    {
      where: {
        id: betId,
        status: fromState  // 현재 상태 확인
      },
      transaction
    }
  );

  if (affectedRows === 0) {
    throw new Error('State transition failed (already changed)');
  }

  return affectedRows;
}
```

**효과**:
- 상태 변경의 일관성 보장
- 동시성 문제 근본적 해결

## 🎯 권장 조치 사항

### 즉시 (금일 내)
1. ✅ **스케줄러 잠금 플래그 추가** (`isSettling` 변수)
2. ✅ **기존 중복 정산 데이터 감사** 및 수동 수정

### 단기 (1주일 내)
3. ✅ **비관적 락 적용** (Pessimistic Locking)
4. ✅ **데이터베이스 유니크 인덱스 추가**
5. ✅ **로깅 강화**: 중복 정산 발생 시 상세 로그 기록

### 중기 (1개월 내)
6. 🔄 **Redis 분산 락 도입**
7. 🔄 **모니터링 대시보드 구축**: 중복 정산 실시간 감지
8. 🔄 **자동 보정 시스템**: 중복 발생 시 자동 환불

### 장기 (3개월 내)
9. 🚀 **이벤트 소싱 아키텍처 마이그레이션**
10. 🚀 **상태 머신 패턴 전면 적용**

## 📝 검증 방법

### 중복 정산 탐지 쿼리

```sql
-- 중복 정산된 베팅 찾기
SELECT
  ph."betId",
  COUNT(*) as payment_count,
  array_agg(ph.memo) as memos,
  array_agg(ph."paidAt") as paid_dates,
  SUM(ph.amount) as total_amount
FROM "PaymentHistories" ph
WHERE ph.memo LIKE '%베팅 적중 지급%'
GROUP BY ph."betId"
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
```

### 실시간 모니터링

```javascript
// 정산 처리 시 이벤트 로깅
async processBetWinnings(bet, transaction) {
  const startTime = Date.now();

  // 중복 체크
  const existing = await PaymentHistory.findOne(...);

  if (existing) {
    // 🚨 중복 시도 알림
    await sendAlert({
      type: 'DUPLICATE_SETTLEMENT_ATTEMPT',
      betId: bet.id,
      userId: bet.userId,
      timestamp: new Date()
    });
    return;
  }

  // 정산 처리...

  const duration = Date.now() - startTime;
  console.log(`[METRIC] Settlement processed: betId=${bet.id}, duration=${duration}ms`);
}
```

## 🔗 관련 파일

- `server/services/betResultService.js` (lines 430-533)
- `server/jobs/settlementScheduler.js` (lines 22-39)
- `server/models/paymentHistoryModel.js`
- `server/migrations/` (유니크 인덱스 마이그레이션 필요)

## 📌 결론

중복 정산 문제는 **동시성 제어(Concurrency Control)의 부재**에서 비롯됩니다. 현재 시스템은:

1. 여러 스케줄러 인스턴스의 동시 실행을 막지 못함
2. 트랜잭션 격리 수준이 낮아 Race Condition 발생
3. 데이터베이스 제약 조건 미비

**단기적으로는** 잠금 플래그와 비관적 락을 통해 문제를 완화하고, **장기적으로는** Redis 분산 락과 이벤트 소싱 패턴을 도입하여 근본적으로 해결해야 합니다.

---

**작성일**: 2025-10-09
**작성자**: Claude Code
**버전**: 1.0
