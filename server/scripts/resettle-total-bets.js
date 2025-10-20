/**
 * 총점 베팅 재정산 스크립트
 * 
 * 문제: 멀티배팅 정산 시 총점(Under/Over) 로직 누락으로 잘못 정산됨
 * 
 * 재정산 대상:
 * - Cremonese vs Udinese (1:0, 총점 1)
 *   - Under 2: 1 < 2 = 승리 ✅
 *   - Over 2: 1 > 2 = 패배 ❌
 * 
 * 영향받은 주문:
 * - #231, #242, #252 등 Under 2 베팅
 * - #230, #235, #243, #248, #253 등 멀티배팅
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
    console.warn(`⚠️ 총점 베팅 형식 오류: ${selectedTeam}`);
    return null;
  }
  
  const option = match[1]; // "Under" 또는 "Over"
  const point = parseFloat(match[2]); // 2 또는 2.5
  
  // Push 조건 (총점 = 기준점)
  if (totalScore === point) {
    return 'push';
  }
  
  // Under/Over 판정
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
    console.warn(`⚠️ 주문 ${order.id}: selectionDetails 없음`);
    return null;
  }
  
  const selections = order.selectionDetails.selections;
  
  // 각 선택의 결과 판정
  const results = selections.map(selection => {
    const team = selection.team || selection.selection;
    
    // 총점 베팅인 경우
    if (selection.market === '총점' || selection.market === 'totals') {
      return determineTotalResult(team, totalScore);
    }
    
    // 승패 베팅인 경우
    if (selection.market === '승패' || selection.market === 'h2h') {
      if (team === 'Draw' || team === '무승부') {
        return totalScore === 0 ? 'won' : 'lost'; // 1:0이므로 무승부 아님
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
  
  // Push가 있으면 cancelled
  if (results.includes('push')) {
    return 'cancelled';
  }
  
  // 하나라도 null이면 판정 불가
  if (results.includes(null)) {
    return null;
  }
  
  // 멀티배팅: 모두 맞아야 승리
  const allWon = results.every(r => r === 'won');
  const anyLost = results.some(r => r === 'lost');
  
  if (allWon) {
    return 'won';
  } else if (anyLost) {
    return 'lost';
  }
  
  return null;
}

/**
 * 주문 재정산
 */
