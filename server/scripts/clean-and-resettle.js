/**
 * 재정산 기록 정리 및 재실행 스크립트
 * 
 * 1단계: 모든 RESETTLE 기록 삭제
 * 2단계: 사용자 잔액을 RESETTLE 이전 상태로 복원
 * 3단계: 올바른 재정산 다시 실행
 */

import createScriptSequelize from '../config/scriptDatabase.js';
import { ExchangeOrder, ExchangeOrderMatch, User, PaymentHistory } from '../models/index.js';
import { Op } from 'sequelize';

const sequelize = createScriptSequelize();

// 재정산할 경기 정보
const GAME_INFO = {
  homeTeam: 'Cremonese',
  awayTeam: 'Udinese',
  commenceTime: '2025-10-20T18:45:00.000Z',
  homeScore: 1,
  awayScore: 0,
  totalScore: 1
};

/**
 * Under/Over 베팅 결과 판정
 */
function determineTotalResult(selectedTeam, totalScore) {
  const match = selectedTeam.match(/^(Under|Over)\s+([\d.]+)$/);
  if (!match) {
    return null;
  }
  
  const option = match[1];
  const point = parseFloat(match[2]);
  
  if (totalScore === point) {
    return 'push';
  }
  
  if (option === 'Under') {
    return totalScore < point ? 'won' : 'lost';
  } else if (option === 'Over') {
    return totalScore > point ? 'won' : 'lost';
  }
  
  return null;
}

/**
 * 주문의 정확한 결과 계산
 */
function calculateCorrectResult(order, totalScore) {
  if (!order.selectionDetails?.selections) {
    return null;
  }
  
  const selections = order.selectionDetails.selections;
  
  const results = selections.map(selection => {
    const team = selection.team || selection.selection;
    
    if (selection.market === '총점' || selection.market === 'totals') {
      return determineTotalResult(team, totalScore);
    }
    
    if (selection.market === '승패' || selection.market === 'h2h') {
      if (team === 'Draw' || team === '무승부') {
        return totalScore === 0 ? 'won' : 'lost';
      }
      if (team === GAME_INFO.homeTeam) {
        return GAME_INFO.homeScore > GAME_INFO.awayScore ? 'won' : 'lost';
      }
      if (team === GAME_INFO.awayTeam) {
        return GAME_INFO.awayScore > GAME_INFO.homeScore ? 'won' : 'lost';
      }
    }
    
    return null;
  });
  
  if (results.includes('push')) {
    return 'cancelled';
  }
  
  if (results.includes(null)) {
    return null;
  }
  
  const allWon = results.every(r => r === 'won');
  const anyLost = results.some(r => r === 'lost');
  
  if (allWon) {
    return 'won';
  } else if (anyLost) {
    return 'lost';
  }
  
  return null;
}

async function main() {
  console.log('🚀 재정산 정리 및 재실행 시작\n');
  
  const transaction = await sequelize.transaction();
  
  try {
    // 1단계: 이전 재정산 기록 조회
    const oldResettleRecords = await PaymentHistory.findAll({
      where: {
        betId: {
          [Op.like]: 'RESETTLE_%'
        }
      },
      order: [['paidAt', 'ASC']],
      transaction
    });
    
    console.log(`📋 1단계: 이전 재정산 기록 ${oldResettleRecords.length}개 발견`);
    
    // 사용자별로 재정산 금액 합계 계산
    const userAdjustments = {};
    for (const record of oldResettleRecords) {
      if (!userAdjustments[record.userId]) {
        userAdjustments[record.userId] = 0;
      }
      userAdjustments[record.userId] += parseFloat(record.amount || 0);
    }
    
    console.log('\n   📊 사용자별 재정산 금액 합계:');
    for (const [userId, totalAmount] of Object.entries(userAdjustments)) {
      console.log(`      ${userId}: ${totalAmount > 0 ? '+' : ''}${totalAmount}`);
    }
    
    // 2단계: 사용자 잔액 복원 (재정산 금액만큼 차감)
    console.log(`\n📋 2단계: 사용자 잔액 복원 중...`);
    
    for (const [userId, totalAmount] of Object.entries(userAdjustments)) {
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        console.warn(`   ⚠️ 사용자 ${userId} 없음 - 건너뜀`);
        continue;
      }
      
      const oldBalance = parseFloat(user.balance);
      const newBalance = oldBalance - totalAmount;
      
      await User.update(
        { balance: newBalance },
        { where: { id: userId }, transaction }
      );
      
      console.log(`   ✅ ${userId.substring(0, 8)}... 잔액: ${oldBalance} → ${newBalance} (${-totalAmount > 0 ? '+' : ''}${-totalAmount})`);
    }
    
    // 3단계: 재정산 기록 삭제
    console.log(`\n📋 3단계: 재정산 기록 삭제 중...`);
    
    const deleteCount = await PaymentHistory.destroy({
      where: {
        betId: {
          [Op.like]: 'RESETTLE_%'
        }
      },
      transaction
    });
    
    console.log(`   ✅ ${deleteCount}개의 재정산 기록 삭제 완료`);
    
    // 4단계: 주문의 actualProfit 원래 값으로 복원
    console.log(`\n📋 4단계: 주문 actualProfit 복원 중...`);
    
    const ordersToRestore = await ExchangeOrder.findAll({
      where: {
        homeTeam: GAME_INFO.homeTeam,
        awayTeam: GAME_INFO.awayTeam,
        commenceTime: GAME_INFO.commenceTime,
        status: 'settled',
        isMultibet: true
      },
      transaction
    });
    
    console.log(`   📊 복원할 주문: ${ordersToRestore.length}개`);
    
    // actualProfit을 0 또는 원래 값으로 설정 (고아 주문 정산 기록 기반)
    for (const order of ordersToRestore) {
      // 고아 주문 정산 기록 찾기
      const orphanRecord = await PaymentHistory.findOne({
        where: {
          betId: `EXCHANGE_${order.id}_ORPHAN`
        },
        transaction
      });
      
      const originalProfit = orphanRecord ? parseFloat(orphanRecord.amount) : 0;
      
      await ExchangeOrder.update(
        { actualProfit: originalProfit },
        { where: { id: order.id }, transaction }
      );
      
      console.log(`   ✅ 주문 #${order.id}: actualProfit → ${originalProfit}`);
    }
    
    console.log(`\n\n⚠️  복원 완료!`);
    console.log(`   - ${deleteCount}개의 재정산 기록 삭제`);
    console.log(`   - ${Object.keys(userAdjustments).length}명의 사용자 잔액 복원`);
    console.log(`   - ${ordersToRestore.length}개의 주문 actualProfit 복원`);
    console.log(`\n   이제 올바른 재정산 스크립트를 실행하세요:`);
    console.log(`   node server/scripts/resettle-total-bets.js --commit\n`);
    
    // --commit 플래그 확인
    const shouldCommit = process.argv.includes('--commit');
    
    if (shouldCommit) {
      await transaction.commit();
      console.log(`✅ 복원 완료! 트랜잭션이 커밋되었습니다.\n`);
    } else {
      await transaction.rollback();
      console.log(`🔄 트랜잭션 롤백됨 (--commit 플래그 없음)\n`);
    }
    
    process.exit(0);
    
  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ 복원 실패:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 스크립트 실행
main();

