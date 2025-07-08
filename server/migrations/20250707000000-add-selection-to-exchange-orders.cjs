'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ExchangeOrders', 'selection', {
      type: Sequelize.STRING,
      allowNull: true, // 기존 데이터를 위해 null 허용
      comment: '선택한 팀/선수명 (예: SSG Landers, Over 9.5)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ExchangeOrders', 'selection');
  }
}; 