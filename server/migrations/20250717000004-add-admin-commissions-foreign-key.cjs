'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Adding AdminCommissions betId foreign key constraint...');
      
      // AdminCommissions 테이블에 betId 외래키 제약조건 추가
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
      
      console.log('✅ Added AdminCommissions betId foreign key constraint');
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error adding foreign key constraint:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 외래키 제약조건 제거
      await queryInterface.removeConstraint('AdminCommissions', 'AdminCommissions_betId_fkey', { transaction });
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}; 