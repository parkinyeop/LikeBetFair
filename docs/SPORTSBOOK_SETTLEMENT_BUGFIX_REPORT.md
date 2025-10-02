# 스포츠북 정산 시스템 버그 수정 종합 보고서

## 📋 작업 개요

**작업 기간**: 2025-10-02  
**작업 목적**: 9월 30일 이후 스포츠북 정산 실패 문제 해결  
**작업 범위**: 정산 로직, 팀명 매칭, 관리자 페이지 표시  
**상태**: 🟡 부분 완료 (미해결 이슈 있음)

---

## 🎯 수정 완료된 버그

### 1. ✅ Draw 베팅 로직 오류

**문제**:
```javascript
// 수정 전
} else {
  console.log(`[승/패 판정] 무승부 → lost`);
  return 'lost'; // ❌ 무조건 lost
}
```

**현상**:
- Barracas Central vs Belgrano 경기 (1-1 무승부)
- 사용자 선택: Draw (무승부)
- 판정 결과: lost ❌ (잘못됨!)

**수정**:
```javascript
// 수정 후 (Line 767-772)
} else {
  // ✅ 무승부: Draw 선택했으면 won, 아니면 lost
  const isDraw = selection.team.toLowerCase() === 'draw';
  const result = isDraw ? 'won' : 'lost';
  console.log(`[승/패 판정] 무승부 (${homeScore}-${awayScore}) → ${selection.team} (Draw 선택: ${isDraw}) = ${result}`);
  return result;
}
```

**테스트 결과**:
- Barracas Central 1-1 Belgrano, Draw 선택 → **won** ✅

**파일**: `server/services/betResultService.js`

---

### 2. ✅ Accent 문자 정규화 누락

**문제**:
```javascript
// 수정 전 (normalizeTeamNameForComparison)
.replace(/[^a-z0-9가-힣]/g, '')  // ❌ Accent 문자 삭제

// 결과:
"São Paulo" → "sopaulo"  // ã 삭제됨
"Ceará"     → "cear"      // á 삭제됨
"Atlético"  → "atltico"   // é 삭제됨
```

**현상**:
- 브라질 리그: 0% 매칭 성공률
- 아르헨티나 리그: 33% 매칭 성공률
- 총 13건의 베팅 매칭 실패

**수정**:
```javascript
// 1. normalizeAccents 함수 추가 (Line 9-15)
function normalizeAccents(str) {
  if (!str) return '';
  // NFD 정규화 + Combining Diacritical Marks 제거
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// 2. normalizeTeamNameForComparison 개선 (Line 374-409)
function normalizeTeamNameForComparison(team) {
  // 1. Accent 정규화 (NFD → ASCII 변환)
  let normalized = normalizeAccents(team);  // ✅ 추가
  
  // 2. 소문자 변환
  normalized = normalized.toLowerCase().trim();
  
  // 3. 지역 접미사 제거 (공백 유지)
  normalized = normalized
    .replace(/[-\s](sp|rj|mg|ba|rs|pr|ce|pe)$/i, '')  // 브라질 주
    .replace(/\s+(ba|cordoba|sanjuan|tucuman|plata|buenos\s*aires)$/i, '');  // 아르헨티나
  
  // 4. 확장명 제거 (공백 유지)
  normalized = normalized
    .replace(/\b(club|clube|fc|sc|cf|ac)\b/gi, '')
    .replace(/\b(do|de|da|del|la|el|los|las)\b/gi, '');
  
  // 5. 모든 공백 및 특수문자 제거 (마지막에!)
  normalized = normalized
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9가-힣]/g, '');
  
  // 6. globalTeamMapping 적용
  // ...
}
```

**테스트 결과**:
```
✅ "São Paulo" → "saopaulo" (ã → a 변환)
✅ "Ceará" → "ceara" (á → a 변환)
✅ "Vélez Sarsfield BA" → "velezsarsfield"
✅ "Sport Club do Recife" → "sportrecife"
✅ "Estudiantes de La Plata" → "estudiantes"

매칭 성공률: 8/8 (100%)
```

**파일**: `server/normalizeUtils.js`

---

### 3. ✅ 브라질/아르헨티나 리그 데이터 수집 실패

