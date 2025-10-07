// server/scripts/fix-settlement-logic.js
import { sequelize } from '../models/sequelize.js';
import { QueryTypes } from 'sequelize';
import BetResultService from '../services/betResultService.js';
import Bet from '../models/betModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import { Op } from 'sequelize';

/**
 * 정산 로직 문제점 수정 스크립트
 * 1. 패배한 경기를 성공으로 인식하는 문제 수정
 * 2. 스코어가 있는 경기를 cancelled로 처리하는 문제 수정
 */
async function fixSettlementLogic() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔧 정산 로직 문제점 수정 시작...');
    
    // 1. 잘못 정산된 베팅 찾기 (won/lost 상태이지만 재검증 필요)
    const problematicBets = await sequelize.query(`
      SELECT DISTINCT 
        b.*, 
        u.username, 
        u.email,
        u.balance
      FROM "Bets" b
      JOIN "Users" u ON b."userId" = u.id
      WHERE b.status IN ('won', 'lost')
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(b.selections) s
          WHERE s->>'result' IN ('won', 'lost', 'cancelled')
        )
      ORDER BY b."createdAt" DESC
      LIMIT 100
    `, {
      type: QueryTypes.SELECT,
      transaction
    });
    
    console.log(`📊 재검증 대상 베팅: ${problematicBets.length}건`);
    
    const betResultService = new BetResultService();
    let correctedCount = 0;
    let refundedAmount = 0;
    let correctedBets = [];
    
    for (const bet of problematicBets) {
      console.log(`\n🔍 베팅 ${bet.id} 재검증 중... (${bet.username})`);
      
      // 2. 수정된 정산 로직으로 재계산
      const correctedSelections = [];
      let hasChanges = false;
      let oldStatus = bet.status;
      
      for (const selection of bet.selections) {
        // 경기 결과 조회
        const gameResult = await betResultService.getGameResultByTeams(selection);
        
        if (gameResult) {
          // 수정된 정산 로직 사용
          let correctResult;
          if (selection.market === 'Win/Loss' || selection.market === '승/패') {
            correctResult = betResultService.determineWinLoseResult(selection, gameResult);
          } else if (selection.market === 'Over/Under' || selection.market === '언더/오버') {
            correctResult = betResultService.determineOverUnderResult(selection, gameResult);
          } else if (selection.market === 'Handicap' || selection.market === '핸디캡') {
            correctResult = betResultService.determineHandicapResult(selection, gameResult);
          } else {
            correctResult = 'pending'; // 알 수 없는 마켓은 pending으로 처리
          }
          
          if (selection.result !== correctResult) {
            console.log(`  📝 ${selection.team} (${selection.market}): ${selection.result} → ${correctResult}`);
            hasChanges = true;
          }
          
          correctedSelections.push({
            ...selection,
            result: correctResult
          });
        } else {
          // 경기 결과를 찾을 수 없으면 pending으로 처리
          if (selection.result !== 'pending') {
            console.log(`  📝 ${selection.team} (${selection.market}): ${selection.result} → pending (경기 결과 없음)`);
            hasChanges = true;
          }
          
          correctedSelections.push({
            ...selection,
            result: 'pending'
          });
        }
      }
      
      if (hasChanges) {
        // 전체 베팅 상태 재계산
        const newStatus = betResultService.determineBetStatus(
          correctedSelections.some(s => s.result === 'pending'),
          correctedSelections.some(s => s.result === 'won'),
          correctedSelections.some(s => s.result === 'lost' || s.result === 'draw'),
          correctedSelections.some(s => s.result === 'cancelled'),
          correctedSelections
        );
        
        console.log(`  🔄 베팅 상태 변경: ${oldStatus} → ${newStatus}`);
        
        // 베팅 업데이트
        await sequelize.query(`
          UPDATE "Bets" 
          SET 
            status = :newStatus,
            selections = :selections,
            "updatedAt" = NOW()
          WHERE id = :betId
        `, {
          replacements: {
            betId: bet.id,
            newStatus: newStatus,
            selections: JSON.stringify(correctedSelections)
          },
          transaction
        });
        
        // 상태 변경에 따른 처리
        if (oldStatus === 'won' && newStatus !== 'won') {
          // 승리에서 다른 상태로 변경된 경우 환불 처리
          console.log(`  💰 승리 → ${newStatus} 변경으로 인한 환불 처리`);
          
          // 기존 승리 지급 기록 확인
          const existingPayment = await PaymentHistory.findOne({
            where: {
              betId: bet.id,
              memo: { [Op.like]: '%베팅 적중 지급%' }
            },
            transaction
          });
          
          if (existingPayment) {
            // 사용자 잔액에서 승리 금액 차감
            await sequelize.query(`
              UPDATE "Users" 
              SET balance = balance - :amount,
                  "updatedAt" = NOW()
              WHERE id = :userId
            `, {
              replacements: {
                userId: bet.userId,
                amount: existingPayment.amount
              },
              transaction
            });
            
            // 환불 기록 추가
            await PaymentHistory.create({
              userId: bet.userId,
              betId: bet.id,
              amount: bet.stake,
              memo: `정산 로직 수정으로 인한 환불 (${oldStatus} → ${newStatus})`,
              paidAt: new Date(),
              balanceAfter: bet.balance + bet.stake
            }, { transaction });
            
            refundedAmount += bet.stake;
          }
        } else if (oldStatus !== 'won' && newStatus === 'won') {
          // 다른 상태에서 승리로 변경된 경우 승리 처리
          console.log(`  🎉 ${oldStatus} → 승리 변경으로 인한 승리 처리`);
          
          // 승리 지급 처리
          await betResultService.processBetWinnings(bet, transaction);
        }
        
        correctedBets.push({
          id: bet.id,
          username: bet.username,
          oldStatus: oldStatus,
          newStatus: newStatus,
          stake: bet.stake
        });
        
        correctedCount++;
      }
    }
    
    await transaction.commit();
    
    console.log(`\n✅ 정산 로직 수정 완료:`);
    console.log(`   수정된 베팅: ${correctedCount}건`);
    console.log(`   환불 금액: ${refundedAmount}원`);
    
    if (correctedBets.length > 0) {
      console.log(`\n📋 수정된 베팅 목록:`);
      correctedBets.forEach(bet => {
        console.log(`   베팅 ${bet.id} (${bet.username}): ${bet.oldStatus} → ${bet.newStatus} (${bet.stake}원)`);
      });
    }
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ 정산 로직 수정 실패:', error);
    throw error;
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  fixSettlementLogic()
    .then(() => {
      console.log('정산 로직 수정 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('정산 로직 수정 스크립트 실패:', error);
      process.exit(1);
    });
}

export default fixSettlementLogic;
