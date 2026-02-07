import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const ExchangeMultibetSelection = sequelize.define('ExchangeMultibetSelection', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  multibetId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: 'ExchangeMultibets',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  exchangeOrderId: { 
    type: DataTypes.INTEGER, 
    allowNull: true,
    references: {
      model: 'ExchangeOrders',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  selection: { 
    type: DataTypes.STRING, 
    allowNull: false,
    comment: '선택한 팀/선수명 또는 결과 (예: "승리", "패배", "Over 2.5")'
  },
  odds: { 
    type: DataTypes.DECIMAL(10, 4), 
    allowNull: false,
    comment: '해당 선택의 배당률'
  },
  market: { 
    type: DataTypes.STRING, 
    allowNull: false,
    comment: '마켓 타입 (h2h, spreads, totals 등)'
  },
  gameId: { 
    type: DataTypes.STRING, 
    allowNull: false,
    comment: '경기 ID (TheSportsDB ID)'
  },
  status: { 
    type: DataTypes.ENUM('pending', 'won', 'lost', 'cancelled', 'postponed'), 
    defaultValue: 'pending',
    comment: '선택사항 상태: pending(대기), won(승리), lost(패배), cancelled(취소), postponed(연기)'
  },
  result: { 
    type: DataTypes.STRING, 
    allowNull: true,
    comment: '경기 결과 (예: "승리", "패배", "무승부")'
  },
  // 🆕 게임 정보 필드들
  homeTeam: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '홈팀명'
  },
  awayTeam: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '어웨이팀명'
  },
  commenceTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '경기 시작 시간'
  },
  sportKey: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '스포츠 종목 키'
  },
  // 🆕 베팅 상세 정보
  line: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: '핸디캡 라인 또는 토탈 라인'
  },
  point: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: '핸디캡 포인트 또는 토탈 포인트'
  },
  // 🆕 정산 관련
  settlementNote: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '정산 관련 메모'
  },
  settledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '정산 완료 시간'
  }
}, {
  tableName: 'ExchangeMultibetSelections',
  timestamps: true,
  indexes: [
    { fields: ['multibetId'] },
    { fields: ['exchangeOrderId'] },
    { fields: ['gameId'] },
    { fields: ['status'] },
    { fields: ['commenceTime'] }
  ]
});

// 관계 설정을 위한 import (순환 참조 방지)
import('./exchangeMultibetModel.js').then(({ default: ExchangeMultibet }) => {
  ExchangeMultibetSelection.belongsTo(ExchangeMultibet, { 
    foreignKey: 'multibetId', 
    as: 'multibet' 
  });
});

import('./exchangeOrderModel.js').then(({ default: ExchangeOrder }) => {
  ExchangeMultibetSelection.belongsTo(ExchangeOrder, { 
    foreignKey: 'exchangeOrderId', 
    as: 'exchangeOrder' 
  });
});

export default ExchangeMultibetSelection;
