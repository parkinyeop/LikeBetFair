'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 기존 테이블 삭제 (데이터가 없으므로 안전)
    await queryInterface.dropTable('OddsCaches');
    
    // 새로운 스키마로 테이블 재생성
    await queryInterface.createTable('OddsCaches', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
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
      lastUpdated: {
        type: Sequelize.DATE,
        allowNull: false
      },
      odds: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      market: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'h2h'
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
    });

    // 인덱스 추가
    await queryInterface.addIndex('OddsCaches', ['mainCategory', 'subCategory']);
    await queryInterface.addIndex('OddsCaches', ['commenceTime']);
    await queryInterface.addIndex('OddsCaches', ['homeTeam', 'awayTeam']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('OddsCaches');
  }
}; 