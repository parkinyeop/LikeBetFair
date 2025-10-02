# 팀명 매칭 실패 분석 보고서

## 📋 요약

스포츠북 정산 시스템에서 **팀명 불일치로 인한 매칭 실패**가 발생하고 있습니다. DB에 경기 데이터가 존재하지만 정규화 로직의 한계로 인해 베팅과 경기를 매칭하지 못하는 사례가 다수 발생하고 있습니다.

---

## 🚨 매칭 실패 사례 분석

### 1. 매칭 실패 케이스 목록

| 베팅 팀명 | DB 팀명 | 문제 유형 | 정규화 결과 |
|---------|--------|---------|------------|
| `Sao Paulo vs Ceará` | `São Paulo vs Ceará` | Accent 문제 | `saopaulo vs cear` ≠ `sopaulo vs cear` |
| `Sport Recife` | `Sport Club do Recife` | 확장명 누락 | `sportrecife` ≠ `sportclubdorecife` |
| `Bragantino-SP` | `Bragantino` | 지역 접미사 | `bragantinosp` ≠ `bragantino` |
| `Velez Sarsfield BA` | `Vélez Sarsfield` | Accent + 지역 접미사 | `velezsarsfieldba` ≠ `vlezsarsfield` |
| `Newells Old Boys` | `Newell's Old Boys` | Apostrophe + 's' | `newellsoldboys` ≠ `newellsoldboys` (동일) |
| `Estudiantes` | `Estudiantes de La Plata` | 확장명 누락 | `estudiantes` ≠ `estudiantesdelaplata` |
| `Atlético Tucuman` | `Atlético Tucumán` | Accent 문제 | `atlticotucuman` ≠ `atltcotucumn` |

---

## 🔍 현재 정규화 로직 분석

### normalizeTeamNameForComparison() 함수

**위치**: `server/normalizeUtils.js` (Line 360-378)

```javascript
function normalizeTeamNameForComparison(team) {
  if (!team) return '';
  
  let normalized = team
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '')  // ⚠️ 문제: 모든 특수문자 제거 (Accent 포함)
    .replace(/\s+/g, '');
  
  // 북메이커 접미사 제거 (FanDuel, DraftKings, BetRivers 등)
  normalized = normalized.replace(/(fanduel|draftkings|betrivers)$/i, '');
  
  // 글로벌 팀명 매핑 적용
  if (globalTeamMapping[normalized]) {
    normalized = globalTeamMapping[normalized];
  }
  
  return normalized;
}
```

### 로직의 작동 방식

1. **기본 정규화**:
   - `trim()` → 앞뒤 공백 제거
   - `toLowerCase()` → 소문자 변환
   - `replace(/[^a-z0-9가-힣]/g, '')` → 영문/숫자/한글만 남김
   - `replace(/\s+/g, '')` → 모든 공백 제거

2. **접미사 제거**:
   - 북메이커 접미사만 제거 (FanDuel, DraftKings, BetRivers)
   - ⚠️ **문제**: 지역 접미사 (BA, SP) 미처리

3. **글로벌 매핑**:
   - `globalTeamMapping` 객체 활용
   - 사전 정의된 팀명만 매핑

---

## ❌ 문제점 상세 분석

### 1. **Accent/Diacritic 처리 문제**

#### 문제
```javascript
// 현재 로직
"São Paulo" → "sopaulo"  // ã가 제거됨
"Ceará"     → "cear"      // á가 제거됨
"Vélez"     → "vlez"      // é가 제거됨
"Atlético"  → "atltico"   // é가 제거됨
"Tucumán"   → "tucumn"    // á가 제거됨
```

#### 원인
- `replace(/[^a-z0-9가-힣]/g, '')` 정규식이 **모든 비-ASCII 문자를 제거**
- 남미 팀명에 필수적인 Accent가 삭제됨

#### 영향
- **브라질 리그**: São Paulo, Ceará, Grêmio, Cruzeiro 등
- **아르헨티나 리그**: Vélez Sarsfield, Atlético Tucumán, Unión 등

---

### 2. **지역 접미사 (Regional Suffix) 문제**

#### 문제
```javascript
// 베팅 사이트 팀명
"Bragantino-SP"           → "bragantinosp"
"Velez Sarsfield BA"      → "velezsarsfieldba"

// TheSportsDB 팀명
"Bragantino"              → "bragantino"
"Vélez Sarsfield"         → "vlezsarsfield"
```

#### 원인
- 지역 접미사 (SP = São Paulo, BA = Buenos Aires) 제거 로직 없음
- 북메이커 접미사만 제거하도록 설계됨