async function resettleOrder(order, transaction) {
  try {
    console.log(`\n🔍 주문 ${order.id} 분석 중...`);
    console.log(`   Side: ${order.side}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   ActualProfit: ${order.actualProfit}`);
    
    // selectionDetails 확인
    if (!order.selectionDetails?.selections) {
      console.log(`   ⏭️ selectionDetails 없음 - 건너뜀`);
      return { skipped: true, reason: 'no_selections' };
    }
    
    const selections = order.selectionDetails.selections;
    console.log(`   Selections:`, selections.map(s => `${s.team || s.selection} (${s.market})`).join(', '));
    
    // Cremonese vs Udinese 경기가 포함된 주문인지 확인
    const hasTargetGame = selections.some(s => 
      s.homeTeam === GAME_INFO.homeTeam && 
      s.awayTeam === GAME_INFO.awayTeam
    );
    
    if (!hasTargetGame) {
      console.log(`   ⏭️ 대상 경기 아님 - 건너뜀`);
      return { skipped: true, reason: 'not_target_game' };
    }
    
    // 정확한 결과 계산
    const correctResult = calculateCorrectResult(order, GAME_INFO.totalScore);
    if (!correctResult) {
      console.log(`   ⚠️ 결과 판정 실패 - 건너뜀`);
      return { skipped: true, reason: 'cannot_determine' };
    }
    
    console.log(`   ✅ 올바른 결과: ${correctResult}`);
    
    // 매칭된 주문들 조회
    const matches = await ExchangeOrderMatch.findAll({
      where: {
        [Op.or]: [
          { originalOrderId: order.id },
          { matchingOrderId: order.id }
        ]
      },
      transaction
    });
    
    if (matches.length === 0) {
      console.log(`   ⏭️ 매칭 없음 - 건너뜀`);
      return { skipped: true, reason: 'no_matches' };
    }
    
    console.log(`   📊 매칭 ${matches.length}개 발견`);
    
    let totalProfit = 0;
    let totalStake = 0;
    const resettlements = [];
    
    for (const match of matches) {
      // 이 주문이 original인지 matching인지 확인
      const isOriginal = match.originalOrderId === order.id;
      const matchedOrderId = isOriginal ? match.matchingOrderId : match.originalOrderId;
      
      console.log(`   💰 매치 ${match.id} (${isOriginal ? 'original' : 'matching'})`);
      console.log(`      potAmount: ${match.potAmount}`);
      console.log(`      backStake: ${match.backStake}`);
      console.log(`      layStake: ${match.layStake}`);
      
      // 현재 주문의 side 확인
      const currentSide = order.side;
      
      // 정산 로직
      let profit = 0;
      let stake = 0;
      
      if (currentSide === 'back') {
        stake = parseFloat(match.backStake);
        if (correctResult === 'won') {
          // Back이 이기면 Pot 전체를 가져감
          profit = parseFloat(match.potAmount);
        } else if (correctResult === 'lost') {
          // Back이 지면 손실 (stake는 이미 차감됨)
          profit = 0;
        } else if (correctResult === 'cancelled') {
          // Push면 stake 환불
          profit = stake;
        }
      } else if (currentSide === 'lay') {
        stake = parseFloat(match.layStake);
        if (correctResult === 'won') {
          // correctResult는 Back 기준 결과
          // Back이 이기면 Lay는 패배
          profit = 0;
        } else if (correctResult === 'lost') {
          // Back이 지면 Lay가 승리하여 Pot을 가져감
          profit = parseFloat(match.potAmount);
        } else if (correctResult === 'cancelled') {
          // Push면 stake 환불
          profit = stake;
        }
      }
      
      totalProfit += profit;
      totalStake += stake;
      
      resettlements.push({
        matchId: match.id,
        matchedOrderId,
        stake,
        profit
      });
      
      console.log(`      → stake: ${stake}, profit: ${profit}`);
    }
    
    // 현재 actualProfit과 비교
    const currentProfit = parseFloat(order.actualProfit || 0);
    const profitDiff = totalProfit - currentProfit;
    
    console.log(`\n   📊 재정산 결과:`);
    console.log(`      현재 profit: ${currentProfit}`);
    console.log(`      올바른 profit: ${totalProfit}`);
    console.log(`      차이: ${profitDiff}`);
    
    if (Math.abs(profitDiff) < 0.01) {
      console.log(`   ✅ 이미 정확하게 정산됨 - 건너뜀`);
      return { skipped: true, reason: 'already_correct' };
    }
    
    // 주문 업데이트
    await ExchangeOrder.update(
      {
        actualProfit: totalProfit,
        updatedAt: new Date()
      },
      {
        where: { id: order.id },
        transaction
      }
    );
    
    // 사용자 잔액 조정
    const user = await User.findByPk(order.userId, { transaction });
    if (!user) {
      throw new Error(`사용자 ${order.userId}를 찾을 수 없습니다.`);
    }
    
    const oldBalance = parseFloat(user.balance);
    const newBalance = oldBalance + profitDiff;
    
    await User.update(
      { balance: newBalance },
      {
        where: { id: order.userId },
        transaction
      }
    );
    
    console.log(`   💵 잔액 조정: ${oldBalance} → ${newBalance} (${profitDiff > 0 ? '+' : ''}${profitDiff})`);
    
    // 결제 내역 기록
    await PaymentHistory.create({
      userId: order.userId,
      betId: `RESETTLE_${order.id}`,
      amount: profitDiff, // 🆕 부호 유지 (양수=입금, 음수=출금)
      type: profitDiff > 0 ? 'winning' : 'loss',
      memo: `총점 베팅 재정산 (주문 #${order.id})`,
      status: 'completed',
      balanceAfter: newBalance,
      paidAt: new Date(),
      relatedOrderId: order.id
    }, { transaction });
    
    console.log(`   ✅ 재정산 완료!`);
    
    return {
      success: true,
      orderId: order.id,
      oldProfit: currentProfit,
      newProfit: totalProfit,
      profitDiff,
      oldBalance,
      newBalance
    };
    
  } catch (error) {
    console.error(`   ❌ 주문 ${order.id} 재정산 실패:`, error.message);
    throw error;
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('🚀 총점 베팅 재정산 시작\n');
  console.log(`📍 대상 경기: ${GAME_INFO.homeTeam} ${GAME_INFO.homeScore}:${GAME_INFO.awayScore} ${GAME_INFO.awayTeam}`);
  console.log(`📍 총점: ${GAME_INFO.totalScore}\n`);
  
  const transaction = await sequelize.transaction();
  
  try {
    // 대상 주문 조회 (Cremonese vs Udinese 경기)
    const orders = await ExchangeOrder.findAll({
      where: {
        homeTeam: GAME_INFO.homeTeam,
        awayTeam: GAME_INFO.awayTeam,
        commenceTime: GAME_INFO.commenceTime,
        status: 'settled',
        isMultibet: true
      },
      order: [['id', 'ASC']],
      transaction
    });
    
    console.log(`📋 대상 주문 ${orders.length}개 발견\n`);
    
    const results = {
      total: orders.length,
      success: 0,
      skipped: 0,
      failed: 0,
      details: []
    };
    
    for (const order of orders) {
      try {
        const result = await resettleOrder(order, transaction);
        
        if (result.skipped) {
          results.skipped++;
          console.log(`   📝 ${result.reason}`);
        } else if (result.success) {
          results.success++;
          results.details.push(result);
        }
      } catch (error) {
        results.failed++;
        console.error(`   ❌ 오류:`, error.message);
      }
    }
    
    // 결과 출력
    console.log(`\n\n📊 ========== 재정산 결과 ==========`);
    console.log(`   전체: ${results.total}개`);
    console.log(`   성공: ${results.success}개`);
    console.log(`   건너뜀: ${results.skipped}개`);
    console.log(`   실패: ${results.failed}개`);
    
    if (results.details.length > 0) {
      console.log(`\n   💰 재정산 상세:`);
      for (const detail of results.details) {
        console.log(`      주문 #${detail.orderId}:`);
        console.log(`         수익: ${detail.oldProfit} → ${detail.newProfit} (${detail.profitDiff > 0 ? '+' : ''}${detail.profitDiff})`);
        console.log(`         잔액: ${detail.oldBalance} → ${detail.newBalance}`);
      }
    }
    console.log(`\n======================================\n`);
    
    // 확인 메시지
    console.log(`\n⚠️  트랜잭션이 대기 중입니다.`);
    console.log(`   위 결과를 확인하고 계속 진행하시겠습니까?`);
    console.log(`   - 계속하려면: 스크립트를 --commit 플래그와 함께 실행하세요`);
    console.log(`   - 취소하려면: 그냥 종료하세요 (변경사항 롤백됨)\n`);
    
    // --commit 플래그 확인
    const shouldCommit = process.argv.includes('--commit');
    
    if (shouldCommit) {
      await transaction.commit();
      console.log(`✅ 재정산 완료! 트랜잭션이 커밋되었습니다.\n`);
    } else {
      await transaction.rollback();
      console.log(`🔄 트랜잭션 롤백됨 (--commit 플래그 없음)\n`);
    }
    
    process.exit(0);
    
  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ 재정산 실패:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 스크립트 실행
main();

