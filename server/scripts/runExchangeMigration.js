import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function runMigration() {
  try {
    console.log('🔄 Exchange 마이그레이션 시작...');
    
    // 데이터베이스 연결
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');
    
    // Exchange 모델들 동기화
    console.log('🔄 Exchange 테이블 동기화 중...');
    
    // ExchangeBalance 모델 동기화
    const ExchangeBalance = sequelize.define('ExchangeBalance', {
      userId: { 
        type: Sequelize.INTEGER, 
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
    
    // ExchangeOrder 모델 동기화
    const ExchangeOrder = sequelize.define('ExchangeOrder', {
      id: { 
        type: Sequelize.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
      },
      userId: { 
        type: Sequelize.INTEGER, 
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
    
    // 테이블 동기화
    await ExchangeBalance.sync({ force: false });
    await ExchangeOrder.sync({ force: false });
    
    console.log('✅ Exchange 테이블 동기화 완료');
    
    // 인덱스 생성 확인
    console.log('🔄 인덱스 확인 중...');
    
    // ExchangeBalances 인덱스
    try {
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_balances_user_id ON "ExchangeBalances" ("userId")');
    } catch (e) {
      console.log('ExchangeBalances 인덱스 이미 존재');
    }
    
    // ExchangeOrders 인덱스들
    try {
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_user_id ON "ExchangeOrders" ("userId")');
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_game_market_line ON "ExchangeOrders" ("gameId", "market", "line")');
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_status ON "ExchangeOrders" ("status")');
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_created_at ON "ExchangeOrders" ("createdAt")');
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_matched_id ON "ExchangeOrders" ("matchedOrderId")');
    } catch (e) {
      console.log('ExchangeOrders 인덱스들 이미 존재');
    }
    
    console.log('✅ 인덱스 생성 완료');
    console.log('🎉 Exchange 마이그레이션 완료!');
    
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration(); 