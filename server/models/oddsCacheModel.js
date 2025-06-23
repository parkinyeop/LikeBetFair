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
      fields: ['lastUpdated']
    }
  ]
});

export default OddsCache; 