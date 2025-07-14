import sequelize from './models/sequelize.js';

async function cancelAndRefundOrder() {
  try {
    console.log('=== 주문 취소 및 환불 시작 ===\n');
    
    // 1. 매칭되지 않은 주문 확인
    const [unmatchedOrders] = await sequelize.query(`
      SELECT eo.*, u.username, u.balance
      FROM "ExchangeOrders" eo
      JOIN "Users" u ON eo."userId" = u.id
      WHERE eo.status = 'matched' AND eo."matchedOrderId" IS NULL
    `);
    
    console.log('매칭되지 않은 주문 수:', unmatchedOrders.length);
    
    if (unmatchedOrders.length === 0) {
      console.log('취소할 주문이 없습니다.');
      return;
    }
    
    for (const order of unmatchedOrders) {
      console.log(`\n주문 ID: ${order.id}`);
      console.log(`사용자: ${order.username}`);
      console.log(`경기: ${order.homeTeam} vs ${order.awayTeam}`);
      console.log(`사이드: ${order.side}`);
      console.log(`금액: ${order.amount}원`);
      console.log(`스테이크: ${order.stakeAmount}원`);
      
      const transaction = await sequelize.transaction();
      
      try {
        // 2. 주문 상태를 cancelled로 변경
        await sequelize.query(`
          UPDATE "ExchangeOrders"
          SET status = 'cancelled', "updatedAt" = NOW()
          WHERE id = :orderId
        `, {
          replacements: { orderId: order.id },
          transaction
        });
        
        // 3. 사용자 잔고 환불
        const refundAmount = order.side === 'back' ? order.amount : order.stakeAmount;
        await sequelize.query(`
          UPDATE "Users"
          SET balance = balance + :refundAmount, "updatedAt" = NOW()
          WHERE id = :userId
        `, {
          replacements: { 
            refundAmount,
            userId: order.userId
          },
          transaction
        });
        
        // 4. 환불 내역 기록
        await sequelize.query(`
          INSERT INTO "PaymentHistories" (
            "userId", "type", "amount", "description", "referenceId", "createdAt", "updatedAt"
          ) VALUES (
            :userId, 'refund', :amount, :description, :referenceId, NOW(), NOW()
          )
        `, {
          replacements: {
            userId: order.userId,
            amount: refundAmount,
            description: `매칭되지 않은 주문 취소 환불 (주문 ID: ${order.id})`,
            referenceId: order.id
          },
          transaction
        });
        
        await transaction.commit();
        
        console.log(`✅ 주문 취소 및 환불 완료`);
        console.log(`  환불 금액: ${refundAmount}원`);
        
        // 5. 환불 후 잔고 확인
        const [updatedUser] = await sequelize.query(`
          SELECT balance FROM "Users" WHERE id = :userId
        `, {
          replacements: { userId: order.userId }
        });
        
        console.log(`  새로운 잔고: ${updatedUser[0].balance}원`);
        
      } catch (error) {
        await transaction.rollback();
        console.error(`❌ 주문 ${order.id} 취소 실패:`, error);
      }
    }
    
    // 6. 최종 상태 확인
    const [finalStatus] = await sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM "ExchangeOrders"
      GROUP BY status
    `);
    
    console.log('\n최종 주문 상태:');
    finalStatus.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count}개`);
    });
    
    console.log('\n=== 주문 취소 및 환불 완료 ===');
    
  } catch (error) {
    console.error('주문 취소 및 환불 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

cancelAndRefundOrder(); 