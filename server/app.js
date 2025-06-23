import express from 'express';
import cors from 'cors';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

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

// 라우트 임포트
import oddsRoutes from './routes/oddsRoutes.js';
import gameResultRoutes from './routes/gameResultRoutes.js';
import authRoutes from './routes/auth.js';
import betRoutes from './routes/bet.js';

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
app.use('/api', oddsRoutes);
app.use('/api/game-results', gameResultRoutes);

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

// 데이터베이스 연결 및 서버 시작
const PORT = process.env.PORT || 5050;

sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
    return sequelize.sync();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  }); 