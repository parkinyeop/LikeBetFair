# Advisory Lock 방식 코드 리뷰 및 문제점 분석

## 📋 제안된 솔루션 개요

PostgreSQL의 Advisory Lock (`pg_try_advisory_lock`, `pg_advisory_unlock`)을 사용하여 정산 스케줄러의 동시 실행을 방지하는 방안입니다.

## ✅ 장점

1. **마이그레이션 불필요**: 별도 테이블 생성 없이 코드 수정만으로 구현 가능
2. **데이터베이스 레벨 잠금**: 여러 서버 인스턴스 간 동기화 가능
3. **PostgreSQL 네이티브**: 추가 의존성 없음 (Redis 불필요)
4. **빠른 성능**: 메모리 기반 락으로 오버헤드 최소화

## ⚠️ 발견된 문제점 및 개선 사항

### 1. 🔴 **문법 오류 (Syntax Error)**

**문제**:
```javascript
// Line 16
console.log('⚙️ [Scheduler] 경기 결과 수집 작업을 시작합니다...);
//                                                           ^^^ 따옴표 누락

// Line 38
console.log('⚙️ [Scheduler] 베팅 정산 작업을 시작합니다... (Lock 획득));
//                                                             ^^^ 따옴표 누락
```

**해결**:
```javascript
console.log('⚙️ [Scheduler] 경기 결과 수집 작업을 시작합니다...');
console.log('⚙️ [Scheduler] 베팅 정산 작업을 시작합니다... (Lock 획득)');
```

### 2. 🟡 **잠금 키 충돌 가능성**

**문제**:
```javascript
const SETTLEMENT_LOCK_KEY = 12345; // 너무 단순한 키
```

PostgreSQL Advisory Lock은 전역 네임스페이스를 사용하므로, 다른 애플리케이션이나 스크립트와 충돌할 수 있습니다.

**권장 해결책**:
```javascript
// 애플리케이션별 고유 네임스페이스 사용
// hashCode('likebetfair_settlement') 같은 방식
const SETTLEMENT_LOCK_KEY = 1987654321; // 더 큰 고유 값 사용

// 또는 두 개의 정수로 구성된 64비트 키 사용
const LOCK_NAMESPACE = 1987; // 애플리케이션 네임스페이스
const LOCK_KEY = 654321;     // 정산 작업 식별자
// pg_try_advisory_lock(LOCK_NAMESPACE, LOCK_KEY) 형태로 사용
```

### 3. 🟡 **락 타임아웃 부재**

**문제**:
현재 코드는 락이 해제될 때까지 무한정 대기할 수 있는 구조입니다. 만약 락 소유 프로세스가 크래시되면:

```javascript
// 프로세스 A: 락 획득 후 크래시 (unlock 실행 안 됨)
// 프로세스 B: 락 획득 실패 → 영구 스킵
// 프로세스 C: 락 획득 실패 → 영구 스킵
// ...
// 결과: 정산 작업이 완전히 멈춤!
```

PostgreSQL Advisory Lock은 **세션이 끊어지면 자동 해제**되지만, 네트워크 문제나 예기치 않은 상황에서는 락이 남을 수 있습니다.

**권장 해결책 1 - 타임스탬프 기반 락 만료**:
```javascript
const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10분

schedule.scheduleJob('*/15 * * * *', async () => {
  let lockAcquired = false;
  try {
    const [[{ lock }]] = await sequelize.query(
      `SELECT pg_try_advisory_lock(${SETTLEMENT_LOCK_KEY}) as lock`
    );
    lockAcquired = lock;

    if (!lockAcquired) {
      console.log('⏭️ [Scheduler] 다른 정산 프로세스가 실행 중입니다.');

      // 🆕 락이 너무 오래 유지되고 있는지 확인
      const lastLockTime = await getLastLockTime(); // Redis/DB에 저장된 시간
      const now = Date.now();

      if (lastLockTime && (now - lastLockTime > LOCK_TIMEOUT_MS)) {
        console.warn('⚠️ [Scheduler] 락이 10분 이상 유지됨. 강제 해제 시도.');

        // 강제 락 해제
        await sequelize.query(`SELECT pg_advisory_unlock_all()`);

        // 재시도
        const [[{ lockRetry }]] = await sequelize.query(
          `SELECT pg_try_advisory_lock(${SETTLEMENT_LOCK_KEY}) as lock`
        );
        lockAcquired = lockRetry;
      } else {
        return; // 정상적으로 스킵
      }
    }

    // 🆕 락 획득 시간 기록
    await setLastLockTime(Date.now());

    // ... 정산 로직
  } finally {
    if (lockAcquired) {
      await sequelize.query(`SELECT pg_advisory_unlock(${SETTLEMENT_LOCK_KEY})`);
      await clearLastLockTime();
    }
  }
});
```