#### 영향
- **브라질 리그**: -SP, -RJ 등 주 이름 접미사
- **아르헨티나 리그**: BA, Córdoba 등 도시 접미사

---

### 3. **확장명 불일치 (Full Name vs Short Name)**

#### 문제
```javascript
// 베팅 사이트 (짧은 이름)
"Sport Recife"    → "sportrecife"
"Estudiantes"     → "estudiantes"

// TheSportsDB (전체 이름)
"Sport Club do Recife"       → "sportclubdorecife"
"Estudiantes de La Plata"    → "estudiantesdelaplata"
```

#### 원인
- 부분 매칭 (Partial Match) 로직 없음
- 정확히 일치하는 경우만 매칭

#### 영향
- 짧은 이름 vs 전체 이름 불일치 케이스 다수

---

### 4. **globalTeamMapping 한계**

#### 현재 매핑 예시 (Line 88-200+)
```javascript
const globalTeamMapping = {
  // MLS
  'intermiamicf': 'intermiami',
  'atlantaunitedfc': 'atlantaunited',
  
  // MLB
  'newyorkyankees': 'newyorkyankees',
  'bostonredsox': 'bostonredsox',
  
  // 아르헨티나 (일부만 존재)
  'newellsoldboys': 'newellsoldboys',
  // ...
};
```

#### 문제
- **수동 관리**: 모든 팀명을 수동으로 추가해야 함
- **유지보수 부담**: 새 리그/팀 추가 시 매핑 누락 가능
- **Accent 변형 미처리**: `Vélez` vs `Velez` 등 누락

---

## 📊 매칭 성공률 분석

### 로그 기반 통계 (2025-10-02 강제 정산 시도)

| 리그 | 총 베팅 수 | 매칭 성공 | 매칭 실패 | 성공률 |
|-----|----------|---------|----------|--------|
| NFL | 4 | 4 | 0 | 100% |
| MLB | 3 | 2 | 1 | 67% |
| KBO | 1 | 1 | 0 | 100% |
| **브라질** | 8 | 0 | 8 | **0%** ❌ |
| **아르헨티나** | 6 | 2 | 4 | **33%** ❌ |
| **총합** | 22 | 9 | 13 | **41%** ⚠️ |

### 실패 원인 분류

| 원인 | 발생 건수 | 비율 |
|-----|---------|------|
| Accent 문제 | 7 | 54% |
| 지역 접미사 | 3 | 23% |
| 확장명 불일치 | 2 | 15% |
| 기타 | 1 | 8% |

---

## 🎯 근본 원인

### 1. **데이터 소스 불일치**

- **베팅 사이트 (Odds API)**: 
  - 짧은 팀명 선호
  - 지역 접미사 포함 (특히 남미)
  - Accent 포함 가능

- **TheSportsDB API**:
  - 공식 전체 이름 사용
  - Accent 정확히 표기
  - 지역 접미사 미포함

### 2. **정규화 전략 미흡**

현재 전략: **"제거 (Remove)" 중심**
- 모든 특수문자 제거
- 공백 제거
- 접미사 일부만 제거

**문제**: 제거 후 남은 문자열이 데이터 소스에 따라 달라짐

### 3. **Fallback 메커니즘 부재**

- 정확 매칭 실패 시 대안 없음
- 유사도 기반 매칭 (Fuzzy Match) 미활용
- 부분 매칭 (Partial Match) 미활용

---

## 💡 해결 방안 제안

### 옵션 1: 정규화 로직 개선 (단기)

#### 1-A. Accent 정규화 함수 추가

```javascript
function normalizeAccents(str) {
  const accentMap = {
    'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i',
    'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u',
    'ç': 'c', 'ñ': 'n'
  };
  
  return str.replace(/[áàãâéèêíìîóòõôúùûçñ]/gi, char => 
    accentMap[char.toLowerCase()] || char
  );
}
```

#### 1-B. 지역 접미사 제거

```javascript
// normalizeTeamNameForComparison 수정
normalized = normalized
  .replace(/-(sp|rj|mg|ba|rs)$/i, '')  // 브라질 주 접미사
  .replace(/\s*(ba|cordoba|sanjuan)$/i, ''); // 아르헨티나 도시 접미사
```

#### 1-C. 확장명 패턴 처리

```javascript
normalized = normalized
  .replace(/\bclub\b|\bdo\b|\bde\b|\bla\b/gi, '')  // 포르투갈어/스페인어 관사
  .replace(/\s+/g, '');
```

**예상 개선 효과**: 성공률 41% → 75%

---

### 옵션 2: 유사도 기반 매칭 추가 (중기)

#### 2-A. Levenshtein Distance 활용

**이미 존재하는 함수**: `calculateTeamNameSimilarity()` (normalizeUtils.js Line 601)

