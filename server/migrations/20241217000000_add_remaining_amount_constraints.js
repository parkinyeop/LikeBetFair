/**
 * 🛡️ ExchangeOrders 테이블 데이터 무결성 제약조건 추가
 * 
 * remainingAmount 관련 치명적 보안 취약점 방지
 * - remainingAmount >= 0 (음수 방지)
 * - remainingAmount <= amount (초과 방지)
 * - remainingAmount + filledAmount = amount (합계 검증)
 */

exports.up = async function(knex) {
  console.log('🔧 ExchangeOrders 데이터 무결성 제약조건 추가 중...');
  
  try {
    // 1. 기본 제약조건 추가
    await knex.schema.alterTable('ExchangeOrders', function(table) {
      // remainingAmount가 음수가 될 수 없도록 제약
      table.check('?? >= 0', ['remainingAmount'], 'check_remaining_amount_non_negative');
      
      // remainingAmount가 amount를 초과할 수 없도록 제약
      table.check('?? <= ??', ['remainingAmount', 'amount'], 'check_remaining_amount_not_exceed_amount');
      
      // filledAmount가 음수가 될 수 없도록 제약
      table.check('?? >= 0', ['filledAmount'], 'check_filled_amount_non_negative');
    });
    
    console.log('✅ ExchangeOrders 기본 제약조건 추가 완료');
    
    // 2. 복합 제약조건 추가 (더 엄격한 검증)
    await knex.schema.alterTable('ExchangeOrders', function(table) {
      // remainingAmount + filledAmount = amount (수학적 정확성)
      table.check('?? + ?? = ??', ['remainingAmount', 'filledAmount', 'amount'], 'check_amount_sum_equality');
    });
    
    console.log('✅ ExchangeOrders 복합 제약조건 추가 완료');
    
    // 3. 기존 데이터 검증 및 정리
    console.log('🔍 기존 데이터 무결성 검증 중...');
    
    const invalidOrders = await knex('ExchangeOrders')
      .where(function() {
        this.where('remainingAmount', '<', 0)
          .orWhere('remainingAmount', '>', knex.raw('amount'))
          .orWhere('filledAmount', '<', 0)
          .orWhereRaw('remainingAmount + filledAmount != amount');
      })
      .select('id', 'amount', 'remainingAmount', 'filledAmount');
    
    if (invalidOrders.length > 0) {
      console.log(`⚠️ ${invalidOrders.length}개의 무효한 주문 발견:`);
      invalidOrders.forEach(order => {
        console.log(`   주문 ID ${order.id}: amount=${order.amount}, remaining=${order.remainingAmount}, filled=${order.filledAmount}`);
      });
      
      // 자동 수정 시도
      for (const order of invalidOrders) {
        const correctRemaining = Math.max(0, Math.min(order.amount, order.remainingAmount || 0));
        const correctFilled = order.amount - correctRemaining;
        
        await knex('ExchangeOrders')
          .where('id', order.id)
          .update({
            remainingAmount: correctRemaining,
            filledAmount: correctFilled
          });
        
        console.log(`   ✅ 주문 ID ${order.id} 자동 수정 완료`);
      }
    } else {
      console.log('✅ 모든 기존 데이터가 무결성을 만족합니다');
    }
    
    console.log('🎉 ExchangeOrders 데이터 무결성 제약조건 설정 완료');
    
  } catch (error) {
    console.error('❌ 제약조건 추가 실패:', error.message);
    throw error;
  }
};

exports.down = async function(knex) {
  console.log('🔧 ExchangeOrders 데이터 무결성 제약조건 제거 중...');
  
  try {
    await knex.schema.alterTable('ExchangeOrders', function(table) {
      table.dropCheck('check_remaining_amount_non_negative');
      table.dropCheck('check_remaining_amount_not_exceed_amount');
      table.dropCheck('check_filled_amount_non_negative');
      table.dropCheck('check_amount_sum_equality');
    });
    
    console.log('✅ ExchangeOrders 제약조건 제거 완료');
    
  } catch (error) {
    console.error('❌ 제약조건 제거 실패:', error.message);
    throw error;
  }
};
