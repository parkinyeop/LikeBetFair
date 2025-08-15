'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ExchangeOrderMatches 테이블 생성
    await queryInterface.createTable('ExchangeOrderMatches', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      originalOrderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ExchangeOrders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '원래 주문 ID (매칭 대상)'
      },
      matchingOrderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ExchangeOrders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '매칭하는 주문 ID'
      },
      matchedAmount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '실제 매칭된 금액'
      },
      matchedPrice: {
        type: Sequelize.FLOAT,
        allowNull: false,
        comment: '매칭된 배당률'
      },
      originalSide: {
        type: Sequelize.ENUM('back', 'lay'),
        allowNull: false,
        comment: '원래 주문의 side'
      },
      matchingSide: {
        type: Sequelize.ENUM('back', 'lay'),
        allowNull: false,
        comment: '매칭 주문의 side'
      },
      status: {
        type: Sequelize.ENUM('active', 'settled', 'cancelled'),
        allowNull: false,
        defaultValue: 'active',
        comment: '매칭 상태'
      },
      settledAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '정산 완료 시간'
      },
      settlementResult: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: '정산 결과 (승부, 수익/손실 등)'
      },
      gameId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: '게임 ID (조회 성능 최적화)'
      },
      market: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: '마켓 타입'
      },
      line: {
        type: Sequelize.FLOAT,
        allowNull: false,
        comment: '라인'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 인덱스 추가
    await queryInterface.addIndex('ExchangeOrderMatches', ['originalOrderId'], {
      name: 'idx_exchange_order_matches_original'
    });

    await queryInterface.addIndex('ExchangeOrderMatches', ['matchingOrderId'], {
      name: 'idx_exchange_order_matches_matching'
    });

    await queryInterface.addIndex('ExchangeOrderMatches', ['gameId', 'status'], {
      name: 'idx_exchange_order_matches_game_status'
    });

    await queryInterface.addIndex('ExchangeOrderMatches', ['status', 'settledAt'], {
      name: 'idx_exchange_order_matches_settlement'
    });
  },

  async down(queryInterface, Sequelize) {
    // 인덱스 제거
    await queryInterface.removeIndex('ExchangeOrderMatches', 'idx_exchange_order_matches_settlement');
    await queryInterface.removeIndex('ExchangeOrderMatches', 'idx_exchange_order_matches_game_status');
    await queryInterface.removeIndex('ExchangeOrderMatches', 'idx_exchange_order_matches_matching');
    await queryInterface.removeIndex('ExchangeOrderMatches', 'idx_exchange_order_matches_original');
    
    // 테이블 삭제
    await queryInterface.dropTable('ExchangeOrderMatches');
  }
};