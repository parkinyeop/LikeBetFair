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
    type: DataTypes.UUID,
    allowNull: false
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
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});

export default PaymentHistory; 