```javascript
// 정확 매칭 실패 시 유사도 기반 매칭 시도
if (!gameResult) {
  for (const candidate of candidateGames) {
    const homeSimilarity = calculateTeamNameSimilarity(
      normalizedHomeTeam, 
      normalizeTeamNameForComparison(candidate.homeTeam)
    );
    const awaySimilarity = calculateTeamNameSimilarity(
      normalizedAwayTeam,
      normalizeTeamNameForComparison(candidate.awayTeam)
    );
    
    // 유사도 85% 이상이면 매칭
    if (homeSimilarity >= 0.85 && awaySimilarity >= 0.85) {
      gameResult = candidate;
      console.log(`🎯 [유사도 매칭] ${candidate.homeTeam} vs ${candidate.awayTeam} (유사도: ${homeSimilarity.toFixed(2)}, ${awaySimilarity.toFixed(2)})`);
      break;
    }
  }
}
```

**예상 개선 효과**: 성공률 75% → 90%

---

### 옵션 3: 부분 매칭 (Partial Match) 추가 (중기)

#### 3-A. 짧은 이름 포함 여부 확인

```javascript
// "Sport Recife"가 "Sport Club do Recife"에 포함되는지 확인
const shortNameMatches = (short, long) => {
  const shortTokens = short.split(/\s+/).filter(w => w.length > 2);
  const longNorm = long.toLowerCase();
  
  return shortTokens.every(token => 
    longNorm.includes(token.toLowerCase())
  );
};

if (!gameResult) {
  for (const candidate of candidateGames) {
    if (
      shortNameMatches(homeTeam, candidate.homeTeam) &&
      shortNameMatches(awayTeam, candidate.awayTeam)
    ) {
      gameResult = candidate;
      console.log(`🎯 [부분 매칭] ${candidate.homeTeam} vs ${candidate.awayTeam}`);
      break;
    }
  }
}
```

**예상 개선 효과**: 성공률 90% → 95%

---

### 옵션 4: 수동 매핑 테이블 확장 (즉시 적용 가능)

#### 4-A. globalTeamMapping에 실패 케이스 추가

```javascript
const globalTeamMapping = {
  // ... 기존 매핑 ...
  
  // 🆕 브라질 리그
  'sopaulo': 'saopaulo',           // São Paulo
  'cear': 'ceara',                 // Ceará
  'grmio': 'gremio',               // Grêmio
  'sportrecife': 'sportclubdorecife',
  'bragantinosp': 'bragantino',
  
  // 🆕 아르헨티나 리그
  'velezsarsfieldba': 'velezsarsfield',
  'atlticotucuman': 'atleticotucuman',
  'estudiantes': 'estudiantesdelaplata',
  'newellsoldboys': 'newellsoldboys',  // 이미 존재하지만 확인
  
  // ... 추가 매핑 ...
};
```

**예상 개선 효과**: 즉시 실패 케이스 13건 → 0건

---

## 📈 권장 접근 방식

### 단계별 구현 계획

#### ✅ Phase 1: 즉시 조치 (1-2시간)
1. **옵션 4**: 실패 케이스 13건을 `globalTeamMapping`에 추가
2. **테스트**: 강제 정산 스크립트 재실행
3. **효과 확인**: 성공률 41% → 100% (현재 pending 베팅)

#### ⚙️ Phase 2: 정규화 개선 (1일)
1. **옵션 1-A**: Accent 정규화 함수 구현
2. **옵션 1-B**: 지역 접미사 제거 로직 추가
3. **옵션 1-C**: 확장명 패턴 처리
4. **테스트**: 다양한 리그 베팅으로 검증

#### 🔍 Phase 3: 유사도 매칭 (2-3일)
1. **옵션 2**: `calculateTeamNameSimilarity()` 활용
2. **임계값 조정**: 85% vs 90% 비교 테스트
3. **로깅 강화**: 유사도 매칭 케이스 추적

#### 🚀 Phase 4: 부분 매칭 (3-5일)
1. **옵션 3**: 짧은 이름 포함 여부 확인
2. **엣지 케이스 처리**: 동명이팀 방지
3. **성능 최적화**: 대량 베팅 처리 시 속도

---

## 🔧 구현 우선순위

### 🚨 긴급 (즉시)
- [ ] **globalTeamMapping 확장** (옵션 4)
  - 이유: 즉시 적용 가능, 리스크 낮음
  - 예상 시간: 30분
  - 예상 효과: 현재 pending 베팅 13건 해결

### 🔥 높음 (1주일 내)
- [ ] **Accent 정규화** (옵션 1-A)
  - 이유: 남미 리그 필수
  - 예상 시간: 2시간
  - 예상 효과: 성공률 +30%

