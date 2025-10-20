'use strict';

/**
 * 마이그레이션: ExchangeOrderMatch에 potAmount 필드 추가
 * 
 * Pot = backStake + layStake
 * - 매칭 성공 시 양측 담보금을 합한 Pot 생성
 * - 경기 결과에 따라 승자가 Pot 전체를 가져감
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ExchangeOrderMatches', 'potAmount', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Pot 금액 (backStake + layStake)'
    });

    console.log('✅ ExchangeOrderMatches에 potAmount 필드 추가 완료');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ExchangeOrderMatches', 'potAmount');
    console.log('✅ ExchangeOrderMatches에서 potAmount 필드 제거 완료');
  }
};

