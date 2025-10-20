import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const PaymentHistory = sequelize.define('PaymentHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  betId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Deprecated - Use relatedBetId instead'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  memo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  // ===== 새로 추가된 필드들 =====
  transactionType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Transaction type from TransactionType enum'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'completed',
    comment: 'Transaction status: completed, rolled_back, pending, failed'
  },
  relatedOrderId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to ExchangeOrder.id'
  },
  relatedBetId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to Bet.id'
  },
  relatedMultibetId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to ExchangeMultibet.id (if exists)'
  },
  relatedMatchId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to ExchangeOrderMatch.id'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional structured data'
  }
}, {
  timestamps: true
});

// User 모델과의 연관관계 설정
import('./userModel.js').then(({ default: User }) => {
  PaymentHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });
});

export default PaymentHistory; 