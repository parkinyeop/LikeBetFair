import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import OddsCache from '../models/oddsCacheModel.js';
import User from '../models/userModel.js';
import Bet from '../models/betModel.js';
import GameResult from '../models/gameResultModel.js';
import OddsHistory from '../models/oddsHistoryModel.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import AdminCommission from '../models/adminCommissionModel.js';
import ReferralCode from '../models/referralCodeModel.js';

dotenv.config();

// Render 데이터베이스 연결을 위한 Sequelize 인스턴스 생성
const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixRenderDatabase() {
  try {
    console.log('🔧 Render 데이터베이스 수정 시작...');
    
    // 1. 데이터베이스 연결 확인
    console.log('\n1️⃣ 데이터베이스 연결 확인...');
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공!');
    
    // 2. 모든 모델 동기화 (테이블 생성/수정)
    console.log('\n2️⃣ 테이블 동기화...');
    
    // 각 모델을 개별적으로 동기화
    console.log('Users 테이블 동기화...');
    await User.sync({ alter: true });
    
    console.log('OddsCaches 테이블 동기화...');
    await OddsCache.sync({ alter: true });
    
    console.log('GameResults 테이블 동기화...');
    await GameResult.sync({ alter: true });
    
    console.log('Bets 테이블 동기화...');
    await Bet.sync({ alter: true });
    
    console.log('OddsHistories 테이블 동기화...');
    await OddsHistory.sync({ alter: true });
    
    console.log('ExchangeOrders 테이블 동기화...');
    await ExchangeOrder.sync({ alter: true });
    
    console.log('PaymentHistories 테이블 동기화...');
    await PaymentHistory.sync({ alter: true });
    
    console.log('AdminCommissions 테이블 동기화...');
    await AdminCommission.sync({ alter: true });
    
    console.log('ReferralCodes 테이블 동기화...');
    await ReferralCode.sync({ alter: true });
    
    console.log('✅ 모든 테이블 동기화 완료!');
    
    // 3. 테이블 존재 확인
    console.log('\n3️⃣ 테이블 존재 확인...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📊 생성된 테이블 목록:');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. "${table.table_name}"`);
    });
    
    // 4. 기본 관리자 계정 생성 (없는 경우)
    console.log('\n4️⃣ 기본 관리자 계정 확인...');
    const adminCount = await User.count({ where: { isAdmin: true } });
    
    if (adminCount === 0) {
      console.log('관리자 계정이 없습니다. 기본 관리자 계정을 생성합니다...');
      
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash('admin123', salt);
      
      await User.create({
        username: 'admin',
        email: 'admin@likebetfair.com',
        password: hashedPassword,
        balance: 1000000, // 100만원
        isAdmin: true,
        adminLevel: 5
      });
      
      console.log('✅ 기본 관리자 계정 생성 완료!');
      console.log('아이디: admin');
      console.log('비밀번호: admin123');
    } else {
      console.log(`✅ 관리자 계정이 ${adminCount}개 존재합니다.`);
    }
    
    // 5. 테스트 사용자 계정 생성
    console.log('\n5️⃣ 테스트 사용자 계정 확인...');
    const testUser = await User.findOne({ where: { username: 'testuser' } });
    
    if (!testUser) {
      console.log('테스트 사용자 계정을 생성합니다...');
      
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash('test123', salt);
      
      await User.create({
        username: 'testuser',
        email: 'test@likebetfair.com',
        password: hashedPassword,
        balance: 100000 // 10만원
      });
      
      console.log('✅ 테스트 사용자 계정 생성 완료!');
      console.log('아이디: testuser');
      console.log('비밀번호: test123');
    } else {
      console.log('✅ 테스트 사용자 계정이 이미 존재합니다.');
    }
    
    // 6. 데이터베이스 통계
    console.log('\n6️⃣ 데이터베이스 통계...');
    const userCount = await User.count();
    const oddsCount = await OddsCache.count();
    const gameCount = await GameResult.count();
    const betCount = await Bet.count();
    
    console.log(`📊 데이터베이스 통계:`);
    console.log(`- 사용자: ${userCount}명`);
    console.log(`- 배당율: ${oddsCount}개`);
    console.log(`- 경기: ${gameCount}개`);
    console.log(`- 베팅: ${betCount}개`);
    
    console.log('\n✅ Render 데이터베이스 수정 완료!');
    console.log('이제 서버를 재시작하면 정상적으로 작동할 것입니다.');
    
  } catch (error) {
    console.error('❌ Render 데이터베이스 수정 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  } finally {
    await sequelize.close();
  }
}

fixRenderDatabase(); 