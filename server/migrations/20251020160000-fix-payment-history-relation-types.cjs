'use strict';

/**
 * PaymentHistories의 relatedOrderId, relatedMatchId 타입을 UUID → INTEGER로 수정
 * ExchangeOrders.id, ExchangeOrderMatches.id가 INTEGER이므로 맞춰야 함
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 PaymentHistories 관계 필드 타입 수정 시작...');
    
    // 1. relatedOrderId를 INTEGER로 변경
    await queryInterface.changeColumn('PaymentHistories', 'relatedOrderId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ExchangeOrders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Exchange 주문 ID (INTEGER)'
    });
    
    console.log('✅ relatedOrderId 타입 변경 완료: UUID → INTEGER');
    
    // 2. relatedMatchId를 INTEGER로 변경
    await queryInterface.changeColumn('PaymentHistories', 'relatedMatchId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ExchangeOrderMatches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Exchange 매치 ID (INTEGER)'
    });
    
    console.log('✅ relatedMatchId 타입 변경 완료: UUID → INTEGER');
    console.log('🎉 마이그레이션 완료!');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 롤백: PaymentHistories 관계 필드 타입 복원...');
    
    // relatedOrderId를 UUID로 복원
    await queryInterface.changeColumn('PaymentHistories', 'relatedOrderId', {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'Exchange 주문 ID (UUID)'
    });
    
    // relatedMatchId를 UUID로 복원
    await queryInterface.changeColumn('PaymentHistories', 'relatedMatchId', {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'Exchange 매치 ID (UUID)'
    });
    
    console.log('✅ 롤백 완료');
  }
};

