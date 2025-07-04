import { Sequelize } from 'sequelize';
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

// ExchangeOrder 모델 정의
const ExchangeOrder = sequelize.define('ExchangeOrder', {
  id: { 
    type: Sequelize.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  userId: { 
    type: Sequelize.UUID, 
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  gameId: { 
    type: Sequelize.STRING, 
    allowNull: false 
  },
  market: { 
    type: Sequelize.STRING, 
    allowNull: false 
  },
  line: { 
    type: Sequelize.FLOAT, 
    allowNull: false 
  },
  side: { 
    type: Sequelize.ENUM('back', 'lay'), 
    allowNull: false 
  },
  price: { 
    type: Sequelize.FLOAT, 
    allowNull: false 
  },
  amount: { 
    type: Sequelize.INTEGER, 
    allowNull: false 
  },
  status: { 
    type: Sequelize.ENUM('open', 'matched', 'settled', 'cancelled'), 
    defaultValue: 'open' 
  },
  matchedOrderId: { 
    type: Sequelize.INTEGER, 
    allowNull: true,
    references: {
      model: 'ExchangeOrders',
      key: 'id'
    }
  },
}, { 
  tableName: 'ExchangeOrders',
  timestamps: true 
});

async function recreateTables() {
  try {
    console.log('🔄 Exchange 테이블 재생성 시작...');
    
    // 데이터베이스 연결
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');
    
    // 기존 테이블 삭제
    console.log('🔄 기존 테이블 삭제 중...');
    await sequelize.query('DROP TABLE IF EXISTS "ExchangeOrders" CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS "ExchangeBalances" CASCADE');
    console.log('✅ 기존 테이블 삭제 완료');
    
    // 새 테이블 생성
    console.log('🔄 새 테이블 생성 중...');
    await ExchangeOrder.sync({ force: true });
    await ExchangeBalance.sync({ force: true });
    console.log('✅ 새 테이블 생성 완료');
    
    // 인덱스 생성
    console.log('🔄 인덱스 생성 중...');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_balances_user_id ON "ExchangeBalances" ("userId")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_user_id ON "ExchangeOrders" ("userId")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_game_market_line ON "ExchangeOrders" ("gameId", "market", "line")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_status ON "ExchangeOrders" ("status")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_created_at ON "ExchangeOrders" ("createdAt")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_matched_id ON "ExchangeOrders" ("matchedOrderId")');
    console.log('✅ 인덱스 생성 완료');
    
    console.log('🎉 Exchange 테이블 재생성 완료!');
    
  } catch (error) {
    console.error('❌ 테이블 재생성 실패:', error);
  } finally {
    await sequelize.close();
  }
}

recreateTables(); 