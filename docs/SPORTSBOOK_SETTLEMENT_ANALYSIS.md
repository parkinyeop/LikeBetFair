# 스포츠북 정산 시스템 분석 보고서

## 📋 개요
9월 30일 이후 모든 스포츠북 경기가 정산되지 않는 문제에 대한 전체 분석

---

## 🔍 문제 현상
- **발생 시점**: 2025년 9월 30일 이후
- **영향 범위**: 모든 스포츠북 베팅 (Sportsbook + Exchange Multibet)
- **증상**: 베팅이 `pending` 상태로 남아있으며 정산되지 않음

### 터미널 로그 분석
```
❌ 매칭 실패 상세 분석:
   - 베팅 ID: 3c85d4c5-a054-4bb4-8c44-fbf9336f4c9a
   - 베팅 팀: Barracas Central vs Belgrano de Cordoba
   - 정규화된 팀명: barracascentral vs belgrano
   - 베팅 시간: 2025-09-29T18:30:00.000Z
   - 검색 시간 범위: 2025-08-30T18:30:00.000Z ~ 2025-10-29T18:30:00.000Z
   - DB 내 유사한 경기들: [
      '[finished] Belgrano de Cordoba vs San Martin de San Juan (2025-09-11T23:00:00.000Z)',
      ...
   ]
```

---

## 🏗️ 스포츠북 정산 시스템 구조

### 1. 데이터 흐름
```
TheSportsDB API → gameResultService → GameResult 테이블
                                              ↓
                                     betResultService
                                              ↓
                                        정산 처리
```

### 2. 주요 컴포넌트

#### A. GameResult 테이블 (경기 결과 저장소)
**위치**: `server/models/gameResultModel.js`

**필드 구조**:
- `homeTeam`, `awayTeam`: 팀명
- `commenceTime`: 경기 시작 시간 (UTC)
- `status`: 'finished', 'scheduled', 'cancelled', 'postponed'
- `score`: JSON 배열 `[{"name":"팀명","score":"점수"}]`
- `result`: 'home_win', 'away_win', 'draw', 'pending', 'cancelled'

#### B. gameResultService (경기 결과 수집)
**위치**: `server/services/gameResultService.js`

**주요 메서드**:
```javascript
// 모든 활성 카테고리의 경기 결과 수집
async fetchAndSaveAllResults() {
  const activeCategories = [
    'KBO', 'MLB', 'NBA', 'NFL', 'MLS', 'EPL', ...
  ];
  
  for (const category of activeCategories) {
    await this.fetchResultsWithSportsDB(sportKey, 15, true);
  }
}

// TheSportsDB API에서 경기 결과 가져오기
async fetchResultsWithSportsDB(sportKey, daysFrom = 15, includeFuture = true) {
  // 과거 15일 + 미래 1일 데이터 수집
  // API 요청 → 데이터 변환 → DB 저장
}
```

**데이터 소스**: TheSportsDB API
- **Endpoint**: 
  - 북미 리그: `eventsseason.php` (시즌 기반)
  - 유럽 리그: `eventslast.php` + `eventsnext.php` (최근 + 예정)
- **시간 범위**: 과거 15일 + 미래 1일
- **API 키**: `process.env.THESPORTSDB_API_KEY` (기본값: '3')

#### C. betResultService (스포츠북 정산)
**위치**: `server/services/betResultService.js`

**정산 프로세스**:
```javascript
async updateBetResults() {
  // 1. pending 상태의 모든 베팅 조회
  const pendingBets = await Bet.findAll({ where: { status: 'pending' } });
  
  // 2. 각 베팅별로 정산 처리
  for (const bet of pendingBets) {
    await this.processBetResult(bet);
  }
}

async processBetResult(bet) {
  // 각 selection별로 경기 결과 조회
  for (const selection of bet.selections) {
    // ① 팀명 파싱: "Team A vs Team B"
    const [homeTeam, awayTeam] = selection.desc.split(' vs ');
    
    // ② 시간 정규화
    const commenceTime = new Date(selection.commence_time);
    
    // ③ GameResult 조회 (±24시간 범위)
    const candidateGames = await GameResult.findAll({
      where: {
        commenceTime: {
          [Op.gte]: new Date(commenceTime.getTime() - 24 * 60 * 60 * 1000),
          [Op.lte]: new Date(commenceTime.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });
    
    // ④ 팀명 매칭 (정규화)
    for (const candidate of candidateGames) {
      if (normalizeTeamName(candidate.homeTeam) === normalizeTeamName(homeTeam)) {
        // 매칭 성공 → 결과 판정
      }
    }
    
    // ⑤ 승/패 판정
    const result = this.determineSelectionResult(selection, gameResult);
  }
  
  // 3. 베팅 상태 업데이트 및 정산
  if (allSelectionsResolved) {
    await this.processBetWinnings(bet); // 적중 시
    await this.processBetRefund(bet);   // 취소 시
  }
}
```

