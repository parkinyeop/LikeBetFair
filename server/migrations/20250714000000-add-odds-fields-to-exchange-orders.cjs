'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ExchangeOrders', 'backOdds', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Back 배당율 (1.0 이상)'
    });

    await queryInterface.addColumn('ExchangeOrders', 'layOdds', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Lay 배당율 (1.0 이상)'
    });

    await queryInterface.addColumn('ExchangeOrders', 'oddsSource', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '배당율 출처 (bookmaker 이름)'
    });

    await queryInterface.addColumn('ExchangeOrders', 'oddsUpdatedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: '배당율 업데이트 시간'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ExchangeOrders', 'backOdds');
    await queryInterface.removeColumn('ExchangeOrders', 'layOdds');
    await queryInterface.removeColumn('ExchangeOrders', 'oddsSource');
    await queryInterface.removeColumn('ExchangeOrders', 'oddsUpdatedAt');
  }
}; 