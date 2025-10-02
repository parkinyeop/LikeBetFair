# 배팅 상세정보 표시 시스템 분석 보고서

## 📋 개요
`http://localhost:3000/admin/bets` 페이지의 배팅 상세정보 표시 기능에 대한 프론트엔드 및 백엔드 코드 분석

---

## 🏗️ 시스템 구조

### 데이터 흐름

```
사용자 클릭 → Frontend (pages/admin/bets.tsx)
                       ↓
              /api/admin/bets (목록 조회)
                       ↓
              Bet 모델 (selections JSONB 포함)
                       ↓
              Frontend 모달 표시
```

**⚠️ 문제점**: 경기 결과 정보가 포함되지 않음!

---

## 📱 프론트엔드 분석

### 파일: `pages/admin/bets.tsx`

#### 1. 베팅 목록 조회 (Line 533-640)

```typescript
const fetchBettingData = useCallback(async () => {
  try {
    const headers = getAuthHeaders();
    const baseUrl = buildApiUrl('/api/admin');

    // 병렬로 모든 데이터 로딩
    const [betsResponse, statsResponse] = await Promise.all([
      fetch(`${baseUrl}/bets?page=1&limit=1000&status=all`, { headers }),  // ← 여기
      fetch(`${baseUrl}/bets/stats/summary`, { headers })
    ]);

    if (betsResponse.ok) {
      const betsData = await betsResponse.json();
      setBets(betsData.bets || []);  // ← 베팅 데이터 저장
      // ...
    }
  } catch (err) {
    console.error('스포츠북 데이터 로딩 오류:', err);
  }
}, [getAuthHeaders]);
```

**호출**: `GET /api/admin/bets?page=1&limit=1000&status=all`

**문제**: 경기 결과 정보가 포함되지 않은 베팅 데이터만 가져옴

---

#### 2. 베팅 상세 모달 (Line 1698-1909)

**경기 결과 표시 로직** (Line 1864-1881):

```typescript
{/* 경기 결과 표시 */}
<div className="mt-2">
  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${gameResult.color}`}>
    {gameResult.result}
  </span>
  {/* 스코어 정보 추가 */}
  {selection.gameResult && selection.gameResult.score && (
    <div className="mt-1 text-xs text-gray-600">
      스코어: {selection.gameResult.score.home || 0} - {selection.gameResult.score.away || 0}
    </div>
  )}
  {/* 경기 결과 세부 정보 */}
  {selection.gameResult && selection.gameResult.result && (
    <div className="mt-1 text-xs text-gray-500">
      결과: {selection.gameResult.result}
    </div>
  )}
