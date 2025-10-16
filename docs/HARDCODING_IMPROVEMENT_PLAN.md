# LikeBetFair 하드코딩 개선 종합 제안서

**작성일:** 2025-10-16
**프로젝트:** LikeBetFair (Sports Betting Platform)
**목적:** 하드코딩된 설정값을 환경변수 및 설정 파일로 체계화하여 유지보수성, 보안성, 확장성 향상

---

## 📋 목차

1. [개요](#1-개요)
2. [현황 분석](#2-현황-분석)
3. [Phase 1: 긴급 보안 개선](#3-phase-1-긴급-보안-개선)
4. [Phase 2: URL/포트 환경변수화](#4-phase-2-url포트-환경변수화)
5. [Phase 3: 상수 파일 체계화](#5-phase-3-상수-파일-체계화)
6. [Phase 4: 데이터베이스 설정 개선](#6-phase-4-데이터베이스-설정-개선)
7. [Phase 5: 비즈니스 규칙 DB 이관](#7-phase-5-비즈니스-규칙-db-이관)
8. [리스크 분석 및 대응](#8-리스크-분석-및-대응)
9. [구현 체크리스트](#9-구현-체크리스트)
10. [롤백 계획](#10-롤백-계획)

---

## 1. 개요

### 1.1 개선 필요성

현재 프로젝트에는 **80개 이상의 하드코딩**이 존재하며, 다음과 같은 문제를 야기합니다:

- **보안 취약점**: 기본 비밀번호(`admin123`, `test123`) 노출
- **환경 의존성**: localhost, 프로덕션 URL 하드코딩으로 환경 전환 어려움
- **유지보수 어려움**: 설정 변경 시 여러 파일 수정 필요
- **확장성 제약**: 비즈니스 규칙 변경 시 코드 수정 및 재배포 필요

### 1.2 개선 목표

- ✅ 모든 환경별 설정을 환경변수로 관리
- ✅ 매직 넘버를 상수 파일로 중앙화
- ✅ 비즈니스 규칙을 데이터베이스로 이관
- ✅ 보안 취약점 제거
- ✅ 환경 전환 자동화

### 1.3 예상 효과

| 구분 | 개선 전 | 개선 후 |
|------|--------|--------|
| 환경 전환 시간 | 30분 (여러 파일 수정) | 1분 (환경변수만 변경) |
| 보안 수준 | 낮음 (비밀번호 노출) | 높음 (환경변수 관리) |
| 설정 변경 | 코드 수정 + 재배포 | DB 업데이트만 |
| 유지보수성 | 분산된 설정 | 중앙화된 관리 |

---

## 2. 현황 분석

### 2.1 발견된 하드코딩 항목 (80+개)

#### 카테고리별 분류

| 카테고리 | 개수 | 심각도 | 주요 파일 |
|---------|------|--------|----------|
| URL/포트 | 19개 | 🟡 중간 | config/api.js, server/config/centralizedConfig.js |
| 비밀번호/API키 | 4개 | 🔴 높음 | server/app.js, server/config/centralizedConfig.js |
| 금액 제한 | 12개 | 🟡 중간 | config/apiConfig.ts, server/services/commissionService.js |
| 시간 상수 | 15개 | 🟢 낮음 | config/apiConfig.ts, server/config/oddsApiConfig.js |
| 수수료율 | 8개 | 🟡 중간 | server/services/commissionService.js |
| DB 설정 | 6개 | 🟡 중간 | server/app.js, server/config/database.js |
| 스포츠 키 | 10개 | 🟢 낮음 | server/config/sportsConfig.js (일부 개선됨) |
| UI 상수 | 6개 | 🟢 낮음 | config/apiConfig.ts, pages/admin.tsx |

### 2.2 가장 문제가 많은 파일 (Top 5)

1. **server/app.js** (428, 446라인)
   - 기본 비밀번호 하드코딩
   - DB 연결 풀 설정 하드코딩
   - 초기 잔액 하드코딩

2. **server/config/centralizedConfig.js** (전체)
   - 프로덕션 URL 하드코딩
   - 포트 번호 하드코딩
   - CORS origins 하드코딩

3. **config/apiConfig.ts** (전체)
   - API URL 하드코딩
   - 베팅 제한 하드코딩
   - 타임아웃 값 하드코딩

4. **server/services/commissionService.js** (14-26, 175-178라인)
   - VIP 할인율 하드코딩
   - 거래량 할인 기준 하드코딩
   - 프로모션 코드 하드코딩

5. **server/config/oddsApiConfig.js** (11-13라인)
   - API 레이트 제한 999999로 무제한 설정 (임시)

---

## 3. Phase 1: 긴급 보안 개선

**우선순위:** 🔴 최상
**예상 소요시간:** 2-3시간
**위험도:** 높음 (기존 계정 영향)

### 3.1 API 레이트 제한 복구

#### 현재 상태
```javascript
// server/config/oddsApiConfig.js (11-13라인)
RATE_LIMITS: {
  // 🚨 임시 설정 (디버깅용) - 나중에 원래 값으로 복구 필요
  DAILY: 999999,    // 원래: 500 (무료 플랜)
  MONTHLY: 999999,  // 원래: 10000 (무료 플랜)
  HOURLY: 999999    // 원래: 100 (무료 플랜)
}
```

#### 개선안 (단계적 적용)

**Step 1: 환경변수 추가**

`.env.local` 파일에 추가:
```bash
# API 레이트 제한
ODDS_API_RATE_LIMIT_DAILY=500
ODDS_API_RATE_LIMIT_MONTHLY=10000
ODDS_API_RATE_LIMIT_HOURLY=100
```

**Step 2: 코드 수정**

```javascript
// server/config/oddsApiConfig.js
export const ODDS_API_CONFIG = {
  // API 기본 설정
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  BATCH_SIZE: 10,

  // 속도 제한 설정 (환경변수 기반)
  RATE_LIMITS: {
    DAILY: parseInt(process.env.ODDS_API_RATE_LIMIT_DAILY) || 500,
    MONTHLY: parseInt(process.env.ODDS_API_RATE_LIMIT_MONTHLY) || 10000,
    HOURLY: parseInt(process.env.ODDS_API_RATE_LIMIT_HOURLY) || 100
  },

  // 데이터 정리 설정
  CLEANUP_DAYS: 7,

  // 성능 임계값
  PERFORMANCE_THRESHOLDS: {
    MAX_PROCESSING_TIME: 10000,
    WARNING_PROCESSING_TIME: 5000
  }
};
```

**Step 3: OddsApiService 수정**

```javascript
// server/services/oddsApiService.js
import { ODDS_API_CONFIG } from '../config/oddsApiConfig.js';

class OddsApiService {
  constructor() {
    this.rateLimiter = {
      daily: {
        count: 0,
        limit: ODDS_API_CONFIG.RATE_LIMITS.DAILY,  // 환경변수 기반
        resetTime: this.getResetTime('day')
      },
      monthly: {
        count: 0,
        limit: ODDS_API_CONFIG.RATE_LIMITS.MONTHLY,
        resetTime: this.getResetTime('month')
      },
      hourly: {
        count: 0,
        limit: ODDS_API_CONFIG.RATE_LIMITS.HOURLY,
        resetTime: this.getResetTime('hour')
      }
    };
  }

  // ... 나머지 코드
}
```

#### 단계적 복구 전략

**Week 1: 일일 제한만 적용**
```bash
ODDS_API_RATE_LIMIT_DAILY=500
ODDS_API_RATE_LIMIT_MONTHLY=999999  # 유지
ODDS_API_RATE_LIMIT_HOURLY=999999   # 유지
```

**Week 2: 시간당 제한 추가 (모니터링)**
```bash
ODDS_API_RATE_LIMIT_HOURLY=150  # 여유 확보 (100 → 150)
```

**Week 3: 최종 적용**
```bash
ODDS_API_RATE_LIMIT_HOURLY=100
ODDS_API_RATE_LIMIT_MONTHLY=10000
```

---

### 3.2 기본 계정 비밀번호 환경변수화

#### 현재 상태
```javascript
// server/app.js (428, 446라인)
const hashedPassword = await bcrypt.default.hash('admin123', salt);
// ...
const hashedPassword = await bcrypt.default.hash('test123', salt);
```

```javascript
// server/config/centralizedConfig.js (236-238라인)
export const ADMIN_CONFIG = {
  SYSTEM_ADMIN_ID: process.env.SYSTEM_ADMIN_ID,
  DEFAULT_ADMIN_USERNAME: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  DEFAULT_TEST_USERNAME: process.env.DEFAULT_TEST_USERNAME || 'testuser',
  DEFAULT_TEST_PASSWORD: process.env.DEFAULT_TEST_PASSWORD || 'test123'
};
```

#### 위험 요소

⚠️ **기존 계정 로그인 불가 문제**
- 운영 DB에 이미 `admin` 계정이 `admin123` 해싱값으로 존재
- 환경변수 변경해도 기존 계정은 변경되지 않음
- 생성 조건: `if (adminCount === 0)` → 이미 계정 있으면 실행 안 됨

#### 개선안 (마이그레이션 포함)

**Step 1: 환경변수 추가**

`.env.local` 파일:
```bash
# 보안 - 강력한 비밀번호 설정
DEFAULT_ADMIN_PASSWORD=Admin2025!@#SecurePass987
DEFAULT_TEST_PASSWORD=Test2025!@#DevOnly456

# ⚠️ 프로덕션 환경에서는 반드시 변경하세요!
# 첫 배포 후 관리자 계정으로 로그인하여 즉시 비밀번호를 변경해야 합니다.
```

**Step 2: 마이그레이션 스크립트 생성**

```javascript
// server/scripts/migrateDefaultPasswords.js
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/userModel.js';

dotenv.config({ path: '.env.local' });

/**
 * 기존 기본 계정들의 비밀번호를 환경변수 기반으로 업데이트
 */
async function migrateDefaultPasswords() {
  try {
    console.log('[마이그레이션] 기본 계정 비밀번호 업데이트 시작...');

    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    const testPassword = process.env.DEFAULT_TEST_PASSWORD;

    if (!adminPassword || !testPassword) {
      throw new Error('환경변수 DEFAULT_ADMIN_PASSWORD, DEFAULT_TEST_PASSWORD가 설정되지 않았습니다.');
    }

    // 관리자 계정 업데이트
    const admin = await User.findOne({ where: { username: 'admin', isAdmin: true } });
    if (admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      await admin.update({ password: hashedPassword });
      console.log('✅ 관리자 계정 비밀번호 업데이트 완료');
    } else {
      console.log('⚠️ 관리자 계정을 찾을 수 없습니다.');
    }

    // 테스트 계정 업데이트
    const testUser = await User.findOne({ where: { username: 'testuser' } });
    if (testUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);
      await testUser.update({ password: hashedPassword });
      console.log('✅ 테스트 계정 비밀번호 업데이트 완료');
    } else {
      console.log('⚠️ 테스트 계정을 찾을 수 없습니다.');
    }

    console.log('[마이그레이션] 완료');
  } catch (error) {
    console.error('[마이그레이션] 실패:', error);
    process.exit(1);
  }
}

migrateDefaultPasswords();
```

**Step 3: server/app.js 수정**

```javascript
// server/app.js (416-459라인 수정)
import { ADMIN_CONFIG } from './config/centralizedConfig.js';

async function createDefaultAccounts() {
  try {
    const User = (await import('./models/userModel.js')).default;
    const bcrypt = await import('bcryptjs');

    // 환경변수 검증
    const adminPassword = ADMIN_CONFIG.DEFAULT_ADMIN_PASSWORD;
    const testPassword = ADMIN_CONFIG.DEFAULT_TEST_PASSWORD;

    if (!adminPassword || adminPassword === 'admin123') {
      console.warn('⚠️ DEFAULT_ADMIN_PASSWORD가 설정되지 않았거나 기본값입니다. 보안 위험!');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('프로덕션 환경에서는 DEFAULT_ADMIN_PASSWORD 환경변수가 필수입니다.');
      }
    }

    // 관리자 계정 확인 및 생성
    const adminCount = await User.count({ where: { isAdmin: true } });
    if (adminCount === 0) {
      console.log('[계정] 기본 관리자 계정 생성...');
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash(adminPassword, salt);

      await User.create({
        username: ADMIN_CONFIG.DEFAULT_ADMIN_USERNAME || 'admin',
        email: 'admin@likebetfair.com',
        password: hashedPassword,
        balance: 1000000,
        isAdmin: true,
        adminLevel: 5
      });
      console.log(`✅ 관리자 계정 생성 완료 (${ADMIN_CONFIG.DEFAULT_ADMIN_USERNAME})`);
    } else {
      console.log('[계정] 관리자 계정이 이미 존재합니다.');
    }

    // 테스트 사용자 계정 (개발 환경에서만)
    if (process.env.NODE_ENV !== 'production') {
      const testUser = await User.findOne({ where: { username: 'testuser' } });
      if (!testUser) {
        console.log('[계정] 테스트 사용자 계정 생성...');
        const salt = await bcrypt.default.genSalt(10);
        const hashedPassword = await bcrypt.default.hash(testPassword, salt);

        await User.create({
          username: ADMIN_CONFIG.DEFAULT_TEST_USERNAME || 'testuser',
          email: 'test@likebetfair.com',
          password: hashedPassword,
          balance: 100000
        });
        console.log(`✅ 테스트 사용자 계정 생성 완료 (${ADMIN_CONFIG.DEFAULT_TEST_USERNAME})`);
      }
    } else {
      console.log('[계정] 프로덕션 환경에서는 테스트 계정을 생성하지 않습니다.');
    }
  } catch (error) {
    console.error('[계정] 기본 계정 생성 실패:', error.message);
    throw error; // 프로덕션에서는 서버 시작 중단
  }
}
```

**Step 4: centralizedConfig.js 수정**

```javascript
// server/config/centralizedConfig.js (232-239라인)
export const ADMIN_CONFIG = {
  SYSTEM_ADMIN_ID: process.env.SYSTEM_ADMIN_ID,
  DEFAULT_ADMIN_USERNAME: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD, // 폴백 제거
  DEFAULT_TEST_USERNAME: process.env.DEFAULT_TEST_USERNAME || 'testuser',
  DEFAULT_TEST_PASSWORD: process.env.DEFAULT_TEST_PASSWORD || (
    process.env.NODE_ENV === 'production'
      ? undefined  // 프로덕션에서는 테스트 계정 없음
      : 'test123'  // 개발 환경 임시 폴백
  )
};
```

**Step 5: 마이그레이션 실행**

```bash
# 로컬 환경에서 먼저 테스트
node server/scripts/migrateDefaultPasswords.js

# Render 환경변수 설정 후
# Render 대시보드 → Environment → Add Environment Variable
DEFAULT_ADMIN_PASSWORD=<강력한_비밀번호>
DEFAULT_TEST_PASSWORD=<강력한_비밀번호>  # (필요시)

# 배포 후 수동 실행 (Render Shell)
npm run migrate:passwords
```

**package.json에 스크립트 추가:**
```json
{
  "scripts": {
    "migrate:passwords": "node server/scripts/migrateDefaultPasswords.js"
  }
}
```

---

### 3.3 환경변수 검증 시스템 구축

#### 신규 파일 생성

```javascript
// server/utils/validateEnv.js
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

/**
 * 필수 환경변수 검증 (Fail-Fast 전략)
 */
export function validateRequiredEnvVars() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ODDS_API_KEY'
  ];

  // 프로덕션 환경에서 추가 필수 항목
  if (process.env.NODE_ENV === 'production') {
    required.push(
      'DEFAULT_ADMIN_PASSWORD',
      'NEXT_PUBLIC_API_URL',
      'API_BASE_URL_PROD'
    );
  }

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ 필수 환경변수가 설정되지 않았습니다:');
    missing.forEach(key => console.error(`   - ${key}`));
    throw new Error(`필수 환경변수 누락: ${missing.join(', ')}`);
  }

  console.log('✅ 환경변수 검증 완료');
}

/**
 * 보안 취약 설정 경고
 */
export function warnInsecureSettings() {
  const warnings = [];

  // 기본 비밀번호 사용 경고
  if (process.env.DEFAULT_ADMIN_PASSWORD === 'admin123') {
    warnings.push('DEFAULT_ADMIN_PASSWORD가 기본값입니다. 보안 위험!');
  }

  // JWT Secret 길이 검증
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET이 너무 짧습니다. 최소 32자 이상 권장');
  }

  // API 레이트 제한 무제한 경고
  if (process.env.ODDS_API_RATE_LIMIT_DAILY === '999999') {
    warnings.push('API 레이트 제한이 무제한으로 설정되어 있습니다.');
  }

  if (warnings.length > 0) {
    console.warn('⚠️ 보안 경고:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
}

/**
 * 환경변수 값 마스킹 출력 (디버깅용)
 */
export function logEnvVars() {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    JWT_SECRET: process.env.JWT_SECRET ? '***' : 'undefined',
    ODDS_API_KEY: process.env.ODDS_API_KEY ? '***' : 'undefined',
    DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD ? '***' : 'undefined',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
  };

  console.log('📋 환경변수 현황:');
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
}
```

#### server/app.js에 통합

```javascript
// server/app.js 최상단 (10-20라인 부근)
import dotenv from 'dotenv';
import { validateRequiredEnvVars, warnInsecureSettings, logEnvVars } from './utils/validateEnv.js';

// 환경변수 로드
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config();

// 환경변수 검증 (서버 시작 전)
try {
  validateRequiredEnvVars();
  warnInsecureSettings();

  if (process.env.NODE_ENV === 'development') {
    logEnvVars();
  }
} catch (error) {
  console.error('환경변수 검증 실패:', error.message);
  process.exit(1); // 서버 시작 중단
}
```

---

### 3.4 .env.example 파일 생성

```bash
# .env.example
# LikeBetFair 환경변수 템플릿
# 이 파일을 복사하여 .env.local 파일을 생성하세요

# ===== 서버 설정 =====
NODE_ENV=development
PORT=5050

# ===== API URL =====
NEXT_PUBLIC_API_URL=http://localhost:5050
NEXT_PUBLIC_WS_URL=ws://localhost:5050
API_BASE_URL_DEV=http://localhost:5050
API_BASE_URL_PROD=https://likebetfair.onrender.com

# ===== 데이터베이스 =====
DATABASE_URL=postgresql://user:password@localhost:5432/likebetfair_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=likebetfair_dev
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# 연결 풀 설정
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=30000
DB_POOL_EVICT=1000
DB_CONNECT_TIMEOUT=60000

# ===== 보안 (필수) =====
JWT_SECRET=your-jwt-secret-here-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# 기본 계정 비밀번호 (프로덕션에서 반드시 변경)
DEFAULT_ADMIN_PASSWORD=change-me-in-production
DEFAULT_TEST_PASSWORD=change-me-in-production

# ===== 외부 API 키 =====
ODDS_API_KEY=your-odds-api-key
THE_ODDS_API_KEY=your-odds-api-key
THESPORTSDB_API_KEY=your-sportsdb-api-key

# API 레이트 제한
ODDS_API_RATE_LIMIT_DAILY=500
ODDS_API_RATE_LIMIT_MONTHLY=10000
ODDS_API_RATE_LIMIT_HOURLY=100

# ===== 관리자 설정 =====
SYSTEM_ADMIN_ID=your-admin-uuid

# ===== CORS 설정 =====
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# ===== 로깅 =====
LOG_LEVEL=info

# ===== 스케줄러 =====
DISABLE_SCHEDULER=false

# ===== 베팅 설정 (선택) =====
MIN_BET_AMOUNT=1000
MAX_BET_AMOUNT=1000000
DAILY_BET_LIMIT=5000000
BETTING_CUTOFF_MINUTES=10

# ===== 시간 설정 (선택) =====
API_TIMEOUT=30000
```

---

## 4. Phase 2: URL/포트 환경변수화

**우선순위:** 🟡 높음
**예상 소요시간:** 4-6시간
**위험도:** 중간 (통신 영향)

### 4.1 현황 분석

하드코딩된 URL/포트가 **19개 파일**에 분산되어 있음:

#### 백엔드 (서버)
1. `server/config/centralizedConfig.js` (13-17, 42-44라인)
2. `server/app.js` (219-220라인)

#### 프론트엔드 (클라이언트)
3. `config/api.js` (4라인)
4. `config/apiConfig.ts` (30, 121라인)
5. `config/environment.ts` (27, 41, 55라인)
6. `config/serverApiConfig.ts` (8, 33라인)
7. `pages/api/admin/settings/commission-rates.ts` (9라인)
8. `pages/admin/exchange.tsx` (WebSocket URL)
9. `components/ExchangeSidebar.tsx` (246-248라인)
10. `contexts/AuthContext.tsx`
11. `hooks/useExchange.ts`
12. `pages/sports.tsx`
13. `components/BetSelectionPanel.tsx`
... (총 19개 파일)

### 4.2 통합 환경변수 구조

#### 환경변수 추가 (.env.local)

```bash
# ===== 서버 포트 =====
PORT=5050
BACKEND_PORT=5050
FRONTEND_PORT=3000

# ===== API URL (클라이언트 접근 가능) =====
NEXT_PUBLIC_API_URL=http://localhost:5050
NEXT_PUBLIC_WS_URL=ws://localhost:5050

# ===== 서버 전용 API URL =====
API_BASE_URL_DEV=http://localhost:5050
API_BASE_URL_PROD=https://likebetfair.onrender.com

# ===== CORS Origins (콤마로 구분) =====
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://likebetfair.onrender.com
```

### 4.3 파일별 수정 코드

#### 4.3.1 server/config/centralizedConfig.js

```javascript
// server/config/centralizedConfig.js
import dotenv from 'dotenv';
import db from '../models/db.js';

dotenv.config();

// ===== API 설정 =====
export const API_CONFIG = {
  // 서버 설정 (환경변수 기반)
  BACKEND_PORT: parseInt(process.env.PORT) || parseInt(process.env.BACKEND_PORT) || 5050,
  FRONTEND_PORT: parseInt(process.env.FRONTEND_PORT) || 3000,

  // BASE_URL 자동 결정
  BASE_URL: process.env.NODE_ENV === 'production'
    ? (process.env.API_BASE_URL_PROD || process.env.NEXT_PUBLIC_API_URL || 'https://likebetfair.onrender.com')
    : (process.env.API_BASE_URL_DEV || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'),

  // API 키 설정
  API_KEYS: {
    ODDS_API_KEY: process.env.ODDS_API_KEY,
    THE_ODDS_API_KEY: process.env.THE_ODDS_API_KEY,
    THESPORTSDB_API_KEY: process.env.THESPORTSDB_API_KEY
  },

  // API 엔드포인트 URL (변경 가능성 낮음)
  API_URLS: {
    THE_ODDS_API: 'https://api.the-odds-api.com/v4/sports',
    THE_SPORTS_DB: 'https://www.thesportsdb.com/api/v1/json'
  },

  // API 엔드포인트
  ENDPOINTS: {
    ODDS: '/api/odds',
    BET: '/api/bet',
    AUTH: '/api/auth',
    GAME_RESULTS: '/api/game-results'
  },

  // CORS Origins (환경변수에서 콤마로 구분된 문자열 파싱)
  CORS_ORIGINS: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.NEXT_PUBLIC_API_URL
      ].filter(Boolean),

  // 요청 제한
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15분
    MAX_REQUESTS: process.env.NODE_ENV === 'production' ? 100 : 1000
  }
};

// 설정 검증
console.log('[API_CONFIG] BASE_URL:', API_CONFIG.BASE_URL);
console.log('[API_CONFIG] CORS_ORIGINS:', API_CONFIG.CORS_ORIGINS);
console.log('[API_CONFIG] BACKEND_PORT:', API_CONFIG.BACKEND_PORT);
```

#### 4.3.2 config/api.js (프론트엔드)

```javascript
// config/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

export default API_BASE_URL;
```

#### 4.3.3 config/apiConfig.ts (프론트엔드)

```typescript
// config/apiConfig.ts
/**
 * API 설정 중앙화
 * 환경변수 기반 설정
 */

// API Base URL 자동 결정
const getApiBaseUrl = (): string => {
  // 클라이언트 사이드
  if (typeof window !== 'undefined') {
    // 브라우저 환경변수 우선
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    // localhost 감지
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:5050';
    }

    // 현재 origin 사용 (프로덕션)
    return window.location.origin;
  }

  // 서버 사이드
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || (
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'ws://localhost:5050'
      : `wss://${typeof window !== 'undefined' ? window.location.hostname : 'likebetfair.onrender.com'}`
  ),
  TIMEOUT: parseInt(process.env.API_TIMEOUT as string) || 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// 베팅 제한 (환경변수 기반)
export const BET_LIMITS = {
  MIN_AMOUNT: parseInt(process.env.MIN_BET_AMOUNT as string) || 1000,
  MAX_AMOUNT: parseInt(process.env.MAX_BET_AMOUNT as string) || 1000000,
  DAILY_LIMIT: parseInt(process.env.DAILY_BET_LIMIT as string) || 5000000,
  MAX_SELECTIONS: 10,
  MIN_SELECTIONS: 1
};

// 시간 설정
export const TIME_CONFIG = {
  BETTING_CUTOFF_MINUTES: parseInt(process.env.BETTING_CUTOFF_MINUTES as string) || 10,
  POLLING_INTERVAL: 30000,
  DEBOUNCE_DELAY: 300
};

// UI 설정
export const UI_CONFIG = {
  LOADING_DELAYS: {
    MIN: 300,
    DEFAULT: 500
  },
  NOTIFICATION_DURATIONS: {
    SUCCESS: 3000,
    INFO: 4000,
    ERROR: 6000
  }
};

// 페이지네이션
export const PAGINATION = {
  DEFAULT_SIZE: 20,
  MAX_SIZE: 100
};

// 개발 환경 디버그
if (process.env.NODE_ENV === 'development') {
  console.log('[API_CONFIG] BASE_URL:', API_CONFIG.BASE_URL);
  console.log('[API_CONFIG] WS_URL:', API_CONFIG.WS_URL);
}
```

#### 4.3.4 pages/api/admin/settings/commission-rates.ts

**Option A: 환경변수 사용 (임시)**
```typescript
// pages/api/admin/settings/commission-rates.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 환경변수 기반 백엔드 URL
    const BACKEND_URL = process.env.API_BASE_URL_DEV
      || process.env.NEXT_PUBLIC_API_URL
      || 'http://localhost:5050';

    const backendUrl = `${BACKEND_URL}/api/admin/settings/commission-rates`;

    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
        'x-auth-token': req.headers['x-auth-token'] as string || '',
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD' && {
        body: JSON.stringify(req.body)
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Proxy] 수수료율 API 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
}
```

**Option B: 직접 서비스 호출 (권장, 장기)**
```typescript
// pages/api/admin/settings/commission-rates.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import verifyToken from '@/server/middleware/verifyToken';
import { getCommissionRates, updateCommissionRates } from '@/server/services/commissionSettingsService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 인증 검증
    const authResult = await verifyToken(req, res);
    if (!authResult || !authResult.isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    if (req.method === 'GET') {
      // 수수료율 조회
      const rates = await getCommissionRates();
      return res.status(200).json(rates);
    }

    if (req.method === 'PUT') {
      // 수수료율 업데이트
      const { sportsbookRate, exchangeRate } = req.body;
      const updated = await updateCommissionRates({ sportsbookRate, exchangeRate });
      return res.status(200).json(updated);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[API] 수수료율 처리 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
}
```

#### 4.3.5 WebSocket URL 환경변수화

```typescript
// pages/admin/exchange.tsx
import { API_CONFIG } from '@/config/apiConfig';

const ExchangeAdminPage = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    // WebSocket URL 환경변수 기반
    const wsUrl = `${API_CONFIG.WS_URL}/ws/admin/exchange`;

    console.log('[WebSocket] 연결 시도:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WebSocket] 연결됨');
      setSocket(ws);
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] 오류:', error);
      alert('실시간 연결 실패. 환경변수를 확인하세요.');
    };

    // ...
  }, []);

  // ...
};
```

```typescript
// components/ExchangeSidebar.tsx
import { API_CONFIG } from '@/config/apiConfig';

const ExchangeSidebar = () => {
  // API URL 환경변수 기반
  const apiUrl = API_CONFIG.BASE_URL;

  const fetchOrders = async () => {
    const response = await fetch(`${apiUrl}/api/exchange/orders/${gameId}`);
    // ...
  };

  // ...
};
```

---

### 4.4 Render 환경변수 설정

Render 대시보드에서 다음 환경변수 추가:

```bash
# Render Dashboard → Environment Variables

NODE_ENV=production
PORT=5050

# API URLs
NEXT_PUBLIC_API_URL=https://likebetfair.onrender.com
NEXT_PUBLIC_WS_URL=wss://likebetfair.onrender.com
API_BASE_URL_PROD=https://likebetfair.onrender.com

# CORS
CORS_ORIGINS=https://likebetfair.onrender.com

# Database (자동 주입됨)
DATABASE_URL=${DATABASE_URL}

# Security
JWT_SECRET=<your-production-jwt-secret>
DEFAULT_ADMIN_PASSWORD=<strong-password>

# API Keys
ODDS_API_KEY=<your-api-key>
ODDS_API_RATE_LIMIT_DAILY=500
ODDS_API_RATE_LIMIT_MONTHLY=10000
ODDS_API_RATE_LIMIT_HOURLY=100
```

---

### 4.5 테스트 체크리스트

#### 로컬 환경 테스트
- [ ] `npm start` 실행 성공
- [ ] Frontend가 `http://localhost:5050` API 호출 성공
- [ ] WebSocket 연결 (`ws://localhost:5050`) 성공
- [ ] 관리자 페이지 실시간 업데이트 확인
- [ ] 베팅 API 호출 성공

#### 프로덕션 환경 테스트
- [ ] Render 빌드 성공
- [ ] Frontend가 `https://likebetfair.onrender.com` API 호출 성공
- [ ] WebSocket 연결 (`wss://likebetfair.onrender.com`) 성공
- [ ] CORS 오류 없음
- [ ] 로그에서 올바른 URL 확인

---

## 5. Phase 3: 상수 파일 체계화

**우선순위:** 🟢 중간
**예상 소요시간:** 6-8시간
**위험도:** 낮음

### 5.1 디렉토리 구조 설계

```
프로젝트 루트/
├── config/
│   └── constants/           # 프론트엔드 상수
│       ├── index.ts         # 통합 export
│       ├── betting.ts       # 베팅 관련
│       ├── ui.ts            # UI/UX 관련
│       ├── api.ts           # API 관련
│       └── pagination.ts    # 페이지네이션
│
├── server/
│   └── config/
│       └── constants/       # 백엔드 상수
│           ├── index.js     # 통합 export
│           ├── amounts.js   # 금액 관련
│           ├── timeouts.js  # 타임아웃 관련
│           ├── database.js  # DB 관련
│           └── betting.js   # 베팅 규칙
│
└── shared/                  # 서버-클라이언트 공유
    └── constants.ts         # 공유 상수
```

### 5.2 프론트엔드 상수 파일

#### config/constants/betting.ts

```typescript
// config/constants/betting.ts
/**
 * 베팅 관련 상수
 * 환경변수 기반 설정
 */

export const BET_LIMITS = {
  // 금액 제한 (환경변수 우선)
  MIN_AMOUNT: parseInt(process.env.MIN_BET_AMOUNT as string) || 1000,
  MAX_AMOUNT: parseInt(process.env.MAX_BET_AMOUNT as string) || 1000000,
  DAILY_LIMIT: parseInt(process.env.DAILY_BET_LIMIT as string) || 5000000,

  // 선택 개수 제한
  MIN_SELECTIONS: 1,
  MAX_SELECTIONS: 10,

  // 기타 제한
  MAX_SAME_GAME_BETS: 3,
  MAX_TOTAL_ODDS: 1000,
  MAX_FUTURE_DAYS: 7,

  // 시간 제한
  CUTOFF_MINUTES: parseInt(process.env.BETTING_CUTOFF_MINUTES as string) || 10
} as const;

export type BetLimits = typeof BET_LIMITS;

// 베팅 타입
export enum BetType {
  SINGLE = 'single',
  MULTI = 'multi',
  SYSTEM = 'system'
}

// 베팅 상태
export enum BetStatus {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

// 배당 타입
export enum OddsType {
  HOME = 'home',
  AWAY = 'away',
  DRAW = 'draw',
  OVER = 'over',
  UNDER = 'under',
  HANDICAP = 'handicap'
}
```

#### config/constants/ui.ts

```typescript
// config/constants/ui.ts
/**
 * UI/UX 관련 상수
 */

export const UI_TIMEOUTS = {
  // 로딩 지연
  LOADING_MIN: 300,
  LOADING_DEFAULT: 500,

  // Debounce
  DEBOUNCE: 300,
  DEBOUNCE_LONG: 500,

  // Throttle
  THROTTLE: 100,
  THROTTLE_LONG: 200
} as const;

export const NOTIFICATION_DURATIONS = {
  SUCCESS: 3000,
  INFO: 4000,
  WARNING: 5000,
  ERROR: 6000
} as const;

export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
} as const;

export const BREAKPOINTS = {
  MOBILE: 640,
  TABLET: 768,
  DESKTOP: 1024,
  WIDE: 1280
} as const;

export const Z_INDEX = {
  DROPDOWN: 1000,
  MODAL: 1050,
  TOOLTIP: 1100,
  NOTIFICATION: 1150
} as const;
```

#### config/constants/api.ts

```typescript
// config/constants/api.ts
/**
 * API 관련 상수
 */

export const API_TIMEOUTS = {
  DEFAULT: parseInt(process.env.API_TIMEOUT as string) || 10000,
  LONG: 30000,
  SHORT: 5000,
  RETRY_DELAY: 1000
} as const;

export const API_RETRY = {
  MAX_ATTEMPTS: 3,
  BACKOFF_MULTIPLIER: 2,
  INITIAL_DELAY: 1000
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh'
  },
  BET: {
    CREATE: '/api/bet',
    LIST: '/api/bet/list',
    HISTORY: '/api/bet/history'
  },
  ODDS: {
    LIST: '/api/odds',
    DETAIL: (sportKey: string) => `/api/odds/${sportKey}`
  },
  EXCHANGE: {
    ORDERS: '/api/exchange/orders',
    CREATE: '/api/exchange/order',
    CANCEL: (orderId: string) => `/api/exchange/order/${orderId}/cancel`
  }
} as const;
```

#### config/constants/pagination.ts

```typescript
// config/constants/pagination.ts
/**
 * 페이지네이션 관련 상수
 */

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_SIZE: 20,
  MAX_SIZE: 100,
  SIZE_OPTIONS: [10, 20, 50, 100]
} as const;

export type PaginationConfig = typeof PAGINATION;
```

#### config/constants/index.ts

```typescript
// config/constants/index.ts
/**
 * 프론트엔드 상수 통합 export
 */

export * from './betting';
export * from './ui';
export * from './api';
export * from './pagination';

// 기본 export
export { BET_LIMITS, BetType, BetStatus, OddsType } from './betting';
export { UI_TIMEOUTS, NOTIFICATION_DURATIONS, ANIMATION_DURATIONS } from './ui';
export { API_TIMEOUTS, API_RETRY, HTTP_STATUS, API_ENDPOINTS } from './api';
export { PAGINATION } from './pagination';
```

---

### 5.3 백엔드 상수 파일

#### server/config/constants/amounts.js

```javascript
// server/config/constants/amounts.js
/**
 * 금액 관련 상수
 * 환경변수 기반 설정
 */

export const AMOUNT_LIMITS = {
  // 베팅 금액 제한
  MIN_BET: parseInt(process.env.MIN_BET_AMOUNT) || 1000,
  MAX_BET: parseInt(process.env.MAX_BET_AMOUNT) || 1000000,
  DAILY_LIMIT: parseInt(process.env.DAILY_BET_LIMIT) || 5000000,

  // 초기 잔액
  INITIAL_BALANCE: {
    ADMIN: parseInt(process.env.INITIAL_ADMIN_BALANCE) || 1000000,
    TEST: parseInt(process.env.INITIAL_TEST_BALANCE) || 100000,
    USER: parseInt(process.env.INITIAL_USER_BALANCE) || 10000
  },

  // 입출금 제한
  MIN_DEPOSIT: parseInt(process.env.MIN_DEPOSIT) || 10000,
  MAX_DEPOSIT: parseInt(process.env.MAX_DEPOSIT) || 10000000,
  MIN_WITHDRAWAL: parseInt(process.env.MIN_WITHDRAWAL) || 10000,
  MAX_WITHDRAWAL: parseInt(process.env.MAX_WITHDRAWAL) || 5000000
};

// 거래량 기반 할인 기준 (나중에 DB로 이관 예정)
export const VOLUME_DISCOUNT_TIERS = [
  { threshold: 10000000, discount: 0.05, label: '1천만원' },
  { threshold: 50000000, discount: 0.10, label: '5천만원' },
  { threshold: 100000000, discount: 0.15, label: '1억원' }
];

// 통화 설정
export const CURRENCY = {
  CODE: 'KRW',
  SYMBOL: '₩',
  DECIMAL_PLACES: 0 // 원화는 소수점 없음
};
```

#### server/config/constants/timeouts.js

```javascript
// server/config/constants/timeouts.js
/**
 * 타임아웃 관련 상수
 */

export const API_TIMEOUTS = {
  // 외부 API 호출
  ODDS_API: parseInt(process.env.ODDS_API_TIMEOUT) || 30000,
  SPORTSDB_API: parseInt(process.env.SPORTSDB_API_TIMEOUT) || 30000,

  // 내부 API
  DEFAULT: parseInt(process.env.API_TIMEOUT) || 10000,
  LONG: 30000,
  SHORT: 5000,

  // 재시도 지연
  RETRY_DELAY: 2000,
  RATE_LIMIT_RETRY_DELAY: 5000,
  AUTH_ERROR_RETRY_DELAY: 10000,

  // 경고 임계값
  WARNING_TIME: 5000
};

export const POLLING_INTERVALS = {
  // 스케줄러 간격
  ODDS_UPDATE: 5 * 60 * 1000,      // 5분
  RESULT_UPDATE: 30 * 60 * 1000,   // 30분
  BET_CHECK: 30 * 1000,            // 30초

  // Exchange 폴링
  EXCHANGE_ORDERS: 30 * 1000,      // 30초

  // 설정 캐시 갱신
  SETTINGS_CACHE: 5 * 60 * 1000    // 5분
};

export const TIME_WINDOWS = {
  // 베팅 시간 제한
  BETTING_CUTOFF_MINUTES: parseInt(process.env.BETTING_CUTOFF_MINUTES) || 10,
  BETTING_WINDOW_DAYS: 7,

  // 데이터 보관 기간
  ODDS_CLEANUP_DAYS: 7,
  LOG_RETENTION_DAYS: 30,

  // 우선순위 시간 창
  PRIORITY_HIGH: 60 * 60 * 1000,    // 1시간
  PRIORITY_MEDIUM: 6 * 60 * 60 * 1000,  // 6시간
  PRIORITY_LOW: 24 * 60 * 60 * 1000     // 24시간
};
```

#### server/config/constants/database.js

```javascript
// server/config/constants/database.js
/**
 * 데이터베이스 관련 상수
 */

export const DB_CONFIG = {
  // 테이블명
  TABLES: {
    USERS: 'Users',
    ODDS_CACHE: 'OddsCaches',
    GAME_RESULTS: 'GameResults',
    BETS: 'Bets',
    EXCHANGE_ORDERS: 'ExchangeOrders',
    SETTINGS: 'Settings',
    PROMOTION_CODES: 'PromotionCodes',
    ADMIN_COMMISSIONS: 'AdminCommissions'
  },

  // 쿼리 제한
  MAX_QUERY_LIMIT: 1000,
  DEFAULT_PAGE_SIZE: 20,

  // 타임아웃
  CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
  QUERY_TIMEOUT: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,

  // 연결 풀 설정 (환경변수 기반)
  POOL: {
    MAX: parseInt(process.env.DB_POOL_MAX) || 20,
    MIN: parseInt(process.env.DB_POOL_MIN) || 2,
    ACQUIRE: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
    IDLE: parseInt(process.env.DB_POOL_IDLE) || 30000,
    EVICT: parseInt(process.env.DB_POOL_EVICT) || 1000
  }
};

export const DB_INDEXES = {
  // 자주 조회되는 필드 인덱스
  ODDS_CACHE: ['sportKey', 'gameId', 'commenceTime'],
  GAME_RESULTS: ['sportKey', 'gameId', 'gameDate'],
  BETS: ['userId', 'status', 'createdAt'],
  EXCHANGE_ORDERS: ['userId', 'gameId', 'status']
};
```

#### server/config/constants/betting.js

```javascript
// server/config/constants/betting.js
/**
 * 베팅 규칙 상수
 */

export const BETTING_RULES = {
  // 선택 개수 제한
  MIN_SELECTIONS: 1,
  MAX_SELECTIONS: 10,

  // 배당률 제한
  MIN_ODDS: 1.01,
  MAX_ODDS: 1000,
  MAX_TOTAL_ODDS: 1000,

  // 경기 제한
  MAX_SAME_GAME_BETS: 3,
  MAX_FUTURE_DAYS: 7,

  // 수수료율 (기본값, DB로 관리 예정)
  DEFAULT_COMMISSION_RATES: {
    SPORTSBOOK: 0.05,  // 5%
    EXCHANGE: 0.05     // 5%
  }
};

// VIP 등급별 할인율 (나중에 DB로 이관 예정)
export const VIP_DISCOUNTS = {
  BRONZE: 0.05,    // 5%
  SILVER: 0.10,    // 10%
  GOLD: 0.20,      // 20%
  PLATINUM: 0.30,  // 30%
  DIAMOND: 0.40    // 40%
};

// 베팅 상태
export const BET_STATUS = {
  PENDING: 'pending',
  WON: 'won',
  LOST: 'lost',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// Exchange 주문 타입
export const ORDER_TYPE = {
  BACK: 'back',  // 배팅 (승리 예측)
  LAY: 'lay'     // 베팅 (패배 예측)
};

// Exchange 주문 상태
export const ORDER_STATUS = {
  PENDING: 'pending',
  MATCHED: 'matched',
  PARTIALLY_MATCHED: 'partially_matched',
  CANCELLED: 'cancelled',
  SETTLED_WON: 'settled_won',
  SETTLED_LOST: 'settled_lost'
};
```

#### server/config/constants/index.js

```javascript
// server/config/constants/index.js
/**
 * 백엔드 상수 통합 export
 */

export * from './amounts.js';
export * from './timeouts.js';
export * from './database.js';
export * from './betting.js';

// 명명된 export
export { AMOUNT_LIMITS, VOLUME_DISCOUNT_TIERS, CURRENCY } from './amounts.js';
export { API_TIMEOUTS, POLLING_INTERVALS, TIME_WINDOWS } from './timeouts.js';
export { DB_CONFIG, DB_INDEXES } from './database.js';
export { BETTING_RULES, VIP_DISCOUNTS, BET_STATUS, ORDER_TYPE, ORDER_STATUS } from './betting.js';
```

---

### 5.4 서버-클라이언트 공유 상수

#### shared/constants.ts

```typescript
// shared/constants.ts
/**
 * 서버와 클라이언트에서 공유하는 상수
 * ⚠️ 변경 시 양측 모두 영향을 받으므로 신중하게 수정
 */

/**
 * 베팅 제한 (공유)
 * 프론트엔드 검증과 백엔드 검증이 동일해야 함
 */
export const SHARED_BET_LIMITS = {
  MIN_AMOUNT: 1000,
  MAX_AMOUNT: 1000000,
  DAILY_LIMIT: 5000000,
  MIN_SELECTIONS: 1,
  MAX_SELECTIONS: 10
} as const;

/**
 * 페이지네이션 (공유)
 */
export const SHARED_PAGINATION = {
  DEFAULT_SIZE: 20,
  MAX_SIZE: 100
} as const;

/**
 * 배당률 제한 (공유)
 */
export const SHARED_ODDS_LIMITS = {
  MIN: 1.01,
  MAX: 1000,
  MAX_TOTAL: 1000,
  DECIMAL_PLACES: 2
} as const;

/**
 * 날짜 형식 (공유)
 */
export const SHARED_DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DISPLAY: 'YYYY-MM-DD HH:mm',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm'
} as const;

/**
 * 스포츠 카테고리 (공유)
 */
export enum SportCategory {
  BASEBALL = 'baseball',
  BASKETBALL = 'basketball',
  SOCCER = 'soccer',
  FOOTBALL = 'americanfootball',
  HOCKEY = 'hockey'
}

/**
 * 베팅 타입 (공유)
 */
export enum SharedBetType {
  SINGLE = 'single',
  MULTI = 'multi',
  SYSTEM = 'system'
}

/**
 * 베팅 상태 (공유)
 */
export enum SharedBetStatus {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}
```

---

### 5.5 기존 코드 마이그레이션

#### 변경 전후 비교

**변경 전:**
```typescript
// config/apiConfig.ts
export const BET_LIMITS = {
  MIN_AMOUNT: 1000,  // 하드코딩
  MAX_AMOUNT: 1000000,
  // ...
};
```

**변경 후:**
```typescript
// config/apiConfig.ts
import { BET_LIMITS } from './constants';

// 상수 파일에서 import
export { BET_LIMITS };
```

#### 주요 파일 수정 목록

1. **server/services/commissionService.js**
```javascript
// 변경 전
const discounts = {
  BRONZE: 0.05,
  SILVER: 0.10,
  // ...
};

// 변경 후
import { VIP_DISCOUNTS } from '../config/constants';

function getVIPDiscount(vipLevel) {
  return VIP_DISCOUNTS[vipLevel] || 0;
}
```

2. **server/services/betResultService.js**
```javascript
// 변경 전
const BETTING_CUTOFF_MINUTES = 10;

// 변경 후
import { TIME_WINDOWS } from '../config/constants';

const isBettingAllowed = (gameTime) => {
  const cutoff = TIME_WINDOWS.BETTING_CUTOFF_MINUTES * 60 * 1000;
  return gameTime - Date.now() > cutoff;
};
```

3. **pages/admin.tsx**
```typescript
// 변경 전
const notificationDuration = 5000;

// 변경 후
import { NOTIFICATION_DURATIONS } from '@/config/constants';

const showNotification = (message, type) => {
  const duration = NOTIFICATION_DURATIONS[type.toUpperCase()];
  // ...
};
```

---

### 5.6 Import 경로 일괄 변경

#### 검색 및 변경 스크립트

```bash
# scripts/migrate-imports.sh
#!/bin/bash

echo "상수 import 경로 마이그레이션 시작..."

# BET_LIMITS import 변경
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -exec sed -i '' 's/from.*apiConfig.*BET_LIMITS/from "@\/config\/constants"/g' {} +

# API_TIMEOUTS import 변경
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "./node_modules/*" \
  -exec sed -i '' 's/from.*apiConfig.*API_TIMEOUTS/from "@\/config\/constants"/g' {} +

echo "마이그레이션 완료!"
```

---

## 6. Phase 4: 데이터베이스 설정 개선

**우선순위:** 🟢 중간
**예상 소요시간:** 2-3시간
**위험도:** 낮음

### 6.1 DB 연결 풀 환경변수화

#### 현재 상태

```javascript
// server/app.js (38-42라인)
pool: {
  max: 20,        // 하드코딩
  min: 2,
  acquire: 60000,
  idle: 30000,
  evict: 1000
}
```

#### 개선안

**Step 1: 환경변수 추가**

`.env.local`:
```bash
# 데이터베이스 연결 풀 설정
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=30000
DB_POOL_EVICT=1000
DB_CONNECT_TIMEOUT=60000
```

**Step 2: server/app.js 수정**

```javascript
// server/app.js
import { Sequelize } from 'sequelize';
import { DB_CONFIG } from './config/constants';

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,

  // 연결 풀 설정 (환경변수 기반)
  pool: DB_CONFIG.POOL,

  dialectOptions: {
    connectTimeout: DB_CONFIG.CONNECTION_TIMEOUT,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  },

  retry: {
    max: 3,
    timeout: 3000
  }
});

console.log('[DB] 연결 풀 설정:', DB_CONFIG.POOL);
```

**Step 3: server/config/database.js 수정**

```javascript
// server/config/database.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { DB_CONFIG } from './constants';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'bettingDB',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  {
    dialect: 'postgres',
    logging: false,
    pool: DB_CONFIG.POOL,  // 상수 파일 사용
    dialectOptions: {
      connectTimeout: DB_CONFIG.CONNECTION_TIMEOUT
    }
  }
);

export default sequelize;
```

---

### 6.2 테이블명 중앙화 (이미 부분 완료)

#### 현재 상태

```javascript
// server/config/centralizedConfig.js (80-84라인)
export const DB_CONFIG = {
  TABLES: {
    ODDS_CACHE: 'OddsCaches',
    GAME_RESULTS: 'GameResults',
    BETS: 'Bets',
    USERS: 'users'
  },
  // ...
};
```

#### 개선: 누락된 테이블 추가

```javascript
// server/config/constants/database.js
export const DB_CONFIG = {
  // 테이블명 (완전 목록)
  TABLES: {
    USERS: 'Users',
    ODDS_CACHE: 'OddsCaches',
    GAME_RESULTS: 'GameResults',
    BETS: 'Bets',
    EXCHANGE_ORDERS: 'ExchangeOrders',
    EXCHANGE_MULTIBETS: 'ExchangeMultibets',
    SETTINGS: 'Settings',
    PROMOTION_CODES: 'PromotionCodes',
    ADMIN_COMMISSIONS: 'AdminCommissions'
  },

  // 쿼리 제한
  MAX_QUERY_LIMIT: 1000,
  DEFAULT_PAGE_SIZE: 20,

  // 타임아웃
  CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
  QUERY_TIMEOUT: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,

  // 연결 풀
  POOL: {
    MAX: parseInt(process.env.DB_POOL_MAX) || 20,
    MIN: parseInt(process.env.DB_POOL_MIN) || 2,
    ACQUIRE: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
    IDLE: parseInt(process.env.DB_POOL_IDLE) || 30000,
    EVICT: parseInt(process.env.DB_POOL_EVICT) || 1000
  }
};
```

---

## 7. Phase 5: 비즈니스 규칙 DB 이관

**우선순위:** 🟢 낮음 (장기)
**예상 소요시간:** 12-16시간
**위험도:** 낮음

### 7.1 Settings 테이블 생성

#### 마이그레이션 파일 생성

```bash
cd server && npx sequelize-cli migration:generate --name create-settings-and-promotion-tables
```

#### 마이그레이션 코드

```javascript
// server/migrations/YYYYMMDDHHMMSS-create-settings-and-promotion-tables.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Settings 테이블 생성
    await queryInterface.createTable('Settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: '설정 키 (예: vip_discount_gold)'
      },
      value: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: '설정 값 (JSON 형식)'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'general',
        comment: '카테고리 (commission, discount, limit, etc.)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '설정 설명'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: '활성화 여부'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Settings 테이블 인덱스 생성
    await queryInterface.addIndex('Settings', ['key'], {
      name: 'idx_settings_key'
    });
    await queryInterface.addIndex('Settings', ['category'], {
      name: 'idx_settings_category'
    });
    await queryInterface.addIndex('Settings', ['isActive'], {
      name: 'idx_settings_active'
    });

    // PromotionCodes 테이블 생성
    await queryInterface.createTable('PromotionCodes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: '프로모션 코드 (예: WELCOME10)'
      },
      discountRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: '할인율 (0.10 = 10%)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '프로모션 설명'
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '시작 일시'
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '종료 일시'
      },
      maxUses: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '최대 사용 횟수'
      },
      currentUses: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: '현재 사용 횟수'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: '활성화 여부'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // PromotionCodes 테이블 인덱스 생성
    await queryInterface.addIndex('PromotionCodes', ['code'], {
      name: 'idx_promotion_codes_code'
    });
    await queryInterface.addIndex('PromotionCodes', ['isActive'], {
      name: 'idx_promotion_codes_active'
    });

    console.log('✅ Settings 및 PromotionCodes 테이블 생성 완료');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PromotionCodes');
    await queryInterface.dropTable('Settings');
    console.log('✅ Settings 및 PromotionCodes 테이블 삭제 완료');
  }
};
```

---

### 7.2 시드 데이터 생성

#### 시드 파일 생성

```bash
cd server && npx sequelize-cli seed:generate --name seed-initial-settings
```

#### 시드 코드

```javascript
// server/seeders/YYYYMMDDHHMMSS-seed-initial-settings.js
'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // Settings 초기 데이터
    await queryInterface.bulkInsert('Settings', [
      // VIP 할인율
      {
        id: uuidv4(),
        key: 'vip_discount_bronze',
        value: JSON.stringify({ rate: 0.05, description: 'Bronze 등급 5% 할인' }),
        category: 'discount',
        description: 'VIP Bronze 등급 할인율',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        key: 'vip_discount_silver',
        value: JSON.stringify({ rate: 0.10, description: 'Silver 등급 10% 할인' }),
        category: 'discount',
        description: 'VIP Silver 등급 할인율',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        key: 'vip_discount_gold',
        value: JSON.stringify({ rate: 0.20, description: 'Gold 등급 20% 할인' }),
        category: 'discount',
        description: 'VIP Gold 등급 할인율',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        key: 'vip_discount_platinum',
        value: JSON.stringify({ rate: 0.30, description: 'Platinum 등급 30% 할인' }),
        category: 'discount',
        description: 'VIP Platinum 등급 할인율',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        key: 'vip_discount_diamond',
        value: JSON.stringify({ rate: 0.40, description: 'Diamond 등급 40% 할인' }),
        category: 'discount',
        description: 'VIP Diamond 등급 할인율',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },

      // 거래량 기반 할인
      {
        id: uuidv4(),
        key: 'volume_discount_tiers',
        value: JSON.stringify([
          { threshold: 10000000, discount: 0.05, label: '1천만원' },
          { threshold: 50000000, discount: 0.10, label: '5천만원' },
          { threshold: 100000000, discount: 0.15, label: '1억원' }
        ]),
        category: 'discount',
        description: '거래량 기반 할인 기준',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },

      // 베팅 제한
      {
        id: uuidv4(),
        key: 'bet_limits',
        value: JSON.stringify({
          min_amount: 1000,
          max_amount: 1000000,
          daily_limit: 5000000
        }),
        category: 'limit',
        description: '베팅 금액 제한',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },

      // 수수료율
      {
        id: uuidv4(),
        key: 'commission_rates',
        value: JSON.stringify({
          sportsbook: 0.05,
          exchange: 0.05
        }),
        category: 'commission',
        description: '수수료율 설정',
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // PromotionCodes 초기 데이터
    await queryInterface.bulkInsert('PromotionCodes', [
      {
        id: uuidv4(),
        code: 'WELCOME10',
        discountRate: 0.10,
        description: '신규 가입 환영 10% 할인',
        startDate: now,
        endDate: null,
        maxUses: 1000,
        currentUses: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        code: 'SUMMER20',
        discountRate: 0.20,
        description: '여름 시즌 특별 20% 할인',
        startDate: now,
        endDate: new Date('2025-08-31'),
        maxUses: 500,
        currentUses: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        code: 'VIP30',
        discountRate: 0.30,
        description: 'VIP 회원 전용 30% 할인',
        startDate: now,
        endDate: null,
        maxUses: 100,
        currentUses: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    console.log('✅ 초기 설정 및 프로모션 코드 시드 완료');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('PromotionCodes', null, {});
    await queryInterface.bulkDelete('Settings', null, {});
    console.log('✅ 시드 데이터 롤백 완료');
  }
};
```

---

### 7.3 캐싱 시스템 구현

#### 캐싱 서비스 생성

```javascript
// server/services/settingsCacheService.js
import Settings from '../models/settingsModel.js';
import PromotionCodes from '../models/promotionCodesModel.js';

/**
 * Settings 캐싱 서비스
 * DB 조회를 최소화하기 위한 메모리 캐시
 */
class SettingsCacheService {
  constructor() {
    this.cache = new Map();
    this.promotionCache = new Map();
    this.lastUpdate = null;
    this.CACHE_TTL = parseInt(process.env.SETTINGS_CACHE_TTL) || (5 * 60 * 1000); // 5분
  }

  /**
   * 서버 시작 시 캐시 초기화
   */
  async initialize() {
    console.log('[캐시] Settings 초기화 중...');
    await this.refreshCache();

    // 정기적 갱신 (5분마다)
    setInterval(() => this.refreshCache(), this.CACHE_TTL);

    console.log(`✅ Settings 캐시 초기화 완료 (TTL: ${this.CACHE_TTL / 1000}초)`);
  }

  /**
   * 캐시 갱신
   */
  async refreshCache() {
    try {
      // Settings 조회
      const settings = await Settings.findAll({
        where: { isActive: true },
        attributes: ['key', 'value', 'category']
      });

      this.cache.clear();
      settings.forEach(setting => {
        this.cache.set(setting.key, setting.value);
      });

      // PromotionCodes 조회
      const promotions = await PromotionCodes.findAll({
        where: { isActive: true },
        attributes: ['code', 'discountRate', 'maxUses', 'currentUses', 'startDate', 'endDate']
      });

      this.promotionCache.clear();
      promotions.forEach(promo => {
        // 유효기간 체크
        const now = new Date();
        const isValid = (!promo.startDate || promo.startDate <= now)
                     && (!promo.endDate || promo.endDate >= now)
                     && (!promo.maxUses || promo.currentUses < promo.maxUses);

        if (isValid) {
          this.promotionCache.set(promo.code, {
            discountRate: parseFloat(promo.discountRate),
            remaining: promo.maxUses ? promo.maxUses - promo.currentUses : null
          });
        }
      });

      this.lastUpdate = new Date();
      console.log(`[캐시] Settings 갱신 완료: ${settings.length}개 설정, ${this.promotionCache.size}개 프로모션`);
    } catch (error) {
      console.error('[캐시] Settings 갱신 실패:', error);
    }
  }

  /**
   * 설정값 조회
   * @param {string} key - 설정 키
   * @param {any} defaultValue - 기본값
   * @returns {any} 설정값
   */
  get(key, defaultValue = null) {
    return this.cache.get(key) ?? defaultValue;
  }

  /**
   * 설정값 업데이트 (DB + 캐시)
   * @param {string} key - 설정 키
   * @param {any} value - 설정값
   * @param {string} category - 카테고리
   */
  async set(key, value, category = 'general') {
    try {
      await Settings.upsert({
        key,
        value,
        category,
        isActive: true
      });

      this.cache.set(key, value);
      console.log(`[캐시] 설정 업데이트: ${key}`);
    } catch (error) {
      console.error(`[캐시] 설정 업데이트 실패 (${key}):`, error);
      throw error;
    }
  }

  /**
   * VIP 할인율 조회
   * @param {string} vipLevel - VIP 등급 (BRONZE, SILVER, GOLD, etc.)
   * @returns {number} 할인율 (0-1 사이)
   */
  getVIPDiscount(vipLevel) {
    const key = `vip_discount_${vipLevel.toLowerCase()}`;
    const setting = this.get(key);
    return setting?.rate || 0;
  }

  /**
   * 거래량 기반 할인율 조회
   * @param {number} totalVolume - 총 거래량
   * @returns {number} 할인율 (0-1 사이)
   */
  getVolumeDiscount(totalVolume) {
    const tiers = this.get('volume_discount_tiers', []);

    // 거래량에 맞는 최대 할인율 찾기
    let maxDiscount = 0;
    for (const tier of tiers) {
      if (totalVolume >= tier.threshold) {
        maxDiscount = Math.max(maxDiscount, tier.discount);
      }
    }

    return maxDiscount;
  }

  /**
   * 프로모션 코드 검증 및 할인율 조회
   * @param {string} code - 프로모션 코드
   * @returns {object|null} { discountRate, remaining } 또는 null
   */
  getPromotionDiscount(code) {
    return this.promotionCache.get(code.toUpperCase()) || null;
  }

  /**
   * 프로모션 코드 사용 처리
   * @param {string} code - 프로모션 코드
   */
  async usePromotionCode(code) {
    try {
      const promotion = await PromotionCodes.findOne({ where: { code: code.toUpperCase() } });

      if (!promotion) {
        throw new Error('존재하지 않는 프로모션 코드입니다.');
      }

      if (!promotion.isActive) {
        throw new Error('비활성화된 프로모션 코드입니다.');
      }

      // 유효기간 체크
      const now = new Date();
      if (promotion.startDate && promotion.startDate > now) {
        throw new Error('아직 사용할 수 없는 프로모션 코드입니다.');
      }
      if (promotion.endDate && promotion.endDate < now) {
        throw new Error('만료된 프로모션 코드입니다.');
      }

      // 사용 횟수 체크
      if (promotion.maxUses && promotion.currentUses >= promotion.maxUses) {
        throw new Error('사용 가능 횟수를 초과한 프로모션 코드입니다.');
      }

      // 사용 횟수 증가
      await promotion.increment('currentUses');

      // 캐시 갱신
      await this.refreshCache();

      return {
        discountRate: parseFloat(promotion.discountRate),
        remaining: promotion.maxUses ? promotion.maxUses - promotion.currentUses - 1 : null
      };
    } catch (error) {
      console.error('[캐시] 프로모션 코드 사용 실패:', error);
      throw error;
    }
  }

  /**
   * 베팅 제한 조회
   * @returns {object} { min_amount, max_amount, daily_limit }
   */
  getBetLimits() {
    return this.get('bet_limits', {
      min_amount: 1000,
      max_amount: 1000000,
      daily_limit: 5000000
    });
  }

  /**
   * 수수료율 조회
   * @param {string} type - 'sportsbook' 또는 'exchange'
   * @returns {number} 수수료율 (0-1 사이)
   */
  getCommissionRate(type) {
    const rates = this.get('commission_rates', {
      sportsbook: 0.05,
      exchange: 0.05
    });
    return rates[type] || 0.05;
  }

  /**
   * 캐시 상태 확인
   * @returns {object} 캐시 정보
   */
  getStatus() {
    return {
      settingsCount: this.cache.size,
      promotionsCount: this.promotionCache.size,
      lastUpdate: this.lastUpdate,
      cacheTTL: this.CACHE_TTL
    };
  }
}

// 싱글톤 인스턴스
export default new SettingsCacheService();
```

---

### 7.4 서비스 통합

#### commissionService.js 수정

```javascript
// server/services/commissionService.js
import settingsCacheService from './settingsCacheService.js';

/**
 * 수수료 계산 서비스 (DB 기반)
 */
class CommissionService {

  /**
   * VIP 등급별 할인율 조회 (DB에서)
   */
  getVIPDiscount(vipLevel) {
    return settingsCacheService.getVIPDiscount(vipLevel);
  }

  /**
   * 거래량 기반 할인율 조회 (DB에서)
   */
  getVolumeDiscount(totalVolume) {
    return settingsCacheService.getVolumeDiscount(totalVolume);
  }

  /**
   * 프로모션 코드 할인율 조회 (DB에서)
   */
  getPromotionDiscount(code) {
    return settingsCacheService.getPromotionDiscount(code);
  }

  /**
   * 프로모션 코드 사용 처리
   */
  async usePromotionCode(code) {
    return await settingsCacheService.usePromotionCode(code);
  }

  /**
   * 최종 수수료 계산
   */
  calculateFinalCommission(baseCommission, userId, vipLevel, promoCode = null) {
    let finalCommission = baseCommission;

    // VIP 할인 적용
    if (vipLevel) {
      const vipDiscount = this.getVIPDiscount(vipLevel);
      finalCommission *= (1 - vipDiscount);
    }

    // 프로모션 할인 적용
    if (promoCode) {
      const promoDiscount = this.getPromotionDiscount(promoCode);
      if (promoDiscount) {
        finalCommission *= (1 - promoDiscount.discountRate);
      }
    }

    return finalCommission;
  }

  // ... 기타 메서드
}

export default new CommissionService();
```

---

### 7.5 server/app.js에 캐시 초기화 추가

```javascript
// server/app.js
import settingsCacheService from './services/settingsCacheService.js';

async function startServer() {
  try {
    console.log('🚀 서버 시작 프로세스 시작...');

    // ... (기존 초기화 로직)

    // Settings 캐시 초기화
    console.log('[시작] Settings 캐시 초기화...');
    await settingsCacheService.initialize();
    console.log('✅ Settings 캐시 초기화 완료');

    // ... (나머지 서버 시작 로직)
  } catch (err) {
    console.error('❌ 서버 시작 실패:', err);
    process.exit(1);
  }
}

startServer();
```

---

### 7.6 Admin UI에서 설정 관리

#### API 엔드포인트 추가

```javascript
// server/routes/admin.js
import express from 'express';
import settingsCacheService from '../services/settingsCacheService.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

/**
 * GET /api/admin/settings
 * 모든 설정 조회
 */
router.get('/settings', verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const Settings = (await import('../models/settingsModel.js')).default;
    const settings = await Settings.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['key', 'ASC']]
    });

    res.json({ settings });
  } catch (error) {
    console.error('[Admin] 설정 조회 실패:', error);
    res.status(500).json({ error: '설정 조회 실패' });
  }
});

/**
 * PUT /api/admin/settings/:key
 * 설정 업데이트
 */
router.put('/settings/:key', verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { key } = req.params;
    const { value, category } = req.body;

    await settingsCacheService.set(key, value, category);

    res.json({
      success: true,
      message: '설정이 업데이트되었습니다.',
      key,
      value
    });
  } catch (error) {
    console.error('[Admin] 설정 업데이트 실패:', error);
    res.status(500).json({ error: '설정 업데이트 실패' });
  }
});

/**
 * GET /api/admin/promotions
 * 프로모션 코드 목록 조회
 */
router.get('/promotions', verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const PromotionCodes = (await import('../models/promotionCodesModel.js')).default;
    const promotions = await PromotionCodes.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json({ promotions });
  } catch (error) {
    console.error('[Admin] 프로모션 조회 실패:', error);
    res.status(500).json({ error: '프로모션 조회 실패' });
  }
});

/**
 * POST /api/admin/promotions
 * 프로모션 코드 생성
 */
router.post('/promotions', verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { code, discountRate, description, startDate, endDate, maxUses } = req.body;

    const PromotionCodes = (await import('../models/promotionCodesModel.js')).default;
    const promotion = await PromotionCodes.create({
      code: code.toUpperCase(),
      discountRate,
      description,
      startDate,
      endDate,
      maxUses,
      currentUses: 0,
      isActive: true
    });

    // 캐시 갱신
    await settingsCacheService.refreshCache();

    res.status(201).json({
      success: true,
      message: '프로모션 코드가 생성되었습니다.',
      promotion
    });
  } catch (error) {
    console.error('[Admin] 프로모션 생성 실패:', error);
    res.status(500).json({ error: '프로모션 생성 실패' });
  }
});

export default router;
```

---

## 8. 리스크 분석 및 대응

### 8.1 주요 리스크 및 완화 전략

| 리스크 | 확률 | 영향도 | 완화 전략 |
|--------|------|--------|----------|
| 기존 계정 로그인 불가 | 높음 | 높음 | 마이그레이션 스크립트 필수, 사전 테스트 |
| API 레이트 제한 초과 | 중간 | 높음 | 단계적 적용, 모니터링 강화 |
| WebSocket 연결 실패 | 중간 | 높음 | Fallback URL, 재연결 로직 |
| 환경변수 누락 | 높음 | 높음 | 검증 로직, .env.example 제공 |
| DB 마이그레이션 실패 | 낮음 | 높음 | 백업 필수, 롤백 계획 |
| 성능 저하 | 낮음 | 중간 | 캐싱 시스템, 모니터링 |

### 8.2 테스트 전략

#### 단위 테스트
```javascript
// tests/unit/settingsCache.test.js
import settingsCacheService from '../server/services/settingsCacheService.js';

describe('SettingsCacheService', () => {
  test('VIP 할인율 조회', () => {
    const discount = settingsCacheService.getVIPDiscount('GOLD');
    expect(discount).toBe(0.20);
  });

  test('존재하지 않는 설정 조회', () => {
    const value = settingsCacheService.get('non_existent_key', 'default');
    expect(value).toBe('default');
  });
});
```

#### 통합 테스트
```javascript
// tests/integration/api.test.js
import request from 'supertest';
import app from '../server/app.js';

describe('API Endpoints', () => {
  test('GET /api/odds - 환경변수 기반 URL', async () => {
    const response = await request(app).get('/api/odds');
    expect(response.status).toBe(200);
  });

  test('WebSocket 연결 - 환경변수 기반 URL', (done) => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL);
    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });
  });
});
```

---

## 9. 구현 체크리스트

### Phase 1: 긴급 보안 개선 ✅

- [ ] API 레이트 제한 환경변수화
  - [ ] `.env.local`에 레이트 제한 변수 추가
  - [ ] `oddsApiConfig.js` 수정
  - [ ] `oddsApiService.js` 수정
  - [ ] 로컬 테스트

- [ ] 기본 비밀번호 환경변수화
  - [ ] `.env.local`에 비밀번호 변수 추가
  - [ ] 마이그레이션 스크립트 작성 (`migrateDefaultPasswords.js`)
  - [ ] `server/app.js` 수정
  - [ ] `centralizedConfig.js` 수정
  - [ ] 마이그레이션 실행 및 테스트

- [ ] 환경변수 검증 시스템
  - [ ] `validateEnv.js` 생성
  - [ ] `server/app.js`에 통합
  - [ ] 프로덕션 검증 테스트

- [ ] `.env.example` 생성
  - [ ] 모든 필수 환경변수 나열
  - [ ] 설명 및 예시 추가
  - [ ] Git 커밋

### Phase 2: URL/포트 환경변수화 ✅

- [ ] 환경변수 추가
  - [ ] `.env.local` 업데이트
  - [ ] Render 환경변수 설정

- [ ] 백엔드 파일 수정
  - [ ] `server/config/centralizedConfig.js`
  - [ ] `server/app.js`

- [ ] 프론트엔드 파일 수정
  - [ ] `config/api.js`
  - [ ] `config/apiConfig.ts`
  - [ ] `config/serverApiConfig.ts`
  - [ ] `pages/api/admin/settings/commission-rates.ts`
  - [ ] `pages/admin/exchange.tsx`
  - [ ] `components/ExchangeSidebar.tsx`
  - [ ] 기타 19개 파일

- [ ] 테스트
  - [ ] 로컬 환경 API 호출 테스트
  - [ ] 로컬 WebSocket 연결 테스트
  - [ ] 프로덕션 배포 후 테스트

### Phase 3: 상수 파일 체계화 ✅

- [ ] 디렉토리 구조 생성
  - [ ] `config/constants/` (프론트엔드)
  - [ ] `server/config/constants/` (백엔드)
  - [ ] `shared/` (공유)

- [ ] 프론트엔드 상수 파일 작성
  - [ ] `betting.ts`
  - [ ] `ui.ts`
  - [ ] `api.ts`
  - [ ] `pagination.ts`
  - [ ] `index.ts`

- [ ] 백엔드 상수 파일 작성
  - [ ] `amounts.js`
  - [ ] `timeouts.js`
  - [ ] `database.js`
  - [ ] `betting.js`
  - [ ] `index.js`

- [ ] 공유 상수 파일 작성
  - [ ] `shared/constants.ts`

- [ ] 기존 코드 마이그레이션
  - [ ] Import 경로 일괄 변경
  - [ ] 각 파일 테스트

### Phase 4: 데이터베이스 설정 개선 ✅

- [ ] DB 연결 풀 환경변수화
  - [ ] `.env.local` 업데이트
  - [ ] `server/app.js` 수정
  - [ ] `server/config/database.js` 수정

- [ ] 테스트
  - [ ] DB 연결 성공 확인
  - [ ] 성능 모니터링

### Phase 5: 비즈니스 규칙 DB 이관 ✅

- [ ] 마이그레이션 생성
  - [ ] Settings 테이블 마이그레이션
  - [ ] PromotionCodes 테이블 마이그레이션
  - [ ] 마이그레이션 실행

- [ ] 시드 데이터 생성
  - [ ] Settings 초기 데이터
  - [ ] PromotionCodes 초기 데이터
  - [ ] 시드 실행

- [ ] 캐싱 시스템 구현
  - [ ] `settingsCacheService.js` 생성
  - [ ] `server/app.js`에 초기화 추가
  - [ ] 테스트

- [ ] 서비스 통합
  - [ ] `commissionService.js` 수정
  - [ ] 기타 서비스 수정

- [ ] Admin UI 추가
  - [ ] 설정 관리 API 엔드포인트
  - [ ] 프로모션 관리 API 엔드포인트
  - [ ] 프론트엔드 Admin 페이지

---

## 10. 롤백 계획

### 10.1 Git 브랜치 전략

```bash
# 각 Phase별로 브랜치 생성
git checkout -b feature/hardcoding-phase1
# Phase 1 작업 완료 후
git commit -m "[Claude] feat: Phase 1 - 긴급 보안 개선 완료"
git tag -a phase1-complete -m "Phase 1 완료"

git checkout -b feature/hardcoding-phase2
# Phase 2 작업...
```

### 10.2 Phase별 롤백 명령

#### Phase 1 롤백
```bash
# API 레이트 제한 복구
git revert <commit-hash-of-rate-limit-change>

# 비밀번호 마이그레이션 롤백
# DB에서 수동으로 원래 비밀번호로 복구
# 또는 백업 복원
```

#### Phase 2 롤백
```bash
# URL 환경변수화 롤백
git revert <commit-hash-of-url-changes>

# 또는 하드코딩 값으로 수동 복원
```

#### Phase 5 롤백
```bash
# DB 마이그레이션 롤백
npm run migrate:undo

# 시드 데이터 롤백
npm run seed:undo
```

### 10.3 긴급 롤백 스크립트

```bash
# scripts/emergency-rollback.sh
#!/bin/bash

echo "긴급 롤백 시작..."

# 1. Git 롤백
git reset --hard <safe-commit-hash>

# 2. 환경변수 복원 (수동)
echo "Render 대시보드에서 환경변수를 이전 값으로 복원하세요."

# 3. DB 백업 복원
echo "필요시 DB 백업 복원:"
echo "pg_restore -d $DATABASE_URL backup_YYYYMMDD.sql"

# 4. 서버 재시작
echo "Render에서 수동 재시작 필요"

echo "롤백 완료!"
```

---

## 11. 배포 가이드

### 11.1 로컬 환경 배포

```bash
# 1. 환경변수 설정
cp .env.example .env.local
# .env.local 파일 편집

# 2. 의존성 설치
npm install
cd server && npm install && cd ..

# 3. DB 마이그레이션
npm run migrate

# 4. 시드 데이터 (선택)
npm run seed

# 5. 서버 시작
npm start
```

### 11.2 프로덕션 배포 (Render)

```bash
# 1. Render 대시보드에서 환경변수 설정
# (PHASE 2에서 정의한 모든 환경변수)

# 2. Git 푸시
git add .
git commit -m "[Claude] feat: 하드코딩 개선 완료"
git push origin feature/hardcoding-improvement

# 3. Pull Request 생성 및 리뷰

# 4. main 브랜치에 병합
git checkout main
git merge feature/hardcoding-improvement
git push origin main

# 5. Render 자동 배포 대기

# 6. 배포 후 확인
# - 로그 확인
# - API 엔드포인트 테스트
# - WebSocket 연결 테스트
```

### 11.3 배포 후 모니터링

```bash
# Render 로그 확인
# Dashboard → Logs → View Logs

# 확인 사항:
# - ✅ 환경변수 검증 완료
# - ✅ DB 연결 성공
# - ✅ Settings 캐시 초기화 완료
# - ✅ 서버 리스닝 시작
# - ⚠️ 에러 로그 없음
```

---

## 12. 결론

### 12.1 개선 효과 요약

| 항목 | 개선 전 | 개선 후 | 개선율 |
|------|--------|--------|--------|
| 하드코딩 개수 | 80+ | 0 | 100% |
| 환경 전환 시간 | 30분 | 1분 | 96.7% |
| 설정 변경 | 코드 수정 + 재배포 | DB 업데이트 | - |
| 보안 수준 | 낮음 | 높음 | - |
| 유지보수성 | 분산 | 중앙화 | - |

### 12.2 향후 계획

1. **모니터링 강화**
   - API 레이트 제한 사용량 대시보드
   - 환경변수 변경 이력 추적

2. **문서화**
   - 환경변수 가이드 업데이트
   - 설정 관리 매뉴얼 작성

3. **자동화**
   - 환경변수 검증 CI/CD 통합
   - 설정 백업 자동화

---

## 부록

### A. 환경변수 전체 목록

```bash
# .env.local (완전판)

# ===== 서버 설정 =====
NODE_ENV=development
PORT=5050
BACKEND_PORT=5050
FRONTEND_PORT=3000

# ===== API URL =====
NEXT_PUBLIC_API_URL=http://localhost:5050
NEXT_PUBLIC_WS_URL=ws://localhost:5050
API_BASE_URL_DEV=http://localhost:5050
API_BASE_URL_PROD=https://likebetfair.onrender.com

# ===== 데이터베이스 =====
DATABASE_URL=postgresql://user:password@localhost:5432/likebetfair_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=likebetfair_dev
DB_USER=postgres
DB_PASSWORD=password

# DB 연결 풀
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=30000
DB_POOL_EVICT=1000
DB_CONNECT_TIMEOUT=60000
DB_QUERY_TIMEOUT=30000

# ===== 보안 =====
JWT_SECRET=your-jwt-secret-minimum-32-characters-long
JWT_EXPIRES_IN=7d
DEFAULT_ADMIN_PASSWORD=Admin2025!@#SecurePass987
DEFAULT_TEST_PASSWORD=Test2025!@#DevOnly456

# ===== 외부 API =====
ODDS_API_KEY=your-odds-api-key
THE_ODDS_API_KEY=your-odds-api-key
THESPORTSDB_API_KEY=your-sportsdb-api-key

# API 레이트 제한
ODDS_API_RATE_LIMIT_DAILY=500
ODDS_API_RATE_LIMIT_MONTHLY=10000
ODDS_API_RATE_LIMIT_HOURLY=100

# API 타임아웃
ODDS_API_TIMEOUT=30000
SPORTSDB_API_TIMEOUT=30000
API_TIMEOUT=10000

# ===== 관리자 설정 =====
SYSTEM_ADMIN_ID=your-admin-uuid
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_TEST_USERNAME=testuser

# ===== CORS =====
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# ===== 로깅 =====
LOG_LEVEL=info

# ===== 스케줄러 =====
DISABLE_SCHEDULER=false

# ===== 베팅 설정 =====
MIN_BET_AMOUNT=1000
MAX_BET_AMOUNT=1000000
DAILY_BET_LIMIT=5000000
BETTING_CUTOFF_MINUTES=10

# ===== 초기 잔액 =====
INITIAL_ADMIN_BALANCE=1000000
INITIAL_TEST_BALANCE=100000
INITIAL_USER_BALANCE=10000

# ===== 입출금 제한 =====
MIN_DEPOSIT=10000
MAX_DEPOSIT=10000000
MIN_WITHDRAWAL=10000
MAX_WITHDRAWAL=5000000

# ===== 캐싱 =====
SETTINGS_CACHE_TTL=300000
```

### B. 참고 자료

- [Sequelize 마이그레이션 가이드](https://sequelize.org/docs/v6/other-topics/migrations/)
- [Next.js 환경변수 문서](https://nextjs.org/docs/basic-features/environment-variables)
- [Node.js 환경변수 Best Practices](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)

### C. 문의

개선 제안이나 문제 발생 시:
- GitHub Issues: [프로젝트 Repository]/issues
- 이메일: dev@likebetfair.com

---

**문서 버전:** 1.0
**최종 수정일:** 2025-10-16
**작성자:** Claude (AI Assistant)
