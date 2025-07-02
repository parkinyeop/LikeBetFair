'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('OddsHistories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      oddsCacheId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'OddsCaches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      marketType: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'h2h'
      },
      outcomeName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      outcomePoint: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      oddsValue: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: false
      },
      bookmakerName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      snapshotTime: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: '베팅 시점 검증용 스냅샷 시간'
      }
    });

    // 핵심 인덱스만 생성
    await queryInterface.addIndex('OddsHistories', ['homeTeam', 'awayTeam', 'snapshotTime']);
    await queryInterface.addIndex('OddsHistories', ['snapshotTime']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('OddsHistories');
  }
}; 