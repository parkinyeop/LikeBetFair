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
  selection: { type: DataTypes.STRING, allowNull: true }, // 선택한 팀/선수명
  status: { type: DataTypes.ENUM('open', 'matched', 'settled', 'cancelled'), defaultValue: 'open' },
  matchedOrderId: { type: DataTypes.INTEGER, allowNull: true },
  // 거래 내역 추적
  stakeAmount: { type: DataTypes.INTEGER, allowNull: false }, // 베팅 금액
  potentialProfit: { type: DataTypes.INTEGER, allowNull: false }, // 잠재적 수익
  actualProfit: { type: DataTypes.INTEGER, allowNull: true }, // 실제 수익 (정산 후)
  settledAt: { type: DataTypes.DATE, allowNull: true }, // 정산 시간
}, { timestamps: true });

export default ExchangeOrder; 