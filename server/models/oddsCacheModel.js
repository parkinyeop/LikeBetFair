import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const OddsCache = sequelize.define('OddsCache', {
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
  sportKey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sportTitle: {
    type: DataTypes.STRING,
    allowNull: false
  },
  commenceTime: {
    type: DataTypes.DATE,
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
  bookmakers: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  officialOdds: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: '공식 평균 배당률 (모든 북메이커의 outcome별 평균)'
  },
  lastUpdated: {
    type: DataTypes.DATE,
    allowNull: false
  },
  market: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'h2h'
  },
  oddsApiId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'OddsAPI에서 제공하는 경기 고유 ID'
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['sportKey', 'homeTeam', 'awayTeam', 'commenceTime'],
      name: 'unique_game_odds'
    },
    {
      fields: ['oddsApiId'],
      name: 'idx_odds_api_id'
    },
    {
      fields: ['sportKey', 'commenceTime'],
      name: 'idx_sport_commence'
    },
    {
      fields: ['lastUpdated'],
      name: 'idx_last_updated'
    }
  ]
});

export default OddsCache; 