#### D. multibetSettlementService (익스체인지 멀티베팅 정산)
**위치**: `server/services/multibetSettlementService.js`

**정산 프로세스**:
```javascript
async settleMultibetOrder(order) {
  // 1. 매치 여부 확인
  const hasMatches = await this.checkOrderMatches(order.id);
  
  // 2. 모든 경기 결과 수집
  const gameResults = await this.collectAllGameResults(order.selectionDetails.selections);
  
  // 3. 멀티배팅 승패 판정
  const settlementResult = this.determineMultibetResult(gameResults);
  
  // 4. 정산 처리
  await this.processMultibetSettlement(order, settlementResult);
}

async findGameResult(selection) {
  // GameResult 조회 (정확한 시간 + 시간 범위)
  let gameResult = await GameResult.findOne({
    where: {
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      commenceTime: commenceTime,
      status: 'finished'
    }
  });
  
  // 시간 범위 검색 (±24시간)
  if (!gameResult) {
    gameResult = await GameResult.findOne({
      where: {
        homeTeam, awayTeam,
        commenceTime: { [Op.between]: [startTime, endTime] },
        status: 'finished'
      }
    });
  }
}
```

---

## 🚨 문제 원인 분석

### 1. **GameResult 데이터 부족** (주요 원인)
**증상**:
- 9월 30일 이후 경기가 `GameResult` 테이블에 없음
- 터미널 로그: "DB 내 유사한 경기들"에 해당 경기가 없음

**원인**:
```javascript
// gameResultService.js - fetchAndSaveAllResults()
// 이 메서드가 정기적으로 실행되어야 하는데 실행되지 않음
```

**확인 방법**:
```sql
-- 9월 30일 이후 GameResult 데이터 확인
SELECT COUNT(*), MIN(commence_time), MAX(commence_time)
FROM game_results
WHERE commence_time >= '2025-09-30';

-- 특정 경기 검색
SELECT * FROM game_results
WHERE home_team LIKE '%Barracas%'
  OR away_team LIKE '%Belgrano%'
ORDER BY commence_time DESC;
```

### 2. **팀명 매칭 실패** (부차적 원인)
**증상**:
- "Barracas Central" vs "Barracas Central de Cordoba" 매칭 실패
- "Velez Sarsfield BA" vs "Velez Sarsfield" 매칭 실패

**정규화 로직**:
```javascript
// normalizeUtils.js
export const normalizeTeamNameForComparison = (teamName) => {
  return teamName
    .toLowerCase()
    .replace(/\s+/g, '')          // 공백 제거
    .replace(/[^\w가-힣]/g, '')   // 특수문자 제거
    .replace(/fc|cf|sc|ac|bk$/g, '') // 접미사 제거
    .trim();
};
```

**문제점**:
- "Barracas Central" → "barracascentral"
- "Barracas Central de Cordoba" → "barrascentraldecordoba"
- → 매칭 실패!

### 3. **TheSportsDB API 문제**
**가능한 원인**:
1. API 키 만료 또는 제한
2. 리그 ID 매핑 오류
3. API 응답 형식 변경
4. 특정 리그 데이터 미제공

**API 키 설정**:
```javascript
// server/services/gameResultService.js
this.sportsDbApiKey = process.env.THESPORTSDB_API_KEY || '3';

// 터미널 로그 확인:
// [GameResult] TheSportsDB API 키 설정: 3
```

### 4. **스케줄러 실행 문제**
**관련 파일**: `server/jobs/` (스케줄러 작업)

**예상 스케줄러**:
```javascript
// 매 30분마다 경기 결과 수집
schedule.scheduleJob('*/30 * * * *', async () => {
  await gameResultService.fetchAndSaveAllResults();
});
```

---

## 🔧 해결 방안

### 즉시 조치 (긴급)

#### 1. GameResult 데이터 수동 수집
```javascript
// server/scripts/collect-game-results.js
import gameResultService from '../services/gameResultService.js';

async function collectMissingResults() {
  console.log('🔍 9월 30일 이후 경기 결과 수집 시작...');
  
  // 모든 활성 카테고리 수집
  const result = await gameResultService.fetchAndSaveAllResults();
  
  console.log(`✅ 수집 완료: ${result.newCount}개 신규, ${result.updatedCount}개 업데이트`);
}

collectMissingResults();
```

**실행**:
```bash
cd /Users/inyeoppark/Documents/MyGemeProject/LikeBetFair
node server/scripts/collect-game-results.js
```

