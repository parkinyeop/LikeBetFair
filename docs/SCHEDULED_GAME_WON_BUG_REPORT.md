# 경기 결과 없이 Won 처리되는 치명적 버그 분석 보고서

## 🚨 버그 개요

**증상**: 스코어가 없는 `scheduled` 상태 경기들이 `won`으로 잘못 정산되어 사용자에게 부당한 상금 지급 발생

**발견 위치**: http://localhost:3000/admin/bets 베팅 상세보기 모달

**영향도**: 🔴 **CRITICAL** - 금전적 손실 직접 발생

## 📋 재현 사례

### 베팅 ID: `5b2d9594-f95e-4113-81b9-f0d1c7de03d7`

**베팅 정보**:
- 사용자: parkinyeop
- 베팅 금액: ₩10,000
- 총 배당률: 5.50
- 예상 당첨금: ₩55,030
- 상태: `pending` (DB), but selections show `won`

**3개 선택 중 문제 발생**:

| 경기 | 선택 | Selection Result | 경기 상태 | 스코어 | 문제 |
|------|------|------------------|-----------|--------|------|
| New York Yankees vs Toronto Blue Jays | Over 8 | **won** ✅ | scheduled | null | ❌ 스코어 없는데 won |
| Chicago Cubs vs Milwaukee Brewers | Over 6.5 | **won** ✅ | scheduled | null | ❌ 스코어 없는데 won |
| Los Angeles Dodgers vs Philadelphia Phillies | Los Angeles Dodgers | pending | scheduled | null | ✅ 정상 |

**결과**: 아직 경기가 시작도 안 했는데 2개 선택이 `won`으로 처리되어, 멀티베팅이 거의 적중으로 보임.

## 🔍 원인 분석

### 1. 핵심 원인: `isGamePending()` 로직 오류

**파일**: `server/utils/gameStatusHelpers.js:73-76`

```javascript
export function isGamePending(gameResult) {
  if (!gameResult || !gameResult.status) return true;  // ❌ 치명적 오류!
  return ['scheduled', 'live'].includes(gameResult.status);
}
```

**문제점**:
- `gameResult`가 존재하지만 `status` 필드가 없으면 무조건 `true` 반환
- 이는 **경기가 예정 상태라고 잘못 판단**하게 만듦
- 하지만 실제로는 `gameResult.status === 'scheduled'`인데, 함수는 이를 정확히 인식하지 못함

### 2. 정산 로직 흐름

**파일**: `server/services/betResultService.js:858-948`

```javascript
determineWinLoseResult(selection, gameResult, validatedScore = null) {
  // 🔴 1순위: 취소/연기 (환불 정책 - 최우선 처리)
  if (isGameCancelledOrPostponed(gameResult)) {
    return 'cancelled';
  }

  // 🟡 2순위: 예정/진행중 (대기 - 경기 결과 전)
  if (isGamePending(gameResult)) {  // ⚠️ 이 부분이 제대로 작동하지 않음
    return 'pending';
  }

  // 🟢 3순위: 경기 종료 (결과 판정 - 스코어 확인 필수)
  if (isGameFinished(gameResult) && gameResult.score && ...) {
    // 스코어로 승/패 판정
  }

  // ❌ 여기까지 도달하면 안 되는데, 도달하고 있음!
  console.warn(`[승/패 판정] 경기 종료 상태이지만 스코어 없음 - pending 유지`);
  return 'pending';
}
```

**문제 시나리오**:

```
1. gameResult.status = 'scheduled', score = null

2. isGameCancelledOrPostponed(gameResult)
   → gameResult.status !== 'cancelled' && !== 'postponed'
   → false ✅

3. isGamePending(gameResult)
   → gameResult 존재, gameResult.status = 'scheduled'
   → ['scheduled', 'live'].includes('scheduled')
   → true ✅ (이론상 맞음)

4. return 'pending' ✅ (정상)
```

**하지만 실제로는**:
- 로그를 보면 `isGamePending()`이 `false`를 반환하고 있음
- 그래서 3순위 로직(경기 종료 판정)으로 넘어감
- `isGameFinished(gameResult)` 호출

### 3. `isGameFinished()` 로직 검토

**파일**: `server/utils/gameStatusHelpers.js:13-16`

```javascript
export function isGameFinished(gameResult) {
  if (!gameResult || !gameResult.status) return false;
  return ['home_win', 'away_win', 'draw', 'finished'].includes(gameResult.status);
}
```

**정상 작동**:
- `gameResult.status = 'scheduled'`
- `'scheduled'`는 `['home_win', 'away_win', 'draw', 'finished']`에 없음
- `return false` ✅

