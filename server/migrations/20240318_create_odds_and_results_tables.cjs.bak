'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // OddsCache 테이블 생성
    await queryInterface.createTable('OddsCaches', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      mainCategory: {
        type: Sequelize.STRING,
        allowNull: false
      },
      subCategory: {
        type: Sequelize.STRING,
        allowNull: false
      },
      sportKey: {
        type: Sequelize.STRING,
        allowNull: false
      },
      sportTitle: {
        type: Sequelize.STRING,
        allowNull: false
      },
      commenceTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      homeTeam: {
        type: Sequelize.STRING,
        allowNull: false
      },
      awayTeam: {
        type: Sequelize.STRING,
        allowNull: false
      },
      bookmakers: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      lastUpdated: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // GameResults 테이블 생성
    await queryInterface.createTable('GameResults', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      eventId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      mainCategory: {
        type: Sequelize.STRING,
        allowNull: false
      },
      subCategory: {
        type: Sequelize.STRING,
        allowNull: false
      },
      homeTeam: {
        type: Sequelize.STRING,
        allowNull: false
      },
      awayTeam: {
        type: Sequelize.STRING,
        allowNull: false
      },
      commenceTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'live', 'finished', 'cancelled'),
        defaultValue: 'scheduled'
      },
      score: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null
      },
      result: {
        type: Sequelize.ENUM('home_win', 'away_win', 'draw', 'cancelled', 'pending'),
        defaultValue: 'pending'
      },
      lastUpdated: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // 인덱스 생성
    await queryInterface.addIndex('OddsCaches', ['mainCategory', 'subCategory']);
    await queryInterface.addIndex('OddsCaches', ['commenceTime']);
    await queryInterface.addIndex('OddsCaches', ['lastUpdated']);

    await queryInterface.addIndex('GameResults', ['mainCategory', 'subCategory']);
    await queryInterface.addIndex('GameResults', ['commenceTime']);
    await queryInterface.addIndex('GameResults', ['status']);
    await queryInterface.addIndex('GameResults', ['result']);
  },

  down: async (queryInterface, Sequelize) => {
    // 테이블 삭제
    await queryInterface.dropTable('OddsCaches');
    await queryInterface.dropTable('GameResults');
  }
}; 