import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const ExchangeOrder = sequelize.define('ExchangeOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  gameId: { type: DataTypes.STRING, allowNull: false },
  market: { type: DataTypes.STRING, allowNull: false },
  line: { type: DataTypes.FLOAT, allowNull: false },
  side: { type: DataTypes.ENUM('back', 'lay'), allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  amount: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('open', 'matched', 'settled'), defaultValue: 'open' },
  matchedOrderId: { type: DataTypes.INTEGER, allowNull: true },
}, { timestamps: true });

export default ExchangeOrder; 