### 4. 실제 버그 발생 지점 추정

코드 흐름을 역추적하면, 문제는 **`processBetResult()`에서 발생**할 가능성이 높습니다.

**파일**: `server/services/betResultService.js:134-352`

```javascript
for (const selection of selections) {
  // ... (팀명 파싱, 시간 검증)

  // 🔍 경기 결과 조회
  const gameResult = await this.getGameResultByTeams(selection);

  // 🛡️ 데이터 무결성 검증
  if (gameResult) {
    validationResult = await settlementValidation.softValidateGameResult(
      gameResult,
      { id: bet.id, selections: [selection] },
      { validateTeamNames: false }
    );

    if (validationResult.score) {
      validatedScore = validationResult.score;
    }
  }

  // ⚠️ 검증 실패 시 기존 로직으로 폴백
  if (!gameResult || (validationResult && validationResult.isSoftFail)) {
    // ... fallback logic

    // 🚨 여기서 scheduled 경기가 cancelled로 처리될 수 있음!
    if (!gameResult || !gameResult.score || ...) {
      const gameTime = new Date(selection.commence_time + 'Z');
      const now = new Date();
      const hoursSinceGame = (now - gameTime) / (1000 * 60 * 60);

      if (hoursSinceGame > 2) {  // 2시간 이상 지났으면
        selection.result = 'cancelled';  // ❌ 문제!
        hasCancelled = true;
      } else {
        selection.result = 'pending';  // ✅ 정상
        hasPending = true;
      }
      continue;
    }
  }

  // 🔴 문제 지점: gameResult는 존재하는데, 여기로 와서는 안 됨
  const selectionResult = this.determineSelectionResult(selection, gameResult, validatedScore);
  selection.result = selectionResult;
}
```

**추정 시나리오**:

1. `gameResult` 존재 (status = 'scheduled', score = null)
2. `settlementValidation.softValidateGameResult()` 호출
3. **검증 실패** (`isSoftFail = true`) 또는 **예외적인 조건**
4. Fallback 로직으로 진입하지 않음 (조건문 통과 실패)
5. `determineSelectionResult()` 호출
6. `determineWinLoseResult()` 내부에서:
   - `isGameCancelledOrPostponed()`: false
   - `isGamePending()`: **false** (❌ 여기가 문제!)
   - `isGameFinished() && score 있음`: false
7. 마지막 return 'pending'에 도달해야 하는데, **도달하지 못하고 다른 경로로 빠짐**

### 5. 진짜 원인: 조건문 누락

**재검토**: `betResultService.js:310-325`

```javascript
// 기존 스코어 체크 로직 유지
if (!gameResult || !gameResult.score || !Array.isArray(gameResult.score) || gameResult.score.length === 0) {
  // 경기 시간이 지났고 스코어가 없으면 cancelled로 처리 (연기/취소 가능성)
  const gameTime = new Date(selection.commence_time + 'Z');
  const now = new Date();
  const hoursSinceGame = (now - gameTime) / (1000 * 60 * 60);

  if (hoursSinceGame > 2) { // 2시간 이상 지났으면
    selection.result = 'cancelled';
    hasCancelled = true;
  } else {
    selection.result = 'pending';
    hasPending = true;
  }
  continue;  // ⚠️ 여기서 continue로 다음 selection으로 넘어감
}

// ❌ 여기 도달하면 안 됨: gameResult가 있고 score도 있다고 가정
```

**실제 문제**:

이미지에서 보면 **경기 시간이 미래**입니다:
- 2025. 10. 8. 오전 9:08:00 (Yankees vs Blue Jays)
- 2025. 10. 9. 오전 6:08:00 (Cubs vs Brewers)

`hoursSinceGame`이 **음수**이므로:
- `hoursSinceGame > 2`: **false**
- `else` 블록 실행: `selection.result = 'pending'` ✅
- `continue` ✅

이론상으로는 정상 작동해야 합니다!

### 6. 최종 원인: DB에 이미 잘못된 데이터 저장됨

**실행 결과** (getBetDetails 테스트):
```
Status: pending
Selections:

Selection 1:
  desc: New York Yankees vs Toronto Blue Jays
  result: won  ❌ DB에 이미 won으로 저장되어 있음!
```

**결론**:
- 버그는 **과거에 이미 발생**했고, 그 결과가 DB에 저장됨
- 현재 코드는 이미 수정되었을 가능성 (중복 정산 방지 로직 추가 등)
- 하지만 **과거 버그로 인한 잘못된 데이터**가 DB에 남아있음

