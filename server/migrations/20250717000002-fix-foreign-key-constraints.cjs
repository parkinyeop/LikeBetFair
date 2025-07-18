'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Fixing foreign key constraints...');
      
      // 1. AdminCommissions 테이블의 외래키 제약조건 제거
      try {
        await queryInterface.removeConstraint('AdminCommissions', 'AdminCommissions_betId_fkey', { transaction });
        console.log('✅ Removed AdminCommissions_betId_fkey constraint');
      } catch (error) {
        console.log('⚠️ AdminCommissions_betId_fkey constraint might not exist:', error.message);
      }
      
      // 2. Bets 테이블 삭제
      await queryInterface.dropTable('Bets', { transaction });
      console.log('✅ Dropped Bets table');
      
      // 3. 새로운 Bets 테이블 생성 (UUID id)
      await queryInterface.createTable('Bets', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          }
        },
        selection: {
          type: Sequelize.JSONB,
          allowNull: false
        },
        stake: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        odds: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        potentialWinnings: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('pending', 'won', 'lost', 'cancelled'),
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
        }
      }, { transaction });
      
      console.log('✅ Created new Bets table with UUID id');
      
      // 4. AdminCommissions 테이블의 betId 컬럼 타입을 UUID로 변경
      try {
        await queryInterface.changeColumn('AdminCommissions', 'betId', {
          type: Sequelize.UUID,
          allowNull: false
        }, { transaction });
        console.log('✅ Changed AdminCommissions.betId to UUID type');
      } catch (error) {
        console.log('⚠️ Could not change AdminCommissions.betId:', error.message);
      }
      
      // 5. AdminCommissions 테이블에 외래키 제약조건 다시 추가
      try {
        await queryInterface.addConstraint('AdminCommissions', {
          fields: ['betId'],
          type: 'foreign key',
          name: 'AdminCommissions_betId_fkey',
          references: {
            table: 'Bets',
            field: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        }, { transaction });
        console.log('✅ Added AdminCommissions_betId_fkey constraint');
      } catch (error) {
        console.log('⚠️ Could not add AdminCommissions_betId_fkey constraint:', error.message);
      }
      
      await transaction.commit();
      console.log('🎉 Foreign key constraints fixed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error fixing foreign key constraints:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 롤백: Bets 테이블을 다시 INTEGER id로 생성
      await queryInterface.dropTable('Bets', { transaction });
      
      await queryInterface.createTable('Bets', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          }
        },
        selection: {
          type: Sequelize.JSONB,
          allowNull: false
        },
        stake: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        odds: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        potentialWinnings: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('pending', 'won', 'lost', 'cancelled'),
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
        }
      }, { transaction });
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}; 