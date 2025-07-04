'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ExchangeOrders', 'stakeAmount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    
    await queryInterface.addColumn('ExchangeOrders', 'potentialProfit', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    
    await queryInterface.addColumn('ExchangeOrders', 'actualProfit', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    
    await queryInterface.addColumn('ExchangeOrders', 'settledAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ExchangeOrders', 'stakeAmount');
    await queryInterface.removeColumn('ExchangeOrders', 'potentialProfit');
    await queryInterface.removeColumn('ExchangeOrders', 'actualProfit');
    await queryInterface.removeColumn('ExchangeOrders', 'settledAt');
  }
}; 