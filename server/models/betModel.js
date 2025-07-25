import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';
import User from './userModel.js';
import dotenv from 'dotenv';
dotenv.config();

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
  stake: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  selections: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  totalOdds: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  potentialWinnings: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'won', 'lost', 'cancelled'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'Bets',
  timestamps: true
});

// 관계 설정
Bet.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Bet, { foreignKey: 'userId' });

export default Bet; 