**권장 해결책 2 - 세션 레벨 락 대신 트랜잭션 레벨 락 사용**:
```javascript
// pg_advisory_lock 대신 pg_try_advisory_xact_lock 사용
// 트랜잭션이 끝나면 자동 해제됨
const transaction = await sequelize.transaction();
try {
  const [[{ lock }]] = await sequelize.query(
    `SELECT pg_try_advisory_xact_lock(${SETTLEMENT_LOCK_KEY}) as lock`,
    { transaction }
  );

  if (!lock) {
    await transaction.rollback();
    return;
  }

  // 정산 로직...
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

### 4. 🟡 **에러 발생 시 락 해제 누락 가능성**

**문제**:
`finally` 블록에서 락 해제를 시도하지만, `sequelize.query()` 자체가 실패하면 락이 해제되지 않을 수 있습니다.

**시나리오**:
```javascript
try {
  // 락 획득 성공
  lockAcquired = true;

  // 정산 로직 중 DB 연결 끊김
  await betResultService.updateBetResults(); // DB 에러 발생
} finally {
  if (lockAcquired) {
    // DB 연결이 끊어진 상태에서 unlock 시도
    await sequelize.query(`SELECT pg_advisory_unlock(...)`); // 실패!
  }
}
```

**권장 해결책**:
```javascript
finally {
  if (lockAcquired) {
    try {
      await sequelize.query(
        `SELECT pg_advisory_unlock(${SETTLEMENT_LOCK_KEY})`,
        { timeout: 5000 } // 5초 타임아웃
      );
      console.log('✅ [Scheduler] 정산 작업 완료 (Lock 해제)');
    } catch (unlockError) {
      console.error('❌ [Scheduler] Lock 해제 실패:', unlockError.message);

      // 🆕 락 해제 실패 알림 (Slack/Discord)
      await sendAlert({
        type: 'LOCK_RELEASE_FAILED',
        lockKey: SETTLEMENT_LOCK_KEY,
        error: unlockError.message
      });
    }
  }
}
```

### 5. 🟡 **Sequelize 연결 풀 이슈**

**문제**:
`createScriptSequelize()`로 생성한 인스턴스는 별도의 연결 풀을 사용합니다. 이는 다음 문제를 야기할 수 있습니다:

1. **메모리 낭비**: 메인 애플리케이션과 별도의 DB 연결 유지
2. **락 세션 불일치**: 락을 획득한 세션과 정산 로직을 실행하는 세션이 다를 수 있음

```javascript
// scriptDatabase.js에서 생성한 연결로 락 획득
const sequelize = createScriptSequelize();
await sequelize.query(`SELECT pg_try_advisory_lock(...)`);

// 하지만 betResultService는 다른 sequelize 인스턴스 사용
await betResultService.updateBetResults(); // 다른 DB 연결!
```

PostgreSQL Advisory Lock은 **세션별**로 유지되므로, 락을 획득한 연결과 다른 연결에서는 락의 보호를 받지 못합니다.

**권장 해결책**:
```javascript
// 메인 애플리케이션의 sequelize 인스턴스 사용
import sequelize from '../models/sequelize.js'; // 기존 인스턴스