**문제**:
```javascript
// 수정 전 (Line 881)
const activeCategories = [
  'KBO', 'MLB', 'NBA', 'NFL', 'MLS', 'CSL',
  'EPL', 'LaLiga', 'Bundesliga', 'SerieA', 'Ligue1',
  'JLeague', 'ArgentinaPrimera', 'Brasileirao'  // ← 첫 글자만 대문자
];

// Line 24
const clientSportKeyMap = {
  'BRASILEIRAO': 'soccer_brazil_campeonato',  // ← 전부 대문자
  // ...
};

// 결과: 매핑 실패!
```

**현상**:
```
No sport key found for Brasileirao
Found 0 events for ArgentinaPrimera  // API는 호출되지만 데이터 0개
```

**수정**:
```javascript
// Line 24 - clientSportKeyMap에 추가
'Brasileirao': 'soccer_brazil_campeonato',  // ✅ 첫 글자만 대문자 추가

// Line 305-316 - isNorthAmericanLeague에 추가
const seasonBasedLeagues = [
  // ... 기존 리그들
  'soccer_brazil_campeonato',             // ✅ 추가
  'soccer_argentina_primera_division'     // ✅ 추가
];
```

**테스트 결과**:
```
✅ Brasileirao: 30개 경기 업데이트
✅ Argentina Primera: 30개 경기 업데이트
```

**파일**: `server/services/gameResultService.js`

---

### 4. ✅ Sequelize JSONB 업데이트 이슈

**문제**:
```javascript
// 수정 전 (Line 361-362)
bet.selections = [...selections];
await bet.save({ transaction: t });

// DB 저장 결과:
bet.status: 'lost' ✅
bet.selections[0].result: undefined ❌  // 저장 안 됨!
```

**현상**:
- 정산 로직은 `selection.result = 'won'` 설정
- 메모리에서는 값이 있음
- DB에는 저장되지 않음

**원인**: Sequelize는 JSONB 필드 변경을 자동 감지하지 못함

**수정**:
```javascript
// 수정 후 (Line 361-363)
bet.selections = [...selections];
bet.changed('selections', true);  // ✅ 추가!
await bet.save({ transaction: t });
```

**테스트 결과**:
```
베팅 0bc97540:
  Selection 1: result: won ✅
  Selection 2: result: won ✅
  Selection 3: result: lost ✅
```

**파일**: `server/services/betResultService.js`

---

### 5. ✅ getGameResultByTeams 함수 누락

**문제**:
```javascript
// Line 585-640 - 주석처리됨
// 🚫 더 이상 사용하지 않는 메서드 (스코어 유무 기반으로 변경됨)
// async getGameResultByTeams(selection, pendingGameResultsCache = null) {
//   ... (주석처리)
// }

// Line 1117, 1585 - 호출 중
const gameResult = await betResultService.getGameResultByTeams(selection);
// ❌ TypeError: getGameResultByTeams is not a function
```

**현상**:
- 관리자 페이지에서 베팅 클릭 시 서버 에러
- 경기 결과 표시 실패

**수정**:
```javascript
// Line 585-652 - 함수 재구현
async getGameResultByTeams(selection) {
  // desc에서 팀명 추출
  const parts = selection.desc.split(' vs ');
  const homeTeam = parts[0].trim();
  const awayTeam = parts[1].trim();
  
  // 팀명 정규화 (Accent 처리)
  const normalizedHomeTeam = normalizeTeamNameForComparison(homeTeam);
  const normalizedAwayTeam = normalizeTeamNameForComparison(awayTeam);
  
  // ±48시간 범위 조회
  const candidateGames = await GameResult.findAll({
    where: {
      commenceTime: { [Op.between]: [start, end] },
      status: { [Op.in]: ['finished', 'cancelled', 'postponed', 'scheduled'] }
    }
  });
  
  // 정규화된 팀명으로 매칭
  for (const candidate of candidateGames) {
    const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
    const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
    
    if ((dbHomeNorm === normalizedHomeTeam && dbAwayNorm === normalizedAwayTeam) ||
        (dbHomeNorm === normalizedAwayTeam && dbAwayNorm === normalizedHomeTeam)) {
      return candidate;
    }
  }
  
  return null;
}
```

**파일**: `server/services/betResultService.js`

---

### 6. ✅ 관리자 페이지 경기 결과 표시 기능 추가

**문제**:
```typescript
// 수정 전
const handleBetClick = (bet: Bet) => {
  setSelectedBet(bet);  // ← gameResult 없음
  setShowBetDetail(true);
};
```

