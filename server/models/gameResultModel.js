import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const GameResult = sequelize.define('GameResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  eventId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  sportKey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sportTitle: {
    type: DataTypes.STRING,
    allowNull: false
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
    type: DataTypes.ENUM('scheduled', 'live', 'finished', 'cancelled', 'postponed'),
    defaultValue: 'scheduled'
  },
  score: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },
  result: {
    type: DataTypes.ENUM('home_win', 'away_win', 'draw', 'cancelled', 'pending', 'postponed'),
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
      unique: true,
      fields: ['eventId'],
      name: 'unique_event_id'
    },
    {
      unique: true,
      fields: ['homeTeam', 'awayTeam', 'commenceTime'],
      name: 'unique_game_match'
    },
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

export default GameResult; 