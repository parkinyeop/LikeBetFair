'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

// DB 연결 직접 생성
const sequelize = new Sequelize(
  process.env.DB_NAME || 'bettingDB',
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const t = await sequelize.transaction();
    try {
      console.log('Creating basic tables...');

      // OddsCaches 테이블 생성
      await queryInterface.createTable('OddsCaches', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        sportKey: {
          type: DataTypes.STRING,
          allowNull: false
        },
        sportTitle: {
          type: DataTypes.STRING,
          allowNull: false
        },
        commenceTime: {
          type: DataTypes.DATE,
          allowNull: false
        },
        homeTeam: {
          type: DataTypes.STRING,
          allowNull: false
        },
        awayTeam: {
          type: DataTypes.STRING,
          allowNull: false
        },
        bookmakers: {
          type: DataTypes.JSONB,
          allowNull: false
        },
        mainCategory: {
          type: DataTypes.STRING,
          allowNull: false
        },
        subCategory: {
          type: DataTypes.STRING,
          allowNull: false
        },
        market: {
          type: DataTypes.STRING,
          allowNull: true
        },
        officialOdds: {
          type: DataTypes.JSONB,
          allowNull: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction: t });

      // GameResults 테이블 생성
      await queryInterface.createTable('GameResults', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        eventId: {
          type: DataTypes.STRING,
          allowNull: true
        },
        sportKey: {
          type: DataTypes.STRING,
          allowNull: false
        },
        sportTitle: {
          type: DataTypes.STRING,
          allowNull: false
        },
        commenceTime: {
          type: DataTypes.DATE,
          allowNull: false
        },
        homeTeam: {
          type: DataTypes.STRING,
          allowNull: false
        },
        awayTeam: {
          type: DataTypes.STRING,
          allowNull: false
        },
        score: {
          type: DataTypes.JSONB,
          allowNull: true
        },
        result: {
          type: DataTypes.ENUM('home_win', 'away_win', 'draw', 'cancelled', 'pending', 'postponed'),
          allowNull: false,
          defaultValue: 'pending'
        },
        lastUpdated: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        completed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        mainCategory: {
          type: DataTypes.STRING,
          allowNull: false
        },
        subCategory: {
          type: DataTypes.STRING,
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM('scheduled', 'live', 'finished', 'postponed', 'cancelled'),
          allowNull: false,
          defaultValue: 'scheduled'
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction: t });

      // Users 테이블 생성
      await queryInterface.createTable('Users', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        username: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
        },
        password: {
          type: DataTypes.STRING,
          allowNull: false
        },
        balance: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        isAdmin: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction: t });

      // Bets 테이블 생성
      await queryInterface.createTable('Bets', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          }
        },
        gameId: {
          type: DataTypes.STRING,
          allowNull: false
        },
        homeTeam: {
          type: DataTypes.STRING,
          allowNull: false
        },
        awayTeam: {
          type: DataTypes.STRING,
          allowNull: false
        },
        selection: {
          type: DataTypes.JSONB,
          allowNull: false
        },
        stake: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        potentialWinnings: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        odds: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM('pending', 'won', 'lost', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending'
        },
        result: {
          type: DataTypes.ENUM('pending', 'won', 'lost', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending'
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction: t });

      console.log('Committing transaction...');
      await t.commit();
      console.log('Basic tables created successfully');
    } catch (error) {
      console.error('Error creating basic tables:', error);
      await t.rollback();
      throw error;
    }
  },
  down: async (queryInterface, Sequelize) => {
    const t = await sequelize.transaction();
    try {
      await queryInterface.dropTable('Bets', { transaction: t });
      await queryInterface.dropTable('Users', { transaction: t });
      await queryInterface.dropTable('GameResults', { transaction: t });
      await queryInterface.dropTable('OddsCaches', { transaction: t });
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}; 