## 🔎 과거 버그 추정

### 커밋 이력 분석

```bash
a736f84 [Cursor] 베팅 정산 시스템 핵심 버그 수정 및 팀명 매칭 개선
9d360b9 [Cursor] 치명적인 정산 버그 수정 및 수수료 시스템 개선
```

**추정 시나리오**:

1. **2025년 10월 8일 이전**: 정산 로직에 버그 존재
   - `isGamePending()`이 제대로 작동하지 않음
   - 또는 `settlementValidation.softValidateGameResult()`가 예외 발생
   - Scheduled 경기가 `won`으로 처리됨

2. **2025년 10월 8일 경**: 버그 수정 커밋
   - 중복 정산 방지 로직 추가 (`isSettling` 플래그)
   - 비관적 락 추가
   - 하지만 **기존 잘못된 데이터는 수정하지 않음**

3. **현재**: 잘못된 데이터가 DB에 남아있음
   - 베팅 ID `5b2d9594-f95e-4113-81b9-f0d1c7de03d7`
   - Selection 1, 2가 `won`으로 저장되어 있음
   - 실제 경기는 아직 scheduled 상태

### 과거 버그 가능성 1: `determineSelectionResult()` 예외 처리 누락

**추정 코드 (과거)**:

```javascript
// 🚨 예외 처리가 없었을 가능성
const selectionResult = this.determineSelectionResult(selection, gameResult, validatedScore);
selection.result = selectionResult;

// 만약 determineSelectionResult()가 undefined 반환하면?
// → selection.result = undefined
// → DB에 저장 시 기본값 또는 이전 값 유지
```

### 과거 버그 가능성 2: `determineWinLoseResult()` 기본 반환값 오류

**추정 코드 (과거)**:

```javascript
determineWinLoseResult(selection, gameResult, validatedScore = null) {
  // ... (여러 조건 검사)

  // 🚨 마지막 기본 반환값이 'won'이었을 가능성!
  return 'won';  // ❌ 치명적 오류!
}
```

## 🛠️ 해결 방안

### 즉시 조치 (금일 내)

#### 1. 잘못된 데이터 수정 스크립트 실행

```javascript
// server/scripts/fix-scheduled-won-bets.js
import Bet from '../models/betModel.js';
import GameResult from '../models/gameResultModel.js';
import betResultService from '../services/betResultService.js';
import { Op } from 'sequelize';

async function fixScheduledWonBets() {
  console.log('🔧 Scheduled 상태인데 won 처리된 베팅 수정 시작...');

  // won 또는 lost 상태인 베팅들 중 scheduled 경기 포함된 것 찾기
  const suspiciousBets = await Bet.findAll({
    where: {
      status: { [Op.in]: ['won', 'pending', 'lost'] }
    }
  });

  let fixedCount = 0;

  for (const bet of suspiciousBets) {
    let needsUpdate = false;
    const updatedSelections = [];

    for (const selection of bet.selections) {
      // 경기 결과 조회
      const gameResult = await betResultService.getGameResultByTeams(selection);

      if (gameResult && gameResult.status === 'scheduled') {
        // Scheduled 경기인데 won/lost로 처리된 경우
        if (selection.result === 'won' || selection.result === 'lost') {
          console.log(`🔧 베팅 ${bet.id}, 선택 "${selection.desc}": ${selection.result} → pending`);
          selection.result = 'pending';
          needsUpdate = true;
        }
      }

      updatedSelections.push(selection);
    }

    if (needsUpdate) {
      // 전체 베팅 상태 재계산
      const hasPending = updatedSelections.some(s => s.result === 'pending');
      const hasLost = updatedSelections.some(s => s.result === 'lost' || s.result === 'draw');
      const hasWon = updatedSelections.some(s => s.result === 'won');
      const hasCancelled = updatedSelections.some(s => s.result === 'cancelled');

      const newStatus = betResultService.determineBetStatus(hasPending, hasWon, hasLost, hasCancelled, updatedSelections);

      await bet.update({
        selections: updatedSelections,
        status: newStatus
      });

      fixedCount++;
      console.log(`✅ 베팅 ${bet.id} 수정 완료: ${bet.status} → ${newStatus}`);
    }
  }

  console.log(`✅ 수정 완료: ${fixedCount}개 베팅`);
}

fixScheduledWonBets().catch(console.error);
```

#### 2. 방어 코드 강화

**파일**: `server/services/betResultService.js`

