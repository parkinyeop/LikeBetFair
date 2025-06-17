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

const GameResult = sequelize.define('GameResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  mainCategory: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subCategory: {
    type: DataTypes.STRING,
    allowNull: false
  },
  homeTeam: {
    type: DataTypes.STRING,
    allowNull: false
  },
  awayTeam: {
    type: DataTypes.STRING,
    allowNull: false
  },
  commenceTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'live', 'finished', 'cancelled'),
    defaultValue: 'scheduled'
  },
  score: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },
  result: {
    type: DataTypes.ENUM('home_win', 'away_win', 'draw', 'cancelled', 'pending'),
    defaultValue: 'pending'
  },
  lastUpdated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['mainCategory', 'subCategory']
    },
    {
      fields: ['commenceTime']
    },
    {
      fields: ['status']
    },
    {
      fields: ['result']
    }
  ]
});

module.exports = GameResult; 