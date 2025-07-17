const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. OddsCaches 테이블에 lastUpdated 컬럼 추가
    try {
      await queryInterface.addColumn('OddsCaches', 'lastUpdated', {
        type: DataTypes.DATE,
        allowNull: true
      });
      console.log('✅ Added lastUpdated column to OddsCaches');
    } catch (error) {
      console.log('⚠️ lastUpdated column might already exist:', error.message);
    }

    // 2. GameResults 테이블에 sportKey와 sportTitle 컬럼 추가
    try {
      await queryInterface.addColumn('GameResults', 'sportKey', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('✅ Added sportKey column to GameResults');
    } catch (error) {
      console.log('⚠️ sportKey column might already exist:', error.message);
    }

    try {
      await queryInterface.addColumn('GameResults', 'sportTitle', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('✅ Added sportTitle column to GameResults');
    } catch (error) {
      console.log('⚠️ sportTitle column might already exist:', error.message);
    }

    // 3. Users 테이블에 email 컬럼이 없다면 추가
    try {
      await queryInterface.addColumn('Users', 'email', {
        type: DataTypes.STRING,
        allowNull: true,
        unique: false
      });
      console.log('✅ Added email column to Users');
    } catch (error) {
      console.log('⚠️ email column might already exist:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 롤백: 컬럼들 제거
    try {
      await queryInterface.removeColumn('OddsCaches', 'lastUpdated');
    } catch (error) {
      console.log('⚠️ Could not remove lastUpdated column:', error.message);
    }

    try {
      await queryInterface.removeColumn('GameResults', 'sportKey');
    } catch (error) {
      console.log('⚠️ Could not remove sportKey column:', error.message);
    }

    try {
      await queryInterface.removeColumn('GameResults', 'sportTitle');
    } catch (error) {
      console.log('⚠️ Could not remove sportTitle column:', error.message);
    }

    try {
      await queryInterface.removeColumn('Users', 'email');
    } catch (error) {
      console.log('⚠️ Could not remove email column:', error.message);
    }
  }
}; 