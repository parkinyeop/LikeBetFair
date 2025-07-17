import express from 'express';
import cors from 'cors';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bet', betRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', oddsRoutes);
app.use('/api/game-results', gameResultRoutes);
app.use('/api/exchange', exchangeRoutes);

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
const PORT = process.env.PORT || 5050;

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
    
    await sequelize.sync();
    
    // 서버 시작
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('[완료] 서버 초기화 완료');
      
      // Exchange WebSocket 서비스 초기화
      exchangeWebSocketService.initialize(server);
      
      // 시즌 상태 자동 체크 스케줄러 시작 (일시 비활성화)
      // setupSeasonStatusScheduler();
    });
    
  } catch (err) {
    console.error('서버 시작 실패:', err);
    process.exit(1);
  }
}

startServer(); 