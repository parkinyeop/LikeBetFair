import { Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
});

// User 모델 정의
const User = sequelize.define('User', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  username: {
    type: Sequelize.STRING(50),
    allowNull: true,
    unique: true
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  },
  balance: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  isAdmin: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  adminLevel: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  isActive: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'Users',
  timestamps: true
});

// ExchangeBalance 모델 정의
const ExchangeBalance = sequelize.define('ExchangeBalance', {
  userId: { 
    type: Sequelize.UUID, 
    primaryKey: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  balance: { 
    type: Sequelize.INTEGER, 
    allowNull: false, 
    defaultValue: 0 
  },
}, { 
  tableName: 'ExchangeBalances',
  timestamps: true 
});

async function createTestUser() {
  try {
    console.log('🔄 테스트 사용자 생성 시작...');
    
    // 데이터베이스 연결
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');
    
    // 테스트 사용자 생성
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      balance: 100000, // 10만원
      isAdmin: false,
      adminLevel: 0,
      isActive: true
    });
    
    console.log('✅ 테스트 사용자 생성 완료:', testUser.email);
    
    // Exchange 잔고 생성
    const exchangeBalance = await ExchangeBalance.create({
      userId: testUser.id,
      balance: 50000 // 5만원
    });
    
    console.log('✅ Exchange 잔고 생성 완료:', exchangeBalance.balance);
    
    // 관리자 계정도 생성
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      balance: 1000000, // 100만원
      isAdmin: true,
      adminLevel: 5,
      isActive: true
    });
    
    console.log('✅ 관리자 계정 생성 완료:', adminUser.email);
    
    // 관리자 Exchange 잔고 생성
    const adminExchangeBalance = await ExchangeBalance.create({
      userId: adminUser.id,
      balance: 200000 // 20만원
    });
    
    console.log('✅ 관리자 Exchange 잔고 생성 완료:', adminExchangeBalance.balance);
    
    console.log('\n🎉 테스트 계정 생성 완료!');
    console.log('\n📋 테스트 계정 정보:');
    console.log('일반 사용자: test@example.com / test123');
    console.log('관리자: admin@example.com / admin123');
    console.log('\n💡 이제 프론트엔드에서 로그인하여 Exchange 기능을 테스트할 수 있습니다.');
    
  } catch (error) {
    console.error('❌ 테스트 사용자 생성 실패:', error);
  } finally {
    await sequelize.close();
  }

}

createTestUser(); 