'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Users 테이블에 필드 추가 (기존 컬럼 확인 후 추가)
      const tableDescription = await queryInterface.describeTable('Users');
      
      // username 컬럼이 없으면 추가
      if (!tableDescription.username) {
        await queryInterface.addColumn('Users', 'username', {
          type: Sequelize.STRING(50),
          allowNull: true,
          unique: true
        }, { transaction });
      }

      // isAdmin 컬럼이 없으면 추가
      if (!tableDescription.isAdmin) {
        await queryInterface.addColumn('Users', 'isAdmin', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }, { transaction });
      }

      // adminLevel 컬럼이 없으면 추가
      if (!tableDescription.adminLevel) {
        await queryInterface.addColumn('Users', 'adminLevel', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        }, { transaction });
      }

      // referralCode 컬럼이 없으면 추가
      if (!tableDescription.referralCode) {
        await queryInterface.addColumn('Users', 'referralCode', {
          type: Sequelize.STRING(20),
          allowNull: true,
          unique: true
        }, { transaction });
      }

      // referredBy 컬럼이 없으면 추가
      if (!tableDescription.referredBy) {
        await queryInterface.addColumn('Users', 'referredBy', {
          type: Sequelize.STRING(20),
          allowNull: true
        }, { transaction });
      }

      // referrerAdminId 컬럼이 없으면 추가
      if (!tableDescription.referrerAdminId) {
        await queryInterface.addColumn('Users', 'referrerAdminId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          }
        }, { transaction });
      }

      // lastLogin 컬럼이 없으면 추가
      if (!tableDescription.lastLogin) {
        await queryInterface.addColumn('Users', 'lastLogin', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }

      // isActive 컬럼이 없으면 추가
      if (!tableDescription.isActive) {
        await queryInterface.addColumn('Users', 'isActive', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }, { transaction });
      }

      // 2. ReferralCodes 테이블이 없으면 생성
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('ReferralCodes')) {
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
      }

      // 3. AdminCommissions 테이블이 없으면 생성
      if (!tables.includes('AdminCommissions')) {
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
            allowNull: false
            // 외래키 제약조건은 나중에 추가
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
      }

      // 4. 인덱스 생성 (이미 존재하는지 확인하고 생성)
      try {
        await queryInterface.addIndex('Users', ['isAdmin'], { transaction });
      } catch (e) {
        console.log('Index Users.isAdmin already exists');
      }
      
      try {
        await queryInterface.addIndex('Users', ['referralCode'], { transaction });
      } catch (e) {
        console.log('Index Users.referralCode already exists');
      }
      
      try {
        await queryInterface.addIndex('Users', ['referredBy'], { transaction });
      } catch (e) {
        console.log('Index Users.referredBy already exists');
      }
      
      try {
        await queryInterface.addIndex('Users', ['referrerAdminId'], { transaction });
      } catch (e) {
        console.log('Index Users.referrerAdminId already exists');
      }
      
      if (tables.includes('ReferralCodes')) {
        try {
          await queryInterface.addIndex('ReferralCodes', ['adminId'], { transaction });
          await queryInterface.addIndex('ReferralCodes', ['code'], { transaction });
          await queryInterface.addIndex('ReferralCodes', ['isActive'], { transaction });
        } catch (e) {
          console.log('ReferralCodes indexes already exist');
        }
      }
      
      if (tables.includes('AdminCommissions')) {
        try {
          await queryInterface.addIndex('AdminCommissions', ['adminId'], { transaction });
          await queryInterface.addIndex('AdminCommissions', ['userId'], { transaction });
          await queryInterface.addIndex('AdminCommissions', ['betId'], { transaction });
          await queryInterface.addIndex('AdminCommissions', ['status'], { transaction });
        } catch (e) {
          console.log('AdminCommissions indexes already exist');
        }
      }

      // 5. Master001 관리자 계정이 없으면 생성
      const [existingAdmin] = await queryInterface.sequelize.query(
        "SELECT id FROM \"Users\" WHERE username = 'Master001' OR email = 'master001@likebetfair.com'",
        { transaction }
      );

      if (existingAdmin.length === 0) {
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Master001!@#', salt);
        const { v4: uuidv4 } = require('uuid');
        const adminId = uuidv4();

        await queryInterface.bulkInsert('Users', [{
          id: adminId,
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
        }], { transaction });

        // 6. 기본 추천코드가 없으면 생성
        const [existingCode] = await queryInterface.sequelize.query(
          "SELECT id FROM \"ReferralCodes\" WHERE code = 'Master001_MAIN'",
          { transaction }
        );

        if (existingCode.length === 0) {
          await queryInterface.bulkInsert('ReferralCodes', [{
            id: uuidv4(),
            adminId: adminId,
            code: 'Master001_MAIN',
            commissionRate: 0.05,  // 5%
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }], { transaction });
        }
      }

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
      const tables = await queryInterface.showAllTables();
      
      if (tables.includes('AdminCommissions')) {
        await queryInterface.dropTable('AdminCommissions', { transaction });
      }
      
      if (tables.includes('ReferralCodes')) {
        await queryInterface.dropTable('ReferralCodes', { transaction });
      }
      
      // Users 테이블 필드 제거 (있는 것만)
      const tableDescription = await queryInterface.describeTable('Users');
      
      if (tableDescription.isActive) {
        await queryInterface.removeColumn('Users', 'isActive', { transaction });
      }
      if (tableDescription.lastLogin) {
        await queryInterface.removeColumn('Users', 'lastLogin', { transaction });
      }
      if (tableDescription.referrerAdminId) {
        await queryInterface.removeColumn('Users', 'referrerAdminId', { transaction });
      }
      if (tableDescription.referredBy) {
        await queryInterface.removeColumn('Users', 'referredBy', { transaction });
      }
      if (tableDescription.referralCode) {
        await queryInterface.removeColumn('Users', 'referralCode', { transaction });
      }
      if (tableDescription.adminLevel) {
        await queryInterface.removeColumn('Users', 'adminLevel', { transaction });
      }
      if (tableDescription.isAdmin) {
        await queryInterface.removeColumn('Users', 'isAdmin', { transaction });
      }
      
      await transaction.commit();
      console.log('✅ Admin system rollback completed');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error rolling back admin system:', error);
      throw error;
    }
  }
}; 