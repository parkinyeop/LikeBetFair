import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  adminLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  referralCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true
  },
  referredBy: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  referrerAdminId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['email']
    },
    {
      fields: ['username']
    },
    {
      fields: ['isAdmin']
    },
    {
      fields: ['referralCode']
    },
    {
      fields: ['referredBy']
    },
    {
      fields: ['referrerAdminId']
    }
  ]
});

// 관리자 권한 체크 메서드들
User.prototype.hasAdminLevel = function(minLevel) {
  return this.isAdmin && this.adminLevel >= minLevel;
};

User.prototype.canViewUsers = function() {
  return this.hasAdminLevel(2);
};

User.prototype.canManageBets = function() {
  return this.hasAdminLevel(3);
};

User.prototype.canManageUsers = function() {
  return this.hasAdminLevel(4);
};

User.prototype.isSuperAdmin = function() {
  return this.hasAdminLevel(5);
};

// 인스턴스 메서드
User.prototype.hasPermission = function(permission) {
  if (!this.isAdmin) return false;
  
  const ADMIN_PERMISSIONS = {
    0: [],
    1: ['view_own_referrals'],
    2: ['view_own_referrals', 'view_user_bets', 'manage_commissions'],
    3: ['view_own_referrals', 'view_user_bets', 'manage_commissions', 'create_referral_codes'],
    4: ['view_all_data', 'manage_users', 'system_settings'],
    5: ['*'] // 모든 권한
  };
  
  const permissions = ADMIN_PERMISSIONS[this.adminLevel] || [];
  return permissions.includes('*') || permissions.includes(permission);
};

User.prototype.canViewUser = function(targetUserId) {
  if (!this.isAdmin) return false;
  if (this.adminLevel >= 4) return true; // SENIOR 이상은 모든 사용자 조회 가능
  
  // 자신이 추천한 사용자만 조회 가능
  return this.hasPermission('view_own_referrals');
};

export default User; 