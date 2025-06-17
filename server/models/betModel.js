const { DataTypes } = require('sequelize');
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
});

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
    type: DataTypes.ENUM('pending', 'won', 'lost', 'cancel'),
    defaultValue: 'pending'
  }
}, {
  timestamps: true
});

// 관계 설정
Bet.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Bet, { foreignKey: 'userId' });

module.exports = Bet; 