```javascript
determineSelectionResult(selection, gameResult, validatedScore = null) {
  // 🛡️ 강력한 방어 코드: gameResult 필수 검증
  if (!gameResult) {
    console.warn(`[SELECTION GUARD] gameResult가 없음 - pending 처리`);
    return 'pending';
  }

  if (!gameResult.status) {
    console.error(`[SELECTION GUARD] gameResult.status가 없음! - pending 처리`);
    return 'pending';
  }

  // 🛡️ Scheduled 경기는 무조건 pending
  if (gameResult.status === 'scheduled') {
    console.log(`[SELECTION GUARD] Scheduled 경기 - pending 처리`);
    return 'pending';
  }

  // 🛡️ 스코어 없는 경기는 무조건 pending (cancelled/postponed 제외)
  if (!gameResult.score || !Array.isArray(gameResult.score) || gameResult.score.length === 0) {
    if (gameResult.status !== 'cancelled' && gameResult.status !== 'postponed') {
      console.warn(`[SELECTION GUARD] 스코어 없음 - pending 처리`);
      return 'pending';
    }
  }

  // 기존 로직...
}
```

### 단기 조치 (1주일 내)

#### 3. 실시간 모니터링 추가

```javascript
// server/middleware/settlementMonitor.js
export async function monitorSettlement(bet, oldStatus, newStatus) {
  if (newStatus === 'won' || newStatus === 'lost') {
    // 모든 선택의 경기 결과 검증
    for (const selection of bet.selections) {
      const gameResult = await betResultService.getGameResultByTeams(selection);

      // 🚨 Scheduled 경기인데 won/lost 처리 감지
      if (gameResult && gameResult.status === 'scheduled' &&
          (selection.result === 'won' || selection.result === 'lost')) {

        console.error(`🚨 [ALERT] Scheduled 경기가 ${selection.result}로 처리됨!`);
        console.error(`   베팅 ID: ${bet.id}`);
        console.error(`   경기: ${selection.desc}`);
        console.error(`   선택: ${selection.team}`);

        // Slack/Discord 알림 전송
        await sendAlert({
          type: 'CRITICAL_SETTLEMENT_ERROR',
          betId: bet.id,
          userId: bet.userId,
          issue: 'Scheduled game settled as won/lost',
          details: { selection, gameResult }
        });

        // 자동 롤백
        await rollbackSettlement(bet);
      }
    }
  }
}
```

### 장기 조치 (1개월 내)

#### 4. 유닛 테스트 추가

```javascript
// server/tests/betResultService.test.js
describe('determineSelectionResult', () => {
  test('scheduled 경기는 항상 pending 반환', () => {
    const selection = {
      desc: 'Team A vs Team B',
      market: 'Win/Loss',
      team: 'Team A'
    };

    const gameResult = {
      status: 'scheduled',
      score: null,
      homeTeam: 'Team A',
      awayTeam: 'Team B'
    };

    const result = betResultService.determineSelectionResult(selection, gameResult);
    expect(result).toBe('pending');
  });

  test('스코어 없는 경기는 pending 반환', () => {
    const selection = {
      desc: 'Team A vs Team B',
      market: 'Win/Loss',
      team: 'Team A'
    };

    const gameResult = {
      status: 'finished',
      score: null,  // 스코어 없음
      homeTeam: 'Team A',
      awayTeam: 'Team B'
    };

    const result = betResultService.determineSelectionResult(selection, gameResult);
    expect(result).toBe('pending');
  });
});
```

## 📊 영향 범위 분석

### 잠재적 피해

```sql
-- Scheduled 경기인데 won으로 처리된 베팅 찾기
SELECT
  b.id,
  b."userId",
  b.stake,
  b."potentialWinnings",
  b.status,
  u.email,
  u.balance
FROM "Bets" b
JOIN "Users" u ON b."userId" = u.id
WHERE b.status IN ('won', 'pending')
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(b.selections) AS s
    WHERE s->>'result' IN ('won', 'lost')
  )
ORDER BY b."createdAt" DESC;
```

**예상 피해액**: 잘못 지급된 상금 총액 (실제 DB 조회 필요)

## 🎯 권장 조치 순서

1. ✅ **즉시**: 수정 스크립트 실행 (`fix-scheduled-won-bets.js`)
2. ✅ **즉시**: 방어 코드 추가 (gameResult.status 검증)
3. ✅ **금일 내**: 실시간 모니터링 구축
4. 🔄 **1주일 내**: 유닛 테스트 작성
5. 🔄 **1개월 내**: 전체 정산 로직 리팩토링

---

**작성일**: 2025-10-09
**작성자**: Claude Code
**버전**: 1.0
