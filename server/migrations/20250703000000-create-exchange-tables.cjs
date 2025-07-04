'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. ExchangeBalances 테이블 생성
      await queryInterface.createTable('ExchangeBalances', {
        userId: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        balance: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Exchange 잔고 (원 단위)'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });

      // 2. ExchangeOrders 테이블 생성
      await queryInterface.createTable('ExchangeOrders', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        gameId: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: '경기 ID (TheSportsDB ID)'
        },
        market: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: '마켓 타입 (h2h, spreads, totals 등)'
        },
        line: {
          type: Sequelize.FLOAT,
          allowNull: false,
          comment: '핸디캡 라인 또는 토탈 라인'
        },
        side: {
          type: Sequelize.ENUM('back', 'lay'),
          allowNull: false,
          comment: 'Back: 베팅, Lay: 레이'
        },
        price: {
          type: Sequelize.FLOAT,
          allowNull: false,
          comment: '배당률'
        },
        amount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: '베팅 금액 (원 단위)'
        },
        status: {
          type: Sequelize.ENUM('open', 'matched', 'settled', 'cancelled'),
          allowNull: false,
          defaultValue: 'open',
          comment: '주문 상태'
        },
        matchedOrderId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'ExchangeOrders',
            key: 'id'
          },
          comment: '매칭된 상대 주문 ID'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });

      // 3. 인덱스 생성
      await queryInterface.addIndex('ExchangeBalances', ['userId'], { transaction });
      
      await queryInterface.addIndex('ExchangeOrders', ['userId'], { transaction });
      await queryInterface.addIndex('ExchangeOrders', ['gameId', 'market', 'line'], { transaction });
      await queryInterface.addIndex('ExchangeOrders', ['status'], { transaction });
      await queryInterface.addIndex('ExchangeOrders', ['createdAt'], { transaction });
      await queryInterface.addIndex('ExchangeOrders', ['matchedOrderId'], { transaction });

      await transaction.commit();
      console.log('✅ Exchange tables created successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating exchange tables:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.dropTable('ExchangeOrders', { transaction });
      await queryInterface.dropTable('ExchangeBalances', { transaction });
      
      await transaction.commit();
      console.log('✅ Exchange tables dropped successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error dropping exchange tables:', error);
      throw error;
    }
  }
}; 