**현상**:
- 스코어 표시 안 됨
- 경기 상태 표시 안 됨
- 경기 결과 표시 안 됨

**수정**:
```typescript
// 1. 백엔드 API 개선 (server/routes/admin.js Line 1580-1612)
router.get('/bets/:id', verifyToken, requireAdmin(1), async (req, res) => {
  const bet = await Bet.findByPk(req.params.id, { include: [User] });
  
  // 🆕 각 selection에 gameResult 추가
  const selectionsWithResults = await Promise.all(
    bet.selections.map(async (selection) => {
      const gameResult = await betResultService.getGameResultByTeams(selection);
      return {
        ...selection,
        gameResult: gameResult ? {
          status: gameResult.status,
          result: gameResult.result,
          score: gameResult.score,
          homeTeam: gameResult.homeTeam,
          awayTeam: gameResult.awayTeam
        } : null
      };
    })
  );
  
  res.json({ bet: { ...bet.toJSON(), selections: selectionsWithResults } });
});

// 2. 프론트엔드 개선 (pages/admin/bets.tsx Line 861-882)
const handleBetClick = useCallback(async (bet: Bet) => {
  const response = await fetch(buildApiUrl(`/api/admin/bets/${bet.id}`), { headers });
  const data = await response.json();
  setSelectedBet(data.bet);  // ← gameResult 포함
  setShowBetDetail(true);
}, [getAuthHeaders]);

// 3. 스코어 표시 로직 개선 (Line 1888-1912)
{selection.gameResult && selection.gameResult.score && (
  <div>
    {(() => {
      const scores = selection.gameResult.score;
      
      // 배열 형식: [{"name":"팀명","score":"점수"}]
      if (Array.isArray(scores) && scores.length >= 2) {
        const homeScore = scores.find(s => s.name === selection.gameResult.homeTeam)?.score;
        const awayScore = scores.find(s => s.name === selection.gameResult.awayTeam)?.score;
        return `스코어: ${homeScore} - ${awayScore}`;
      }
      return '스코어: N/A';
    })()}
  </div>
)}

// 4. 경기 상태/결과 표시 추가 (Line 1915-1947)
{selection.gameResult && (
  <div>
    경기 상태: {finished ? '완료' : cancelled ? '취소' : postponed ? '연기' : '예정'}
    경기 결과: {home_win ? '홈팀 승리' : away_win ? '원정팀 승리' : '무승부'}
  </div>
)}
```

**테스트 결과**:
- ✅ 스코어 표시됨
- ✅ 경기 상태 표시됨
- ✅ 경기 결과 표시됨

**파일**: 
- `server/routes/admin.js`
- `pages/admin/bets.tsx`

---

### 7. ✅ 프론트엔드 'won'/'win' 값 불일치

**문제**:
```typescript
// 수정 전 (Line 1824-1830)
if (selection.result === 'win') {  // ❌ 백엔드는 'won' 저장
  return { result: '승리' };
} else if (selection.result === 'lose') {  // ❌ 백엔드는 'lost' 저장
  return { result: '패배' };
}
```

**수정**:
```typescript
// 수정 후 (Line 1838-1849)
if (selection.result === 'won' || selection.result === 'win') {  // ✅ 둘 다 처리
  return { result: '승리' };
} else if (selection.result === 'lost' || selection.result === 'lose') {
  return { result: '패배' };
}
```

**파일**: `pages/admin/bets.tsx`

---

## 🚨 발견했지만 미해결된 버그

### 버그 #1: scheduled 경기가 lost로 잘못 정산됨

**베팅 정보**:
```
베팅 ID: ebeae01a-6b00-432d-8591-d3a4f7caa8e9
경기: New York Yankees vs Boston Red Sox
경기 시간: 2025-10-02 오전 7:08 (한국 시간)
사용자 선택: New York Yankees
```

**GameResult 정보**:
```
homeTeam: New York Yankees
awayTeam: Boston Red Sox
commenceTime: 2025-10-01T22:08:00.000Z
status: scheduled  ← 아직 시작 안 함!
result: pending
score: null
```

**베팅 상태**:
```
bet.status: lost ❌ (잘못됨!)
selection.result: pending ✅ (정상)
```