#### 2. 베팅 정산 강제 실행
```javascript
// server/scripts/force-settlement.js
import betResultService from '../services/betResultService.js';

async function forceSettlement() {
  console.log('🎯 베팅 정산 강제 실행...');
  
  const result = await betResultService.updateBetResults();
  
  console.log(`✅ 정산 완료: ${result.updatedCount}개 업데이트`);
}

forceSettlement();
```

### 중기 조치 (개선)

#### 1. 팀명 매칭 개선
```javascript
// normalizeUtils.js 개선
export const normalizeTeamNameForComparison = (teamName) => {
  // 1차 정규화
  let normalized = teamName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\w가-힣]/g, '');
  
  // 2차: 공통 접두사/접미사 제거
  normalized = normalized
    .replace(/^(club|deportivo|atletico|sporting)/g, '')
    .replace(/(fc|cf|sc|ac|bk|united|city)$/g, '');
  
  // 3차: 지역명 제거 옵션
  // "Barracas Central de Cordoba" → "barracascentral"
  const parts = normalized.split(/de|da|do|of/);
  if (parts.length > 1) {
    return parts[0].trim();
  }
  
  return normalized;
};

// 유사도 기반 매칭 추가
export const calculateTeamNameSimilarity = (name1, name2) => {
  // Levenshtein 거리 또는 Jaro-Winkler 거리 사용
  // 유사도 80% 이상이면 매칭 성공
};
```

#### 2. 시간 범위 확대
```javascript
// betResultService.js
const candidateGames = await GameResult.findAll({
  where: {
    commenceTime: {
      // ±24시간 → ±48시간으로 확대
      [Op.gte]: new Date(commenceTime.getTime() - 48 * 60 * 60 * 1000),
      [Op.lte]: new Date(commenceTime.getTime() + 48 * 60 * 60 * 1000)
    }
  }
});
```

#### 3. 스케줄러 강화
```javascript
// server/jobs/gameResultScheduler.js
import schedule from 'node-schedule';
import gameResultService from '../services/gameResultService.js';

// 매 30분마다 경기 결과 수집 (더 자주)
schedule.scheduleJob('*/30 * * * *', async () => {
  try {
    console.log('[Scheduler] 경기 결과 수집 시작...');
    await gameResultService.fetchAndSaveAllResults();
    console.log('[Scheduler] 경기 결과 수집 완료');
  } catch (error) {
    console.error('[Scheduler] 경기 결과 수집 실패:', error);
    // 실패 시 재시도 로직
    await retryWithDelay(gameResultService.fetchAndSaveAllResults, 3);
  }
});

// 매 10분마다 베팅 정산
schedule.scheduleJob('*/10 * * * *', async () => {
  try {
    console.log('[Scheduler] 베팅 정산 시작...');
    await betResultService.updateBetResults();
    console.log('[Scheduler] 베팅 정산 완료');
  } catch (error) {
    console.error('[Scheduler] 베팅 정산 실패:', error);
  }
});
```

### 장기 조치 (근본 해결)

#### 1. 다중 데이터 소스 지원
```javascript
// gameResultService.js
async fetchResultsWithFallback(sportKey) {
  // 1차: TheSportsDB
  try {
    return await this.fetchResultsWithSportsDB(sportKey);
  } catch (error) {
    console.warn('TheSportsDB 실패, 2차 시도...');
  }
  
  // 2차: The Odds API (경기 결과 지원 시)
  try {
    return await this.fetchResultsWithOddsAPI(sportKey);
  } catch (error) {
    console.warn('The Odds API 실패, 3차 시도...');
  }
  
  // 3차: 로컬 추정
  return await this.generateEstimatedResults(sportKey);
}
```

#### 2. 매칭 알고리즘 개선
```javascript
// Fuzzy Matching 라이브러리 사용
import { distance } from 'fastest-levenshtein';

function findBestTeamMatch(targetTeam, candidateGames) {
  let bestMatch = null;
  let highestScore = 0;
  
  for (const game of candidateGames) {
    // 홈팀 유사도
    const homeScore = 1 - (distance(targetTeam, game.homeTeam) / Math.max(targetTeam.length, game.homeTeam.length));
    
    // 원정팀 유사도
    const awayScore = 1 - (distance(targetTeam, game.awayTeam) / Math.max(targetTeam.length, game.awayTeam.length));
    
    const maxScore = Math.max(homeScore, awayScore);
    
    if (maxScore > 0.8 && maxScore > highestScore) {
      bestMatch = game;
      highestScore = maxScore;
    }
  }
  
  return bestMatch;
}
```

