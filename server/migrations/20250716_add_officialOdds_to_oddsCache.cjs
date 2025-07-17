'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('OddsCaches', 'officialOdds', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: '공식 평균 배당률 (모든 북메이커의 outcome별 평균)'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('OddsCaches', 'officialOdds');
  }
}; 