**문제점**:
1. 경기가 아직 시작도 안 했음 (`scheduled`)
2. `selection.result = 'pending'` (정상)
3. 그런데 `bet.status = 'lost'` (비정상!)

**원인 가설**:

#### 가설 1: 이전 코드로 정산됨
- 10월 2일 2:49에 베팅 생성
- 코드 수정 전에 정산 스케줄러가 실행됨
- 이전 버전 로직에서 잘못 `lost` 처리
- 이후 정산 시 Line 101-104에서 건너뛰어짐:
  ```javascript
  if (bet.status === 'won' || bet.status === 'lost' || bet.status === 'cancelled') {
    console.log(`[베팅 처리] 이미 완료된 베팅 ${bet.id} 건너뛰기`);
    return true;  // ← 재정산 안 함!
  }
  ```

#### 가설 2: status 필터 불일치 (수정 완료)
- 정산 로직 (Line 183): `status: ['finished', 'cancelled', 'postponed']` ❌
- 상세 조회 (Line 620): `status: ['finished', 'cancelled', 'postponed', 'scheduled']` ✅
- Yankees 경기(`scheduled`)를 정산 시 못 찾음
- **수정 완료**: Line 183에 `'scheduled'` 추가

#### 가설 3: determineBetStatus 로직 문제
```javascript
determineBetStatus(hasPending, hasWon, hasLost, hasCancelled, selections) {
  if (hasPending) {
    return 'pending';  // ← 정상 로직
  }
  // ...
}
```

**로직은 정상입니다.** `selection.result = 'pending'`이면 `hasPending = true` → `'pending'` 반환해야 합니다.

**의문점**: 왜 `bet.status = 'lost'`가 되었을까?

---

### 버그 #2: 핸디캡 베팅이 정산되지 않음

**베팅 정보**:
```
베팅 ID: 5eea8e09-2889-40d8-8dc3-c11b16e4e338
```

**로그**:
```
Selection 1: Miami Dolphins (Win/Loss) → won ✅
Selection 2: Over 45.5 (Over/Under) → won ✅
Selection 3: Miami Dolphins (Win/Loss) → won ✅
Selection 4: Denver Broncos -7 (Handicap) → pending ❌
최종 상태: pending
```

**GameResult**:
```
Miami Dolphins 27-21 New York Jets (finished) ✅
Denver Broncos 28-3 Cincinnati Bengals (finished) ✅
```

**문제점**:
```
[핸디캡 판정] Denver Broncos -7
스코어: 28-3
핸디캡 적용: 28 + (-7) = 21 vs 3
결과: 21 > 3 → won이어야 함
실제: pending ❌
```

**원인**:
- `determineHandicapResult()` 함수에 로직 오류 가능성
- 또는 핸디캡 파싱 실패

---

## 📊 정산 결과 통계

### 전체 베팅 정산 현황
```
총 베팅 수: 91개
정산 완료: ~30개
정산 실패/대기: ~60개
```

### 실패 원인 분류

| 원인 | 건수 | 상태 |
|-----|------|------|
| 브라질/아르헨티나 매칭 실패 | ~20건 | ✅ 해결 |
| 핸디캡 로직 오류 | ~5건 | ❌ 미해결 |
| scheduled 경기 잘못 정산 | ~3건 | 🟡 수정했으나 재정산 필요 |
| 미래 경기 (K League 등) | ~10건 | ✅ 정상 (대기) |
| MLB 스코어 누락 | ~5건 | ⚠️ API 문제 |

---

## 🔧 수정 코드 요약

| 파일 | 수정 내용 | Line | 상태 |
|-----|---------|------|------|
| `server/normalizeUtils.js` | normalizeAccents 함수 추가 | 9-15 | ✅ |
| `server/normalizeUtils.js` | normalizeTeamNameForComparison 개선 | 374-409 | ✅ |
| `server/services/gameResultService.js` | Brasileirao 매핑 추가 | 24 | ✅ |
| `server/services/gameResultService.js` | 시즌 기반 리그에 남미 추가 | 305-316 | ✅ |
| `server/services/betResultService.js` | Draw 로직 수정 | 767-772, 793-796 | ✅ |
| `server/services/betResultService.js` | Sequelize JSONB 명시 | 362 | ✅ |
| `server/services/betResultService.js` | getGameResultByTeams 재구현 | 585-652 | ✅ |
| `server/services/betResultService.js` | scheduled 추가 | 183, 620 | ✅ |
| `server/routes/admin.js` | betResultService import | 22 | ✅ |
| `server/routes/admin.js` | GET /bets/:id 개선 | 1580-1617 | ✅ |
| `pages/admin/bets.tsx` | handleBetClick async | 861-882 | ✅ |
| `pages/admin/bets.tsx` | 스코어 표시 로직 | 1888-1912 | ✅ |
| `pages/admin/bets.tsx` | 경기 상태/결과 표시 | 1915-1947 | ✅ |
| `pages/admin/bets.tsx` | won/win 처리 | 1838-1849 | ✅ |

