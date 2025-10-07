// server/scripts/fix-incorrect-settlements.js
import { sequelize } from '../models/sequelize.js';
import { QueryTypes } from 'sequelize';
import BetResultService from '../services/betResultService.js';

/**
 * 잘못된 정산 데이터 수정 스크립트
 * 트랜잭션으로 안전하게 처리
 */
async function fixIncorrectSettlements() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔧 잘못된 정산 데이터 수정 시작...');
    
    // 1. 수정된 GameResult에 포함된 모든 베팅 찾기
    const affectedBets = await sequelize.query(`
      SELECT DISTINCT 
        b.*, 
        u.username, 
        u.email,
        u.balance
      FROM "Bets" b
      JOIN "Users" u ON b."userId" = u.id
      WHERE b.status IN ('won', 'lost')
        AND EXISTS (
          SELECT 1 FROM "GameResults" gr
          WHERE gr.status = 'finished' 
            AND gr.score IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(b.selections) s
              WHERE s->>'homeTeam' = gr."homeTeam" 
                AND s->>'awayTeam' = gr."awayTeam"
                AND s->>'commence_time' = gr."commenceTime"::text
            )
        )
    `, {
      type: QueryTypes.SELECT,
      transaction
    });
    
    console.log(`📊 재정산 대상 베팅: ${affectedBets.length}건`);
    
    const betResultService = new BetResultService();
    let correctedCount = 0;
    let refundedAmount = 0;
    let correctedBets = [];
    
    for (const bet of affectedBets) {
      console.log(`\n🔍 베팅 ${bet.id} 재정산 중... (${bet.username})`);
      
      // 2. 수정된 정산 로직으로 재계산
      const correctedSelections = [];
      let hasChanges = false;
      let oldStatus = bet.status;
      
      for (const selection of bet.selections) {
        // 경기 결과 조회
        const gameResults = await sequelize.query(`
          SELECT * FROM "GameResults" 
          WHERE "homeTeam" = :homeTeam 
            AND "awayTeam" = :awayTeam 
            AND "commenceTime" = :commenceTime
        `, {
          replacements: { 
            homeTeam: selection.homeTeam,
            awayTeam: selection.awayTeam,
            commenceTime: selection.commence_time
          },
          type: QueryTypes.SELECT,
          transaction
        });
        
        if (gameResults.length > 0) {
          const gameResult = gameResults[0];
          
          // 수정된 정산 로직 사용
          let correctResult;
          if (selection.market === 'Win/Loss') {
            correctResult = betResultService.determineWinLoseResult(selection, gameResult);
          } else if (selection.market === 'Over/Under') {
            correctResult = betResultService.determineOverUnderResult(selection, gameResult);
          } else if (selection.market === 'Handicap') {
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
          correctedSelections.push(selection);
        }
      }
      
      // 3. 베팅 결과 변경이 있으면 업데이트
      if (hasChanges) {
        const overallResult = calculateOverallResult(correctedSelections);
        
        // 베팅 상태 업데이트
        await sequelize.query(`
          UPDATE "Bets" 
          SET selections = :selections, status = :status, "updatedAt" = NOW()
          WHERE id = :id
        `, {
          replacements: { 
            selections: JSON.stringify(correctedSelections),
            status: overallResult,
            id: bet.id
          },
          type: QueryTypes.UPDATE,
          transaction
        });
        
        // 4. 사용자 잔액 조정 (잘못 지급된 당첨금 회수)
        if (oldStatus === 'won' && overallResult === 'lost') {
          const refundAmount = parseFloat(bet.potentialWinnings);
          
          // 사용자 잔액 차감
          await sequelize.query(`
            UPDATE "Users" 
            SET balance = balance - :amount, "updatedAt" = NOW()
            WHERE id = :userId
          `, {
            replacements: { amount: refundAmount, userId: bet.userId },
            type: QueryTypes.UPDATE,
            transaction
          });
          
          // 환불 기록 추가
          await sequelize.query(`
            INSERT INTO "PaymentHistories" 
            ("userId", "betId", "amount", "type", "memo", "createdAt", "updatedAt")
            VALUES (:userId, :betId, :amount, 'refund', :memo, NOW(), NOW())
          `, {
            replacements: { 
              userId: bet.userId,
              betId: bet.id,
              amount: -refundAmount,
              memo: `잘못된 정산 수정 - ${bet.username} (${bet.id})`
            },
            type: QueryTypes.INSERT,
            transaction
          });
          
          refundedAmount += refundAmount;
          console.log(`  💰 환불 처리: ${refundAmount.toLocaleString()}원 (잔액: ${bet.balance - refundAmount}원)`);
        }
        
        correctedBets.push({
          betId: bet.id,
          username: bet.username,
          oldStatus,
          newStatus: overallResult,
          refundAmount: oldStatus === 'won' && overallResult === 'lost' ? parseFloat(bet.potentialWinnings) : 0
        });
        
        correctedCount++;
      }
    }
    
    await transaction.commit();
    
    console.log(`\n🎉 잘못된 정산 수정 완료:`);
    console.log(`   - 수정된 베팅: ${correctedCount}건`);
    console.log(`   - 총 환불 금액: ${refundedAmount.toLocaleString()}원`);
    
    // 수정 결과 상세 리포트
    console.log(`\n📋 수정 결과 상세:`);
    correctedBets.forEach((bet, index) => {
      console.log(`   ${index + 1}. ${bet.username} (${bet.betId})`);
      console.log(`      ${bet.oldStatus} → ${bet.newStatus}`);
      if (bet.refundAmount > 0) {
        console.log(`      환불: ${bet.refundAmount.toLocaleString()}원`);
      }
    });
    
    return { correctedCount, refundedAmount, correctedBets };
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ 잘못된 정산 수정 실패:', error);
    throw error;
  }
}

function calculateOverallResult(selections) {
  // cancelled가 하나라도 있으면 cancelled
  if (selections.some(s => s.result === 'cancelled')) {
    return 'cancelled';
  }
  
  // 모든 selection이 won이어야 전체 won
  if (selections.every(s => s.result === 'won')) {
    return 'won';
  }
  
  // 그 외는 lost
  return 'lost';
}

// 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  fixIncorrectSettlements()
    .then(result => {
      console.log('\n✅ 수정 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 수정 실패:', error);
      process.exit(1);
    });
}

export default fixIncorrectSettlements;
