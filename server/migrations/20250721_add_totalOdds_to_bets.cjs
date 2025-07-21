module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Bets', 'totalOdds', {
      type: Sequelize.NUMERIC,
      allowNull: false,
      // 기본값이 필요하다면 defaultValue: 1.0 등 추가 가능
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Bets', 'totalOdds');
  },
}; 