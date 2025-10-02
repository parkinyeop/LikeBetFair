import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Settings = sequelize.define('Settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'general'
  }
}, {
  tableName: 'Settings',
  timestamps: true,
  indexes: [
    { fields: ['key'] },
    { fields: ['category'] }
  ]
});

export default Settings;