---

## 🤖 Gemini에게 질문할 사항

### 질문 1: scheduled 경기가 lost로 처리된 근본 원인

**상황**:
```
베팅 ID: ebeae01a-6b00-432d-8591-d3a4f7caa8e9
경기: Yankees vs Red Sox (scheduled, 아직 시작 안 함)
selection.result: pending ✅
bet.status: lost ❌
```

**코드 분석 결과**:
- `determineBetStatus()` 로직: `hasPending = true`이면 `'pending'` 반환 (정상)
- `processBetResult()`: `selection.result = 'pending'` 설정 (정상)
- 그런데 `bet.status = 'lost'`

**질문**:
1. `selection.result = 'pending'`인데 `bet.status = 'lost'`가 되는 경로가 있을까요?
2. 트랜잭션 롤백/커밋 문제로 부분 업데이트가 발생했을 가능성?
3. 다른 프로세스(스케줄러)와의 동시성 문제?

**코드**:
```javascript
// server/services/betResultService.js

// Line 99-104: 이미 완료된 베팅 건너뛰기
async processBetResult(bet) {
  if (bet.status === 'won' || bet.status === 'lost' || bet.status === 'cancelled') {
    console.log(`[베팅 처리] 이미 완료된 베팅 ${bet.id} (${bet.status}) 건너뛰기`);
    return true;  // ⚠️ 재정산 안 함
  }
  // ...
}

// Line 378-415: 베팅 상태 결정
determineBetStatus(hasPending, hasWon, hasLost, hasCancelled, selections) {
  if (hasPending) {
    return 'pending';  // ✅ 정상 로직
  }
  // ...
}

// Line 358-373: DB 저장
const t = await Bet.sequelize.transaction();
try {
  bet.status = betStatus;
  bet.selections = [...selections];
  bet.changed('selections', true);
  await bet.save({ transaction: t });
  // ...
  await t.commit();
} catch (err) {
  await t.rollback();
  throw err;
}
```

---

### 질문 2: 핸디캡 베팅이 정산되지 않는 이유

**상황**:
```
선택: Denver Broncos -7
실제 스코어: Denver 28-3 Cincinnati (finished)
핸디캡 적용: 28 + (-7) = 21 vs 3
예상 결과: 21 > 3 → won
실제 결과: pending ❌
```

**로그**:
```
[핸디캡 판정] Denver Broncos -7
   - 판정 결과: pending  ← 왜?
```

**관련 코드**:
```javascript
// Line 871-951: determineHandicapResult
determineHandicapResult(selection, gameResult, validatedScore = null) {
  // 취소/연기 처리
  if (gameResult.result === 'cancelled' || gameResult.status === 'cancelled' ||
      gameResult.result === 'postponed' || gameResult.status === 'postponed') {
    return 'cancelled';
  }

  // ✅ status가 finished가 아니거나 스코어가 없으면 pending
  if (gameResult.status !== 'finished' || !gameResult.score || !Array.isArray(gameResult.score) || gameResult.score.length < 2) {
    console.log(`[핸디캡] 스코어 없음 또는 경기 미완료`);
    return 'pending';
  }

  // selection.team에서 핸디캡 파싱
  let selectedTeam, handicap;
  
  if (selection.team && typeof selection.team === 'string') {
    const match = selection.team.match(/^(.+?)\s+([-+]?\d+(?:\.\d+)?)$/);
    
    if (match) {
      selectedTeam = normalizeTeamNameForComparison(match[1].trim());
      // 핸디캡 파싱 로직...
    } else {
      selectedTeam = normalizeTeamNameForComparison(selection.team);
      handicap = 0;
      console.log(`[핸디캡 파싱] 정규식 매칭 실패, 팀명: "${selectedTeam}", 핸디캡: ${handicap}`);
    }
  }
  
  // ... 스코어 계산 및 판정
}
```

