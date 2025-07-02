import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';
import OddsCache from './oddsCacheModel.js';

const OddsHistory = sequelize.define('OddsHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  oddsCacheId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: OddsCache,
      key: 'id'
    }
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
  marketType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'h2h'
  },
  outcomeName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  outcomePoint: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  oddsValue: {
    type: DataTypes.DECIMAL(8, 3),
    allowNull: false
  },
  bookmakerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  snapshotTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'OddsHistories',
  timestamps: false  // 불변 데이터이므로 timestamps 비활성화
});

// 관계 설정
OddsHistory.belongsTo(OddsCache, { 
  foreignKey: 'oddsCacheId',
  as: 'oddsCache'
});
OddsCache.hasMany(OddsHistory, { 
  foreignKey: 'oddsCacheId',
  as: 'history'
});

export default OddsHistory; 