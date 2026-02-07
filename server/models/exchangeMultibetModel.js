import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const ExchangeMultibet = sequelize.define('ExchangeMultibet', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
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
  status: { 
    type: DataTypes.ENUM('open', 'pending', 'won', 'lost', 'cancelled', 'settled'), 
    defaultValue: 'open',
    comment: '멀티배팅 상태: open(진행중), pending(대기), won(승리), lost(패배), cancelled(취소), settled(정산완료)'
  },
  totalStake: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    comment: '총 베팅 금액 (원 단위)'
  },
  totalOdds: { 
    type: DataTypes.DECIMAL(10, 4), 
    allowNull: false,
    comment: '총 배당률 (소수점 4자리)'
  },
  potentialWinnings: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    comment: '잠재적 수익 (원 단위)'
  },
  actualProfit: { 
    type: DataTypes.INTEGER, 
    allowNull: true,
    comment: '실제 수익/손실 (원 단위, 정산 후)'
  },
  settledAt: { 
    type: DataTypes.DATE, 
    allowNull: true,
    comment: '정산 완료 시간'
  },
  // 🆕 추가 필드들
  selectionCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '선택된 베팅 개수'
  },
  wonSelections: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '성공한 선택 개수'
  },
  lostSelections: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '실패한 선택 개수'
  },
  cancelledSelections: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '취소된 선택 개수'
  },
  // 🆕 메타데이터
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '멀티배팅 설명 (사용자 입력)'
  },
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: '태그 정보 (예: ["축구", "프리미어리그"])'
  }
}, {
  tableName: 'ExchangeMultibets',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['status'] },
    { fields: ['createdAt'] },
    { fields: ['settledAt'] }
  ]
});

// 관계 설정을 위한 import (순환 참조 방지)
import('./userModel.js').then(({ default: User }) => {
  ExchangeMultibet.belongsTo(User, { foreignKey: 'userId', as: 'user' });
});

import('./exchangeMultibetSelectionModel.js').then(({ default: ExchangeMultibetSelection }) => {
  ExchangeMultibet.hasMany(ExchangeMultibetSelection, { 
    foreignKey: 'multibetId', 
    as: 'selections' 
  });
});

import('./exchangeOrderModel.js').then(({ default: ExchangeOrder }) => {
  ExchangeMultibet.hasMany(ExchangeOrder, { 
    foreignKey: 'multibetId', 
    as: 'orders' 
  });
});

export default ExchangeMultibet;
