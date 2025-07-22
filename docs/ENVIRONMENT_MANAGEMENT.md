# 환경 관리 가이드

이 문서는 로컬 개발환경과 Render 프로덕션 환경의 차이를 관리하는 방법을 설명합니다.

## 🏗️ 환경 구조

### 개발환경 (Local)
- **API URL**: `http://localhost:5050`
- **데이터베이스**: 로컬 PostgreSQL
- **디버그 모드**: 활성화
- **로그 레벨**: DEBUG
- **자동 새로고침**: 30초

### 프로덕션 환경 (Render)
- **API URL**: `https://likebetfair.onrender.com`
- **데이터베이스**: Render PostgreSQL
- **디버그 모드**: 비활성화
- **로그 레벨**: ERROR
- **자동 새로고침**: 10분

## 🔧 환경 설정 방법

### 1. 환경변수 설정

#### 로컬 환경 (.env.local)
```bash
# API 설정
NEXT_PUBLIC_API_URL=http://localhost:5050

# 데이터베이스
DATABASE_URL=postgresql://username:password@localhost:5432/likebetfair_dev

# 외부 API 키
ODDS_API_KEY=your_odds_api_key
SPORTSDB_API_KEY=your_sportsdb_api_key

# JWT
JWT_SECRET=your_jwt_secret
```

#### Render 환경 (Render Dashboard)
```bash
# API 설정
NEXT_PUBLIC_API_URL=https://likebetfair.onrender.com

# 데이터베이스 (Render에서 자동 설정)
DATABASE_URL=postgresql://...

# 외부 API 키
ODDS_API_KEY=your_odds_api_key
SPORTSDB_API_KEY=your_sportsdb_api_key

# JWT
JWT_SECRET=your_jwt_secret
```

### 2. 환경 확인 스크립트

```bash
# 기본 환경 확인
npm run check-env

# API 엔드포인트 확인
npm run check-env:api

# 데이터베이스 연결 확인
npm run check-env:db

# 전체 확인
npm run check-env:full
```

## 🚨 일반적인 문제들

### 1. API 연결 실패
**증상**: 프론트엔드에서 API 호출 시 연결 실패
**원인**: 환경변수 `NEXT_PUBLIC_API_URL` 설정 오류
**해결**: 
```bash
# 로컬에서
NEXT_PUBLIC_API_URL=http://localhost:5050

# Render에서
NEXT_PUBLIC_API_URL=https://likebetfair.onrender.com
```

### 2. 데이터베이스 연결 실패
**증상**: 서버 시작 시 데이터베이스 연결 오류
**원인**: `DATABASE_URL` 환경변수 누락 또는 잘못된 형식
**해결**: Render 대시보드에서 환경변수 확인

### 3. 배당률 데이터 수집 실패
**증상**: OddsCaches 테이블이 비어있음
**원인**: 
- `ODDS_API_KEY` 누락
- 데이터베이스 스키마 불일치
- API 호출 제한
**해결**:
1. API 키 확인
2. 데이터베이스 스키마 확인
3. Render 로그 확인

### 4. 환경별 코드 분기
**증상**: 로컬에서는 작동하지만 Render에서 실패
**원인**: 환경별 설정이 코드에 하드코딩됨
**해결**: 환경변수 사용

```typescript
// ❌ 하드코딩
const apiUrl = 'http://localhost:5050';

// ✅ 환경변수 사용
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://likebetfair.onrender.com';
```

## 📋 배포 체크리스트

### 배포 전 확인사항
- [ ] 환경변수 설정 확인
- [ ] 데이터베이스 마이그레이션 실행
- [ ] API 키 유효성 확인
- [ ] 로컬에서 테스트 완료

### 배포 후 확인사항
- [ ] Render 로그 확인
- [ ] API 엔드포인트 테스트
- [ ] 데이터베이스 연결 확인
- [ ] 배당률 데이터 수집 확인

## 🔍 디버깅 도구

### 1. 환경 진단 스크립트
```bash
npm run check-env:full
```

### 2. Render 로그 확인
- Render Dashboard → Logs
- 실시간 로그 스트리밍
- 에러 메시지 확인

### 3. 데이터베이스 직접 확인
```sql
-- 테이블 구조 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'OddsCaches';

-- 데이터 확인
SELECT COUNT(*) FROM "OddsCaches";
```

### 4. API 엔드포인트 테스트
```bash
# 배당률 업데이트
curl -X POST https://likebetfair.onrender.com/api/odds/update-odds

# 특정 리그 배당률
curl https://likebetfair.onrender.com/api/odds/soccer_korea_kleague1
```

## 🎯 모범 사례

### 1. 환경변수 우선 사용
```typescript
// config/apiConfig.ts
export const API_CONFIG = {
  get BASE_URL() {
    // 1. 환경변수 우선
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    
    // 2. 환경별 기본값
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:5050';
    }
    
    return 'https://likebetfair.onrender.com';
  }
};
```

### 2. 환경별 로깅
```typescript
// 개발환경: 상세 로그
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG] 상세 정보:', data);
}

// 프로덕션: 에러만 로그
if (process.env.NODE_ENV === 'production') {
  console.error('[ERROR] 에러만:', error);
}
```

### 3. 조건부 기능 활성화
```typescript
// 개발환경에서만 활성화
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  // 개발 전용 기능
  console.log('개발 모드 활성화');
}
```

## 📞 문제 해결

### 긴급 상황
1. **서버 다운**: Render Dashboard에서 재시작
2. **데이터베이스 오류**: 마이그레이션 재실행
3. **API 키 만료**: 새로운 키 발급 및 설정

### 지원
- Render 로그 확인
- 환경 진단 스크립트 실행
- 데이터베이스 직접 확인
- API 엔드포인트 테스트

---

**마지막 업데이트**: 2025-07-21 