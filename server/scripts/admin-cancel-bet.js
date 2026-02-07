import sequelize from '../models/sequelize.js';
import BetModel from '../models/betModel.js';
import User from '../models/userModel.js';

async function adminCancelBet(betId, reason = '관리자 취소') {
  const transaction = await sequelize.transaction();
  
  try {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔧 관리자 베팅 취소 처리: ${betId}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 1. 베팅 정보 조회
    const bet = await BetModel.findByPk(betId, { transaction });
    
    if (!bet) {
      throw new Error('베팅을 찾을 수 없습니다.');
    }

    console.log('📌 취소할 베팅 정보:');
    console.log(`   ID: ${bet.id}`);
    console.log(`   유저: ${bet.userId}`);
    console.log(`   금액: ${bet.stake}`);
    console.log(`   상태: ${bet.status}`);
    console.log(`   생성일: ${bet.createdAt}`);

    // 2. 베팅 상태 확인
    if (bet.status === 'cancelled') {
      throw new Error('이미 취소된 베팅입니다.');
    }

    if (bet.status === 'settled') {
      throw new Error('이미 정산된 베팅은 취소할 수 없습니다.');
    }

    // 3. 유저 정보 조회
    const user = await User.findByPk(bet.userId, { transaction });
    if (!user) {
      throw new Error('유저를 찾을 수 없습니다.');
    }

    console.log(`\n💰 환불 처리:`);
    console.log(`   환불 금액: ${bet.stake}`);
    console.log(`   유저 현재 잔액: ${user.balance}`);

    // 4. 베팅 취소 처리
    await bet.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason,
      settlementNote: `관리자 취소: ${reason}`
    }, { transaction });

    // 5. 유저 잔액 환불
    const newBalance = parseFloat(user.balance) + parseFloat(bet.stake);
    await user.update({
      balance: newBalance
    }, { transaction });

    console.log(`   환불 후 잔액: ${newBalance}`);

    // 6. 환불 트랜잭션 기록 (PaymentHistories 테이블 사용)
    await sequelize.query(`
      INSERT INTO "PaymentHistories" (
        id, "userId", "betId", amount, "balanceAfter", memo, "paidAt", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), :userId, :betId, :amount, :balanceAfter, :memo, NOW(), NOW(), NOW()
      )
    `, {
      replacements: {
        userId: bet.userId,
        betId: betId,
        amount: bet.stake,
        balanceAfter: newBalance,
        memo: `베팅 취소 환불: ${reason}`
      },
      transaction
    });

    // 7. 정산 로그 기록 (settlement_logs 테이블이 없으므로 콘솔에만 기록)
    console.log(`   정산 로그: 관리자 취소 - ${reason}`);
    console.log(`   취소 세부사항:`, {
      originalAmount: bet.stake,
      refundAmount: bet.stake,
      newBalance: newBalance,
      cancelledBy: 'admin'
    });

    await transaction.commit();

    console.log('\n✅ 베팅 취소 및 환불 처리 완료!');
    console.log(`   - 베팅 상태: cancelled`);
    console.log(`   - 환불 금액: ${bet.stake}원`);
    console.log(`   - 취소 사유: ${reason}`);
    console.log(`   - 처리 시간: ${new Date().toLocaleString('ko-KR')}`);

    return {
      success: true,
      betId: bet.id,
      userId: bet.userId,
      refundAmount: bet.stake,
      newBalance: newBalance,
      reason: reason
    };

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ 베팅 취소 처리 실패:', error.message);
    console.error(error.stack);
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    await sequelize.close();
  }
}

// CLI 실행
const betId = process.argv[2];
const reason = process.argv[3] || '시스템 오류로 인한 관리자 취소';

if (!betId) {
  console.log('사용법: node admin-cancel-bet.js <bet_id> [취소사유]');
  console.log('예시: node admin-cancel-bet.js 4fda3248-dc0d-45c1-9d4f-d2378d14a4ac "잘못된 경기 데이터"');
  process.exit(1);
}

adminCancelBet(betId, reason);
