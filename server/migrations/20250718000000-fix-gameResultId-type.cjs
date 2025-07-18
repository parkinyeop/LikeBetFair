'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 gameResultId 필드 타입 수정 시작...');
      
      // 1. 기존 gameResultId 컬럼 제거
      try {
        await queryInterface.removeColumn('ExchangeOrders', 'gameResultId', { transaction });
        console.log('✅ 기존 gameResultId 컬럼 제거 완료');
      } catch (error) {
        console.log('⚠️ gameResultId 컬럼이 존재하지 않거나 이미 제거됨:', error.message);
      }
      
      // 2. 올바른 타입으로 gameResultId 컬럼 추가
      await queryInterface.addColumn('ExchangeOrders', 'gameResultId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'GameResults',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'GameResults 테이블 참조 (자동 정산용)'
      }, { transaction });
      
      // 3. 인덱스 추가
      await queryInterface.addIndex('ExchangeOrders', ['gameResultId'], { transaction });
      
      await transaction.commit();
      console.log('✅ gameResultId 필드 타입 수정 완료');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ gameResultId 필드 타입 수정 실패:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 인덱스 제거
      await queryInterface.removeIndex('ExchangeOrders', ['gameResultId'], { transaction });
      
      // 컬럼 제거
      await queryInterface.removeColumn('ExchangeOrders', 'gameResultId', { transaction });
      
      await transaction.commit();
      console.log('✅ gameResultId 필드 롤백 완료');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ gameResultId 필드 롤백 실패:', error);
      throw error;
    }
  }
}; 