</div>
```

**문제**: `selection.gameResult`를 표시하려고 하지만, 데이터가 없음!

---

#### 3. 경기 결과 상태 결정 함수 (Line 1817-1843)

```typescript
const getGameResult = (selection) => {
  // selection.result가 없거나 pending이면 대기중
  if (!selection.result || selection.result === 'pending') {
    return { status: 'pending', result: '경기 결과 대기중', color: 'bg-yellow-100 text-yellow-800' };
  }
  
  // selection.result로 승패 판정 (이미 정산 시 저장됨)
  if (selection.result === 'win') {
    return { 
      status: 'win', 
      result: `승리`, 
      color: 'bg-green-100 text-green-800' 
    };
  } else if (selection.result === 'lose') {
    return { 
      status: 'lose', 
      result: `패배`, 
      color: 'bg-red-100 text-red-800' 
    };
  } else {
    return { 
      status: 'cancelled', 
      result: `취소됨`, 
      color: 'bg-gray-100 text-gray-800' 
    };
  }
};
```

**작동 방식**:
- `selection.result` 필드만 사용 (정산 시 저장된 값)
- `selection.gameResult`는 **사용하지 않음**

**현재 표시 내용**:
- ✅ 승/패 상태: `selection.result` 기반
- ❌ 스코어: `selection.gameResult.score` 필요 (없음)
- ❌ 경기 결과: `selection.gameResult.result` 필요 (없음)

---

## 🖥️ 백엔드 분석

### 1. 베팅 목록 조회 API

**파일**: `server/routes/admin.js`  
**라우트**: `GET /api/admin/bets` (Line 1400-1475)

```javascript
router.get('/bets', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'all', 
      userId = '', 
      startDate = '', 
      endDate = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const { count, rows: bets } = await Bet.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: orderClause,
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }]
    });

    res.json({
      bets,  // ← selections는 JSONB 그대로 반환
      pagination: { /* ... */ }
    });
  } catch (error) {
    console.error('Bets list error:', error);
    res.status(500).json({ message: '베팅 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});
```

**반환 데이터**:
```json
{
  "bets": [
    {
      "id": "uuid",
      "userId": "uuid",
      "stake": 10000,
      "selections": [
        {
          "team": "SSG Landers",
          "odds": 1.5,
          "desc": "SSG Landers vs Lotte Giants",
          "market": "Win/Loss",
          "gameId": "...",
          "sport_key": "baseball_kbo",
          "commence_time": "2025-09-30T...",
          "result": "won"  // ← 정산 시 저장된 결과
          // ❌ gameResult 정보 없음!
        }
      ],
      "totalOdds": 1.5,
      "potentialWinnings": 15000,
      "status": "won",
      "User": { /* ... */ }
    }
  ],
  "pagination": { /* ... */ }
}
```

**문제**:
- ❌ `selections` 필드에 `gameResult` 정보가 **포함되지 않음**
- ✅ `result` 필드만 있음 (정산 시 저장된 승/패)

---

### 2. 베팅 상세 조회 API (경기 결과 포함)

**파일**: `server/routes/bet.js`  
**라우트**: `GET /api/bet/details/:betId` (Line 93-104)

```javascript
router.get('/details/:betId', async (req, res) => {
  try {
    const betDetails = await betResultService.getBetDetails(req.params.betId);
    if (!betDetails) {
      return res.status(404).json({ error: 'Bet not found' });
    }
    res.json(betDetails);
  } catch (error) {
    console.error('Error getting bet details:', error);
    res.status(500).json({ error: 'Failed to get bet details' });
  }
});
```

**서비스**: `server/services/betResultService.js` - `getBetDetails()` (Line 1104-1138)

```javascript
async getBetDetails(betId) {
  try {
    const bet = await Bet.findByPk(betId, {
      include: [{ model: User, attributes: ['email'] }]
    });

    if (!bet) return null;

    // 각 selection의 경기 결과 정보 추가
    const selectionsWithResults = [];
    for (const selection of bet.selections) {
      const gameResult = await this.getGameResultByTeams(selection);  // ← GameResult 테이블 조회
      selectionsWithResults.push({
        ...selection,
        gameResult: gameResult ? {
          status: gameResult.status,      // finished, scheduled, cancelled 등
          result: gameResult.result,      // home_win, away_win, draw 등
          score: gameResult.score,        // [{"name":"팀명","score":"점수"}]
          homeTeam: gameResult.homeTeam,
          awayTeam: gameResult.awayTeam
        } : null
      });
    }

    return {
      ...bet.toJSON(),
      selections: selectionsWithResults  // ← gameResult 포함된 selections 반환
    };
  } catch (error) {
    console.error('Error getting bet details:', error);
    throw error;
  }
}
```

**반환 데이터**:
```json
{
  "id": "uuid",
  "selections": [
    {
      "team": "SSG Landers",
      "odds": 1.5,
      "desc": "SSG Landers vs Lotte Giants",
      "result": "won",
      "gameResult": {  // ✅ 경기 결과 정보 포함!
        "status": "finished",
        "result": "home_win",
        "score": [
          {"name": "SSG Landers", "score": "4"},
          {"name": "Lotte Giants", "score": "2"}
        ],
        "homeTeam": "SSG Landers",
        "awayTeam": "Lotte Giants"
      }
    }
  ]
}
```

---

### 3. 경기 결과 조회 로직

**파일**: `server/services/betResultService.js` - `getGameResultByTeams()` (Line 588-673)

```javascript
// 레거시 메서드 (사용 중단 예정)
async getGameResultByTeams(selection) {
  try {
    if (!selection.desc || !selection.commence_time) {
      console.log('[getGameResultByTeams] Invalid selection data:', selection);
      return null;
    }
    
    // desc에서 팀명 추출 (예: "LG Twins vs Doosan Bears")
    const parts = selection.desc.split(' vs ');
    if (parts.length !== 2) {
      console.log(`[getGameResultByTeams] Invalid desc format: ${selection.desc}`);
      return null;
    }

    const homeTeam = parts[0].trim();
    const awayTeam = parts[1].trim();
    
    // 🚀 중앙화된 경기 결과 조회 사용
    const config = getLocationConfig('betController');
    
    if (config.FEATURE_FLAGS?.USE_CENTRALIZED_QUERY) {
      console.log(`[betController] Using centralized query`);
      const gameResult = await GameResultQuery.findByTeamsAndTime(
        homeTeam,
        awayTeam,
        selection.commence_time,
        'betController'
      );
      return gameResult;
    } else {
      // 레거시 로직 (Feature Flag가 비활성화된 경우)
      console.log(`[betController] Using legacy query`);
      
      const commenceTime = new Date(selection.commence_time);
      const GameResult = (await import('../models/gameResultModel.js')).default;
      
      // 정확한 시간으로 먼저 검색
      let gameResult = await GameResult.findOne({
        where: {
          homeTeam: homeTeam,
          awayTeam: awayTeam,
          commenceTime: commenceTime,
          status: { [Op.in]: ['finished', 'cancelled', 'postponed'] }
        }
      });

      // 정확한 시간으로 찾지 못하면 시간 범위로 검색 (±6시간)
      if (!gameResult) {
        const startTime = new Date(commenceTime.getTime() - (6 * 60 * 60 * 1000));
        const endTime = new Date(commenceTime.getTime() + (6 * 60 * 60 * 1000));
        
        gameResult = await GameResult.findOne({
          where: {
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            commenceTime: { [Op.between]: [startTime, endTime] },
            status: { [Op.in]: ['finished', 'cancelled', 'postponed'] }
          }
        });
      }

      return gameResult;
    }
  } catch (error) {
    console.error('[getGameResultByTeams] Error:', error);
    return null;
  }
}
```

**작동 방식**:
1. `selection.desc`에서 팀명 추출 (`"LG Twins vs Doosan Bears"`)
2. `GameResult` 테이블에서 팀명 + 시간 매칭
3. 정확 매칭 실패 시 ±6시간 범위 검색
4. `gameResult` 객체 반환 (status, result, score 포함)

---

## 🚨 문제점 분석

### 1. **프론트엔드가 경기 결과를 가져오지 않음** ❌

#### 현재 코드

**베팅 목록 조회** (Line 545-548):
```typescript
const [betsResponse, statsResponse] = await Promise.all([
  fetch(`${baseUrl}/bets?page=1&limit=1000&status=all`, { headers }),
  // ❌ /api/bet/details/:betId 호출 없음!
]);
```

**베팅 상세 모달** (Line 1698-1909):
```typescript
{showBetDetail && selectedBet && (
  <div>
    {/* ... */}
    {selectedBet.selections.map((selection, index) => {
      const gameResult = getGameResult(selection);  // ← selection.result만 사용
      
      return (
        <div>
          {/* 스코어 정보 표시 시도 */}
          {selection.gameResult && selection.gameResult.score && (
            <div>
              스코어: {selection.gameResult.score.home || 0} - {selection.gameResult.score.away || 0}
            </div>
          )}
          {/* ⚠️ selection.gameResult는 undefined! */}
        </div>
      );
    })}
  </div>
)}
```

**결과**:
- ✅ `selection.result` → 표시됨 ("승리", "패배" 등)
- ❌ `selection.gameResult.score` → 표시 안 됨 (undefined)
- ❌ `selection.gameResult.result` → 표시 안 됨 (undefined)

---

### 2. **백엔드 API 불일치** ⚠️

| API 엔드포인트 | 경기 결과 포함 | 용도 | 호출 여부 |
|---------------|-------------|------|----------|
| `GET /api/admin/bets` | ❌ 없음 | 목록 조회 | ✅ 호출됨 |
| `GET /api/bet/details/:betId` | ✅ 있음 | 상세 조회 | ❌ 호출 안 됨 |

**문제**:
- 프론트엔드가 경기 결과를 포함한 API (`/api/bet/details/:betId`)를 호출하지 않음
- 대신 경기 결과가 없는 API (`/api/admin/bets`)만 호출

---

### 3. **selections JSONB 구조**

**Bet 모델** (`server/models/betModel.js` Line 25-28):
```javascript
selections: {
  type: DataTypes.JSONB,
  allowNull: false
}
```

**저장 시점 구조** (베팅 생성 시):
```json
[
  {
    "team": "SSG Landers",
    "odds": 1.5,
    "desc": "SSG Landers vs Lotte Giants",
    "market": "Win/Loss",
    "gameId": "...",
    "sport_key": "baseball_kbo",
    "commence_time": "2025-09-30T09:30:00.000Z"
    // ❌ gameResult 필드 없음
  }
]
```

**정산 시점 구조** (`betResultService.updateBetResults()` 실행 후):
```json
[
  {
    "team": "SSG Landers",
    "odds": 1.5,
    "desc": "SSG Landers vs Lotte Giants",
    "market": "Win/Loss",
    "gameId": "...",
    "sport_key": "baseball_kbo",
    "commence_time": "2025-09-30T09:30:00.000Z",
    "result": "won"  // ✅ 정산 결과만 추가됨
    // ❌ gameResult 객체는 추가되지 않음!
  }
]
```

**문제**:
- `betResultService.updateBetResults()`는 `selection.result`만 업데이트
- `gameResult` 객체는 selections에 **저장되지 않음**
- `getBetDetails()`에서만 동적으로 조회하여 추가

---

## 💡 해결 방안

### 옵션 1: 프론트엔드에서 상세 조회 API 호출 (권장)

#### 1-A. 베팅 클릭 시 상세 정보 조회

**파일**: `pages/admin/bets.tsx`  
**위치**: `handleBetClick()` 함수 (Line 861-864)

**현재 코드**:
```typescript
const handleBetClick = useCallback((bet: Bet) => {
  setSelectedBet(bet);  // ← 기존 bet 그대로 사용
  setShowBetDetail(true);
}, []);
```

**개선 코드**:
```typescript
const handleBetClick = useCallback(async (bet: Bet) => {
  try {
    // 🆕 경기 결과 포함된 상세 정보 조회
    const headers = getAuthHeaders();
    const response = await fetch(buildApiUrl(`/api/bet/details/${bet.id}`), { headers });
    
    if (response.ok) {
      const betDetails = await response.json();
      setSelectedBet(betDetails);  // ← gameResult 포함된 데이터
    } else {
      setSelectedBet(bet);  // ← 실패 시 기존 데이터 사용
    }
    
    setShowBetDetail(true);
  } catch (error) {
    console.error('베팅 상세 정보 조회 오류:', error);
    setSelectedBet(bet);  // ← 오류 시 기존 데이터 사용
    setShowBetDetail(true);
  }
}, [getAuthHeaders]);
```

**예상 효과**:
- ✅ 스코어 정보 표시
- ✅ 경기 결과 상세 정보 표시
- ✅ 기존 코드 재사용 (백엔드 수정 불필요)

---

### 옵션 2: 백엔드 API 통합 (중기)

#### 2-A. `/api/admin/bets`에서 gameResult 포함

**파일**: `server/routes/admin.js`  
**위치**: Line 1450-1469

**현재 코드**:
```javascript
const { count, rows: bets } = await Bet.findAndCountAll({
  where,
  limit: parseInt(limit),
  offset: parseInt(offset),
  order: orderClause,
  include: [{
    model: User,
    attributes: ['id', 'username', 'email']
  }]
});

res.json({ bets, pagination: { /* ... */ } });
```

**개선 코드**:
```javascript
const { count, rows: bets } = await Bet.findAndCountAll({
  where,
  limit: parseInt(limit),
  offset: parseInt(offset),
  order: orderClause,
  include: [{
    model: User,
    attributes: ['id', 'username', 'email']
  }]
});

// 🆕 각 베팅의 selections에 gameResult 추가
const betsWithGameResults = await Promise.all(
  bets.map(async (bet) => {
    const betJson = bet.toJSON();
    
    // selections에 gameResult 추가
    const selectionsWithResults = await Promise.all(
      betJson.selections.map(async (selection) => {
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
    
    return {
      ...betJson,
      selections: selectionsWithResults
    };
  })
);

res.json({ 
  bets: betsWithGameResults, 
  pagination: { /* ... */ } 
});
```

**장점**:
- ✅ 프론트엔드 수정 불필요
- ✅ 모든 베팅에 대해 한 번에 gameResult 제공

**단점**:
- ⚠️ 성능 이슈 (N+1 쿼리)
- ⚠️ 베팅 1000개 × 평균 3개 selections = 3000번 DB 조회

---

### 옵션 3: selections JSONB에 gameResult 저장 (장기)

#### 3-A. 정산 시 gameResult 저장

**파일**: `server/services/betResultService.js`  
**위치**: `updateBetResults()` 메서드

**현재**: `selection.result` 만 저장
```javascript
selection.result = selectionResult;  // 'won', 'lost', 'pending'
```

**개선**: `selection.gameResult` 객체도 저장
```javascript
selection.result = selectionResult;
selection.gameResult = {
  status: gameResult.status,
  result: gameResult.result,
  score: gameResult.score,
  homeTeam: gameResult.homeTeam,
  awayTeam: gameResult.awayTeam
};
```

**장점**:
- ✅ DB에 영구 저장 (재조회 불필요)
- ✅ 성능 개선 (조회 시 DB 쿼리 불필요)
- ✅ 데이터 일관성 (정산 시점 결과 보존)

**단점**:
- ⚠️ JSONB 크기 증가
- ⚠️ 기존 베팅 데이터 마이그레이션 필요

---

## 📊 스코어 표시 로직 상세

### 현재 프론트엔드 코드 (Line 1870-1874)

```typescript
{selection.gameResult && selection.gameResult.score && (
  <div className="mt-1 text-xs text-gray-600">
    스코어: {selection.gameResult.score.home || 0} - {selection.gameResult.score.away || 0}
  </div>
)}
```

**문제**:
- `selection.gameResult.score.home` 형식으로 접근
- 하지만 실제 DB 구조는 `[{"name":"팀명","score":"점수"}]` 배열 형식

**올바른 접근 방식**:
```typescript
{selection.gameResult && selection.gameResult.score && (
  <div className="mt-1 text-xs text-gray-600">
    스코어: 
    {(() => {
      const scores = selection.gameResult.score;
      if (Array.isArray(scores) && scores.length >= 2) {
        const homeScore = scores.find(s => s.name === selection.gameResult.homeTeam)?.score || '0';
        const awayScore = scores.find(s => s.name === selection.gameResult.awayTeam)?.score || '0';
        return `${homeScore} - ${awayScore}`;
      }
      return 'N/A';
    })()}
  </div>
)}
```

---

## 🎯 권장 조치

### ✅ Phase 1: 즉시 조치 (1-2시간)

1. **프론트엔드 수정**: `handleBetClick()` 개선
   - `/api/bet/details/:betId` 호출 추가
   - `gameResult` 포함된 상세 정보 로드

2. **스코어 표시 로직 수정**:
   - 배열 형식 스코어 올바르게 파싱
   - `selection.gameResult.homeTeam/awayTeam` 활용

**예상 효과**:
- ✅ 경기 결과 즉시 표시
- ✅ 스코어 정보 표시
- ⚠️ 클릭 시 약간의 지연 (API 호출)

---

### ⚙️ Phase 2: 중기 개선 (1주)

1. **백엔드 최적화**:
   - `/api/admin/bets`에서 gameResult 포함 (옵션 2)
   - 배치 쿼리로 성능 개선
   - 캐싱 추가

**예상 효과**:
- ✅ 즉시 스코어 표시 (API 호출 불필요)
- ⚠️ 성능 최적화 필요

---

### 🚀 Phase 3: 장기 개선 (2주)

1. **정산 시 gameResult 저장** (옵션 3):
   - `betResultService.updateBetResults()` 수정
   - selections JSONB에 gameResult 저장

2. **기존 데이터 마이그레이션**:
   - 모든 정산된 베팅에 gameResult 추가

**예상 효과**:
- ✅ 영구 저장 (데이터 일관성)
- ✅ 성능 최고 (조회만)

---

## 📝 코드 비교 요약

| 항목 | 현재 | 옵션 1 | 옵션 2 | 옵션 3 |
|-----|------|--------|--------|--------|
| **프론트엔드 수정** | - | ✅ 필요 | ❌ 불필요 | ❌ 불필요 |
| **백엔드 수정** | - | ❌ 불필요 | ✅ 필요 | ✅ 필요 |
| **스코어 표시** | ❌ 안 됨 | ✅ 됨 | ✅ 됨 | ✅ 됨 |
| **성능** | - | ⚠️ 느림 (클릭 시 조회) | ⚠️ 느림 (목록 조회 시) | ✅ 빠름 |
| **구현 시간** | - | 1-2시간 | 3-4시간 | 1-2일 |
| **데이터 일관성** | - | ⚠️ 동적 조회 | ⚠️ 동적 조회 | ✅ 영구 저장 |

---

## 🔧 구현 예시 (옵션 1 - 권장)

### 프론트엔드 수정

**파일**: `pages/admin/bets.tsx`

#### 수정 1: handleBetClick 함수

```typescript
// Line 861-864 수정
const handleBetClick = useCallback(async (bet: Bet) => {
  try {
    setLoading(true);
    
    // 🆕 경기 결과 포함된 상세 정보 조회
    const headers = getAuthHeaders();
    const response = await fetch(buildApiUrl(`/api/bet/details/${bet.id}`), { headers });
    
    if (response.ok) {
      const betDetails = await response.json();
      console.log('베팅 상세 정보 (gameResult 포함):', betDetails);
      setSelectedBet(betDetails);
    } else {
      console.warn('베팅 상세 정보 조회 실패, 기본 데이터 사용');
      setSelectedBet(bet);
    }
    
    setShowBetDetail(true);
  } catch (error) {
    console.error('베팅 상세 정보 조회 오류:', error);
    setSelectedBet(bet);
    setShowBetDetail(true);
  } finally {
    setLoading(false);
  }
}, [getAuthHeaders]);
```

#### 수정 2: 스코어 표시 로직

```typescript
// Line 1870-1874 수정
{selection.gameResult && selection.gameResult.score && (
  <div className="mt-1 text-xs text-gray-600">
    {(() => {
      const scores = selection.gameResult.score;
      
      // 배열 형식인 경우 ([{"name":"팀명","score":"점수"}])
      if (Array.isArray(scores) && scores.length >= 2) {
        const homeScore = scores.find(s => s.name === selection.gameResult.homeTeam)?.score || '0';
        const awayScore = scores.find(s => s.name === selection.gameResult.awayTeam)?.score || '0';
        return `스코어: ${homeScore} - ${awayScore}`;
      }
      
      // 문자열 형식인 경우 ("5-0")
      if (typeof scores === 'string') {
        return `스코어: ${scores}`;
      }
      
      // 객체 형식인 경우 ({home: 5, away: 0})
      if (scores.home !== undefined && scores.away !== undefined) {
        return `스코어: ${scores.home} - ${scores.away}`;
      }
      
      return '스코어: N/A';
    })()}
  </div>
)}
```

#### 수정 3: 경기 결과 상태 표시

```typescript
// Line 1876-1880 개선
{selection.gameResult && (
  <div className="mt-1 text-xs text-gray-500 space-y-1">
    {/* 경기 상태 */}
    {selection.gameResult.status && (
      <div>
        경기 상태: 
        <span className={`ml-1 ${
          selection.gameResult.status === 'finished' ? 'text-green-600 font-medium' :
          selection.gameResult.status === 'cancelled' ? 'text-red-600' :
          'text-yellow-600'
        }`}>
          {selection.gameResult.status === 'finished' ? '완료' :
           selection.gameResult.status === 'cancelled' ? '취소' :
           selection.gameResult.status === 'postponed' ? '연기' :
           '예정'}
        </span>
      </div>
    )}
    
    {/* 경기 결과 */}
    {selection.gameResult.result && selection.gameResult.result !== 'pending' && (
      <div>
        경기 결과: 
        <span className="ml-1 font-medium">
          {selection.gameResult.result === 'home_win' ? '홈팀 승리' :
           selection.gameResult.result === 'away_win' ? '원정팀 승리' :
           selection.gameResult.result === 'draw' ? '무승부' :
           selection.gameResult.result}
        </span>
      </div>
    )}
  </div>
)}
```

---

## 🔍 추가 발견 사항

### 1. 수동 경기 결과 입력 기능 존재

**파일**: `pages/admin/bets.tsx` (Line 1912-2026)  
**기능**: 관리자가 경기 결과를 수동으로 입력 가능

**프로세스**:
1. "경기 결과 수동 입력" 버튼 클릭 (Line 1800-1805)
2. 각 경기별 스코어 입력 폼 표시 (Line 1933-2005)
3. `POST /api/admin/manual-game-result` 호출 (Line 499-509)
4. 정산 처리 후 베팅 목록 새로고침

**활용 가능성**:
- ✅ 매칭 실패한 브라질/아르헨티나 경기를 수동 입력 가능
- ✅ TheSportsDB API에 없는 리그 지원

---

### 2. 실시간 업데이트 (미구현)

**코드** (Line 382-383):
```typescript
const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
```

**용도**: 정산 결과 실시간 반영 (WebSocket 등)

**상태**: 변수만 선언, 실제 구현 없음

---

## 📈 테스트 시나리오

### 시나리오 1: 정상 정산된 베팅

**입력**:
- 베팅 ID: `ca1623ec-bd0d-425d-96fd-75df963188bc`
- 선택: SSG Landers vs Lotte Giants (승/패)
- 상태: won
- 경기 결과: DB에 있음 (SSG 4-2 Lotte)

**현재 표시**:
- ✅ 상태: "승리" (selection.result 기반)
- ❌ 스코어: 표시 안 됨 (selection.gameResult 없음)
- ❌ 경기 결과: 표시 안 됨

**옵션 1 적용 후**:
- ✅ 상태: "승리"
- ✅ 스코어: "4 - 2"
- ✅ 경기 결과: "홈팀 승리"

---

### 시나리오 2: 매칭 실패한 베팅

**입력**:
- 베팅 ID: `5b94177c-8d81-4a48-a37e-1b718c690336`
- 선택: Mirassol vs Bragantino-SP
- 상태: pending
- 경기 결과: DB에 있지만 매칭 실패 (팀명 불일치)

**현재 표시**:
- ✅ 상태: "대기중" (selection.result === 'pending')
- ❌ 스코어: 표시 안 됨
- ❌ "경기 결과 수동 입력" 버튼: 표시됨 ✅

**옵션 1 적용 후**:
- ✅ 상태: "대기중"
- ⚠️ 스코어: 여전히 표시 안 됨 (매칭 실패)
- ✅ "경기 결과 수동 입력" 버튼: 표시됨

**수동 입력 후**:
- ✅ 정산 처리
- ✅ 스코어 표시 가능

---

## 🎯 결론

### 현재 문제
1. ❌ 프론트엔드가 경기 결과를 가져오지 않음
2. ❌ `/api/admin/bets`는 gameResult 미포함
3. ❌ 스코어 표시 로직이 잘못된 구조 사용

### 권장 조치
1. **즉시**: 옵션 1 적용 (프론트엔드 수정)
   - `handleBetClick()` 개선
   - 스코어 표시 로직 수정
   - 예상 시간: 1-2시간

2. **중기**: 옵션 2 고려 (백엔드 최적화)
   - 배치 쿼리로 성능 개선
   - 예상 시간: 3-4시간

3. **장기**: 옵션 3 고려 (영구 저장)
   - 정산 시 gameResult 저장
   - 예상 시간: 1-2일

### 기대 효과
- ✅ 관리자가 경기 스코어 즉시 확인 가능
- ✅ 경기 결과 상태 확인 가능 (finished, cancelled 등)
- ✅ 수동 입력 필요 여부 명확히 판단 가능

---

**작성일**: 2025-10-02  
**작성자**: AI Assistant  
**버전**: 1.0



