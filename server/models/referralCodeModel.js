import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';
import User from './userModel.js';

const ReferralCode = sequelize.define('ReferralCode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  commissionRate: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: false,
    defaultValue: 0.05  // 5%
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  maxUsers: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null  // 무제한
  },
  currentUsers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['adminId'] },
    { fields: ['code'] },
    { fields: ['isActive'] }
  ]
});

// 관계 설정
ReferralCode.belongsTo(User, { 
  foreignKey: 'adminId', 
  as: 'admin' 
});

User.hasMany(ReferralCode, { 
  foreignKey: 'adminId', 
  as: 'referralCodes' 
});

// 인스턴스 메서드
ReferralCode.prototype.canAcceptNewUser = function() {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  if (this.maxUsers && this.currentUsers >= this.maxUsers) return false;
  return true;
};

ReferralCode.prototype.incrementUserCount = async function() {
  this.currentUsers += 1;
  await this.save();
};

// 정적 메서드
ReferralCode.findActiveByCode = function(code) {
  return this.findOne({
    where: {
      code: code,
      isActive: true
    },
    include: [{
      model: User,
      as: 'admin',
      attributes: ['id', 'username', 'adminLevel']
    }]
  });
};

export default ReferralCode; 