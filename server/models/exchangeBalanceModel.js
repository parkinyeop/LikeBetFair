import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const ExchangeBalance = sequelize.define('ExchangeBalance', {
  userId: { type: DataTypes.INTEGER, primaryKey: true },
  balance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { timestamps: true });

export default ExchangeBalance; 