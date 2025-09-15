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
    allowNull: true
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
  }
}, {
  timestamps: true
});

// User 모델과의 연관관계 설정
import('./userModel.js').then(({ default: User }) => {
  PaymentHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });
});

export default PaymentHistory; 