**질문**:
1. `selection.team = "Denver Broncos -7"`이 정규식 `/^(.+?)\s+([-+]?\d+(?:\.\d+)?)$/`에 매칭되지 않을까요?
2. 핸디캡 파싱 로그가 출력되지 않은 이유는?
3. 혹시 `selection.team`이 다른 형식일 가능성? (예: `"Miami Dolphins -3"` vs `"Denver Broncos -7"`)

**디버깅 필요**:
- `selection.team` 정확한 값
- 정규식 매칭 결과
- 핸디캡 파싱 로그

---

### 버그 #3: 기존 정산 완료 베팅의 selections.result가 undefined

**상황**:
```
총 정산 완료 베팅: 91개
selections.result가 undefined인 베팅: 대다수
```

**원인**:
- 이전 버전 코드로 정산됨 (Sequelize JSONB 업데이트 버그)
- `bet.status`만 업데이트되고 `selections.result`는 저장 안 됨

**수정 완료**:
- Line 362에 `bet.changed('selections', true)` 추가 ✅

**미해결**:
- 기존 베팅들의 `selections.result` 일괄 업데이트 필요
- 스크립트 실행 중 에러 발생으로 중단됨

**에러 로그**:
```
🔧 정산 완료된 베팅의 selections.result 업데이트...
📊 정산 완료 베팅 수: 91개
🔄 업데이트: e7fa43cf... (상태: lost)
   Daegu FC vs Pohang Steelers → lost
🔄 업데이트: 38a829bc... (상태: lost)
   Chicago Cubs vs Pittsburgh Pirates → won
🔄 업데이트 (중단됨)
```

---

## 🎯 권장 조치

### 즉시 조치 (긴급)

#### 1. scheduled 경기 잘못 정산 문제
```sql
-- Yankees 베팅 수동 수정
UPDATE "Bets" 
SET status = 'pending' 
WHERE id = 'ebeae01a-6b00-432d-8591-d3a4f7caa8e9' 
AND status = 'lost';
```

또는 processBetResult() 로직 수정:
```javascript
// Line 101-104 수정
if (bet.status === 'won' || bet.status === 'cancelled') {  // lost 제거
  console.log(`[베팅 처리] 이미 완료된 베팅 ${bet.id} 건너뛰기`);
  return true;
}

// lost 베팅은 재검증
if (bet.status === 'lost') {
  console.log(`[베팅 처리] lost 베팅 재검증: ${bet.id}`);
  // 재정산 진행
}
```

#### 2. 기존 베팅 selections.result 일괄 업데이트
```javascript
// server/scripts/updateAllBetsSelections.js (신규 생성)

async function updateAllBets() {
  const bets = await Bet.findAll({
    where: { status: { [Op.in]: ['won', 'lost', 'cancelled'] } },
    limit: 1000
  });
  
  for (const bet of bets) {
    const needsUpdate = bet.selections.some(sel => !sel.result);
    
    if (needsUpdate) {
      for (const selection of bet.selections) {
        if (!selection.result || selection.result === 'pending') {
          const gameResult = await betResultService.getGameResultByTeams(selection);
          if (gameResult && gameResult.status === 'finished') {
            selection.result = betResultService.determineSelectionResult(selection, gameResult);
          }
        }
      }
      
      bet.selections = [...bet.selections];
      bet.changed('selections', true);
      await bet.save();
    }
  }
}
```

#### 3. 핸디캡 로직 디버깅
```javascript
// determineHandicapResult에 디버깅 로그 추가

console.log(`[핸디캡 디버깅]`);
console.log(`  - selection.team: "${selection.team}"`);
console.log(`  - typeof: ${typeof selection.team}`);
console.log(`  - 정규식 테스트: ${/^(.+?)\s+([-+]?\d+(?:\.\d+)?)$/.test(selection.team)}`);

const match = selection.team.match(/^(.+?)\s+([-+]?\d+(?:\.\d+)?)$/);
console.log(`  - match 결과: ${JSON.stringify(match)}`);
```

---

### 중기 조치 (1주일 내)

