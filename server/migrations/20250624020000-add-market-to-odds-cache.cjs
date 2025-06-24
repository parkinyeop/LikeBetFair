'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('OddsCaches', 'market', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'h2h', // 기존 데이터 호환을 위해 기본값 지정
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('OddsCaches', 'market');
  }
}; 