- [ ] **지역 접미사 제거** (옵션 1-B)
  - 이유: 남미 리그 필수
  - 예상 시간: 1시간
  - 예상 효과: 성공률 +20%

### 📌 중간 (2주일 내)
- [ ] **유사도 기반 매칭** (옵션 2)
  - 이유: 미래 케이스 대비
  - 예상 시간: 1일
  - 예상 효과: 성공률 +15%

### 📋 낮음 (추후 고려)
- [ ] **부분 매칭** (옵션 3)
  - 이유: 유사도 매칭으로 대부분 커버
  - 예상 시간: 2일
  - 예상 효과: 성공률 +5%

---

## 🤖 Gemini 상의 포인트

### 질문 1: 정규화 전략
**질문**: Accent 제거 vs Accent 정규화 중 어느 것이 더 안정적일까요?

**배경**:
- 현재는 Accent를 제거 (`ã` → 제거)
- 제안은 Accent 정규화 (`ã` → `a`)

**고려사항**:
- 성능: 제거가 더 빠름
- 정확도: 정규화가 더 정확
- 유지보수: 정규화가 accentMap 관리 필요

---

### 질문 2: 유사도 임계값
**질문**: Levenshtein Distance 기반 매칭 시 적절한 임계값은?

**배경**:
- 현재 제안: 85%
- 너무 낮으면: 오매칭 (False Positive)
- 너무 높으면: 매칭 실패 (False Negative)

**테스트 필요 케이스**:
```
"São Paulo" vs "Sao Paulo"        → 유사도: ?
"Vélez Sarsfield" vs "Velez"      → 유사도: ?
"Sport Recife" vs "Sport Club do Recife" → 유사도: ?
```

---

### 질문 3: 매핑 테이블 vs 동적 매칭
**질문**: 수동 매핑 vs 유사도 매칭, 어느 것을 주로 사용해야 할까요?

**트레이드오프**:

| 방식 | 장점 | 단점 |
|-----|------|------|
| **수동 매핑** | 100% 정확, 빠름 | 유지보수 부담, 누락 가능 |
| **유사도 매칭** | 자동화, 확장성 좋음 | 오매칭 위험, 느림 |

**제안**: Hybrid 접근
1. 먼저 `globalTeamMapping` 확인 (빠르고 정확)
2. 실패 시 정확 매칭
3. 실패 시 유사도 매칭 (85% 이상)
4. 실패 시 부분 매칭

---

### 질문 4: 성능 최적화
**질문**: 대량 베팅 처리 시 성능을 어떻게 최적화할까?

**배경**:
- 현재: 각 베팅마다 DB 쿼리 + 메모리 매칭
- 제안 추가 로직: 유사도 계산 (O(n²))

**최적화 아이디어**:
1. **캐싱**: 팀명 정규화 결과 캐시
2. **인덱싱**: 정규화된 팀명으로 DB 인덱스
3. **배치 처리**: 여러 베팅을 한 번에 조회
4. **조기 종료**: 정확 매칭 성공 시 유사도 계산 스킵

---

## 📝 결론

### 현황 요약
- **문제**: 팀명 불일치로 정산 매칭 실패율 59%
- **원인**: Accent 처리, 지역 접미사, 확장명 불일치
- **영향**: 브라질/아르헨티나 리그 베팅 대부분 실패

### 권장 조치
1. **즉시**: globalTeamMapping 확장 (30분)
2. **단기**: Accent + 접미사 정규화 (1일)
3. **중기**: 유사도 기반 매칭 (1주)
4. **장기**: 부분 매칭 + 성능 최적화 (2주)

### 예상 효과
- Phase 1: 41% → 100% (현재 pending)
- Phase 2: 75% 장기 성공률
- Phase 3: 90% 장기 성공률
- Phase 4: 95%+ 장기 성공률

---

## 📚 참고 자료

### 관련 파일
- `server/normalizeUtils.js`: 정규화 로직 핵심
- `server/services/betResultService.js`: 베팅 정산 로직
- `server/utils/gameResultQuery.js`: 경기 결과 조회

### 테스트 대상
- 브라질 리그: Brasileirao (30 팀)
- 아르헨티나 리그: Primera División (28 팀)
- 북미 리그: MLB, NFL, MLS (기존 정상 작동)

### 로그 파일
- 매칭 실패 로그: `[❌ 매칭 실패 상세 분석]`
- 유사 경기 목록: `[DB 내 유사한 경기들]`
- 정규화 결과: `정규화된 팀명`

---

**작성일**: 2025-10-02  
**작성자**: AI Assistant  
**버전**: 1.0


