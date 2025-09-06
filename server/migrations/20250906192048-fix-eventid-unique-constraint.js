'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. 기존 eventId 유니크 제약조건 제거
    await queryInterface.removeIndex('GameResults', 'unique_event_id');
    
    // 2. eventId 컬럼에서 unique 속성 제거
    await queryInterface.changeColumn('GameResults', 'eventId', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: false
    });
    
    // 3. 새로운 복합 유니크 인덱스 생성 (eventId + sportKey)
    await queryInterface.addIndex('GameResults', {
      fields: ['eventId', 'sportKey'],
      unique: true,
      name: 'unique_event_id_per_sport',
      where: {
        eventId: {
          [Sequelize.Op.ne]: null
        }
      }
    });
    
    console.log('✅ eventId 유니크 제약조건을 sportKey와 결합된 복합 제약조건으로 변경 완료');
  },

  async down (queryInterface, Sequelize) {
    // 1. 복합 유니크 인덱스 제거
    await queryInterface.removeIndex('GameResults', 'unique_event_id_per_sport');
    
    // 2. 기존 eventId 유니크 제약조건 복원
    await queryInterface.changeColumn('GameResults', 'eventId', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
    
    // 3. 기존 유니크 인덱스 복원
    await queryInterface.addIndex('GameResults', {
      fields: ['eventId'],
      unique: true,
      name: 'unique_event_id'
    });
    
    console.log('✅ eventId 유니크 제약조건을 원래 상태로 복원 완료');
  }
};