// 또는 모든 정산 작업을 동일한 트랜잭션 내에서 실행
const transaction = await sequelize.transaction();
try {
  const [[{ lock }]] = await sequelize.query(
    `SELECT pg_try_advisory_xact_lock(${SETTLEMENT_LOCK_KEY}) as lock`,
    { transaction }
  );

  if (!lock) {
    await transaction.rollback();
    return;
  }

  // 모든 정산 작업을 동일한 트랜잭션에 포함
  await betResultService.updateBetResults(transaction);
  await exchangeService.settleAllConnectedOrders(transaction);
  await multibetSettlementService.settleAllMultibetOrders(transaction);

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

### 6. 🔴 **betResultService 내부 락과 충돌**

**매우 중요한 문제**:

현재 `betResultService.js`에는 이미 내부 락이 구현되어 있습니다:

```javascript
// betResultService.js:19-20
let isSettling = false;

async updateBetResults() {
  if (isSettling) {
    console.log('⏭️ [SETTLEMENT_LOCK] 이미 정산이 진행 중입니다.');
    return { updatedCount: 0, errorCount: 0, skipped: true };
  }

  isSettling = true;
  try {
    // ... 정산 로직
  } finally {
    isSettling = false;
  }
}
```

**문제**:
- 스케줄러 레벨에서 Advisory Lock 추가 시 **이중 락** 발생
- `betResultService`의 `isSettling` 플래그는 **프로세스 내부**에만 유효
- Advisory Lock은 **데이터베이스 레벨**에서 작동

**시나리오**:
```
서버 A 스케줄러: Advisory Lock 획득 ✅
  → betResultService: isSettling = true ✅

서버 B 스케줄러: Advisory Lock 획득 실패 ❌ → 스킵
  (정상 작동)

하지만 서버 A 내부에서 다른 코드가 betResultService 호출 시:
  → isSettling = true → 내부 락으로 방어 ✅
  (Advisory Lock은 동일 세션이므로 통과)
```

**권장 조치**:
1. **옵션 1**: `betResultService` 내부 락 제거하고 스케줄러 락에만 의존
2. **옵션 2**: 두 락을 모두 유지 (방어적 프로그래밍)

```javascript
// 옵션 2 권장: 이중 방어
// 스케줄러: 서버 간 동시 실행 방지
// betResultService: 프로세스 내 동시 호출 방지
```

### 7. 🟡 **모니터링 및 관찰성 부족**

**문제**:
락 획득 실패 시 단순히 로그만 남기고 넘어가므로, 문제 발생 시 추적이 어렵습니다.

**권장 개선**:
```javascript
// 메트릭 수집
let lockFailureCount = 0;
let lastLockFailureTime = null;

if (!lockAcquired) {
  lockFailureCount++;
  lastLockFailureTime = new Date();

  console.log(`⏭️ [Scheduler] Lock 획득 실패 (${lockFailureCount}회 연속)`);

  // 연속 실패 시 알림
  if (lockFailureCount > 3) {
    await sendAlert({
      type: 'LOCK_ACQUISITION_FAILED',
      count: lockFailureCount,
      lastFailure: lastLockFailureTime
    });
  }

  return;
}

// 락 획득 성공 시 카운터 리셋
lockFailureCount = 0;
```

## 🎯 최종 권장 코드

```javascript
// server/jobs/settlementScheduler.js
import schedule from 'node-schedule';
import gameResultService from '../services/gameResultService.js';
import betResultService from '../services/betResultService.js';
import multibetSettlementService from '../services/multibetSettlementService.js';
import exchangeSettlementService from '../services/exchangeSettlementService.js';
import sequelize from '../models/sequelize.js'; // 메인 sequelize 사용

// 🔒 Advisory Lock 설정
const LOCK_NAMESPACE = 1987654321; // LikeBetFair 애플리케이션 네임스페이스
const SETTLEMENT_LOCK_KEY = 1;     // 정산 작업 ID
const LOCK_TIMEOUT_MS = 20 * 60 * 1000; // 20분 (정산 작업 최대 소요 시간)

let lockFailureCount = 0;
let lastSettlementStartTime = null;

console.log('⏰ [Scheduler] 정산 스케줄러가 활성화되었습니다.');

// 매 30분마다 경기 결과 수집
schedule.scheduleJob('*/30 * * * *', async () => {
  console.log('⚙️ [Scheduler] 경기 결과 수집 작업을 시작합니다...');
  try {
    const result = await gameResultService.fetchAndSaveAllResults();
    console.log(`✅ [Scheduler] 경기 결과 수집 완료: 신규 ${result.newCount}개, 업데이트 ${result.updatedCount}개`);
  } catch (error) {
    console.error('❌ [Scheduler] 경기 결과 수집 중 오류 발생:', error);
  }
});

// 매 15분마다 베팅 정산
schedule.scheduleJob('*/15 * * * *', async () => {
  let lockAcquired = false;
  const startTime = Date.now();

  try {
    // 🔒 Step 1: Advisory Lock 획득 시도
    const [[{ lock }]] = await sequelize.query(
      `SELECT pg_try_advisory_lock(${LOCK_NAMESPACE}, ${SETTLEMENT_LOCK_KEY}) as lock`
    );
    lockAcquired = lock;

    if (!lockAcquired) {
      lockFailureCount++;
      console.log(`⏭️ [Scheduler] 다른 정산 프로세스가 실행 중입니다. (${lockFailureCount}회 연속 실패)`);

      // 🚨 타임아웃 체크: 마지막 정산이 너무 오래 걸리면 경고
      if (lastSettlementStartTime && (startTime - lastSettlementStartTime > LOCK_TIMEOUT_MS)) {
        console.error(`🚨 [Scheduler] 정산 작업이 ${LOCK_TIMEOUT_MS / 60000}분 이상 실행 중! 데드락 가능성 확인 필요.`);
        // 알림 전송 (Slack/Discord)
      }

      return;
    }

    // 락 획득 성공
    lockFailureCount = 0;
    lastSettlementStartTime = startTime;
    console.log('⚙️ [Scheduler] 베팅 정산 작업을 시작합니다... (Lock 획득)');

    // Step 2: 정산 작업 실행
    // 1. 스포츠북 정산
    const betResult = await betResultService.updateBetResults();
    console.log(`✅ [Scheduler] 스포츠북 정산: ${betResult.updatedCount}개 완료`);

    // 2. 익스체인지 일반 주문 정산
    const exchangeService = new exchangeSettlementService();
    const exchangeResult = await exchangeService.settleAllConnectedOrders();
    console.log(`✅ [Scheduler] 익스체인지 일반 주문 정산: ${exchangeResult?.totalSettled || 0}개 완료`);

    // 3. 익스체인지 멀티베팅 정산
    const multibetResult = await multibetSettlementService.settleAllMultibetOrders();
    console.log(`✅ [Scheduler] 익스체인지 멀티베팅 정산: ${multibetResult?.settledCount || 0}개 완료`);

    const duration = Date.now() - startTime;
    console.log(`✅ [Scheduler] 전체 정산 완료 (소요 시간: ${duration}ms)`);

  } catch (error) {
    console.error('❌ [Scheduler] 베팅 정산 중 오류 발생:', error);
    // 오류 알림 전송
  } finally {
    // 🔓 Step 3: Advisory Lock 해제 (항상 실행)
    if (lockAcquired) {
      try {
        await sequelize.query(
          `SELECT pg_advisory_unlock(${LOCK_NAMESPACE}, ${SETTLEMENT_LOCK_KEY})`,
          { timeout: 5000 }
        );
        console.log('🔓 [Scheduler] Lock 해제 완료');
        lastSettlementStartTime = null;
      } catch (unlockError) {
        console.error('❌ [Scheduler] Lock 해제 실패:', unlockError.message);
        // 치명적 오류: 즉시 알림 전송
      }
    }
  }
});

console.log('📅 [Scheduler] 스케줄 등록 완료:');
console.log('   - 경기 결과 수집: 매 30분마다 실행');
console.log('   - 베팅 정산: 매 15분마다 실행 (Advisory Lock 적용됨)');
console.log(`   - Lock Key: pg_advisory_lock(${LOCK_NAMESPACE}, ${SETTLEMENT_LOCK_KEY})`);
```

## 📊 테스트 방법

### Advisory Lock 작동 확인

```sql
-- 현재 활성화된 락 조회
SELECT
  locktype,
  classid,
  objid,
  mode,
  granted,
  pid,
  pg_blocking_pids(pid) as blocking_pids
FROM pg_locks
WHERE locktype = 'advisory'
ORDER BY pid;

-- 특정 락이 획득되어 있는지 확인
SELECT pg_try_advisory_lock(1987654321, 1);
-- true: 락 획득 가능
-- false: 이미 락이 획득되어 있음

-- 수동으로 락 해제 (테스트용)
SELECT pg_advisory_unlock(1987654321, 1);
SELECT pg_advisory_unlock_all(); -- 모든 락 해제
```

### 동시 실행 테스트

```bash
# 터미널 1
npm run start

# 터미널 2 (별도 서버 인스턴스)
npm run start

# 두 서버에서 동시에 15분 단위로 정산 실행 시,
# 하나만 Lock 획득하고 나머지는 스킵하는지 확인
```

## 🎯 결론

제안된 Advisory Lock 방식은 **매우 우수한 솔루션**이지만, 다음 개선 사항 적용 필요:

1. ✅ **필수**: 문법 오류 수정
2. ✅ **필수**: 메인 sequelize 인스턴스 사용
3. ✅ **권장**: 두 개의 정수로 구성된 64비트 락 키 사용
4. ✅ **권장**: 락 타임아웃 체크 추가
5. ✅ **권장**: 락 해제 실패 시 에러 처리 강화
6. 🔄 **선택**: `betResultService` 내부 락과의 조율

위 최종 권장 코드를 사용하면 안전하고 견고한 정산 시스템을 구축할 수 있습니다.
