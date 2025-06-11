const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./userModel');

const Bet = sequelize.define('Bet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  selections: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  stake: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalOdds: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  potentialWinnings: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'won', 'lost'),
    defaultValue: 'pending'
  }
}, {
  timestamps: true
});

// 관계 설정
Bet.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Bet, { foreignKey: 'userId' });

module.exports = Bet; 