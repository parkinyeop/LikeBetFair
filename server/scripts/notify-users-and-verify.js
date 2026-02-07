// server/scripts/notify-users-and-verify.js
import { sequelize } from '../models/sequelize.js';
import { QueryTypes } from 'sequelize';

/**
 * 사용자 통지 및 수정 결과 검증 스크립트
 */
async function notifyUsersAndVerify() {
  try {
    console.log('📧 사용자 통지 및 검증 시작...');
    
    // 1. 환불 처리된 베팅들 조회
    const refundedBets = await sequelize.query(`
      SELECT 
        ph."userId",
        ph."betId",
        ph.amount,
        ph.memo,
        u.username,
        u.email,
        u.balance,
        b.stake,
        b."potentialWinnings",
        b.status,
        b.selections
      FROM "PaymentHistories" ph
      JOIN "Users" u ON ph."userId" = u.id
      JOIN "Bets" b ON ph."betId" = b.id
      WHERE ph.type = 'refund'
        AND ph.memo LIKE '%잘못된 정산 수정%'
        AND ph."createdAt" >= NOW() - INTERVAL '1 hour'
      ORDER BY ph."createdAt" DESC
    `, {
      type: QueryTypes.SELECT
    });
    
    console.log(`📊 환불 처리된 베팅: ${refundedBets.length}건`);
    
    // 2. 사용자별 통지 메시지 생성
    const userNotifications = {};
    
    for (const refund of refundedBets) {
      if (!userNotifications[refund.userId]) {
        userNotifications[refund.userId] = {
          username: refund.username,
          email: refund.email,
          totalRefund: 0,
          bets: []
        };
      }
      
      userNotifications[refund.userId].totalRefund += Math.abs(refund.amount);
      userNotifications[refund.userId].bets.push({
        betId: refund.betId,
        stake: refund.stake,
        potentialWinnings: refund.potentialWinnings,
        refundAmount: Math.abs(refund.amount),
        selections: refund.selections
      });
    }
    
    // 3. 사용자 통지 메시지 출력 (실제로는 이메일/SMS 발송)
    console.log(`\n📧 사용자 통지 메시지:`);
    
    for (const [userId, notification] of Object.entries(userNotifications)) {
      console.log(`\n👤 ${notification.username} (${notification.email})`);
      console.log(`   총 환불 금액: ${notification.totalRefund.toLocaleString()}원`);
      console.log(`   현재 잔액: ${notification.balance.toLocaleString()}원`);
      
      notification.bets.forEach((bet, index) => {
        console.log(`\n   베팅 ${index + 1}: ${bet.betId}`);
        console.log(`   베팅 금액: ${bet.stake.toLocaleString()}원`);
        console.log(`   환불 금액: ${bet.refundAmount.toLocaleString()}원`);
        console.log(`   사유: 잘못된 정산 결과 수정`);
        
        // 베팅 상세 정보
        bet.selections.forEach((selection, selIndex) => {
          console.log(`     선택 ${selIndex + 1}: ${selection.team} (${selection.market})`);
          console.log(`     결과: ${selection.result}`);
        });
      });
      
      // 실제 통지 메시지 (이메일 템플릿)
      const emailMessage = `
안녕하세요 ${notification.username}님,

베팅 시스템의 정산 로직 개선 작업으로 인해 일부 베팅 결과가 수정되었습니다.

📋 수정 내용:
${notification.bets.map((bet, index) => `
베팅 ${index + 1} (${bet.betId}):
- 베팅 금액: ${bet.stake.toLocaleString()}원
- 환불 금액: ${bet.refundAmount.toLocaleString()}원
- 사유: 경기 결과와 정산 결과 불일치로 인한 수정
`).join('')}

💰 총 환불 금액: ${notification.totalRefund.toLocaleString()}원
💳 현재 잔액: ${notification.balance.toLocaleString()}원

더 정확한 정산을 위해 앞으로는 경기 스코어를 우선적으로 반영하여 정산하겠습니다.

문의사항이 있으시면 고객센터로 연락해 주세요.

감사합니다.
LikeBetFair 팀
      `;
      
      console.log(`\n📧 이메일 메시지:`);
      console.log(emailMessage);
    }
    
    // 4. 데이터 무결성 검증
    console.log(`\n🔍 데이터 무결성 검증:`);
    
    // 잔액 합계 검증
    const balanceVerification = await sequelize.query(`
      SELECT 
        SUM(CASE WHEN ph.type = 'deposit' THEN ph.amount ELSE 0 END) as total_deposits,
        SUM(CASE WHEN ph.type = 'withdrawal' THEN ABS(ph.amount) ELSE 0 END) as total_withdrawals,
        SUM(CASE WHEN ph.type = 'refund' THEN ABS(ph.amount) ELSE 0 END) as total_refunds,
        SUM(u.balance) as current_total_balance
      FROM "PaymentHistories" ph
      FULL OUTER JOIN "Users" u ON ph."userId" = u.id
    `, {
      type: QueryTypes.SELECT
    });
    
    const verification = balanceVerification[0];
    console.log(`   총 입금: ${verification.total_deposits?.toLocaleString() || 0}원`);
    console.log(`   총 출금: ${verification.total_withdrawals?.toLocaleString() || 0}원`);
    console.log(`   총 환불: ${verification.total_refunds?.toLocaleString() || 0}원`);
    console.log(`   현재 총 잔액: ${verification.current_total_balance?.toLocaleString() || 0}원`);
    
    // 베팅 상태 검증
    const betStatusVerification = await sequelize.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(stake) as total_stake,
        SUM(CASE WHEN status = 'won' THEN "potentialWinnings" ELSE 0 END) as total_winnings
      FROM "Bets"
      GROUP BY status
      ORDER BY status
    `, {
      type: QueryTypes.SELECT
    });
    
    console.log(`\n📊 베팅 상태별 통계:`);
    betStatusVerification.forEach(stat => {
      console.log(`   ${stat.status}: ${stat.count}건 (${stat.total_stake?.toLocaleString() || 0}원)`);
      if (stat.status === 'won') {
        console.log(`     총 당첨금: ${stat.total_winnings?.toLocaleString() || 0}원`);
      }
    });
    
    console.log(`\n✅ 사용자 통지 및 검증 완료`);
    
    return {
      refundedBets: refundedBets.length,
      notifiedUsers: Object.keys(userNotifications).length,
      totalRefundAmount: Object.values(userNotifications).reduce((sum, n) => sum + n.totalRefund, 0)
    };
    
  } catch (error) {
    console.error('❌ 사용자 통지 및 검증 실패:', error);
    throw error;
  }
}

// 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  notifyUsersAndVerify()
    .then(result => {
      console.log('\n✅ 통지 및 검증 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 통지 및 검증 실패:', error);
      process.exit(1);
    });
}

export default notifyUsersAndVerify;
