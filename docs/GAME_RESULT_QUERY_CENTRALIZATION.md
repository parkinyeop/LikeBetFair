# 경기 결과 조회 중앙화 시스템

## 📋 개요

경기 결과 조회 로직을 중앙화하여 **일관성**, **유지보수성**, **성능**을 향상시킨 시스템입니다.

### 🎯 목표
- **4곳의 분산된 로직**을 **1곳의 중앙화된 로직**으로 통합
- **Feature Flag**를 통한 안전한 점진적 마이그레이션
- **성능 모니터링** 및 **메트릭 수집**으로 지속적 개선

---

## 🏗️ 아키텍처

### 📁 파일 구조
```
server/
├── config/
│   └── gameResultQuery.js          # 설정 파일
├── utils/
│   ├── gameResultQuery.js          # 중앙화된 쿼리 유틸리티
│   └── gameResultQueryMetrics.js   # 메트릭 수집 클래스
└── test-*.js                       # 테스트 스크립트들
```

### 🔄 마이그레이션된 위치
1. **`server/controllers/betController.js`** - 베팅 내역 조회
2. **`server/services/multibetSettlementService.js`** - 멀티배팅 정산
3. **`server/services/exchangeSettlementService.js`** - 익스체인지 정산
4. **`server/routes/exchange.js`** - 익스체인지 주문 조회

---

## 🚀 사용 방법

### 1. 기본 사용법

```javascript
import GameResultQuery from '../utils/gameResultQuery.js';

// 경기 결과 조회
const gameResult = await GameResultQuery.findByTeamsAndTime(
  'Lotte Giants',           // 홈팀
  'Samsung Lions',          // 어웨이팀
  '2025-06-17T10:30:00Z',  // 경기 시간
  'betController'           // 호출 위치
);
```

### 2. 설정 관리

```javascript
import { getLocationConfig } from '../config/gameResultQuery.js';

// 특정 위치의 설정 조회
const config = getLocationConfig('betController');
console.log(config.FEATURE_FLAGS?.USE_CENTRALIZED_QUERY);
```

### 3. 메트릭 수집

```javascript
import gameResultQueryMetrics from '../utils/gameResultQueryMetrics.js';

// 일일 리포트 생성
const report = gameResultQueryMetrics.generateDailyReport();
console.log(`성공률: ${report.successRate}%`);
```

---

## ⚙️ 설정 옵션

### Feature Flags
```javascript
FEATURE_FLAGS: {
  USE_CENTRALIZED_QUERY: true,   // 중앙화된 쿼리 사용
  ENABLE_CACHING: false,         // 캐싱 활성화
  ENABLE_METRICS: true,          // 메트릭 수집 활성화
  ENABLE_ALERTS: true            // 알림 활성화
}
```

### 위치별 설정
```javascript
LOCATION_CONFIGS: {
  betController: {
    usePartialMatch: true,      // 부분 매칭 사용
    timeRange: 24,              // 시간 범위 (±24시간)
    statusFilter: null,         // 상태 필터 없음
    orderBy: 'createdAt',       // 정렬 기준
    orderDirection: 'DESC'      // 정렬 방향
  },
  multibetSettlement: {
    usePartialMatch: false,     // 정확 매칭 사용
    timeRange: 24,              // 시간 범위 (±24시간)
    statusFilter: 'finished',   // 완료된 경기만
    twoStageQuery: true         // 2단계 조회 사용
  }
}
```

---

## 📊 성능 모니터링

### 메트릭 수집 항목
- **쿼리 성능**: 응답시간, 성공률, 에러율
- **매칭 정확도**: 팀명 매칭 정확도
- **위치별 통계**: 각 위치별 성능 분석
- **에러 분석**: 에러 유형별 발생 빈도

### 리포트 예시
```json
{
  "date": "2025-09-28",
  "totalQueries": 13,
  "successRate": 100.0,
  "averageDuration": 5.7,
  "slowQueries": 0,
  "locationBreakdown": {
    "betController": {
      "total": 11,
      "successRate": 100.0,
      "averageDuration": 6.4
    }
  },
  "matchingAccuracy": {
    "averageAccuracy": 66.7,
    "totalMatches": 3,
    "lowAccuracyMatches": 1
  }
}
```

---

