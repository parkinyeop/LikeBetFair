const { sequelize, ExchangeOrder, ExchangeOrderMatch, PaymentHistory, User, Bet } = require('../models');
const { Op } = require('sequelize');

async function resetB6789Accounts() {
  try {
    console.log('🔄 b6 ,b7, b8, b9 계정 전체 초기화 시작...');

    //const usernames = ['b6','b7', 'b8', 'b9'];
    const usernames = ['b1','b2','b3'];
    const userIds = (await User.findAll({
      where: { username: { [Op.in]: usernames } },
      attributes: ['id', 'username']
    })).map(u => u.id);

    console.log('\n📊 현재 계정 상태:');
    const currentUsers = await sequelize.query(`
      SELECT u.username, u.balance
      FROM "Users" u
      WHERE u.username IN (${usernames.map(n => `'${n}'`).join(', ')})
      ORDER BY u.username
    `, { type: sequelize.QueryTypes.SELECT });
    
    currentUsers.forEach(user => {
      console.log(`  ${user.username}: ${parseFloat(user.balance).toLocaleString()}원`);
    });
    
    // 2. 모든 매칭 삭제
    console.log('\n🔄 모든 매칭 삭제...');
    const deletedMatches = await sequelize.query(`
      DELETE FROM "ExchangeOrderMatches"
      WHERE "originalOrderId" IN (
        SELECT id FROM "ExchangeOrders" 
        WHERE "userId" IN (SELECT id FROM "Users" WHERE username IN (${usernames.map(n => `'${n}'`).join(', ')}))
      ) OR "matchingOrderId" IN (
        SELECT id FROM "ExchangeOrders" 
        WHERE "userId" IN (SELECT id FROM "Users" WHERE username IN (${usernames.map(n => `'${n}'`).join(', ')}))
      )
      RETURNING id
    `, { type: sequelize.QueryTypes.SELECT });
    console.log(`✅ ${deletedMatches.length}개 매칭 삭제 완료`);
    
    // 2-1. 자기참조 FK(matchedOrderId) 참조 끊기
    console.log('\n🔗 matchedOrderId 참조 끊기...');
    const detachedRefs = await sequelize.query(`
      UPDATE "ExchangeOrders"
      SET "matchedOrderId" = NULL
      WHERE "matchedOrderId" IN (
        SELECT id FROM "ExchangeOrders"
        WHERE "userId" IN (
          SELECT id FROM "Users" WHERE username IN (${usernames.map(n => `'${n}'`).join(', ')})
        )
      )
      RETURNING id
    `, { type: sequelize.QueryTypes.UPDATE });
    console.log(`✅ matchedOrderId 참조 해제 완료`);
    
    // 3. 모든 익스체인지 주문 삭제
    console.log('\n🔄 모든 익스체인지 주문 삭제...');
    const deletedOrders = await sequelize.query(`
      DELETE FROM "ExchangeOrders" 
      WHERE "userId" IN (
        SELECT id FROM "Users" WHERE username IN (${usernames.map(n => `'${n}'`).join(', ')})
      )
      RETURNING id
    `, { type: sequelize.QueryTypes.SELECT });
    console.log(`✅ ${deletedOrders.length}개 익스체인지 주문 삭제 완료`);
    
    // 4. 스포츠북 베팅 삭제
    console.log('\n🔄 스포츠북 베팅 삭제...');
    
    // 스포츠북 베팅 조회
    const bets = await sequelize.query(`
      SELECT b.id, u.username, b.status
      FROM "Bets" b
      JOIN "Users" u ON b."userId" = u.id
      WHERE u.username IN (${usernames.map(n => `'${n}'`).join(', ')})
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`📋 스포츠북 베팅: ${bets.length}개`);
    
    // 베팅별 개수 요약
    const betSummary = {};
    bets.forEach(b => {
      if (!betSummary[b.username]) betSummary[b.username] = 0;
      betSummary[b.username]++;
    });
    Object.entries(betSummary).forEach(([username, count]) => {
      console.log(`  ${username}: ${count}개`);
    });
    
    // 베팅 삭제 처리
    if (bets.length > 0) {
      await sequelize.query(`
        DELETE FROM "Bets"
        WHERE "userId" IN (
          SELECT id FROM "Users" WHERE username IN (${usernames.map(n => `'${n}'`).join(', ')})
        )
      `);
      console.log(`✅ ${bets.length}개 베팅 삭제 완료`);
    }
    
    // 5. 모든 결제 내역 삭제
    console.log('\n🔄 모든 결제 내역 삭제...');
    
    // 먼저 삭제할 결제 내역 확인
    const paymentsToDelete = await sequelize.query(`
      SELECT ph.id, u.username, ph.amount, ph.memo
      FROM "PaymentHistories" ph
      JOIN "Users" u ON ph."userId" = u.id
      WHERE u.username IN (${usernames.map(n => `'${n}'`).join(', ')})
      ORDER BY ph."createdAt" DESC
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`📋 삭제할 결제 내역: ${paymentsToDelete.length}개`);
    const paymentSummary = {};
    paymentsToDelete.forEach(p => {
      if (!paymentSummary[p.username]) paymentSummary[p.username] = 0;
      paymentSummary[p.username]++;
    });
    Object.entries(paymentSummary).forEach(([username, count]) => {
      console.log(`  ${username}: ${count}개`);
    });
    
    const deletedPayments = await sequelize.query(`
      DELETE FROM "PaymentHistories"
      WHERE "userId" IN (
        SELECT id FROM "Users" WHERE username IN (${usernames.map(n => `'${n}'`).join(', ')})
      )
      RETURNING id
    `, { type: sequelize.QueryTypes.SELECT });
    console.log(`✅ ${deletedPayments.length}개 결제 내역 삭제 완료`);

    // 6. 계정별 잔액 초기화
    console.log('\n🔄 계정별 잔액 초기화...');
    
    for (const username of usernames) {
      await sequelize.query(`
        UPDATE "Users"
        SET balance = 100000000
        WHERE username = :username
      `, {
        replacements: { username },
        type: sequelize.QueryTypes.UPDATE
      });
      console.log(`✅ ${username}: 100,000,000원`);
    }

    // 7. 최종 상태 확인
    console.log('\n📊 초기화 후 최종 상태:');
    const finalUsers = await sequelize.query(`
      SELECT u.username, u.balance
      FROM "Users" u
      WHERE u.username IN (${usernames.map(n => `'${n}'`).join(', ')})
      ORDER BY u.username
    `, { type: sequelize.QueryTypes.SELECT });
    
    let finalTotal = 0;
    finalUsers.forEach(user => {
      const balance = parseFloat(user.balance);
      finalTotal += balance;
      console.log(`  ${user.username}: ${balance.toLocaleString()}원`);
    });
    console.log(`  합계: ${finalTotal.toLocaleString()}원`);
    
    console.log('\n🎉 b6, b7, b8, b9 계정 전체 초기화 완료!');
    console.log('💰 모든 계정 잔액: 100,000,000원');
    console.log('📋 모든 익스체인지 주문: 완전 삭제');
    console.log('🎲 모든 스포츠북 베팅: 완전 삭제');
    console.log('🔗 모든 매칭: 완전 삭제');
    console.log('💳 모든 결제 내역: 삭제 완료');
    
  } catch (error) {
    console.error('❌ 초기화 실패:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  resetB6789Accounts();
}

module.exports = { resetB6789Accounts };

