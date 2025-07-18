import express from 'express';
import cors from 'cors';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Serve Next.js static files
import fs from 'fs';

// 여러 가능한 빌드 경로 시도
const possiblePaths = [
  path.join(__dirname, '../out'),
  path.join(__dirname, '../.next'),
  path.join(__dirname, '../../out'),
  path.join(__dirname, '../../.next'),
  path.join(process.cwd(), 'out'),
  path.join(process.cwd(), '.next'),
  path.join(process.cwd(), '.next/static'),
  path.join(process.cwd(), '../out'),
  path.join(process.cwd(), '../.next'),
  path.join(process.cwd(), '../.next/static')
];

let staticPath = null;
let indexPath = null;

console.log('[서버] 빌드 파일 경로 확인 중...');
for (const testPath of possiblePaths) {
  console.log('[서버] 확인 중:', testPath);
  if (fs.existsSync(testPath)) {
    staticPath = testPath;
    indexPath = path.join(testPath, 'index.html');
    console.log('[서버] 빌드 파일 발견:', staticPath);
    break;
  }
}

if (staticPath && fs.existsSync(indexPath)) {
  console.log('[서버] Next.js 빌드 파일 발견!');
  console.log('[서버] 정적 파일 경로:', staticPath);
  console.log('[서버] 인덱스 파일 경로:', indexPath);
  
  app.use(express.static(staticPath));
  
  // Serve Next.js pages
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    
    // Serve Next.js pages
    res.sendFile(indexPath);
  });
} else {
  console.log('[서버] Next.js 빌드 파일을 찾을 수 없습니다.');
  console.log('[서버] 확인한 경로들:', possiblePaths);
  
  // API routes only with better error message
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ message: 'API endpoint not found' });
    } else {
      // 간단한 프론트엔드 제공 (빌드 파일이 없을 때)
      res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>LikeBetFair - 베팅 플랫폼</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; text-align: center; }
            .status { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .error { background: #ffe6e6; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .api-test { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
            button { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px; }
            button:hover { background: #2980b9; }
            .info { font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🏈 LikeBetFair 베팅 플랫폼</h1>
            
            <div class="status">
              <h3>✅ 서버 상태</h3>
              <p>Express 서버가 정상적으로 실행 중입니다.</p>
              <p>포트: ${process.env.PORT || 3001}</p>
              <p>환경: ${process.env.NODE_ENV || 'development'}</p>
            </div>
            
            <div class="error">
              <h3>⚠️ 프론트엔드 상태</h3>
              <p>Next.js 빌드 파일을 찾을 수 없습니다.</p>
              <p>확인된 경로:</p>
              <ul>
                ${possiblePaths.map(p => `<li>${p}</li>`).join('')}
              </ul>
              <p>현재 디렉토리: ${process.cwd()}</p>
              <p>서버 디렉토리: ${__dirname}</p>
            </div>
            
            <div class="api-test">
              <h3>🔧 API 테스트</h3>
              <p>API 엔드포인트가 정상 작동하는지 확인해보세요:</p>
              <button onclick="testAPI()">MLB 배당율 테스트</button>
              <button onclick="testAuth()">인증 API 테스트</button>
              <div id="api-result"></div>
            </div>
            
            <div class="info">
              <p><strong>해결 방법:</strong></p>
              <ol>
                <li>Render 대시보드에서 Build Command가 'npm run build'로 설정되어 있는지 확인</li>
                <li>빌드 로그에서 Next.js 빌드가 성공했는지 확인</li>
                <li>환경변수 NODE_ENV=production이 설정되어 있는지 확인</li>
              </ol>
            </div>
          </div>
          
          <script>
            async function testAPI() {
              const result = document.getElementById('api-result');
              result.innerHTML = '테스트 중...';
              try {
                const response = await fetch('/api/odds/MLB');
                const data = await response.json();
                result.innerHTML = '<strong>✅ API 정상:</strong> ' + JSON.stringify(data).substring(0, 100) + '...';
              } catch (error) {
                result.innerHTML = '<strong>❌ API 오류:</strong> ' + error.message;
              }
            }
            
            async function testAuth() {
              const result = document.getElementById('api-result');
              result.innerHTML = '테스트 중...';
              try {
                const response = await fetch('/api/auth/register', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({username: 'test', email: 'test@test.com', password: 'test123'})
                });
                const data = await response.json();
                result.innerHTML = '<strong>✅ 인증 API 정상:</strong> ' + JSON.stringify(data).substring(0, 100) + '...';
              } catch (error) {
                result.innerHTML = '<strong>❌ 인증 API 오류:</strong> ' + error.message;
              }
            }
          </script>
        </body>
        </html>
      `);
    }
  });
}

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