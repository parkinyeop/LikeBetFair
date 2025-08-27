import express from 'express';
import cors from 'cors';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import next from 'next';

// 환경변수 로드 (여러 파일 시도)
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config();

// 🚨 임시 해결책: API 키 강제 설정 (dotenv 문제 해결 후 제거)
process.env.ODDS_API_KEY = 'b1a67915235b9dd963dcb5be603853ea';
process.env.THE_ODDS_API_KEY = 'b1a67915235b9dd963dcb5be603853ea';
console.log('[환경변수] 새로운 API 키 설정됨:', process.env.ODDS_API_KEY.substring(0, 8) + '...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 중앙화된 설정 import
import { initializeCentralizedConfig, API_CONFIG } from './config/centralizedConfig.js';

// Sequelize 인스턴스 생성
const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
});

// 글로벌 변수로 DB 연결 상태 관리
global.dbConnected = false;

// 환경 변수 디버깅 (비밀번호는 마스킹)
console.log('[DB 연결] 환경 변수 확인:');
console.log('[DB 연결] DB_HOST:', process.env.DB_HOST);
console.log('[DB 연결] DB_PORT:', process.env.DB_PORT);
console.log('[DB 연결] DB_NAME:', process.env.DB_NAME);
console.log('[DB 연결] DB_USER:', process.env.DB_USER);
console.log('[DB 연결] DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');

// 라우트 임포트
import oddsRoutes from './routes/odds.js';
import gameResultRoutes from './routes/gameResultRoutes.js';
import authRoutes from './routes/auth.js';
import betRoutes from './routes/bet.js';
import adminRoutes from './routes/admin.js';
import exchangeRoutes from './routes/exchange.js';



const app = express();

// 기본 미들웨어 설정
app.use(cors());
app.use(express.json());

// 모든 응답에 CORS 헤더를 강제 추가
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[API] ${req.method} ${req.path}`, req.body);
  }
  next();
});

// DB 연결 상태 확인 미들웨어
app.use('/api/*', (req, res, next) => {
  if (!global.dbConnected) {
    console.error('[API] 데이터베이스 연결되지 않음');
    return res.status(500).json({ 
      error: '데이터베이스 연결 오류',
      details: '서버가 아직 준비되지 않았습니다'
    });
  }
  next();
});

// Render 헬스체크 엔드포인트 (API 라우트보다 먼저)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3001,
    dbConnected: global.dbConnected
  });
});

// 루트 경로는 Next.js로 처리 (프론트엔드 서빙)
// app.get('/', (req, res) => {
//   res.send("Server is running");
// });

// API Routes (순서 중요!)
app.use('/api/auth', authRoutes);
app.use('/api/bet', betRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/game-results', gameResultRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api/odds', oddsRoutes);

// API 라우트 디버깅
app.use('/api/*', (req, res, next) => {
  console.log(`[API] 처리되지 않은 요청: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'API 엔드포인트를 찾을 수 없습니다' });
});

