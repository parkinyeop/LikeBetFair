import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

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
  selection: { type: DataTypes.STRING, allowNull: true }, // 선택한 팀/선수명 (기존 호환성)
  status: { type: DataTypes.ENUM('open', 'matched', 'settled', 'cancelled'), defaultValue: 'open' },
  matchedOrderId: { type: DataTypes.INTEGER, allowNull: true },
  // 매칭 배팅 관련 필드
  matchedBy: { type: DataTypes.UUID, allowNull: true }, // 매칭한 사용자 ID
  matchedAt: { type: DataTypes.DATE, allowNull: true }, // 매칭 시간
  matchedAmount: { type: DataTypes.INTEGER, allowNull: true }, // 매칭된 금액
  matchedType: { type: DataTypes.ENUM('back', 'lay'), allowNull: true }, // 매칭된 타입
  // 거래 내역 추적
  stakeAmount: { type: DataTypes.INTEGER, allowNull: false }, // 베팅 금액
  potentialProfit: { type: DataTypes.INTEGER, allowNull: false }, // 잠재적 수익
  actualProfit: { type: DataTypes.INTEGER, allowNull: true }, // 실제 수익 (정산 후)
  settledAt: { type: DataTypes.DATE, allowNull: true }, // 정산 시간
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
  settlementNote: { type: DataTypes.TEXT, allowNull: true },
  // 🆕 배당율 정보 추가
  backOdds: { 
    type: DataTypes.FLOAT, 
    allowNull: true,
    comment: 'Back 배당율 (1.0 이상)'
  },
  layOdds: { 
    type: DataTypes.FLOAT, 
    allowNull: true,
    comment: 'Lay 배당율 (1.0 이상)'
  },
  oddsSource: { 
    type: DataTypes.STRING, 
    allowNull: true,
    comment: '배당율 출처 (bookmaker 이름)'
  },
  oddsUpdatedAt: { 
    type: DataTypes.DATE, 
    allowNull: true,
    comment: '배당율 업데이트 시간'
  }
}, { timestamps: true });

// 관계 설정을 위한 import (순환 참조 방지)
import('./userModel.js').then(({ default: User }) => {
  ExchangeOrder.belongsTo(User, { foreignKey: 'userId', as: 'user' });
});

import('./gameResultModel.js').then(({ default: GameResult }) => {
  ExchangeOrder.belongsTo(GameResult, { foreignKey: 'gameResultId', as: 'gameResult' });
});

export default ExchangeOrder; 