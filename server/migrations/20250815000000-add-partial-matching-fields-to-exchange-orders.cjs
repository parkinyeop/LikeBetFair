'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ExchangeOrders 테이블에 부분 매칭 필드 추가
    await queryInterface.addColumn('ExchangeOrders', 'originalAmount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '원래 주문 금액 (부분 매칭 추적용)'
    });

    await queryInterface.addColumn('ExchangeOrders', 'remainingAmount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '남은 미체결 금액'
    });

    await queryInterface.addColumn('ExchangeOrders', 'filledAmount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '체결된 금액'
    });

    await queryInterface.addColumn('ExchangeOrders', 'partiallyFilled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '부분 체결 여부'
    });

    // 기존 데이터 업데이트: originalAmount와 remainingAmount 초기화
    await queryInterface.sequelize.query(`
      UPDATE "ExchangeOrders" 
      SET 
        "originalAmount" = "amount",
        "remainingAmount" = CASE 
          WHEN status = 'matched' THEN 0 
          ELSE "amount" 
        END,
        "filledAmount" = CASE 
          WHEN status = 'matched' THEN "amount" 
          ELSE 0 
        END,
        "partiallyFilled" = false
    `);

    // 인덱스 추가 (부분 매칭 성능 최적화)
    await queryInterface.addIndex('ExchangeOrders', ['gameId', 'market', 'line', 'price', 'side', 'status', 'remainingAmount'], {
      name: 'idx_exchange_orders_partial_matching'
    });
  },

  async down(queryInterface, Sequelize) {
    // 인덱스 제거
    await queryInterface.removeIndex('ExchangeOrders', 'idx_exchange_orders_partial_matching');
    
    // 컬럼 제거
    await queryInterface.removeColumn('ExchangeOrders', 'partiallyFilled');
    await queryInterface.removeColumn('ExchangeOrders', 'filledAmount');
    await queryInterface.removeColumn('ExchangeOrders', 'remainingAmount');
    await queryInterface.removeColumn('ExchangeOrders', 'originalAmount');
  }
};