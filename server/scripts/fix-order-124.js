import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../models/sequelize.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import ExchangeOrderMatch from '../models/exchangeOrderMatchModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import User from '../models/userModel.js';

console.log('=== 주문 #124 잘못된 정산 수정 ===\n');

async function fixOrder124() {
  const transaction = await sequelize.transaction();

  try {
    console.log('📋 주문 #124 선택:');
    console.log('  경기 1: Nottingham Forest vs Chelsea - Chelsea 선택 (실제: 0-3 Chelsea 승리) → won ✅');
    console.log('  경기 2: Zhejiang vs Shandong Luneng Taishan FC - Shandong Luneng Taishan FC 선택 → pending ⏳');
    console.log('\n❌ 문제: 두 번째 경기가 pending인데 정산되었음!');
    console.log('✅ 해결: 롤백하여 미정산 상태로 복원\n');

    const order = await ExchangeOrder.findByPk(124, { transaction });

    if (!order.settledAt) {
      console.log('✅ 주문 #124는 이미 미정산 상태입니다.');
      await transaction.commit();
      return;
    }

    console.log('1️⃣ PaymentHistory 삭제...\n');
    const payments = await PaymentHistory.findAll({
      where: {
        betId: {
          [sequelize.Sequelize.Op.like]: 'EXCHANGE_124%'
        }
      },
      transaction
    });

    for (const payment of payments) {
      const user = await User.findByPk(payment.userId, { transaction });
      const newBalance = parseFloat(user.balance) - parseFloat(payment.amount);
      await user.update({ balance: newBalance }, { transaction });
      console.log(`  유저 ${payment.userId}: ${user.balance} → ${newBalance} (${payment.amount})`);
      await payment.destroy({ transaction });
    }

    console.log('\n2️⃣ 매치 상태 롤백...\n');
    const matches = await ExchangeOrderMatch.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { originalOrderId: 124 },
          { matchingOrderId: 124 }
        ]
      },
      transaction
    });

    for (const match of matches) {
      if (match.status === 'settled') {
        await match.update({
          status: 'active',
          settledAt: null,
          settlementResult: null
        }, { transaction });
        console.log(`  매치 #${match.id}: settled → active`);
      }
    }

    console.log('\n3️⃣ 백 주문 #124 롤백...\n');
    await order.update({
      status: 'matched',
      actualProfit: null,
      settledAt: null,
      settlementNote: null
    }, { transaction });
    console.log(`  주문 #124: settled → matched`);

    console.log('\n4️⃣ 레이 주문들 롤백...\n');
    for (const match of matches) {
      const layOrderId = match.originalSide === 'lay' ? match.originalOrderId : match.matchingOrderId;
      const layOrder = await ExchangeOrder.findByPk(layOrderId, { transaction });

      if (layOrder && layOrder.settledAt) {
        // 레이 주문의 PaymentHistory 삭제
        const layPayments = await PaymentHistory.findAll({
          where: {
            betId: {
              [sequelize.Sequelize.Op.like]: `EXCHANGE_${layOrderId}_MATCH_${match.id}%`
            }
          },
          transaction
        });

        for (const payment of layPayments) {
          const user = await User.findByPk(payment.userId, { transaction });
          const newBalance = parseFloat(user.balance) - parseFloat(payment.amount);
          await user.update({ balance: newBalance }, { transaction });
          console.log(`  레이 주문 #${layOrderId} 유저: ${user.balance} → ${newBalance}`);
          await payment.destroy({ transaction });
        }

        // 레이 주문 상태 롤백
        await layOrder.update({
          status: 'matched',
          actualProfit: null,
          settledAt: null
        }, { transaction });
        console.log(`  레이 주문 #${layOrderId}: settled → matched`);
      }
    }

    await transaction.commit();
    console.log('\n✅ 롤백 완료!');
    console.log('주문 #124는 두 번째 경기 결과가 나올 때까지 대기합니다.\n');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ 오류:', error);
  } finally {
    await sequelize.close();
  }
}

fixOrder124();
