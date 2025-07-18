'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Creating missing tables for Render database...');
      
      // 1. SequelizeMeta 테이블 생성 (마이그레이션 추적용)
      await queryInterface.createTable('SequelizeMeta', {
        name: {
          type: Sequelize.STRING,
          primaryKey: true,
          allowNull: false
        }
      }, { transaction });
      console.log('✅ Created SequelizeMeta table');
      
      // 2. AdminCommissions 테이블 생성
      await queryInterface.createTable('AdminCommissions', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        adminId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        betId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Bets',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        betAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        winAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0
        },
        commissionRate: {
          type: Sequelize.DECIMAL(5, 4),
          allowNull: false
        },
        commissionAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        status: {
          type: Sequelize.ENUM('pending', 'paid', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending'
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
        },
        paidAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });
      console.log('✅ Created AdminCommissions table');
      
      // 3. ReferralCodes 테이블 생성
      await queryInterface.createTable('ReferralCodes', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        adminId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        code: {
          type: Sequelize.STRING(20),
          allowNull: false,
          unique: true
        },
        commissionRate: {
          type: Sequelize.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0.05
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        maxUsers: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        currentUsers: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: true
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
      console.log('✅ Created ReferralCodes table');
      
      // 4. PaymentHistories 테이블 생성
      await queryInterface.createTable('PaymentHistories', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        betId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Bets',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        type: {
          type: Sequelize.ENUM('win', 'refund', 'commission', 'adjustment'),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('pending', 'paid', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending'
        },
        memo: {
          type: Sequelize.TEXT,
          allowNull: true
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
        },
        paidAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });
      console.log('✅ Created PaymentHistories table');
      
      // 5. OddsHistories 테이블 생성
      await queryInterface.createTable('OddsHistories', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
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
        snapshotTime: {
          type: Sequelize.DATE,
          allowNull: false
        },
        bookmakers: {
          type: Sequelize.JSONB,
          allowNull: false
        },
        officialOdds: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });
      console.log('✅ Created OddsHistories table');
      
      // 6. 인덱스 생성
      try {
        await queryInterface.addIndex('AdminCommissions', ['adminId'], { transaction });
        await queryInterface.addIndex('AdminCommissions', ['userId'], { transaction });
        await queryInterface.addIndex('AdminCommissions', ['betId'], { transaction });
        await queryInterface.addIndex('AdminCommissions', ['status'], { transaction });
        console.log('✅ Created AdminCommissions indexes');
      } catch (error) {
        console.log('⚠️ AdminCommissions indexes might already exist:', error.message);
      }
      
      try {
        await queryInterface.addIndex('ReferralCodes', ['adminId'], { transaction });
        await queryInterface.addIndex('ReferralCodes', ['code'], { transaction });
        await queryInterface.addIndex('ReferralCodes', ['isActive'], { transaction });
        console.log('✅ Created ReferralCodes indexes');
      } catch (error) {
        console.log('⚠️ ReferralCodes indexes might already exist:', error.message);
      }
      
      try {
        await queryInterface.addIndex('PaymentHistories', ['userId'], { transaction });
        await queryInterface.addIndex('PaymentHistories', ['betId'], { transaction });
        await queryInterface.addIndex('PaymentHistories', ['status'], { transaction });
        console.log('✅ Created PaymentHistories indexes');
      } catch (error) {
        console.log('⚠️ PaymentHistories indexes might already exist:', error.message);
      }
      
      try {
        await queryInterface.addIndex('OddsHistories', ['oddsCacheId'], { transaction });
        await queryInterface.addIndex('OddsHistories', ['homeTeam', 'awayTeam', 'snapshotTime'], { 
          name: 'odds_histories_home_team_away_team_snapshot_time',
          transaction 
        });
        console.log('✅ Created OddsHistories indexes');
      } catch (error) {
        console.log('⚠️ OddsHistories indexes might already exist:', error.message);
      }
      
      await transaction.commit();
      console.log('🎉 All missing tables created successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating missing tables:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 테이블 삭제 (역순)
      await queryInterface.dropTable('OddsHistories', { transaction });
      await queryInterface.dropTable('PaymentHistories', { transaction });
      await queryInterface.dropTable('ReferralCodes', { transaction });
      await queryInterface.dropTable('AdminCommissions', { transaction });
      await queryInterface.dropTable('SequelizeMeta', { transaction });
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}; 