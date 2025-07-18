import express from 'express';
import cors from 'cors';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import next from 'next';

dotenv.config();

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

// 환경 변수 디버깅 (비밀번호는 마스킹)
console.log('[DB 연결] 환경 변수 확인:');
console.log('[DB 연결] DB_HOST:', process.env.DB_HOST);
console.log('[DB 연결] DB_PORT:', process.env.DB_PORT);
console.log('[DB 연결] DB_NAME:', process.env.DB_NAME);
console.log('[DB 연결] DB_USER:', process.env.DB_USER);
console.log('[DB 연결] DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');

// 라우트 임포트
import oddsRoutes from './routes/oddsRoutes.js';
import gameResultRoutes from './routes/gameResultRoutes.js';
import authRoutes from './routes/auth.js';
import betRoutes from './routes/bet.js';
import adminRoutes from './routes/admin.js';
import exchangeRoutes from './routes/exchange.js';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: path.join(__dirname, '..') });
const handle = nextApp.getRequestHandler();

const app = express();

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

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bet', betRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/game-results', gameResultRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api', oddsRoutes);

// Next.js SSR 핸들러로 나머지 모든 요청 전달
nextApp.prepare().then(() => {
  app.all('*', (req, res) => {
    return handle(req, res);
  });

  // 서버 시작
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something broke!',
    error: err.stack,
  });
});

// 스케줄러 초기화
import './jobs/oddsUpdateJob.js';

// 배팅 결과 업데이트 스케줄러 추가
import betResultService from './services/betResultService.js';

// 5분마다 배팅 결과 업데이트
setInterval(async () => {
  try {
    console.log('[Scheduler] Updating bet results...');
    const result = await betResultService.updateBetResults();
    if (result.updatedCount > 0) {
      console.log(`[Scheduler] Updated ${result.updatedCount} bet results`);
    }
  } catch (error) {
    console.error('[Scheduler] Error updating bet results:', error);
  }
}, 5 * 60 * 1000); // 5분

// 스케줄러 관련 import 및 설정
import { setupSeasonStatusScheduler } from './services/seasonStatusUpdater.js';

// Exchange WebSocket 서비스 import
import exchangeWebSocketService from './services/exchangeWebSocketService.js';

// 데이터베이스 연결 및 서버 시작
const PORT = process.env.PORT || 3001;

// 설정 초기화 후 서버 시작
async function startServer() {
  try {
    // 중앙화된 설정 초기화
    console.log('[시작] 중앙화된 설정 초기화...');
    await initializeCentralizedConfig();
    
    // 데이터베이스 연결
    console.log('[시작] 데이터베이스 연결 중...');
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // 데이터베이스 동기화 및 초기화
    console.log('[시작] 데이터베이스 테이블 동기화...');
    await sequelize.sync({ alter: true });
    console.log('Database tables synchronized successfully.');
    
    // 기본 계정 생성 (Render 환경에서만)
    if (process.env.NODE_ENV === 'production') {
      console.log('[시작] 기본 계정 생성 확인...');
      await createDefaultAccounts();
    }
    
    // 서버 시작
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('[완료] 서버 초기화 완료');
      
      // Exchange WebSocket 서비스 초기화
      exchangeWebSocketService.initialize(server);
      
      // Render 환경에서 초기 배당율 수집
      if (process.env.NODE_ENV === 'production') {
        console.log('[시작] 초기 배당율 수집 시작...');
        collectInitialOdds();
      }
      
      // 시즌 상태 자동 체크 스케줄러 시작 (일시 비활성화)
      // setupSeasonStatusScheduler();
    });
    
  } catch (err) {
    console.error('서버 시작 실패:', err);
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

// 초기 배당율 수집 함수
async function collectInitialOdds() {
  try {
    const oddsApiService = (await import('./services/oddsApiService.js')).default;
    const gameResultService = (await import('./services/gameResultService.js')).default;
    
    const activeCategories = [
      'NBA', 'MLB', 'KBO', 'NFL', 'MLS', 'K리그', 'J리그', 
      '세리에 A', '브라질 세리에 A', '아르헨티나 프리메라', 
      '중국 슈퍼리그', '라리가', '분데스리가'
    ];
    
    console.log('[배당율] 초기 배당율 수집 시작...');
    
    // 배당율 수집
    const oddsResult = await oddsApiService.fetchAndCacheOddsForCategories(activeCategories, 'high');
    console.log(`[배당율] 배당율 수집 완료: ${oddsResult.updatedCount}개`);
    
    // 경기 결과 수집
    const resultsResult = await gameResultService.fetchAndUpdateResultsForCategories(activeCategories);
    console.log(`[배당율] 경기 결과 수집 완료: ${resultsResult?.updatedCount || 0}개`);
    
    console.log('[배당율] 초기 데이터 수집 완료!');
  } catch (error) {
    console.error('[배당율] 초기 데이터 수집 실패:', error.message);
  }
}

startServer(); 