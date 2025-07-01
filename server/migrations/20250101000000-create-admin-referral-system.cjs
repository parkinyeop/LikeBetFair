'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Users 테이블에 필드 추가
      await queryInterface.addColumn('Users', 'username', {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true
      }, { transaction });

      await queryInterface.addColumn('Users', 'isAdmin', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction });

      await queryInterface.addColumn('Users', 'adminLevel', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }, { transaction });

      await queryInterface.addColumn('Users', 'referralCode', {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true
      }, { transaction });

      await queryInterface.addColumn('Users', 'referredBy', {
        type: Sequelize.STRING(20),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('Users', 'referrerAdminId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      }, { transaction });

      await queryInterface.addColumn('Users', 'lastLogin', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('Users', 'isActive', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      // 2. ReferralCodes 테이블 생성
      await queryInterface.createTable('ReferralCodes', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        adminId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        code: {
          type: Sequelize.STRING(20),
          allowNull: false,
          unique: true
        },
        commissionRate: {
          type: Sequelize.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0.05  // 5%
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        maxUsers: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null  // 무제한
        },
        currentUsers: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      // 3. AdminCommissions 테이블 생성
      await queryInterface.createTable('AdminCommissions', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        adminId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        betId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Bets',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        betAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        winAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0
        },
        commissionRate: {
          type: Sequelize.DECIMAL(5, 4),
          allowNull: false
        },
        commissionAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        status: {
          type: Sequelize.ENUM('pending', 'paid', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        paidAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      // 4. 인덱스 생성
      await queryInterface.addIndex('Users', ['isAdmin'], { transaction });
      await queryInterface.addIndex('Users', ['referralCode'], { transaction });
      await queryInterface.addIndex('Users', ['referredBy'], { transaction });
      await queryInterface.addIndex('Users', ['referrerAdminId'], { transaction });
      
      await queryInterface.addIndex('ReferralCodes', ['adminId'], { transaction });
      await queryInterface.addIndex('ReferralCodes', ['code'], { transaction });
      await queryInterface.addIndex('ReferralCodes', ['isActive'], { transaction });
      
      await queryInterface.addIndex('AdminCommissions', ['adminId'], { transaction });
      await queryInterface.addIndex('AdminCommissions', ['userId'], { transaction });
      await queryInterface.addIndex('AdminCommissions', ['betId'], { transaction });
      await queryInterface.addIndex('AdminCommissions', ['status'], { transaction });

      // 5. Master001 관리자 계정 생성
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Master001!@#', salt);

      const [adminUser] = await queryInterface.bulkInsert('Users', [{
        id: Sequelize.UUIDV4,
        username: 'Master001',
        email: 'master001@likebetfair.com',
        password: hashedPassword,
        balance: 0,
        isAdmin: true,
        adminLevel: 5,
        referralCode: 'Master001_MAIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }], { 
        transaction,
        returning: true 
      });

      // 6. 기본 추천코드 생성
      await queryInterface.bulkInsert('ReferralCodes', [{
        id: Sequelize.UUIDV4,
        adminId: adminUser.id,
        code: 'Master001_MAIN',
        commissionRate: 0.05,  // 5%
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }], { transaction });

      await transaction.commit();
      console.log('✅ Admin and Referral system created successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating admin system:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 테이블 삭제 (역순)
      await queryInterface.dropTable('AdminCommissions', { transaction });
      await queryInterface.dropTable('ReferralCodes', { transaction });
      
      // Users 테이블 필드 제거
      await queryInterface.removeColumn('Users', 'isActive', { transaction });
      await queryInterface.removeColumn('Users', 'lastLogin', { transaction });
      await queryInterface.removeColumn('Users', 'referrerAdminId', { transaction });
      await queryInterface.removeColumn('Users', 'referredBy', { transaction });
      await queryInterface.removeColumn('Users', 'referralCode', { transaction });
      await queryInterface.removeColumn('Users', 'adminLevel', { transaction });
      await queryInterface.removeColumn('Users', 'isAdmin', { transaction });
      await queryInterface.removeColumn('Users', 'username', { transaction });
      
      await transaction.commit();
      console.log('✅ Admin system rollback completed');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error rolling back admin system:', error);
      throw error;
    }
  }
}; 