#### 3. 모니터링 및 알림
```javascript
// server/utils/settlementMonitoring.js
export async function checkSettlementHealth() {
  // 1. 정산 대기 중인 베팅 수 확인
  const pendingBets = await Bet.count({ where: { status: 'pending' } });
  
  // 2. GameResult 최신 데이터 확인
  const latestGameResult = await GameResult.findOne({
    order: [['commenceTime', 'DESC']]
  });
  
  const hoursSinceLatest = (Date.now() - latestGameResult.commenceTime) / (1000 * 60 * 60);
  
  // 3. 임계값 초과 시 알림
  if (pendingBets > 100 || hoursSinceLatest > 24) {
    sendAlert({
      type: 'settlement_health',
      pendingBets,
      hoursSinceLatest,
      message: '정산 시스템 점검 필요'
    });
  }
}
```

---

## 📊 진단 체크리스트

### 1. GameResult 데이터 확인
```sql
-- ✅ 확인 사항 1: 9월 30일 이후 데이터 개수
SELECT COUNT(*) FROM game_results WHERE commence_time >= '2025-09-30';

-- ✅ 확인 사항 2: 최신 데이터 시간
SELECT MAX(commence_time) FROM game_results;

-- ✅ 확인 사항 3: 특정 경기 존재 여부
SELECT * FROM game_results
WHERE (home_team LIKE '%Barracas%' OR away_team LIKE '%Belgrano%')
  AND commence_time >= '2025-09-29';

-- ✅ 확인 사항 4: status별 분포
SELECT status, COUNT(*) FROM game_results
WHERE commence_time >= '2025-09-30'
GROUP BY status;
```

### 2. Bet 데이터 확인
```sql
-- ✅ 확인 사항 1: pending 베팅 수
SELECT COUNT(*) FROM bets WHERE status = 'pending';

-- ✅ 확인 사항 2: 9월 30일 이후 베팅
SELECT COUNT(*) FROM bets
WHERE created_at >= '2025-09-30';

-- ✅ 확인 사항 3: 정산 실패 베팅 상세
SELECT id, status, selections
FROM bets
WHERE status = 'pending'
  AND created_at >= '2025-09-30'
LIMIT 10;
```

### 3. TheSportsDB API 테스트
```bash
# ✅ API 키 테스트
curl "https://www.thesportsdb.com/api/v1/json/3/search_all_leagues.php"

# ✅ 특정 리그 데이터 확인 (MLB)
curl "https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4424&s=2025"

# ✅ 최근 경기 확인 (Argentina Primera)
curl "https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=4406"
```

### 4. 스케줄러 로그 확인
```bash
# ✅ 서버 로그에서 스케줄러 실행 여부 확인
tail -f /Users/inyeoppark/Documents/MyGemeProject/LikeBetFair/logs/server.log | grep "Scheduler"

# ✅ 경기 결과 수집 로그 확인
tail -f /Users/inyeoppark/Documents/MyGemeProject/LikeBetFair/logs/server.log | grep "GameResult"
```

---

## 🎯 권장 조치 순서

### 1단계: 즉시 실행 (10분)
1. ✅ **GameResult 데이터 수집 스크립트 실행**
2. ✅ **베팅 정산 강제 실행**
3. ✅ **정산 결과 확인**

### 2단계: 단기 조치 (1시간)
1. ✅ **스케줄러 확인 및 재시작**
2. ✅ **TheSportsDB API 키 확인**
3. ✅ **팀명 매칭 로직 개선 (간단 버전)**

### 3단계: 중기 조치 (1일)
1. ✅ **모니터링 시스템 구축**
2. ✅ **알림 시스템 추가**
3. ✅ **시간 범위 확대**

### 4단계: 장기 조치 (1주)
1. ✅ **다중 데이터 소스 지원**
2. ✅ **Fuzzy Matching 도입**
3. ✅ **전체 시스템 리팩토링**

---

## 📌 중요 파일 목록

### 정산 관련
- `server/services/betResultService.js` - 스포츠북 정산
- `server/services/multibetSettlementService.js` - 멀티베팅 정산
- `server/services/exchangeSettlementService.js` - 익스체인지 정산

### 데이터 수집
- `server/services/gameResultService.js` - 경기 결과 수집
- `server/models/gameResultModel.js` - GameResult 모델

### 유틸리티
- `server/normalizeUtils.js` - 팀명 정규화
- `server/utils/gameResultQuery.js` - 경기 결과 조회
- `server/utils/settlementValidation.js` - 정산 검증

### 스케줄러
- `server/jobs/` - 스케줄러 작업 (확인 필요)

---

## 📝 참고 자료
- TheSportsDB API 문서: https://www.thesportsdb.com/api.php
- 리그 ID 매핑: `server/services/gameResultService.js` (line 47-67)
- 팀명 정규화 로직: `server/normalizeUtils.js`

---

**작성일**: 2025-10-01  
**작성자**: AI Assistant  
**상태**: 분석 완료, 조치 대기중

