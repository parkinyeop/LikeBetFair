# The Odds API 경기 결과 데이터 수집 작업지시서

## 개요
TheSportsDB 대안으로 The Odds API를 활용한 경기 결과 데이터 수집 시스템 구축

## 현재 상황 분석

### The Odds API 테스트 결과
- ✅ **정규시즌**: MLB, K리그, J리그 등 완료된 경기 데이터 제공
- ❌ **KBO 한계**: 플레이오프/포스트시즌 경기 데이터 미제공
- ✅ **데이터 구조**: 기존 GameResult 테이블과 95% 호환
- ✅ **팀명 매핑**: 100% 매핑 성공

### 수집 가능한 데이터
```json
{
  "id": "game_id",
  "sport_key": "baseball_mlb",
  "home_team": "Team A",
  "away_team": "Team B",
  "commence_time": "2025-09-28T19:00:00Z",
  "completed": true,
  "scores": [
    {"name": "Team A", "score": "4"},
    {"name": "Team B", "score": "2"}
  ],
  "last_update": "2025-09-29T03:52:15Z"
}
```

## 구현 작업 계획

### 1단계: 데이터 수집 서비스 구현

#### 1.1 OddsAPI 스코어 수집 서비스 생성
**파일**: `server/services/oddsApiScoreService.js`

```javascript
// 주요 기능
- getCompletedScores(sportKey, daysFrom): 완료된 경기 스코어 수집
- mapToGameResult(oddsApiData): GameResult 형식으로 변환
- bulkSaveGameResults(gameResults): 대량 저장
- validateScoreData(scoreData): 데이터 유효성 검증
```

#### 1.2 지원 스포츠 확장
- **현재 확인됨**: `baseball_mlb`, `soccer_korea_kleague1`, `soccer_japan_j_league`
- **추가 테스트 필요**: `baseball_kbo`, 기타 스포츠
- **설정 파일**: `server/config/oddsApiSports.js`

### 2단계: 데이터베이스 매핑 최적화

#### 2.1 팀명 매핑 시스템
**파일**: `server/utils/teamNameMapper.js`

```javascript
// The Odds API → 내부 팀명 변환
const teamMapping = {
  'Los Angeles Dodgers': '다저스',
  'New York Yankees': '양키스',
  // KBO 팀명 매핑 추가 필요
}
```

#### 2.2 GameResult 테이블 확장 고려
```sql
-- 추가 컬럼 검토
ALTER TABLE GameResults ADD COLUMN odds_api_id VARCHAR(255);
ALTER TABLE GameResults ADD COLUMN last_update TIMESTAMP;
ALTER TABLE GameResults ADD COLUMN data_source VARCHAR(50); -- 'odds_api', 'sports_db', 'scraping'
```

### 3단계: 자동화 스케줄러 구현

#### 3.1 정기 수집 작업
**파일**: `server/jobs/scoreCollectionJob.js`

```javascript
// 실행 주기 설정
- 매일 오전 6시: 전날 완료된 경기 수집
- 매시간: 진행 중인 경기 상태 확인
- 실시간: 중요 경기 결과 즉시 수집
```

#### 3.2 에러 처리 및 백업
- API 한도 초과 시 대기 로직
- 실패 시 재시도 메커니즘 (최대 3회)
- 수집 실패 시 이메일 알림

### 4단계: 하이브리드 시스템 구축

#### 4.1 다중 데이터 소스 관리
```javascript
// 우선순위 시스템
1. The Odds API (정규시즌, 주요 리그)
2. TheSportsDB (백업)
3. 웹 스크래핑 (KBO 플레이오프 등)
```

#### 4.2 데이터 품질 검증
- 스코어 데이터 교차 검증
- 이상치 탐지 및 수동 확인 플래그
- 데이터 소스별 신뢰도 점수

## 기술적 고려사항

### API 제한사항
- **요청 한도**: 월 500회 (무료 플랜)
- **daysFrom 제한**: 최대 3일 전 데이터만 조회 가능
- **응답 시간**: 평균 2-5초

### 성능 최적화
- 배치 처리로 API 호출 최소화
- 중복 데이터 필터링
- 캐싱 메커니즘 적용

### 보안 고려사항
- API 키 환경변수 관리
- 요청 로그 기록
- 데이터 무결성 검증

## 구현 우선순위

### Phase 1 (즉시 구현)
1. ✅ 데이터 구조 분석 완료
2. ✅ 매핑 로직 검증 완료
3. 🔄 기본 수집 서비스 구현

### Phase 2 (1-2주 내)
1. 자동화 스케줄러 구현
2. 에러 처리 시스템 구축
3. 관리자 대시보드 연동

### Phase 3 (장기)
1. KBO 플레이오프 대안 시스템
2. 실시간 수집 시스템
3. 데이터 품질 모니터링

## 예상 문제점 및 해결 방안

### 문제 1: KBO 플레이오프 데이터 부재
**해결**: 웹 스크래핑 백업 시스템 구축

### 문제 2: API 요청 한도 초과
**해결**: 효율적인 배치 처리 및 캐싱

### 문제 3: 데이터 지연
**해결**: 다중 소스 시스템으로 실시간성 확보

## 성공 지표

### 정량적 지표
- 데이터 수집 성공률: 95% 이상
- API 응답 시간: 평균 3초 이하
- 데이터 정확도: 99% 이상

### 정성적 지표
- 사용자 불만 감소
- 베팅 정산 자동화율 향상
- 관리자 수동 개입 빈도 감소

## 구현 체크리스트

- [ ] OddsAPI 스코어 수집 서비스 구현
- [ ] 팀명 매핑 시스템 구축
- [ ] GameResult 테이블 확장
- [ ] 자동화 스케줄러 구현
- [ ] 에러 처리 및 로깅 시스템
- [ ] 관리자 모니터링 도구
- [ ] KBO 대안 시스템 구축
- [ ] 성능 테스트 및 최적화
- [ ] 문서화 및 운영 가이드 작성