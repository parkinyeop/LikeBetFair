import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../models/sequelize.js';
import User from '../models/userModel.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import ExchangeOrderMatch from '../models/exchangeOrderMatchModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import Bet from '../models/betModel.js';

console.log('=== 테스트 계정 초기화 ===\n');

const TEST_EMAILS = [
  'b1@bbb.com',
  'b2@bbb.com',
  'b3@bbb.com',
  'b4@bbb.com',
  'b5@bbb.com'
];

async function resetTestAccounts() {
  const transaction = await sequelize.transaction();

  try {
    console.log('📋 초기화 대상 계정:', TEST_EMAILS.join(', '));
    console.log('');

    // 1. 사용자 조회
    const users = await User.findAll({
      where: {
        email: {
          [sequelize.Sequelize.Op.in]: TEST_EMAILS
        }
      },
      transaction
    });

    if (users.length === 0) {
      console.log('⚠️  해당 이메일의 사용자를 찾을 수 없습니다.');
      await transaction.commit();
      return;
    }

    console.log(`✅ ${users.length}개 계정 발견\n`);

    const userIds = users.map(u => u.id);

    // 각 계정별 초기화
    for (const user of users) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`👤 계정: ${user.email} (${user.id})`);
      console.log(`${'='.repeat(60)}\n`);

      // 2. Exchange Orders 조회
      const exchangeOrders = await ExchangeOrder.findAll({
        where: { userId: user.id },
        transaction
      });

      console.log(`📊 Exchange 주문: ${exchangeOrders.length}개`);

      if (exchangeOrders.length > 0) {
        const orderIds = exchangeOrders.map(o => o.id);

        // 2-1. ExchangeOrderMatch 삭제
        const deletedMatches = await ExchangeOrderMatch.destroy({
          where: {
            [sequelize.Sequelize.Op.or]: [
              { originalOrderId: { [sequelize.Sequelize.Op.in]: orderIds } },
              { matchingOrderId: { [sequelize.Sequelize.Op.in]: orderIds } }
            ]
          },
          transaction
        });
        console.log(`   - ExchangeOrderMatch 삭제: ${deletedMatches}개`);

        // 2-2. 모든 ExchangeOrder의 matchedOrderId NULL 설정 (레거시 필드, 외래키 제약 해제)
        // 다른 사용자의 주문이 이 사용자의 주문을 참조할 수 있으므로 전체 테이블 업데이트
        await sequelize.query(
          `UPDATE "ExchangeOrders" SET "matchedOrderId" = NULL WHERE "matchedOrderId" IN (${orderIds.join(',')})`,
          { transaction }
        );
        await ExchangeOrder.update(
          { matchedOrderId: null },
          {
            where: { userId: user.id },
            transaction
          }
        );
        console.log(`   - matchedOrderId NULL 설정 완료`);

        // 2-3. ExchangeOrder 삭제
        const deletedOrders = await ExchangeOrder.destroy({
          where: { userId: user.id },
          transaction
        });
        console.log(`   - ExchangeOrder 삭제: ${deletedOrders}개`);
      }

      // 3. Bets 조회 및 삭제
      const bets = await Bet.findAll({
        where: { userId: user.id },
        transaction
      });

      console.log(`📊 스포츠북 베팅: ${bets.length}개`);

      if (bets.length > 0) {
        const deletedBets = await Bet.destroy({
          where: { userId: user.id },
          transaction
        });
        console.log(`   - Bet 삭제: ${deletedBets}개`);
      }

      // 4. PaymentHistory 조회
      const payments = await PaymentHistory.findAll({
        where: { userId: user.id },
        transaction
      });

      console.log(`💰 PaymentHistory: ${payments.length}개`);

      if (payments.length > 0) {
        // 총 금액 계산
        const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        console.log(`   - 총 거래 금액: ${totalAmount.toLocaleString()}원`);

        // PaymentHistory 삭제
        const deletedPayments = await PaymentHistory.destroy({
          where: { userId: user.id },
          transaction
        });
        console.log(`   - PaymentHistory 삭제: ${deletedPayments}개`);
      }

      // 5. 잔액 초기화 (100,000,000원)
      const INITIAL_BALANCE = 100000000;
      const oldBalance = parseFloat(user.balance);

      await user.update({
        balance: INITIAL_BALANCE
      }, { transaction });

      console.log(`💵 잔액 초기화: ${oldBalance.toLocaleString()} → ${INITIAL_BALANCE.toLocaleString()}원`);
    }

    await transaction.commit();

    console.log('\n\n' + '='.repeat(60));
    console.log('✅ 초기화 완료!');
    console.log('='.repeat(60));
    console.log('\n📊 초기화 요약:');
    console.log(`   - 계정 수: ${users.length}개`);
    console.log(`   - 모든 Exchange 주문 삭제`);
    console.log(`   - 모든 스포츠북 베팅 삭제`);
    console.log(`   - 모든 PaymentHistory 삭제`);
    console.log(`   - 잔액 초기화: 100,000,000원\n`);

  } catch (error) {
    await transaction.rollback();
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

resetTestAccounts();
