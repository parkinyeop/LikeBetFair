import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';
import User from './userModel.js';
import Bet from './betModel.js';

const AdminCommission = sequelize.define('AdminCommission', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  betId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Bet,
      key: 'id'
    }
  },
  betAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  winAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  commissionRate: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: false
  },
  commissionAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['adminId'] },
    { fields: ['userId'] },
    { fields: ['betId'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
});

// 관계 설정
AdminCommission.belongsTo(User, { 
  foreignKey: 'adminId', 
  as: 'admin' 
});

AdminCommission.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user' 
});

AdminCommission.belongsTo(Bet, { 
  foreignKey: 'betId', 
  as: 'bet' 
});

User.hasMany(AdminCommission, { 
  foreignKey: 'adminId', 
  as: 'adminCommissions' 
});

User.hasMany(AdminCommission, { 
  foreignKey: 'userId', 
  as: 'userCommissions' 
});

Bet.hasOne(AdminCommission, { 
  foreignKey: 'betId', 
  as: 'commission' 
});

// 인스턴스 메서드
AdminCommission.prototype.calculateCommission = function() {
  if (this.winAmount > 0) {
    // 순수익에 대한 수수료 (당첨금 - 베팅금)
    const profit = this.winAmount - this.betAmount;
    this.commissionAmount = Math.max(0, profit * this.commissionRate);
  } else {
    this.commissionAmount = 0;
  }
  return this.commissionAmount;
};

AdminCommission.prototype.markAsPaid = async function() {
  this.status = 'paid';
  this.paidAt = new Date();
  await this.save();
};

// 정적 메서드
AdminCommission.createFromBet = async function(bet, admin, commissionRate) {
  return await this.create({
    adminId: admin.id,
    userId: bet.userId,
    betId: bet.id,
    betAmount: bet.stake,
    commissionRate: commissionRate,
    status: 'pending'
  });
};

AdminCommission.getTotalCommissionByAdmin = async function(adminId, startDate, endDate) {
  const whereClause = {
    adminId: adminId,
    status: 'paid'
  };
  
  if (startDate && endDate) {
    whereClause.paidAt = {
      [sequelize.Sequelize.Op.between]: [startDate, endDate]
    };
  }
  
  const result = await this.findAll({
    where: whereClause,
    attributes: [
      [sequelize.fn('SUM', sequelize.col('commissionAmount')), 'totalCommission'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalBets']
    ]
  });
  
  return {
    totalCommission: parseFloat(result[0]?.dataValues?.totalCommission || 0),
    totalBets: parseInt(result[0]?.dataValues?.totalBets || 0)
  };
};

export default AdminCommission; 