## 🔧 점진적 마이그레이션 전략

### 1단계: 개발 환경 테스트
```javascript
// config/gameResultQuery.js
FEATURE_FLAGS: {
  USE_CENTRALIZED_QUERY: true   // 개발 환경에서 활성화
}
```

### 2단계: 특정 위치 활성화
```javascript
// 특정 위치만 먼저 활성화
LOCATION_CONFIGS: {
  betController: {
    FEATURE_FLAGS: { USE_CENTRALIZED_QUERY: true }
  },
  multibetSettlement: {
    FEATURE_FLAGS: { USE_CENTRALIZED_QUERY: false }  // 아직 비활성화
  }
}
```

### 3단계: 전체 활성화
```javascript
// 모든 위치 활성화
FEATURE_FLAGS: {
  USE_CENTRALIZED_QUERY: true   // 전체 활성화
}
```

### 4단계: 레거시 코드 제거
- Feature Flag 제거
- 레거시 로직 삭제
- 코드 정리

---

## 🧪 테스트

### 기본 테스트
```bash
node server/test-centralized-query.js
```

### 고급 메트릭 테스트
```bash
node server/test-advanced-metrics.js
```

### 테스트 결과 예시
```
🧪 중앙화된 경기 결과 조회 테스트 시작

📋 Feature Flag 상태 확인:
  betController: ✅ 활성화
  multibetSettlement: ✅ 활성화
  exchangeRoutes: ✅ 활성화

📊 성능 메트릭 리포트:
  총 쿼리 수: 13
  성공률: 100.0%
  평균 응답시간: 5.7ms
```

---

## 🚨 주의사항

### 1. 데이터베이스 연결
- 모든 쿼리는 **Sequelize ORM**을 사용
- **트랜잭션** 내에서 사용 시 주의

### 2. 에러 처리
- **입력 검증** 실패 시 명확한 에러 메시지
- **재시도 로직**으로 일시적 오류 복구
- **로깅**으로 디버깅 지원

### 3. 성능 고려사항
- **캐싱** 활성화 시 메모리 사용량 모니터링
- **느린 쿼리** 임계값 설정 (기본: 2000ms)
- **메트릭 보관 기간** 설정 (기본: 30일)

---

## 🔄 롤백 전략

### 긴급 롤백
```javascript
// config/gameResultQuery.js
FEATURE_FLAGS: {
  USE_CENTRALIZED_QUERY: false  // 즉시 레거시 로직으로 복귀
}
```

### 부분 롤백
```javascript
// 특정 위치만 롤백
LOCATION_CONFIGS: {
  betController: {
    FEATURE_FLAGS: { USE_CENTRALIZED_QUERY: false }
  }
}
```

---

## 📈 향후 개선 계획

### 1. 캐싱 구현
- **Redis** 또는 **메모리 캐시** 추가
- **TTL** 기반 캐시 만료
- **캐시 무효화** 전략

### 2. 고급 매칭
- **AI 기반 팀명 매칭**
- **다국어 지원** 강화
- **유사도 점수** 기반 매칭

### 3. 실시간 모니터링
- **대시보드** 구축
- **알림 시스템** 연동
- **자동 스케일링** 지원

---

## 📞 지원

### 문제 발생 시
1. **로그 확인**: 서버 로그에서 에러 메시지 확인
2. **메트릭 분석**: `gameResultQueryMetrics.generateDailyReport()` 실행
3. **Feature Flag 확인**: 설정 파일에서 활성화 상태 확인
4. **롤백**: 긴급 시 Feature Flag 비활성화

### 개발자 가이드
- **새로운 위치 추가**: `LOCATION_CONFIGS`에 설정 추가
- **커스텀 로직**: `GameResultQuery` 클래스 확장
- **메트릭 추가**: `GameResultQueryMetrics` 클래스 확장

---

## 📝 변경 이력

| 버전 | 날짜 | 변경사항 |
|------|------|----------|
| 1.0.0 | 2025-09-29 | 초기 구현 및 4곳 마이그레이션 완료 |
| 1.1.0 | - | 캐싱 기능 추가 예정 |
| 1.2.0 | - | AI 기반 매칭 추가 예정 |

---

**🎉 경기 결과 조회 중앙화 시스템이 성공적으로 구현되었습니다!**
