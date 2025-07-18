'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Fixing User table schema...');
      
      // 1. balance 컬럼을 INTEGER에서 DECIMAL(10,2)로 변경
      await queryInterface.changeColumn('Users', 'balance', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      }, { transaction });
      console.log('✅ Fixed balance column type');
      
      // 2. adminLevel 컬럼이 없으면 추가
      const tableDescription = await queryInterface.describeTable('Users');
      if (!tableDescription.adminLevel) {
        await queryInterface.addColumn('Users', 'adminLevel', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        }, { transaction });
        console.log('✅ Added adminLevel column');
      }
      
      // 3. referralCode 컬럼이 없으면 추가
      if (!tableDescription.referralCode) {
        await queryInterface.addColumn('Users', 'referralCode', {
          type: Sequelize.STRING(20),
          allowNull: true,
          unique: true
        }, { transaction });
        console.log('✅ Added referralCode column');
      }
      
      // 4. referredBy 컬럼이 없으면 추가
      if (!tableDescription.referredBy) {
        await queryInterface.addColumn('Users', 'referredBy', {
          type: Sequelize.STRING(20),
          allowNull: true
        }, { transaction });
        console.log('✅ Added referredBy column');
      }
      
      // 5. referrerAdminId 컬럼이 없으면 추가
      if (!tableDescription.referrerAdminId) {
        await queryInterface.addColumn('Users', 'referrerAdminId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          }
        }, { transaction });
        console.log('✅ Added referrerAdminId column');
      }
      
      // 6. lastLogin 컬럼이 없으면 추가
      if (!tableDescription.lastLogin) {
        await queryInterface.addColumn('Users', 'lastLogin', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
        console.log('✅ Added lastLogin column');
      }
      
      // 7. isActive 컬럼이 없으면 추가
      if (!tableDescription.isActive) {
        await queryInterface.addColumn('Users', 'isActive', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }, { transaction });
        console.log('✅ Added isActive column');
      }
      
      // 8. username 컬럼 길이 제한 추가 (50자)
      if (tableDescription.username && tableDescription.username.type === 'character varying') {
        await queryInterface.changeColumn('Users', 'username', {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true
        }, { transaction });
        console.log('✅ Fixed username column constraints');
      }
      
      await transaction.commit();
      console.log('✅ User table schema fixed successfully');
      
    } catch (error) {
      console.error('❌ Error fixing User table schema:', error);
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Rollback changes
      await queryInterface.changeColumn('Users', 'balance', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }, { transaction });
      
      const tableDescription = await queryInterface.describeTable('Users');
      
      if (tableDescription.adminLevel) {
        await queryInterface.removeColumn('Users', 'adminLevel', { transaction });
      }
      if (tableDescription.referralCode) {
        await queryInterface.removeColumn('Users', 'referralCode', { transaction });
      }
      if (tableDescription.referredBy) {
        await queryInterface.removeColumn('Users', 'referredBy', { transaction });
      }
      if (tableDescription.referrerAdminId) {
        await queryInterface.removeColumn('Users', 'referrerAdminId', { transaction });
      }
      if (tableDescription.lastLogin) {
        await queryInterface.removeColumn('Users', 'lastLogin', { transaction });
      }
      if (tableDescription.isActive) {
        await queryInterface.removeColumn('Users', 'isActive', { transaction });
      }
      
      await transaction.commit();
      console.log('✅ User table schema rollback completed');
      
    } catch (error) {
      console.error('❌ Error rolling back User table schema:', error);
      await transaction.rollback();
      throw error;
    }
  }
}; 