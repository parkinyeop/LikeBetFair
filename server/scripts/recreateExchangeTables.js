import sequelize from '../models/sequelize.js';
import { DataTypes } from 'sequelize';

/**
 * Exchange 테이블 재생성 스크립트
 * ExchangeBalance 제거하고 User.balance 통합 사용
 */
async function recreateExchangeTables() {
  try {
    console.log('=== 🔄 Exchange 테이블 재생성 시작 ===\n');
    
    // ExchangeOrder 모델 정의
    const ExchangeOrder = sequelize.define('ExchangeOrder', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { 
        type: DataTypes.UUID, 
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      gameId: { type: DataTypes.STRING, allowNull: false },
      market: { type: DataTypes.STRING, allowNull: false },
      line: { type: DataTypes.FLOAT, allowNull: false },
      side: { type: DataTypes.ENUM('back', 'lay'), allowNull: false },
      price: { type: DataTypes.FLOAT, allowNull: false },
      amount: { type: DataTypes.INTEGER, allowNull: false },
      selection: { type: DataTypes.STRING, allowNull: true },
      status: { type: DataTypes.ENUM('open', 'matched', 'settled', 'cancelled'), defaultValue: 'open' },
      matchedOrderId: { type: DataTypes.INTEGER, allowNull: true },
      // 거래 내역 추적
      stakeAmount: { type: DataTypes.INTEGER, allowNull: false },
      potentialProfit: { type: DataTypes.INTEGER, allowNull: false },
      actualProfit: { type: DataTypes.INTEGER, allowNull: true },
      settledAt: { type: DataTypes.DATE, allowNull: true },
      // 게임 연동 필드들
      homeTeam: { type: DataTypes.STRING, allowNull: true },
      awayTeam: { type: DataTypes.STRING, allowNull: true },
      commenceTime: { type: DataTypes.DATE, allowNull: true },
      sportKey: { type: DataTypes.STRING, allowNull: true },
      gameResultId: { 
        type: DataTypes.UUID, 
        allowNull: true,
        references: {
          model: 'GameResults',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      // 베팅 선택 상세 정보
      selectionDetails: { 
        type: DataTypes.JSONB, 
        allowNull: true,
        comment: 'JSON 구조: { teamName, marketType, outcome, point, etc. }'
      },
      // 자동 정산 관련
      autoSettlement: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      settlementNote: { type: DataTypes.TEXT, allowNull: true }
    }, { 
      tableName: 'ExchangeOrders',
      timestamps: true 
    });

    console.log('🗑️ 기존 Exchange 테이블 삭제 중...');
    
    // 기존 테이블 삭제 (CASCADE로 관련 인덱스도 함께 삭제)
    await sequelize.query('DROP TABLE IF EXISTS "ExchangeOrders" CASCADE');
    console.log('✅ ExchangeOrders 테이블 삭제 완료');
    
    // ExchangeBalance 테이블도 삭제 (더 이상 사용하지 않음)
    await sequelize.query('DROP TABLE IF EXISTS "ExchangeBalances" CASCADE');
    console.log('✅ ExchangeBalances 테이블 삭제 완료 (User.balance로 통합)');

    console.log('\n🔄 새로운 Exchange 테이블 생성 중...');
    
    // ExchangeOrder 테이블 생성
    await ExchangeOrder.sync({ force: true });
    console.log('✅ ExchangeOrders 테이블 생성 완료');

    console.log('\n📊 인덱스 생성 중...');
    
    // ExchangeOrders 인덱스
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_user_id ON "ExchangeOrders" ("userId")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_game_id ON "ExchangeOrders" ("gameId")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_status ON "ExchangeOrders" ("status")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_commence_time ON "ExchangeOrders" ("commenceTime")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_game_result_id ON "ExchangeOrders" ("gameResultId")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_exchange_orders_matched_order_id ON "ExchangeOrders" ("matchedOrderId")');
    
    console.log('✅ ExchangeOrders 인덱스 생성 완료');

    console.log('\n=== 📋 생성된 테이블 구조 ===');
    console.log('📊 ExchangeOrders:');
    console.log('  - id (INTEGER, PK, auto increment)');
    console.log('  - userId (UUID, FK to Users)');
    console.log('  - gameId (STRING)');
    console.log('  - market, line, side, price, amount');
    console.log('  - selection, status, matchedOrderId');
    console.log('  - stakeAmount, potentialProfit, actualProfit, settledAt');
    console.log('  - homeTeam, awayTeam, commenceTime, sportKey, gameResultId');
    console.log('  - selectionDetails (JSONB), autoSettlement, settlementNote');
    console.log('  - timestamps (createdAt, updatedAt)');
    
    console.log('\n💡 잔고 관리:');
    console.log('  - ExchangeBalance 테이블 제거됨');
    console.log('  - User.balance 필드로 통합 관리');
    console.log('  - 모든 거래에서 User.balance 직접 업데이트');

    console.log('\n✅ Exchange 테이블 재생성 완료!');
    
  } catch (error) {
    console.error('❌ Exchange 테이블 재생성 실패:', error);
    throw error;
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  recreateExchangeTables()
    .then(() => {
      console.log('\n✅ Exchange 테이블 재생성 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default recreateExchangeTables; 