#### 1. 재정산 방지 로직 개선
```javascript
// 현재 문제점
if (bet.status === 'lost') {
  return true;  // 무조건 건너뛰기 ❌
}

// 개선안
if (bet.status === 'lost') {
  // selection.result 확인
  const allSelectionsHaveResults = bet.selections.every(sel => 
    sel.result && sel.result !== 'pending'
  );
  
  if (!allSelectionsHaveResults) {
    console.log(`[재검증] lost 베팅이지만 selection 결과가 불완전함 - 재정산`);
    // 재정산 진행
  } else {
    return true;  // 완전한 경우만 건너뛰기
  }
}
```

#### 2. GameResult status 검증 강화
```javascript
// 정산 시 scheduled 경기는 건너뛰기
if (gameResult && gameResult.status === 'scheduled') {
  console.log(`[정산] scheduled 경기는 건너뛰기: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
  selection.result = 'pending';
  hasPending = true;
  continue;
}
```

---

## 📝 Gemini 상담 포인트

### 포인트 1: 데이터 일관성 문제
**질문**: `bet.status`와 `bet.selections[].result`의 일관성을 어떻게 보장할까요?

**현재 문제**:
- `bet.status = 'lost'`
- `selections[0].result = 'pending'`
- 불일치 발생!

**제안**:
1. DB 트리거로 일관성 검증?
2. 애플리케이션 레벨에서 검증 레이어 추가?
3. `bet.status`를 `selections.result` 기반으로 계산만 하고 저장 안 하기?

---

### 포인트 2: 재정산 정책
**질문**: 이미 정산 완료된 베팅을 언제 재정산해야 할까요?

**시나리오**:
- A. `bet.status = 'lost'`이지만 `selection.result = 'pending'` (불일치)
- B. `bet.status = 'lost'`이고 `selection.result`가 모두 있음 (일치)
- C. `bet.status = 'lost'`이고 경기가 `scheduled` (잘못된 정산)

**제안**:
```javascript
// 재정산 조건
const needsResettle = (bet) => {
  // 1. selections.result가 불완전한 경우
  const hasIncompleteSelections = bet.selections.some(sel => 
    !sel.result || sel.result === 'pending'
  );
  
  // 2. 모든 경기가 scheduled인데 lost인 경우
  const allScheduled = bet.selections.every(sel => {
    const gameResult = getGameResult(sel);  // 조회 필요
    return gameResult?.status === 'scheduled';
  });
  
  return hasIncompleteSelections || (bet.status !== 'pending' && allScheduled);
};
```

---

### 포인트 3: 핸디캡 로직 오류
**질문**: 핸디캡 베팅이 정산되지 않는 원인을 찾기 위한 디버깅 전략?

**필요한 정보**:
```javascript
// 실패한 핸디캡 베팅의 selection 데이터
{
  "team": "???",  // 정확한 값 확인 필요
  "market": "Handicap",
  "desc": "Denver Broncos vs Cincinnati Bengals",
  "point": -7,  // 또는 다른 필드?
  "result": "pending"
}
```

**디버깅 단계**:
1. `selection.team` 정확한 값 출력
2. 정규식 매칭 결과 출력
3. 핸디캡 파싱 결과 출력
4. 스코어 계산 로직 추적

---

### 포인트 4: 성능 vs 정확성
**질문**: 정산 시 `scheduled` 경기도 조회해야 할까요?

**트레이드오프**:

| 옵션 | 장점 | 단점 |
|-----|------|------|
| **A. scheduled 포함** | 경기 정보 확인 가능 | 불필요한 조회 증가 |
| **B. scheduled 제외** | 성능 최적화 | scheduled 경기 매칭 실패 |

**현재 코드**:
- 정산 로직: `['finished', 'cancelled', 'postponed', 'scheduled']` ✅
- 상세 조회: `['finished', 'cancelled', 'postponed', 'scheduled']` ✅

**제안**: scheduled는 포함하되, 정산은 건너뛰기
```javascript
if (gameResult && gameResult.status === 'scheduled') {
  selection.result = 'pending';  // 대기 유지
  hasPending = true;
  continue;
}
```

---

## 🔍 추가 조사 필요 사항

### 1. Yankees 베팅 생성 시점 vs 첫 정산 시점
```
베팅 생성: 2025-10-02 02:49
첫 정산: ?
lost 변경: ?
```

**조사 방법**:
- `bet.updatedAt` 확인
- 서버 로그에서 해당 betId 검색
- PaymentHistory 테이블 조회 (환불 기록 등)

---

### 2. 핸디캡 베팅 selection 데이터 구조
```sql
SELECT selections 
FROM "Bets" 
WHERE id = '5eea8e09-2889-40d8-8dc3-c11b16e4e338';
```

**확인 사항**:
- `selection.team` 정확한 값
- `selection.point` 필드 유무
- `selection.market` 값

---

### 3. Sequelize 트랜잭션 로그
```javascript
// Line 358-373 트랜잭션 로직
const t = await Bet.sequelize.transaction();
try {
  bet.status = betStatus;
  bet.selections = [...selections];
  bet.changed('selections', true);
  await bet.save({ transaction: t });
  // ...
  await t.commit();  // ← 성공했나?
} catch (err) {
  await t.rollback();  // ← 롤백되었나?
  throw err;
}
```

**로깅 추가**:
```javascript
console.log(`[트랜잭션] 시작: betId=${bet.id}, status=${betStatus}`);
await bet.save({ transaction: t });
console.log(`[트랜잭션] 저장 완료`);
await t.commit();
console.log(`[트랜잭션] 커밋 완료`);
```

---

## 📊 테스트 케이스

### 정상 작동 케이스

| 베팅 ID | 경기 | 상태 | selection.result | bet.status | 정상? |
|---------|------|------|-----------------|------------|-------|
| 0bc97540 | São Paulo vs Ceará | finished | won, won, lost | lost | ✅ |
| ec384f2e | Barracas Central | finished | won, won, won, won | won | ✅ |

### 비정상 케이스

| 베팅 ID | 경기 | 상태 | selection.result | bet.status | 문제 |
|---------|------|------|-----------------|------------|------|
| ebeae01a | Yankees vs Red Sox | **scheduled** | pending | **lost** | ❌ 불일치 |
| 5eea8e09 | Dolphins / Broncos | finished | won, won, won, **pending** | pending | ❌ 핸디캡 미정산 |

---

## 🚀 다음 단계 제안

### Phase 1: 긴급 수정 (즉시)
1. Yankees 베팅 수동 수정 (SQL 또는 스크립트)
2. 핸디캡 로직 디버깅 로그 추가
3. 기존 베팅 selections.result 일괄 업데이트 (배치 작업)

### Phase 2: 근본 원인 파악 (1-2일)
1. Yankees 베팅이 lost가 된 정확한 시점 추적
2. 핸디캡 베팅 selection 데이터 구조 분석
3. 트랜잭션 일관성 검증

### Phase 3: 시스템 개선 (1주)
1. `bet.status`와 `selections.result` 일관성 검증 로직 추가
2. 재정산 정책 수립 및 구현
3. scheduled 경기 처리 정책 확립

---

## 📚 참고 자료

### 수정된 파일 목록
1. `server/normalizeUtils.js` - Accent 정규화
2. `server/services/gameResultService.js` - 브라질/아르헨티나 지원
3. `server/services/betResultService.js` - Draw 로직, JSONB 업데이트, scheduled 추가
4. `server/routes/admin.js` - 상세 조회 API 개선
5. `pages/admin/bets.tsx` - 경기 결과 표시 개선
6. `server/jobs/manualCollectResults.js` - 경기 결과 수집 스크립트
7. `server/jobs/forceSettleBets.js` - 강제 정산 스크립트
8. `server/jobs/settlementScheduler.js` - 자동 정산 스케줄러
9. `server/app.js` - 스케줄러 활성화

### 생성된 문서
1. `docs/SPORTSBOOK_SETTLEMENT_ANALYSIS.md` - 정산 시스템 분석 (579줄)
2. `docs/TEAM_NAME_MATCHING_ANALYSIS.md` - 팀명 매칭 분석 (530줄)
3. `docs/BET_DETAIL_DISPLAY_ANALYSIS.md` - 상세정보 표시 분석

### 테스트 스크립트
1. `server/scripts/testTeamMatching.js` - 팀명 매칭 테스트
2. `server/scripts/fixSpecificBet.js` - 특정 베팅 수정

---

**작성일**: 2025-10-02  
**작성자**: AI Assistant  
**Gemini 상담 필요**: Yankees 베팅 lost 문제, 핸디캡 미정산 문제  
**버전**: 1.0



