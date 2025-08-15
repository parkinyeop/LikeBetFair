import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const ExchangeOrderMatch = sequelize.define('ExchangeOrderMatch', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  originalOrderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ExchangeOrders',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: '원래 주문 ID (매칭 대상)'
  },
  matchingOrderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ExchangeOrders',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: '매칭하는 주문 ID'
  },
  matchedAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '실제 매칭된 금액'
  },
  matchedPrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: '매칭된 배당률'
  },
  originalSide: {
    type: DataTypes.ENUM('back', 'lay'),
    allowNull: false,
    comment: '원래 주문의 side'
  },
  matchingSide: {
    type: DataTypes.ENUM('back', 'lay'),
    allowNull: false,
    comment: '매칭 주문의 side'
  },
  status: {
    type: DataTypes.ENUM('active', 'settled', 'cancelled'),
    allowNull: false,
    defaultValue: 'active',
    comment: '매칭 상태'
  },
  settledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '정산 완료 시간'
  },
  settlementResult: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: '정산 결과 (승부, 수익/손실 등)'
  },
  gameId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '게임 ID (조회 성능 최적화)'
  },
  market: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '마켓 타입'
  },
  line: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: '라인'
  }
}, { 
  timestamps: true,
  tableName: 'ExchangeOrderMatches'
});

// 관계 설정을 위한 import (순환 참조 방지)
import('./exchangeOrderModel.js').then(({ default: ExchangeOrder }) => {
  ExchangeOrderMatch.belongsTo(ExchangeOrder, { 
    foreignKey: 'originalOrderId', 
    as: 'originalOrder' 
  });
  ExchangeOrderMatch.belongsTo(ExchangeOrder, { 
    foreignKey: 'matchingOrderId', 
    as: 'matchingOrder' 
  });
  
  // ExchangeOrder에서 역방향 관계 설정
  ExchangeOrder.hasMany(ExchangeOrderMatch, { 
    foreignKey: 'originalOrderId', 
    as: 'originalMatches' 
  });
  ExchangeOrder.hasMany(ExchangeOrderMatch, { 
    foreignKey: 'matchingOrderId', 
    as: 'matchingMatches' 
  });
});

export default ExchangeOrderMatch;