// Error handling middleware (API 라우트 이후)
app.use((err, req, res, next) => {
  console.error('[Error Middleware] 오류 발생:', err);
  console.error('[Error Middleware] 스택:', err.stack);
  
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
  
  res.status(err.status || 500).json({
    error: err.message || '서버 내부 오류',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Next.js 앱 설정
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: path.join(__dirname, '..') });
const handle = nextApp.getRequestHandler();

// API가 아닌 모든 요청은 Next.js로 전달
app.all('*', (req, res) => {
  return handle(req, res);
});

// 스케줄러 초기화는 startServer 함수 내부에서 처리

// 배팅 결과 업데이트는 oddsUpdateJob.js에서만 처리 (중복 방지)

// 스케줄러 관련 import 및 설정
import { setupSeasonStatusScheduler } from './services/seasonStatusUpdater.js';

// Exchange WebSocket 서비스 import
import exchangeWebSocketService from './services/exchangeWebSocketService.js';

// 데이터베이스 연결 및 서버 시작
const PORT = process.env.PORT || (() => {
  console.warn('⚠️ PORT 환경변수가 없어서 3000 포트를 사용합니다.');
  return 3000;
})();
if (!PORT) {
  throw new Error('PORT 환경변수가 설정되어 있지 않습니다!');
}

// 설정 초기화 후 서버 시작
async function startServer() {
  try {
    console.log('🚀 서버 시작 프로세스 시작...');
    
    // 환경 변수 확인 (상세)
    console.log('📋 환경 변수 확인:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- PORT:', process.env.PORT);
    console.log('- DB_HOST:', process.env.DB_HOST ? '***' : 'undefined');
    console.log('- DB_PORT:', process.env.DB_PORT);
    console.log('- DB_NAME:', process.env.DB_NAME);
    console.log('- DB_USER:', process.env.DB_USER ? '***' : 'undefined');
    console.log('- DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');
    console.log('- DB_CONNECTION_STRING:', process.env.DB_CONNECTION_STRING ? '설정됨' : '미설정');
    console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '***' : 'undefined');
    console.log('- JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);
    
    // 데이터베이스 연결
    console.log('[시작] 데이터베이스 연결 중...');
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    
    // 글로벌 DB 연결 상태 업데이트
    global.dbConnected = true;
    
    // 중앙화된 설정 초기화
    console.log('[시작] 중앙화된 설정 초기화...');
    await initializeCentralizedConfig();
    console.log('✅ 중앙화된 설정 초기화 완료');
    
    // 데이터베이스 동기화 및 초기화
    console.log('[시작] 데이터베이스 테이블 동기화...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synchronized successfully.');
    
    // 데이터베이스 스키마 자동 수정 (Render 환경에서만)
    if (process.env.NODE_ENV === 'production') {
      console.log('[시작] 데이터베이스 스키마 자동 수정...');
      try {
        // balance 컬럼을 INTEGER에서 DECIMAL(10,2)로 변경
        await sequelize.query(`
          ALTER TABLE "Users" 
          ALTER COLUMN "balance" TYPE DECIMAL(10,2) USING "balance"::DECIMAL(10,2);
        `);
        console.log('✅ balance 컬럼 타입 수정 완료');
        
        // adminLevel 컬럼 추가
        await sequelize.query(`
          ALTER TABLE "Users" 
          ADD COLUMN IF NOT EXISTS "adminLevel" INTEGER DEFAULT 0;
        `);
        console.log('✅ adminLevel 컬럼 확인/추가 완료');
        
        // referralCode 컬럼 추가
        await sequelize.query(`
          ALTER TABLE "Users" 
          ADD COLUMN IF NOT EXISTS "referralCode" VARCHAR(20) UNIQUE;
        `);
        console.log('✅ referralCode 컬럼 확인/추가 완료');
        
        // referredBy 컬럼 추가
        await sequelize.query(`
          ALTER TABLE "Users" 
          ADD COLUMN IF NOT EXISTS "referredBy" VARCHAR(20);
        `);
        console.log('✅ referredBy 컬럼 확인/추가 완료');
        
        // referrerAdminId 컬럼 추가
        await sequelize.query(`
          ALTER TABLE "Users" 
          ADD COLUMN IF NOT EXISTS "referrerAdminId" UUID REFERENCES "Users"(id);
        `);
        console.log('✅ referrerAdminId 컬럼 확인/추가 완료');
        
        // lastLogin 컬럼 추가
        await sequelize.query(`
          ALTER TABLE "Users" 
          ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP;
        `);
        console.log('✅ lastLogin 컬럼 확인/추가 완료');
        
        // isActive 컬럼 추가
        await sequelize.query(`
          ALTER TABLE "Users" 
          ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
        `);
        console.log('✅ isActive 컬럼 확인/추가 완료');
        
        // gameResultId 컬럼 타입 수정
        await sequelize.query(`
          ALTER TABLE "ExchangeOrders" 
          DROP COLUMN IF EXISTS "gameResultId";
        `);
        await sequelize.query(`
          ALTER TABLE "ExchangeOrders" 
          ADD COLUMN IF NOT EXISTS "gameResultId" UUID REFERENCES "GameResults"(id) ON UPDATE CASCADE ON DELETE SET NULL;
        `);
        console.log('✅ gameResultId 컬럼 타입 수정 완료');
        
      } catch (error) {
        console.error('[스키마 수정] 오류:', error.message);
      }
    }
    
    // Next.js 준비
    console.log('[시작] Next.js 앱 준비 중...');
    await nextApp.prepare();
    console.log('✅ Next.js 앱 준비 완료');
    
    // 스케줄러 초기화
    console.log('[시작] 스케줄러 초기화 중...');
    if (process.env.NODE_ENV !== 'production' || process.env.DISABLE_SCHEDULER !== 'true') {
      try {
        await import('./jobs/oddsUpdateJob.js');
        console.log('[스케줄러] ✅ 스케줄러 로드 성공');
      } catch (err) {
        console.error('[스케줄러] ❌ 스케줄러 로드 실패:', err.message);
        console.error('[스케줄러] 스택 트레이스:', err.stack);
      }
    } else {
      console.log('[스케줄러] 빌드 환경에서 스케줄러 비활성화됨');
    }
    
    // 서버 시작
    console.log(`[시작] Express 서버 시작 중... (포트: ${PORT})`);
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server listening on port ${PORT}`);
      console.log('[완료] 서버 초기화 완료');
      
      // Exchange WebSocket 서비스 초기화
      console.log('[시작] Exchange WebSocket 서비스 초기화...');
      exchangeWebSocketService.initialize(server);
      console.log('✅ Exchange WebSocket 서비스 초기화 완료');
      
      // 기본 계정 생성 (비동기로 처리)
      if (process.env.NODE_ENV === 'production') {
        console.log('[시작] 기본 계정 생성 확인...');
        createDefaultAccounts().catch(error => {
          console.error('[계정] 기본 계정 생성 실패:', error.message);
        });
      }
      
      // Render 환경에서 초기 배당율 수집 (비동기로 처리)
      if (process.env.NODE_ENV === 'production') {
        console.log('[시작] 초기 배당율 수집 시작...');
        collectInitialOdds().catch(error => {
          console.error('[배당율] 초기 데이터 수집 실패:', error.message);
        });
      }
    });
    
    // 서버 오류 처리
    server.on('error', (error) => {
      console.error('❌ 서버 시작 오류:', error);
      if (error.code === 'EADDRINUSE') {
        console.error('포트가 이미 사용 중입니다:', PORT);
      }
      process.exit(1);
    });
    
    // 프로세스 종료 처리
    process.on('SIGTERM', () => {
      console.log('[종료] SIGTERM 신호 수신');
      global.dbConnected = false;
      server.close(() => {
        console.log('[종료] 서버 종료 완료');
        process.exit(0);
      });
    });
    
  } catch (err) {
    console.error('❌ 서버 시작 실패:', err);
    console.error('스택 트레이스:', err.stack);
    global.dbConnected = false;
    process.exit(1);
  }
}

// 기본 계정 생성 함수
async function createDefaultAccounts() {
  try {
    const User = (await import('./models/userModel.js')).default;
    const bcrypt = await import('bcryptjs');
    
    // 관리자 계정 확인 및 생성
    const adminCount = await User.count({ where: { isAdmin: true } });
    if (adminCount === 0) {
      console.log('[계정] 기본 관리자 계정 생성...');
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash('admin123', salt);
      
      await User.create({
        username: 'admin',
        email: 'admin@likebetfair.com',
        password: hashedPassword,
        balance: 1000000,
        isAdmin: true,
        adminLevel: 5
      });
      console.log('[계정] 관리자 계정 생성 완료 (admin/admin123)');
    }
    
    // 테스트 사용자 계정 확인 및 생성
    const testUser = await User.findOne({ where: { username: 'testuser' } });
    if (!testUser) {
      console.log('[계정] 테스트 사용자 계정 생성...');
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash('test123', salt);
      
      await User.create({
        username: 'testuser',
        email: 'test@likebetfair.com',
        password: hashedPassword,
        balance: 100000
      });
      console.log('[계정] 테스트 사용자 계정 생성 완료 (testuser/test123)');
    }
  } catch (error) {
    console.error('[계정] 기본 계정 생성 실패:', error.message);
  }
}

// 초기 배당율 수집 함수 (빌드 환경에서는 비활성화)
async function collectInitialOdds() {
  try {
    // 빌드 환경에서는 초기 데이터 수집 건너뛰기
    if (process.env.NODE_ENV === 'production' && process.env.DISABLE_SCHEDULER === 'true') {
      console.log('[배당율] 빌드 환경에서 초기 데이터 수집 건너뛰기');
      return;
    }
    
    const oddsApiService = (await import('./services/oddsApiService.js')).default;
    const gameResultService = (await import('./services/gameResultService.js')).default;
    
    // 빌드 환경에서는 고우선순위 리그만 수집
    const categories = process.env.NODE_ENV === 'production' && process.env.DISABLE_SCHEDULER === 'true' 
      ? ['KBO', 'MLB'] // 빌드 시에는 핵심 리그만
      : ['NBA', 'MLB', 'KBO', 'NFL', 'MLS', 'K리그', 'J리그', 
         '세리에 A', '브라질 세리에 A', '아르헨티나 프리메라', 
         '중국 슈퍼리그', '라리가', '분데스리가'];
    
    console.log('[배당율] 초기 배당율 수집 시작...');
    
    // 배당율 수집 (빌드 환경에서는 타임아웃 설정)
    const timeout = process.env.NODE_ENV === 'production' && process.env.DISABLE_SCHEDULER === 'true' 
      ? 60000 // 1분 타임아웃
      : 300000; // 5분 타임아웃
    
    const oddsResult = await Promise.race([
      oddsApiService.fetchAndCacheOddsForCategories(categories, 'high'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Initial odds collection timeout')), timeout))
    ]);
    
    console.log(`[배당율] 배당율 수집 완료: ${oddsResult.updatedCount}개`);
    
    // 경기 결과 수집 (빌드 환경에서는 건너뛰기)
    if (process.env.NODE_ENV !== 'production' || process.env.DISABLE_SCHEDULER !== 'true') {
      const resultsResult = await gameResultService.fetchAndUpdateResultsForCategories(categories);
      console.log(`[배당율] 경기 결과 수집 완료: ${resultsResult?.updatedCount || 0}개`);
    }
    
    console.log('[배당율] 초기 데이터 수집 완료!');
  } catch (error) {
    console.error('[배당율] 초기 데이터 수집 실패:', error.message);
    // 빌드 환경에서는 오류를 무시하고 계속 진행
    if (process.env.NODE_ENV === 'production' && process.env.DISABLE_SCHEDULER === 'true') {
      console.log('[배당율] 빌드 환경에서 오류 무시하고 계속 진행');
    }
  }
}

startServer(); 