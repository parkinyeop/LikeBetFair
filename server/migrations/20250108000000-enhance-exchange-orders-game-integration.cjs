'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 ExchangeOrders 게임 연동 필드 추가 시작...');
      
      // 1. 게임 정보 필드 추가
      await queryInterface.addColumn('ExchangeOrders', 'homeTeam', {
        type: Sequelize.STRING,
        allowNull: true, // 기존 데이터 호환성을 위해 nullable
        comment: '홈팀명'
      }, { transaction });
      
      await queryInterface.addColumn('ExchangeOrders', 'awayTeam', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: '어웨이팀명'
      }, { transaction });
      
      await queryInterface.addColumn('ExchangeOrders', 'commenceTime', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '경기 시작 시간'
      }, { transaction });
      
      await queryInterface.addColumn('ExchangeOrders', 'sportKey', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: '스포츠 종목 키 (예: baseball_kbo, soccer_k_league)'
      }, { transaction });
      
      // 2. GameResults 참조 필드 추가 (선택적)
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
      
      // 3. selection 필드를 JSON 구조로 확장하기 위한 새 필드 추가
      await queryInterface.addColumn('ExchangeOrders', 'selectionDetails', {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: '베팅 선택 상세 정보 (팀명, 마켓타입, 라인값 등)'
      }, { transaction });
      
      // 4. 자동 정산을 위한 필드 추가
      await queryInterface.addColumn('ExchangeOrders', 'autoSettlement', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '자동 정산 여부'
      }, { transaction });
      
      await queryInterface.addColumn('ExchangeOrders', 'settlementNote', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '정산 관련 메모'
      }, { transaction });
      
      // 5. 인덱스 추가
      await queryInterface.addIndex('ExchangeOrders', ['homeTeam', 'awayTeam'], { transaction });
      await queryInterface.addIndex('ExchangeOrders', ['commenceTime'], { transaction });
      await queryInterface.addIndex('ExchangeOrders', ['sportKey'], { transaction });
      await queryInterface.addIndex('ExchangeOrders', ['gameResultId'], { transaction });
      await queryInterface.addIndex('ExchangeOrders', ['autoSettlement'], { transaction });
      
      await transaction.commit();
      console.log('✅ ExchangeOrders 게임 연동 필드 추가 완료');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ ExchangeOrders 게임 연동 필드 추가 실패:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 인덱스 제거
      await queryInterface.removeIndex('ExchangeOrders', ['autoSettlement'], { transaction });
      await queryInterface.removeIndex('ExchangeOrders', ['gameResultId'], { transaction });
      await queryInterface.removeIndex('ExchangeOrders', ['sportKey'], { transaction });
      await queryInterface.removeIndex('ExchangeOrders', ['commenceTime'], { transaction });
      await queryInterface.removeIndex('ExchangeOrders', ['homeTeam', 'awayTeam'], { transaction });
      
      // 컬럼 제거
      await queryInterface.removeColumn('ExchangeOrders', 'settlementNote', { transaction });
      await queryInterface.removeColumn('ExchangeOrders', 'autoSettlement', { transaction });
      await queryInterface.removeColumn('ExchangeOrders', 'selectionDetails', { transaction });
      await queryInterface.removeColumn('ExchangeOrders', 'gameResultId', { transaction });
      await queryInterface.removeColumn('ExchangeOrders', 'sportKey', { transaction });
      await queryInterface.removeColumn('ExchangeOrders', 'commenceTime', { transaction });
      await queryInterface.removeColumn('ExchangeOrders', 'awayTeam', { transaction });
      await queryInterface.removeColumn('ExchangeOrders', 'homeTeam', { transaction });
      
      await transaction.commit();
      console.log('✅ ExchangeOrders 게임 연동 필드 제거 완료');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ ExchangeOrders 게임 연동 필드 제거 실패:', error);
      throw error;
    }
  }
}; 