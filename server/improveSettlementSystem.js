import sequelize from './models/sequelize.js';

async function improveSettlementSystem() {
  try {
    console.log('=== 정산 시스템 개선 시작 ===\n');
    
    // 1. 정산 가능한 주문들 확인
    const [settleableOrders] = await sequelize.query(`
      SELECT eo.*, gr.result, gr.status as game_status, gr.score
      FROM "ExchangeOrders" eo
      LEFT JOIN "GameResults" gr ON eo."gameResultId" = gr.id
      WHERE eo.status = 'matched' 
        AND gr.status = 'finished'
        AND eo."settledAt" IS NULL
      ORDER BY eo."commenceTime" ASC
    `);
    
    console.log('정산 가능한 주문 수:', settleableOrders.length);
    
    if (settleableOrders.length === 0) {
      console.log('정산할 주문이 없습니다.');
      return;
    }
    
    for (const order of settleableOrders) {
      console.log(`\n주문 ID: ${order.id}`);
      console.log(`경기: ${order.homeTeam} vs ${order.awayTeam}`);
      console.log(`사이드: ${order.side}, 배당률: ${order.price}`);
      console.log(`경기 결과: ${order.result}, 스코어: ${JSON.stringify(order.score)}`);
      
      // 2. 매칭된 상대방 주문 찾기
      let opponentOrder = null;
      
      if (order.matchedOrderId) {
        // 직접 매칭된 상대방이 있는 경우
        const [matchedOrder] = await sequelize.query(`
          SELECT * FROM "ExchangeOrders" WHERE id = :matchedId
        `, {
          replacements: { matchedId: order.matchedOrderId }
        });
        
        if (matchedOrder.length > 0) {
          opponentOrder = matchedOrder[0];
          console.log(`  매칭된 상대방: 주문 ID ${opponentOrder.id} (${opponentOrder.side})`);
        }
      } else {
        // 매칭 정보가 없는 경우, 같은 조건의 반대 주문 찾기
        const [potentialOpponents] = await sequelize.query(`
          SELECT * FROM "ExchangeOrders"
          WHERE "gameId" = :gameId 
            AND market = :market 
            AND line = :line 
            AND price = :price 
            AND amount = :amount 
            AND side != :side
            AND status = 'matched'
            AND id != :orderId
        `, {
          replacements: {
            gameId: order.gameId,
            market: order.market,
            line: order.line,
            price: order.price,
            amount: order.amount,
            side: order.side,
            orderId: order.id
          }
        });
        
        if (potentialOpponents.length > 0) {
          opponentOrder = potentialOpponents[0];
          console.log(`  추정 상대방: 주문 ID ${opponentOrder.id} (${opponentOrder.side})`);
        }
      }
      
      // 3. 승패 판정
      let isWinner = false;
      let settlementAmount = 0;
      
      if (opponentOrder) {
        // 상대방이 있는 경우: 승패 비교
        isWinner = determineWinner(order, opponentOrder, order.result, order.score);
        settlementAmount = isWinner ? order.potentialProfit : -order.stakeAmount;
        
        console.log(`  승패 판정: ${isWinner ? '승리' : '패배'}`);
        console.log(`  정산 금액: ${settlementAmount > 0 ? '+' : ''}${settlementAmount}원`);
        
      } else {
        // 상대방이 없는 경우: 단독 주문 처리
        console.log('  ⚠️ 매칭된 상대방이 없습니다. 단독 주문으로 처리합니다.');
        
        // 단독 주문의 경우, 경기 결과에 따라 승패 판정
        isWinner = determineSingleOrderWinner(order, order.result, order.score);
        settlementAmount = isWinner ? order.potentialProfit : -order.stakeAmount;
        
        console.log(`  단독 주문 승패: ${isWinner ? '승리' : '패배'}`);
        console.log(`  정산 금액: ${settlementAmount > 0 ? '+' : ''}${settlementAmount}원`);
      }
      
      // 4. 정산 실행
      const transaction = await sequelize.transaction();
      
      try {
        // 주문 정산 정보 업데이트
        await sequelize.query(`
          UPDATE "ExchangeOrders"
          SET "actualProfit" = :profit, "settledAt" = NOW(), "updatedAt" = NOW(),
              "settlementNote" = :note
          WHERE id = :orderId
        `, {
          replacements: {
            profit: settlementAmount,
            note: opponentOrder ? 
              `매칭된 상대방과 정산 (${isWinner ? '승리' : '패배'})` :
              `단독 주문 정산 (${isWinner ? '승리' : '패배'})`,
            orderId: order.id
          },
          transaction
        });
        
        // 사용자 잔고 업데이트
        await sequelize.query(`
          UPDATE "Users"
          SET balance = balance + :amount, "updatedAt" = NOW()
          WHERE id = :userId
        `, {
          replacements: {
            amount: settlementAmount,
            userId: order.userId
          },
          transaction
        });
        
        // 정산 내역 기록
        await sequelize.query(`
          INSERT INTO "PaymentHistories" (
            "userId", "type", "amount", "description", "referenceId", "createdAt", "updatedAt"
          ) VALUES (
            :userId, :type, :amount, :description, :referenceId, NOW(), NOW()
          )
        `, {
          replacements: {
            userId: order.userId,
            type: settlementAmount > 0 ? 'winning' : 'loss',
            amount: Math.abs(settlementAmount),
            description: `Exchange 정산 - ${order.homeTeam} vs ${order.awayTeam} (${isWinner ? '승리' : '패배'})`,
            referenceId: order.id
          },
          transaction
        });
        
        await transaction.commit();
        console.log('  ✅ 정산 완료');
        
      } catch (error) {
        await transaction.rollback();
        console.error('  ❌ 정산 실패:', error);
      }
    }
    
    console.log('\n=== 정산 시스템 개선 완료 ===');
    
  } catch (error) {
    console.error('정산 시스템 개선 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

// 승패 판정 함수 (매칭된 주문)
function determineWinner(order, opponentOrder, gameResult, score) {
  // 여기에 실제 승패 판정 로직 구현
  // 예: 승패, 핸디캡, 토탈 등 마켓별 판정
  console.log(`  승패 판정 로직: ${order.market}, ${order.side}, ${gameResult}`);
  
  // 임시 로직 (실제로는 마켓별 상세 로직 필요)
  if (order.market === '승패') {
    if (order.side === 'back') {
      // back 주문: 선택한 팀이 이기면 승리
      return gameResult === order.selection;
    } else {
      // lay 주문: 선택한 팀이 지면 승리
      return gameResult !== order.selection;
    }
  }
  
  return false; // 기본값
}

// 승패 판정 함수 (단독 주문)
function determineSingleOrderWinner(order, gameResult, score) {
  console.log(`  단독 주문 승패 판정: ${order.market}, ${order.side}, ${gameResult}`);
  
  // 단독 주문의 경우, 경기 결과에 따라 판정
  if (order.market === '승패') {
    if (order.side === 'back') {
      return gameResult === order.selection;
    } else {
      return gameResult !== order.selection;
    }
  }
  
  return false; // 기본값
}

improveSettlementSystem(); 