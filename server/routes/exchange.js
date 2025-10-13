import express from 'express';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import ExchangeOrderMatch from '../models/exchangeOrderMatchModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import verifyToken from '../middleware/verifyToken.js';
import exchangeWebSocketService from '../services/exchangeWebSocketService.js';
import exchangeGameMappingService from '../services/exchangeGameMappingService.js';
import exchangeSettlementService from '../services/exchangeSettlementService.js';
import ExchangeOddsReturnRateService from '../services/exchangeOddsReturnRateService.js';
import balanceService from '../services/balanceService.js';
import { Op } from 'sequelize';
import sequelize from '../models/sequelize.js';
import GameResultQuery from '../utils/gameResultQuery.js';
import { getLocationConfig } from '../config/gameResultQuery.js';

const router = express.Router();

// 🆕 부분 매칭 처리 함수
async function processPartialMatching(orderData) {
  const { gameId, market, line, side, price, amount, userId } = orderData;
  const opposite = side === 'back' ? 'lay' : 'back';
  
  console.log('🔄 부분 매칭 처리 시작:', { gameId, market, line, side, price, amount, userId });
  
  // FIFO 방식으로 매칭 가능한 주문들 조회
  let availableOrders;
  if (side === 'back') {
    // Back 주문은 같거나 낮은 가격의 Lay 주문과 매칭
    availableOrders = await ExchangeOrder.findAll({
      where: {
        gameId,
        market,
        line,
        side: 'lay',
        price: { [Op.lte]: price },
        status: 'open',
        userId: { [Op.ne]: userId },
        remainingAmount: { [Op.gt]: 0 }
      },
      order: [['price', 'ASC'], ['createdAt', 'ASC']] // 가격 우선, 시간 순
    });
  } else {
    // Lay 주문은 같거나 높은 가격의 Back 주문과 매칭
    availableOrders = await ExchangeOrder.findAll({
      where: {
        gameId,
        market,
        line,
        side: 'back',
        price: { [Op.gte]: price },
        status: 'open',
        userId: { [Op.ne]: userId },
        remainingAmount: { [Op.gt]: 0 }
      },
      order: [['price', 'DESC'], ['createdAt', 'ASC']] // 가격 우선, 시간 순
    });
  }
  
  console.log(`📊 매칭 가능한 주문: ${availableOrders.length}개`);
  
  let remainingAmount = amount;
  const matches = [];
  
  // 순차적으로 매칭 처리
  for (const existingOrder of availableOrders) {
    if (remainingAmount <= 0) break;
    
    const availableAmount = existingOrder.remainingAmount || existingOrder.amount;
    const matchAmount = Math.min(remainingAmount, availableAmount);
    const matchPrice = existingOrder.price;
    
    console.log(`🎯 매칭 진행: ${matchAmount}원 at ${matchPrice} (주문 ID: ${existingOrder.id})`);
    
    // 기존 주문 업데이트
    const newRemainingAmount = availableAmount - matchAmount;
    
    // Exchange 매치 금액 계산 (Back/Lay에 따라 다름)
    let actualFilledAmount;
    if (existingOrder.side === 'back') {
      // Back 베팅: filledAmount = stake (베팅 금액)
      actualFilledAmount = matchAmount;
    } else {
      // Lay 베팅: filledAmount = stake × (odds - 1) (리스크 금액)
      actualFilledAmount = Math.floor(matchAmount * (existingOrder.price - 1));
    }
    
    const newFilledAmount = (existingOrder.filledAmount || 0) + actualFilledAmount;
    
    // 🆕 Back과 Lay 구분 상태 관리
    let newStatus;
    if (existingOrder.side === 'lay') {
      // Lay 매치: 부분 매칭되어도 active 상태 유지 (취소 가능)
      newStatus = 'active';
    } else {
      // Back 주문: 기존 로직 유지
      newStatus = newRemainingAmount > 0 ? 'open' : 'matched';
    }
    
    console.log(`💰 매치 금액 계산: ${existingOrder.side} 주문 #${existingOrder.id}`);
    console.log(`   매치 금액: ₩${matchAmount.toLocaleString()}`);
    console.log(`   배당률: ${existingOrder.price}`);
    console.log(`   실제 체결 금액: ₩${actualFilledAmount.toLocaleString()}`);
    console.log(`   누적 체결 금액: ₩${newFilledAmount.toLocaleString()}`);
    
    await existingOrder.update({
      remainingAmount: newRemainingAmount,
      filledAmount: newFilledAmount,
      originalAmount: existingOrder.originalAmount || existingOrder.amount,
      partiallyFilled: newFilledAmount > 0 && newRemainingAmount > 0,
      status: newStatus
    });
    
    // 매칭 기록 생성
    const matchRecord = await ExchangeOrderMatch.create({
      originalOrderId: existingOrder.id,
      matchingOrderId: null, // 나중에 새 주문 ID로 업데이트
      matchedAmount: matchAmount,
      matchedPrice: matchPrice,
      originalSide: existingOrder.side,
      matchingSide: side,
      gameId,
      market,
      line,
      status: 'active'
    });
    
    matches.push({
      matchRecord,
      existingOrder,
      matchAmount,
      matchPrice,
      newRemainingAmount
    });
    
    remainingAmount -= matchAmount;
  }
  
  return {
    matches,
    remainingAmount,
    totalMatched: amount - remainingAmount
  };
}

// 매칭 배팅 API - 즉시 매칭 방식
router.post('/match-order', verifyToken, async (req, res) => {
  // 🆕 catch 블록에서 사용할 변수들을 미리 선언
  let targetOrder, matchOrder, exchangeOrderMatch;
  let matchAmount, matchType, userId;
  
  try {
    const { targetOrderId, matchAmount: reqMatchAmount, matchType: reqMatchType } = req.body;
    matchAmount = reqMatchAmount;
    matchType = reqMatchType;
    userId = req.user.userId;
    
    console.log('🎯 매칭 배팅 요청:', { targetOrderId, matchAmount, matchType, userId });
    console.log('🆕 ExchangeOrderMatch 모델 상태:', {
      modelExists: !!ExchangeOrderMatch,
      tableName: ExchangeOrderMatch?.tableName,
      sequelize: !!ExchangeOrderMatch?.sequelize
    });
    
    // 대상 주문 찾기
    const targetOrder = await ExchangeOrder.findByPk(targetOrderId);
    if (!targetOrder) {
      return res.status(404).json({ success: false, message: '대상 주문을 찾을 수 없습니다.' });
    }
    
    console.log('🔍 targetOrder.commenceTime 타입:', typeof targetOrder.commenceTime);
    console.log('🔍 targetOrder.commenceTime 값:', targetOrder.commenceTime);
    
    // 주문 상태 확인 (부분 매칭된 주문도 허용)
    if (targetOrder.status !== 'open' && targetOrder.status !== 'partially_matched') {
      return res.status(400).json({ success: false, message: '이미 완전히 체결되었거나 취소된 주문입니다.' });
    }
    
    // 본인 주문인지 확인
    if (targetOrder.userId === userId) {
      return res.status(400).json({ success: false, message: '자신이 생성한 주문에는 매칭 배팅을 할 수 없습니다.' });
    }
    
    // 매칭 타입 확인 (반대 타입이어야 함)
    if (targetOrder.side === matchType) {
      return res.status(400).json({ success: false, message: '매칭 배팅은 반대 타입으로만 가능합니다.' });
    }
    
    // 🆕 원본 배당율 사용 (환수율은 프론트엔드에서 적용)
    const adjustedPrice = targetOrder.price;
    
    // 🆕 올바른 매칭 금액 계산 로직
    let actualMatchAmount;
    let stakeAmount;
    
    if (targetOrder.side === 'back') {
      // Back 주문에 Lay로 매칭: matchAmount는 리스크 금액
      // 실제 매칭되는 주문 금액 = matchAmount / (odds - 1)
      if (targetOrder.price <= 1.0) {
        return res.status(400).json({ 
          success: false, 
          message: '유효하지 않은 배당율입니다. (1.0 이하)' 
        });
      }
      // 🆕 소수점 문제 해결: Math.floor → Math.round 사용 (환수율 적용된 배당율 사용)
      const maxMatchableAmount = Math.round(matchAmount / (adjustedPrice - 1));
      actualMatchAmount = Math.min(maxMatchableAmount, targetOrder.remainingAmount || targetOrder.amount);
      stakeAmount = matchAmount; // 리스크 금액
    } else {
      // Lay 주문에 Back으로 매칭: matchAmount는 주문 금액
      if (adjustedPrice <= 1.0) {
        return res.status(400).json({ 
          success: false, 
          message: '유효하지 않은 배당율입니다. (1.0 이하)' 
        });
      }
      actualMatchAmount = Math.min(matchAmount, targetOrder.remainingAmount || targetOrder.amount);
      stakeAmount = Math.floor((adjustedPrice - 1) * actualMatchAmount); // 리스크 금액 (환수율 적용된 배당율 사용)
    }
    
    if (actualMatchAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: '매칭 가능한 금액이 없습니다.' 
      });
    }
    
    // 🆕 매칭 금액 계산 디버깅 로그
    console.log('🎯 매칭 금액 계산 결과:', {
      targetOrderSide: targetOrder.side,
      targetOrderPrice: targetOrder.price,
      targetOrderAmount: targetOrder.amount,
      targetOrderRemainingAmount: targetOrder.remainingAmount,
      matchAmount: matchAmount,
      actualMatchAmount: actualMatchAmount,
      stakeAmount: stakeAmount,
      matchType: matchType,
      // 🆕 소수점 계산 디버깅 추가
      calculation: targetOrder.side === 'back' ? 
        `${matchAmount} / (${targetOrder.price} - 1) = ${matchAmount / (targetOrder.price - 1)}` : 
        `${matchAmount} * (${targetOrder.price} - 1) = ${matchAmount * (targetOrder.price - 1)}`
    });
    
    // ✅ 중앙화된 잔액 관리 서비스 사용
    const transaction = await sequelize.transaction();
    
    try {
      // 사용자 잔고 확인 및 차감 (PaymentHistory 자동 기록)
      await balanceService.deductBalance(
        userId,
        stakeAmount,
        `익스체인지 매칭 배팅 차감: ${targetOrder.homeTeam} vs ${targetOrder.awayTeam}`,
        `EXCHANGE_${Date.now()}`,
        transaction
      );
      
      console.log(`✅ 잔액 차감 완료: ${stakeAmount.toLocaleString()}원 (PaymentHistory 기록됨)`);
    
      // 🆕 매칭 주문 생성 (매치 배팅자용)
      const matchOrder = await ExchangeOrder.create({
      userId: userId,
      gameId: targetOrder.gameId,
      market: targetOrder.market,
      line: targetOrder.line,
      side: matchType,
      price: targetOrder.price,
      amount: actualMatchAmount,
      status: matchType === 'lay' ? 'active' : 'matched', // 🆕 Lay는 active 상태로 생성
      matchedOrderId: targetOrder.id,
      homeTeam: targetOrder.homeTeam,
      awayTeam: targetOrder.awayTeam,
      commenceTime: new Date(targetOrder.commenceTime),
      sportKey: targetOrder.sportKey,
      selection: targetOrder.selection,
      selectionDetails: targetOrder.selectionDetails,
      isMultibet: targetOrder.isMultibet, // 🆕 멀티배팅 정보 추가
      // ✅ 멀티베팅 필드 복사 (버그 수정)
      totalOdds: targetOrder.totalOdds,
      selectionCount: targetOrder.selectionCount,
      potentialWinnings: targetOrder.potentialWinnings,
      stakeAmount: stakeAmount, // 🆕 올바른 리스크 금액 사용
      potentialProfit: matchType === 'back' ? Math.floor((targetOrder.price - 1) * actualMatchAmount) : actualMatchAmount, // ✅ 순수익 (담보금 제외)
      autoSettlement: true,
      backOdds: targetOrder.backOdds,
      layOdds: targetOrder.layOdds,
      oddsSource: targetOrder.oddsSource || 'exchange',
      oddsUpdatedAt: targetOrder.oddsUpdatedAt || new Date(),
      // 🆕 부분 매칭 필드들
      originalAmount: actualMatchAmount, // 🆕 매칭 주문의 원래 금액
      remainingAmount: 0, // 즉시 매칭되므로 0
      filledAmount: actualMatchAmount, // 🆕 매칭 주문의 체결된 금액
      partiallyFilled: false // 🆕 매칭 주문은 즉시 체결되므로 false
      }, { transaction });

    // 🆕 양방향 매칭 관계 설정 - targetOrder에도 matchedOrderId 설정
    targetOrder.matchedOrderId = matchOrder.id;

    // 🆕 대상 주문 상태 업데이트 (부분 매칭 처리)
    if (actualMatchAmount >= (targetOrder.remainingAmount || targetOrder.amount)) {
      // 완전 매칭
      targetOrder.originalAmount = targetOrder.originalAmount || targetOrder.amount; // 🆕 originalAmount 설정
      targetOrder.filledAmount = targetOrder.originalAmount;
      targetOrder.remainingAmount = 0;
      targetOrder.partiallyFilled = false;
      
      // 🆕 멀티베팅 주문은 매칭 시 matched 상태로 설정
      if (targetOrder.isMultibet) {
        targetOrder.status = 'matched'; // 멀티베팅 주문은 매칭 시 matched 상태
      } else {
        // 일반 주문: Back과 Lay 구분 상태 설정
        if (targetOrder.side === 'lay') {
          targetOrder.status = 'active'; // Lay 매치는 active 상태 유지
        } else {
          targetOrder.status = 'matched'; // Back 주문은 matched 상태
        }
      }
    } else {
      // 부분 매칭
      targetOrder.originalAmount = targetOrder.originalAmount || targetOrder.amount; // 🆕 originalAmount 설정
      targetOrder.partiallyFilled = true;
      targetOrder.filledAmount = (targetOrder.filledAmount || 0) + actualMatchAmount;
      targetOrder.remainingAmount = (targetOrder.remainingAmount || targetOrder.amount) - actualMatchAmount;
      
      // ✅ 수정: 멀티베팅 주문도 부분 매칭 시 partially_matched 상태로 설정
      if (targetOrder.isMultibet) {
        targetOrder.status = 'partially_matched'; // ✅ 부분 매칭 시 partially_matched 상태
      } else {
        // 일반 주문: Back과 Lay 구분 상태 설정
        if (targetOrder.side === 'lay') {
          targetOrder.status = 'active'; // Lay 매치는 부분 매칭되어도 active 상태 유지
        } else {
          targetOrder.status = 'partially_matched'; // Back 주문은 partially_matched 상태
        }
      }
      
      // 🆕 소수점 문제 해결: 잔액이 100원 미만이면 0으로 처리
      if (targetOrder.remainingAmount < 100) {
        console.log('🧹 잔액 정리: remainingAmount가 100원 미만이므로 0으로 처리');
        targetOrder.remainingAmount = 0;
        targetOrder.partiallyFilled = false;
        
        // ✅ 수정: 잔액 정리 후에는 완전 매칭 상태로 설정
        if (targetOrder.isMultibet) {
          targetOrder.status = 'matched'; // 멀티베팅 주문은 matched 상태
        } else {
          // 일반 주문: Back과 Lay 구분 상태 설정
          if (targetOrder.side === 'lay') {
            targetOrder.status = 'active'; // Lay 매치는 active 상태 유지
          } else {
            targetOrder.status = 'matched'; // Back 주문은 matched 상태
          }
        }
      }
    }
    
      await targetOrder.save({ transaction });

    // 🆕 대상 주문 업데이트 후 디버깅 로그
    console.log('🎯 대상 주문 업데이트 완료:', {
      orderId: targetOrder.id,
      originalAmount: targetOrder.originalAmount,
      filledAmount: targetOrder.filledAmount,
      remainingAmount: targetOrder.remainingAmount,
      status: targetOrder.status,
      partiallyFilled: targetOrder.partiallyFilled
    });

    // 🆕 ExchangeOrderMatch 레코드 생성
    console.log('🆕 ExchangeOrderMatch 생성 시작:', {
      originalOrderId: targetOrder.id,
      matchingOrderId: matchOrder.id,
      matchedAmount: actualMatchAmount,
      matchedPrice: targetOrder.price,
      originalSide: targetOrder.side,
      matchingSide: matchType,
      gameId: targetOrder.gameId,
      market: targetOrder.market,
      line: targetOrder.line,
      status: 'active'
    });
    
      const exchangeOrderMatch = await ExchangeOrderMatch.create({
      originalOrderId: parseInt(targetOrder.id), // 🆕 정수로 변환
      matchingOrderId: parseInt(matchOrder.id), // 🆕 정수로 변환
      matchedAmount: actualMatchAmount,
      matchedPrice: targetOrder.price,
      originalSide: targetOrder.side,
      matchingSide: matchType,
      gameId: targetOrder.gameId,
      market: targetOrder.market,
      line: targetOrder.line,
      status: 'active'
    }, { transaction });
    
      console.log('✅ ExchangeOrderMatch 생성 완료:', exchangeOrderMatch.id);

      // ✅ 매칭 시에는 추가 입금 없음
      // 각자 이미 차감된 금액이 있으므로 정산 시까지 묶어둠
      console.log('💰 매칭 완료 - 정산 시까지 금액 묶임 (추가 입금 없음)');
    
      // WebSocket으로 실시간 업데이트
      exchangeWebSocketService.broadcastOrderUpdate({
        type: 'order_matched',
        targetOrder: targetOrder,
        matchInfo: {
          matchedAmount: actualMatchAmount,
          matchedType: matchType
        }
      });
      
      // 트랜잭션 커밋
      await transaction.commit();
      
      console.log('✅ 매칭 배팅 성공:', { 
        targetOrderId, 
        matchedBy: userId,
        actualMatchAmount, 
        matchType,
        remainingAmount: targetOrder.remainingAmount,
        isPartiallyMatched: targetOrder.partiallyFilled
      });
      
      res.json({ 
        success: true, 
        message: '매칭 배팅이 성공적으로 처리되었습니다.',
        targetOrderId: targetOrder.id,
        matchedAmount: actualMatchAmount,
        remainingAmount: targetOrder.remainingAmount,
        isPartiallyMatched: targetOrder.partiallyFilled
      });
      
    } catch (error) {
      // 트랜잭션 롤백
      await transaction.rollback();
      
      console.error('❌ 매칭 배팅 실패:', {
        error: error.message,
        stack: error.stack,
        targetOrderId: targetOrder?.id || 'unknown',
        matchAmount: matchAmount || 'unknown',
        matchType: matchType || 'unknown',
        userId: userId || 'unknown'
      });
      res.status(500).json({ 
        success: false, 
        message: `매칭 배팅 처리 중 오류가 발생했습니다: ${error.message}` 
      });
    }
  } catch (error) {
    console.error('❌ 매칭 배팅 외부 에러:', error);
    res.status(500).json({ 
      success: false, 
      message: `매칭 배팅 처리 중 오류가 발생했습니다: ${error.message}` 
    });
  }
});

// 주문 등록 (게임 데이터 연동 포함)
router.post('/order', verifyToken, async (req, res) => {
  try {
    const { gameId, market, line, side, price, amount, selection } = req.body;
    const userId = req.user.userId;
    
    console.log('🎯 Exchange 주문 생성 요청:', { gameId, market, line, side, price, amount, selection });
    
    // 게임 데이터 매핑
    const orderData = await exchangeGameMappingService.mapGameDataToOrder({
      gameId, market, line, side, price, amount, selection, userId
    });
    
    console.log('📊 매핑된 게임 데이터:', {
      homeTeam: orderData.homeTeam,
      awayTeam: orderData.awayTeam,
      sportKey: orderData.sportKey,
      originalPrice: price,
      adjustedPrice: orderData.adjustedPrice
    });
    
    // 🆕 원본 배당율 사용 (환수율은 프론트엔드에서 적용)
    const finalPrice = price;
    
    // ✅ 중앙화된 잔액 관리 서비스 사용
    const transaction = await sequelize.transaction();
    
    try {
      // 필요 금액 계산
      const required = side === 'back' ? amount : Math.floor((finalPrice - 1) * amount);
      
      console.log('🔍 잔고 검증 상세:', { 
        userId,
        required, 
        side, 
        originalPrice: price,
        finalPrice: finalPrice,
        amount,
        calculation: side === 'back' ? `${amount} (back)` : `Math.floor((${finalPrice} - 1) * ${amount}) = ${Math.floor((finalPrice - 1) * amount)} (lay)`
      });
      
      // 사용자 잔고 확인 및 차감 (PaymentHistory 자동 기록)
      await balanceService.deductBalance(
        userId,
        required,
        `익스체인지 주문 생성: ${orderData.homeTeam} vs ${orderData.awayTeam} (${side})`,
        null, // 주문 생성 시점에는 betId 없음
        transaction
      );
      
      console.log(`✅ 잔액 차감 완료: ${required.toLocaleString()}원 (PaymentHistory 기록됨)`);
    
      // 🆕 부분 매칭 처리 (가중치가 적용된 배당율 사용)
      const partialMatchResult = await processPartialMatching({
        gameId, market, line, side, price: finalPrice, amount, userId
      });
    
      console.log('🎯 부분 매칭 결과:', {
        totalMatched: partialMatchResult.totalMatched,
        remainingAmount: partialMatchResult.remainingAmount,
        matchCount: partialMatchResult.matches.length
      });
    
    // 거래 정보 계산
    let stakeAmount, potentialProfit;
    
    if (selectionDetails && selectionDetails.selections && selectionDetails.selections.length > 1) {
      // 멀티배팅인 경우
      if (side === 'back') {
        stakeAmount = amount; // Back: 배팅 금액 (담보금)
        potentialProfit = Math.floor((price - 1) * amount); // Back: 순수익 (담보금 제외)
      } else {
        stakeAmount = Math.floor((price - 1) * amount); // Lay: 스테이크 금액 (담보금)
        potentialProfit = amount; // Lay: 순수익 (상대 배팅금)
      }
    } else {
      // 단일 배팅인 경우
      stakeAmount = side === 'back' ? amount : Math.floor((price - 1) * amount);
      potentialProfit = side === 'back' ? Math.floor((price - 1) * amount) : amount; // Back: 순수익 (담보금 제외)
    }
    
    // 🆕 배당율 정보 준비
    const now = new Date();
    const baseOrderData = {
      userId, 
      gameId, 
      market, 
      line, 
      side, 
      price,
      selection,
      stakeAmount, 
      potentialProfit,
      // 매핑된 게임 데이터 추가
      homeTeam: orderData.homeTeam,
      awayTeam: orderData.awayTeam,
      commenceTime: new Date(orderData.commenceTime), // UTC로 변환하여 저장
      sportKey: orderData.sportKey,
      selectionDetails: orderData.selectionDetails,
      autoSettlement: true,
      // 🆕 스포츠북 배당율 정보 사용
      backOdds: orderData.backOdds,
      layOdds: orderData.layOdds,
      oddsSource: orderData.oddsSource || 'exchange',
      oddsUpdatedAt: orderData.oddsUpdatedAt || now,
      // 🆕 부분 매칭 필드 초기화
      originalAmount: amount,
      remainingAmount: partialMatchResult.remainingAmount,
      filledAmount: partialMatchResult.totalMatched,
      partiallyFilled: partialMatchResult.totalMatched > 0 && partialMatchResult.remainingAmount > 0
    };
    
    let order;
    if (partialMatchResult.remainingAmount > 0) {
      // 미체결 주문 생성
      order = await ExchangeOrder.create({
        ...baseOrderData,
        amount: partialMatchResult.remainingAmount,
        status: partialMatchResult.totalMatched > 0 ? 'open' : 'open'
      });
      console.log('📝 새 주문 생성:', { 
        orderId: order.id, 
        originalAmount: amount,
        remainingAmount: partialMatchResult.remainingAmount,
        status: 'open' 
      });
    }
    
    // 매칭된 부분에 대한 주문들 생성 및 매칭 기록 업데이트
    const createdMatchedOrders = [];
    for (const match of partialMatchResult.matches) {
      // 매칭된 부분에 대한 새 주문 생성
      // Exchange 매치 금액 계산 (Back/Lay에 따라 다름)
      let filledAmount;
      if (side === 'back') {
        // Back 베팅: filledAmount = stake (베팅 금액)
        filledAmount = match.matchAmount;
      } else {
        // Lay 베팅: filledAmount = stake × (odds - 1) (리스크 금액)
        filledAmount = Math.floor(match.matchAmount * (match.matchPrice - 1));
      }
      
      const matchedOrder = await ExchangeOrder.create({
        ...baseOrderData,
        amount: match.matchAmount,
        status: side === 'lay' ? 'active' : 'matched', // 🆕 Lay는 active 상태로 생성
        matchedOrderId: match.existingOrder.id,
        filledAmount: filledAmount,
        originalAmount: match.matchAmount,
        remainingAmount: 0,
        stakeAmount: side === 'back' ? match.matchAmount : Math.floor((match.matchPrice - 1) * match.matchAmount),
        potentialProfit: side === 'back' ? Math.floor((match.matchPrice - 1) * match.matchAmount) : match.matchAmount // ✅ 순수익
      }, { transaction });
      
      // 매칭 기록 업데이트 (새 주문 ID 연결)
      await match.matchRecord.update({
        matchingOrderId: matchedOrder.id
      }, { transaction });
      
      // 기존 주문에도 매칭 정보 업데이트
      if (match.existingOrder.matchedOrderId === null) {
        await match.existingOrder.update({
          matchedOrderId: matchedOrder.id
        }, { transaction });
      }
      
      createdMatchedOrders.push(matchedOrder);
      console.log('✅ 부분 매칭 완료:', { 
        newOrderId: matchedOrder.id, 
        existingOrderId: match.existingOrder.id,
        matchAmount: match.matchAmount,
        matchPrice: match.matchPrice
      });
    }
    
      // WebSocket으로 주문 업데이트 브로드캐스트
      if (order) {
        exchangeWebSocketService.broadcastOrderUpdate(gameId, { order });
      }
      
      // 트랜잭션 커밋
      await orderTransaction.commit();
      
      // 🆕 부분 매칭 결과 포함한 응답
      res.json({ 
        success: true,
        order: order ? order.toJSON() : null,
        matchingResult: {
          totalMatched: partialMatchResult.totalMatched,
          remainingAmount: partialMatchResult.remainingAmount,
          matchCount: partialMatchResult.matches.length,
          isPartiallyMatched: partialMatchResult.totalMatched > 0 && partialMatchResult.remainingAmount > 0,
          isFullyMatched: partialMatchResult.totalMatched > 0 && partialMatchResult.remainingAmount === 0,
          createdMatchedOrders: createdMatchedOrders.map(o => ({
            id: o.id,
            amount: o.amount,
            price: o.price,
            status: o.status
          }))
        },
        gameInfo: {
          homeTeam: orderData.homeTeam,
          awayTeam: orderData.awayTeam,
          sportKey: orderData.sportKey,
          hasGameMapping: !!(orderData.homeTeam && orderData.awayTeam)
        }
      });
      
    } catch (error) {
      // 트랜잭션 롤백
      await orderTransaction.rollback();
      
      console.error('❌ Exchange 주문 생성 오류:', error);
      res.status(500).json({ message: '주문 생성 중 오류가 발생했습니다.' });
    }
  } catch (error) {
    console.error('❌ Exchange 주문 생성 외부 에러:', error);
    res.status(500).json({ message: '주문 생성 중 오류가 발생했습니다.' });
  }
});

// 호가(orderbook) 조회 - 테스트용 (공개 API)
router.get('/orderbook-test', async (req, res) => {
  try {
    const { gameId, market, line } = req.query;
    console.log('테스트 호가 조회 요청:', { gameId, market, line });
    
    // Where 조건을 동적으로 구성
    const whereCondition = { gameId, market, status: 'open' };
    if (line !== undefined && line !== null && line !== '') {
      whereCondition.line = line;
    }
    
    // 🆕 매치 배팅 주문 제외하고 원본 주문만 조회 (테스트용)
    const orders = await ExchangeOrder.findAll({
      where: {
        ...whereCondition,
        // matchedOrderId가 null인 주문만 조회 (원본 주문)
        matchedOrderId: null
      }
    });
    
    console.log('찾은 주문 수:', orders.length);
    console.log('주문 데이터:', orders.map(o => ({
      id: o.id,
      gameId: o.gameId,
      market: o.market,
      line: o.line,
      side: o.side,
      price: o.price,
      amount: o.amount,
      backOdds: o.backOdds,
      layOdds: o.layOdds,
      oddsSource: o.oddsSource
    })));
    
    res.json({ orders });
  } catch (error) {
    console.error('호가 조회 에러:', error);
    res.status(500).json({ error: error.message });
  }
});

// 호가(orderbook) 조회
router.get('/orderbook', verifyToken, async (req, res) => {
  try {
    const { gameId, market, line } = req.query;
    
    // ✅ 현재 시간보다 미래 경기만 조회
    const now = new Date();
    
    // Where 조건을 동적으로 구성
    const whereCondition = { 
      gameId, 
      market, 
      status: 'open',
      // ✅ 경기 시작 시간 필터 추가 (10분 여유)
      commenceTime: {
        [Op.gt]: new Date(now.getTime() - 10 * 60 * 1000)
      }
    };
    if (line !== undefined && line !== null && line !== '') {
      whereCondition.line = line;
    }
    
    // 🆕 매치 배팅 주문 제외하고 원본 주문만 조회
    const orders = await ExchangeOrder.findAll({
      where: {
        ...whereCondition,
        // matchedOrderId가 null인 주문만 조회 (원본 주문)
        matchedOrderId: null
      }
    });
    
    // 🆕 부분 매칭을 고려한 주문 정보 반환 + 가중치 적용
    const ordersWithRemainingAmount = await Promise.all(orders.map(async order => {
      const orderData = order.toJSON();
      
      // 환수율 조정은 프론트엔드에서 처리 (정확한 배열 기반 계산을 위해)
      let displayPrice = orderData.price;
      
      // ✅ 오더북: 매칭하는 사람이 낼 금액 표시
      // - Back 주문 → LAY 매처가 낼 담보금
      // - LAY 주문 → Back 매처가 낼 배팅금
      const remainingAmt = order.remainingAmount || order.amount;
      const displayAmount = order.side === 'back'
        ? Math.floor(remainingAmt * (order.price - 1)) // LAY 담보금
        : remainingAmt; // Back 배팅금
      
      console.log(`🔍 [ALL-ORDERS] 주문 ${order.id} displayAmount 계산:`, {
        side: order.side,
        amount: order.amount,
        remainingAmt: remainingAmt,
        price: order.price,
        계산: order.side === 'back' ? `${remainingAmt} × (${order.price} - 1) = ${displayAmount}` : remainingAmt,
        displayAmount: displayAmount
      });
      
      return {
        ...orderData,
        price: displayPrice, // 사용자에게 표시할 환수율 적용된 배당율
        originalPrice: orderData.price, // 원본 배당율 보존
        displayAmount: displayAmount, // ✅ 매칭할 사람이 낼 금액
        originalAmount: order.originalAmount || order.amount,
        remainingAmount: order.remainingAmount || order.amount,
        filledAmount: order.filledAmount || 0,
        partiallyFilled: order.partiallyFilled || false
      };
    }));
    
    res.json({ orders: ordersWithRemainingAmount });
  } catch (error) {
    console.error('호가 조회 오류:', error);
    res.status(500).json({ message: '호가 조회 중 오류가 발생했습니다.' });
  }
});

// 정산(경기 결과 입력) - 관리자만 접근 가능
router.post('/settle', verifyToken, async (req, res) => {
  // 관리자 권한 체크
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
  const { gameId, market, line, result } = req.body;
  const matchedOrders = await ExchangeOrder.findAll({
    where: { gameId, market, line, status: 'matched' }
  });
  for (const order of matchedOrders) {
    const matched = await ExchangeOrder.findByPk(order.matchedOrderId);
    if (!matched) continue;
    // ✅ 올바른 Exchange 정산 로직
    let winner, payout;
    if ((result === 'over' && order.side === 'back') || (result === 'under' && order.side === 'lay')) {
      winner = order;
      // Back 승리: 매칭된 Lay 베팅금액만큼 획득
      payout = order.side === 'back' ? matched.amount : order.amount;
    } else {
      winner = matched;
      // Lay 승리: 자신의 베팅금액 + Back의 배팅금액 중 지분만큼 획득
      if (matched.side === 'lay') {
        const backMatchAmount = order.amount * (order.price - 1);
        const layShareRatio = backMatchAmount > 0 ? matched.amount / backMatchAmount : 0;
        payout = matched.amount + (order.amount * layShareRatio);
      } else {
        payout = order.side === 'back' ? matched.amount : order.amount;
      }
    }
    const winnerUser = await User.findByPk(winner.userId);
    winnerUser.balance += payout;
    await winnerUser.save();
    
    // PaymentHistory 기록 (실제 수익 지급만)
    await PaymentHistory.create({
      userId: winner.userId,
      betId: `EXCHANGE_${winner.id}`, // Exchange 주문 ID를 betId로 사용하여 추적 가능
      amount: payout,
      memo: `Exchange 정산 수익`,
      paidAt: new Date(),
      balanceAfter: winnerUser.balance
    });
    
    // 거래 내역 업데이트
    order.actualProfit = winner === order ? payout : 0;
    matched.actualProfit = winner === matched ? payout : 0;
    order.settledAt = new Date();
    matched.settledAt = new Date();
    order.status = 'settled';
    matched.status = 'settled';
    await order.save();
    await matched.save();
  }
  res.json({ message: '정산 완료' });
});

// 주문 취소 (Back/Lay 구분 처리)
router.post('/cancel/:orderId', verifyToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    
    const order = await ExchangeOrder.findOne({
      where: { id: orderId, userId: userId },
      transaction
    });
    
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }
    
    // 🆕 경기 시간 10분 전 확인 함수
    const isWithin10MinutesOfGame = (commenceTime) => {
      if (!commenceTime) return false;
      const gameTime = new Date(commenceTime);
      const now = new Date();
      const timeDiff = gameTime.getTime() - now.getTime();
      return timeDiff <= 10 * 60 * 1000; // 10분 = 600,000ms
    };

    // 🆕 Back과 Lay 구분 취소 조건
    if (order.side === 'lay') {
      // Lay 매치: active 상태 + 경기 시간 10분 전까지
      if (order.status !== 'active') {
        await transaction.rollback();
        return res.status(400).json({ message: '취소할 수 없는 매치 상태입니다.' });
      }
      if (isWithin10MinutesOfGame(order.commenceTime)) {
        await transaction.rollback();
        return res.status(400).json({ message: '경기 시작 10분 전 이후에는 취소할 수 없습니다.' });
      }
    } else {
      // Back 주문: open/partially_matched 상태 + 경기 시간 10분 전까지
      if (order.status !== 'open' && order.status !== 'partially_matched') {
        await transaction.rollback();
        return res.status(400).json({ message: '취소할 수 없는 주문 상태입니다.' });
      }
      if (isWithin10MinutesOfGame(order.commenceTime)) {
        await transaction.rollback();
        return res.status(400).json({ message: '경기 시작 10분 전 이후에는 취소할 수 없습니다.' });
      }
    }
    
    console.log(`🔄 주문 취소 시작: ID ${orderId}, 타입: ${order.side}, 상태: ${order.status}`);
    
    if (order.side === 'back') {
      // Back 주문 취소: 매칭된 Lay도 함께 취소
      await cancelBackOrderWithMatchedLays(order, transaction);
    } else {
      // Lay 매치 취소: Lay만 취소, Back은 유지
      await cancelLayMatchOnly(order, transaction);
    }
    
    await transaction.commit();
    
    res.json({ 
      message: '주문이 취소되었습니다.',
      orderId: order.id,
      side: order.side
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Order cancellation error:', error);
    res.status(500).json({ message: '주문 취소 중 오류가 발생했습니다.' });
  }
});

// 🆕 Back 주문 취소: 매칭된 Lay도 함께 취소
async function cancelBackOrderWithMatchedLays(backOrder, transaction) {
  console.log(`  📋 Back 주문 취소 처리: ID ${backOrder.id}`);
  
  // 1. 매칭된 Lay 주문들 조회
  const matchedLays = await findMatchedLayOrders(backOrder.id, transaction);
  console.log(`  🔍 매칭된 Lay 주문: ${matchedLays.length}개`);
  
  // 2. 매칭된 Lay 주문들 취소 처리
  for (const layOrder of matchedLays) {
    await cancelMatchedLayOrder(layOrder, transaction);
  }
  
  // 3. Back 주문 취소 처리
  await cancelOriginalOrder(backOrder, transaction);
  
  // 4. 매칭 기록 상태 변경
  await updateMatchRecordsAsCancelled(backOrder.id, transaction);
  
  console.log(`  ✅ Back 주문 취소 완료: ID ${backOrder.id}`);
}

// 🆕 Lay 매치 취소: Lay만 취소, Back은 유지
async function cancelLayMatchOnly(layOrder, transaction) {
  console.log(`  📋 Lay 매치 취소 처리: ID ${layOrder.id}`);
  
  // 1. 매칭된 Back 주문 조회
  const matchedBack = await findMatchedBackOrder(layOrder.id, transaction);
  
  if (matchedBack) {
    // 2. Back 주문을 open 상태로 복원
    await restoreBackOrderToOpen(matchedBack, layOrder, transaction);
    console.log(`  🔄 Back 주문 복원: ID ${matchedBack.id}`);
  }
  
  // 3. Lay 주문 취소 처리
  await cancelOriginalOrder(layOrder, transaction);
  
  // 4. 매칭 기록을 cancelled 상태로 변경
  await updateMatchRecordAsCancelled(layOrder.id, transaction);
  
  console.log(`  ✅ Lay 매치 취소 완료: ID ${layOrder.id}`);
}

// 🆕 매칭된 Lay 주문들 조회
async function findMatchedLayOrders(backOrderId, transaction) {
  const matches = await ExchangeOrderMatch.findAll({
    where: { 
      [Op.or]: [
        { originalOrderId: backOrderId },
        { matchingOrderId: backOrderId }
      ]
    },
    transaction
  });
  
  const layOrderIds = [];
  for (const match of matches) {
    // Back 주문과 매칭된 Lay 주문들 찾기
    if (match.originalOrderId == backOrderId && match.matchingSide === 'lay') {
      layOrderIds.push(match.matchingOrderId);
    } else if (match.matchingOrderId == backOrderId && match.originalSide === 'lay') {
      layOrderIds.push(match.originalOrderId);
    }
  }
  
  return await ExchangeOrder.findAll({
    where: { id: { [Op.in]: layOrderIds } },
    transaction
  });
}

// 🆕 매칭된 Back 주문 조회
async function findMatchedBackOrder(layOrderId, transaction) {
  const matches = await ExchangeOrderMatch.findAll({
    where: {
      [Op.or]: [
        { originalOrderId: layOrderId },
        { matchingOrderId: layOrderId }
      ]
    },
    transaction
  });
  
  for (const match of matches) {
    // Lay 주문과 매칭된 Back 주문 찾기
    if (match.originalOrderId == layOrderId && match.matchingSide === 'back') {
      return await ExchangeOrder.findByPk(match.matchingOrderId, { transaction });
    } else if (match.matchingOrderId == layOrderId && match.originalSide === 'back') {
      return await ExchangeOrder.findByPk(match.originalOrderId, { transaction });
    }
  }
  
  return null;
}

// 🆕 매칭된 Lay 주문 취소 처리 (Back 주문 취소 시만 호출)
async function cancelMatchedLayOrder(layOrder, transaction) {
  console.log(`    🔄 Lay 주문 취소: ID ${layOrder.id}, 현재 상태: ${layOrder.status}`);
  
  // ⭐️ 핵심: 이미 취소된 주문은 스킵 (이중 환불 방지)
  if (layOrder.status === 'cancelled') {
    console.log(`    ⏭️  이미 취소된 주문, 환불 스킵 (이중 환불 방지)`);
    return;
  }
  
  // ⭐️ active 상태가 아닌 주문도 스킵 (matched, settled 등)
  if (layOrder.status !== 'active') {
    console.log(`    ⏭️  취소 불가능한 상태 (${layOrder.status}), 환불 스킵`);
    return;
  }
  
  // ✅ 간단명료: 본인이 낸 담보금만 환불
  const refundAmount = layOrder.stakeAmount || Math.floor((layOrder.price - 1) * layOrder.amount);
  
  console.log(`    💰 LAY 환불: ${refundAmount}원 (본인이 낸 담보금)`);
  
  await balanceService.addBalance(
    layOrder.userId,
    refundAmount,
    `Exchange Lay 매치 취소 환불 (Back 주문 취소로 인한)`,
    `EXCHANGE_${layOrder.id}`,
    transaction
  );
  
  // Lay 주문 상태 변경
  layOrder.status = 'cancelled';
  await layOrder.save({ transaction });
  
  console.log(`    ✅ Lay 주문 취소 완료: ID ${layOrder.id}, 환불: ${refundAmount}원`);
}

// 🆕 Back 주문을 open 상태로 복원
async function restoreBackOrderToOpen(backOrder, cancelledLayOrder, transaction) {
  console.log(`    🔄 Back 주문 복원: ID ${backOrder.id}`);
  
  // 🚨 수정된 로직: 취소된 Lay와 매칭되었던 금액을 계산
  const matches = await ExchangeOrderMatch.findAll({
    where: {
      [Op.or]: [
        { originalOrderId: backOrder.id, matchingOrderId: cancelledLayOrder.id },
        { originalOrderId: cancelledLayOrder.id, matchingOrderId: backOrder.id }
      ]
    },
    transaction
  });
  
  let restoreAmount = 0;
  for (const match of matches) {
    restoreAmount += match.matchedAmount;
  }
  
  // 상태 업데이트
  const newRemainingAmount = (backOrder.remainingAmount || 0) + restoreAmount;
  const newFilledAmount = Math.max(0, (backOrder.filledAmount || 0) - restoreAmount);
  const newStatus = newFilledAmount > 0 ? 'partially_matched' : 'open';
  
  await backOrder.update({
    remainingAmount: newRemainingAmount,
    filledAmount: newFilledAmount,
    status: newStatus,
    partiallyFilled: newFilledAmount > 0 && newRemainingAmount > 0
  }, { transaction });
  
  console.log(`    ✅ Back 주문 복원 완료: ID ${backOrder.id}, 상태: ${newStatus}, 복원금액: ${restoreAmount}원`);
}

// 🆕 원래 주문 취소 처리
async function cancelOriginalOrder(order, transaction) {
  console.log(`    🔄 원래 주문 취소: ID ${order.id}, 타입: ${order.side}, 현재 상태: ${order.status}`);
  
  // ⭐️ 이미 취소된 주문은 스킵 (이중 환불 방지)
  if (order.status === 'cancelled') {
    console.log(`    ⏭️  이미 취소된 주문, 환불 스킵 (이중 환불 방지)`);
    return;
  }
  
  // ⭐️ 취소 가능한 상태 확인
  if (order.side === 'back') {
    if (order.status !== 'open' && order.status !== 'partially_matched') {
      console.log(`    ⏭️  Back 주문 취소 불가 상태 (${order.status}), 환불 스킵`);
      return;
    }
  } else {
    // Lay 주문
    if (order.status !== 'active' && order.status !== 'open' && order.status !== 'partially_matched') {
      console.log(`    ⏭️  Lay 주문 취소 불가 상태 (${order.status}), 환불 스킵`);
      return;
    }
  }
  
  // ✅ 간단명료한 환불 로직: 본인이 낸 돈만 환불
  let refundAmount;
  if (order.side === 'back') {
    // BACK: 베팅 금액 환불
    refundAmount = order.amount;
    console.log(`    💰 BACK 환불: ${refundAmount}원 (본인이 낸 돈)`);
  } else {
    // LAY: 담보금 환불
    refundAmount = order.stakeAmount || Math.floor((order.price - 1) * order.amount);
    console.log(`    💰 LAY 환불: ${refundAmount}원 (본인이 낸 담보금)`);
  }
  
  await balanceService.addBalance(
    order.userId,
    refundAmount,
    `Exchange ${order.side} 주문 취소 환불`,
    `EXCHANGE_${order.id}`,
    transaction
  );
  
  // 주문 상태 변경
  order.status = 'cancelled';
  await order.save({ transaction });
  
  console.log(`    ✅ 주문 취소 완료: ID ${order.id}, 환불: ${refundAmount}원`);
}

// 🆕 매칭 기록들을 cancelled 상태로 변경
async function updateMatchRecordsAsCancelled(orderId, transaction) {
  await ExchangeOrderMatch.update(
    { status: 'cancelled', settledAt: new Date() },
    {
      where: {
        [Op.or]: [
          { originalOrderId: orderId },
          { matchingOrderId: orderId }
        ]
      },
      transaction
    }
  );
  console.log(`    📝 매칭 기록 cancelled 상태로 변경: 주문 ID ${orderId}`);
}

// 🆕 단일 매칭 기록을 cancelled 상태로 변경
async function updateMatchRecordAsCancelled(orderId, transaction) {
  await ExchangeOrderMatch.update(
    { status: 'cancelled', settledAt: new Date() },
    {
      where: {
        [Op.or]: [
          { originalOrderId: orderId },
          { matchingOrderId: orderId }
        ]
      },
      transaction
    }
  );
  console.log(`    📝 매칭 기록 cancelled 상태로 변경: 주문 ID ${orderId}`);
}

// Exchange 잔고 조회 (일반 잔고 사용)
router.get('/balance', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    res.json({ balance: user.balance });
  } catch (error) {
    console.error('Exchange balance error:', error);
    res.status(500).json({ message: '잔고 조회 중 오류가 발생했습니다.' });
  }
});

// 🆕 주문별 매칭 상세 내역 조회
router.get('/orders/:orderId/matches', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    
    // 주문 소유권 확인
    const order = await ExchangeOrder.findOne({
      where: { id: orderId, userId }
    });
    
    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }
    
    // 매칭 내역 조회
    const matches = await ExchangeOrderMatch.findAll({
      where: {
        [Op.or]: [
          { originalOrderId: orderId },
          { matchingOrderId: orderId }
        ]
      },
      include: [
        {
          model: ExchangeOrder,
          as: 'originalOrder',
          required: false
        },
        {
          model: ExchangeOrder,
          as: 'matchingOrder',
          required: false
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    
    // 🆕 부분 매칭 통계 계산
    const totalMatchedAmount = matches.reduce((sum, match) => sum + match.matchedAmount, 0);
    const matchCount = matches.length;
    const isPartiallyMatched = order.partiallyFilled && order.remainingAmount > 0;
    const isFullyMatched = order.status === 'matched';
    
    res.json({
      orderId,
      orderInfo: {
        originalAmount: order.originalAmount || order.amount,
        filledAmount: order.filledAmount || 0,
        remainingAmount: order.remainingAmount || order.amount,
        partiallyFilled: order.partiallyFilled || false,
        status: order.status,
        // 🆕 매칭 통계 추가
        totalMatchedAmount,
        matchCount,
        isPartiallyMatched,
        isFullyMatched,
        matchProgress: order.originalAmount ? 
          Math.round((totalMatchedAmount / order.originalAmount) * 100) : 0
      },
      matches: matches.map(match => ({
        id: match.id,
        matchedAmount: match.matchedAmount,
        matchedPrice: match.matchedPrice,
        matchedAt: match.createdAt,
        status: match.status,
        counterparty: {
          orderId: match.originalOrderId === parseInt(orderId) ? 
            match.matchingOrderId : match.originalOrderId,
          side: match.originalOrderId === parseInt(orderId) ? 
            match.matchingSide : match.originalSide,
          // 🆕 상대방 주문 정보 추가
          order: match.originalOrderId === parseInt(orderId) ? 
            match.matchingOrder : match.originalOrder
        }
      }))
    });
    
  } catch (error) {
    console.error('주문 매칭 내역 조회 오류:', error);
    res.status(500).json({ message: '매칭 내역 조회 중 오류가 발생했습니다.' });
  }
});

// 사용자 주문 내역 조회 (상태별 필터링 지원)
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;
    
    // ✅ 현재 시간보다 미래 경기만 조회 (open/partially_matched 상태만)
    const now = new Date();
    
    // Where 조건 구성
    const whereCondition = { userId };
    if (status) {
      whereCondition.status = status;
    } else {
      // ✅ status 파라미터가 없으면 모든 상태 조회 (과거 주문도 포함)
      whereCondition[Op.or] = [
        { status: 'open' },
        { status: 'partially_matched' },
        { status: 'matched' },
        { status: 'active' },
        { status: 'settled' },
        { status: 'cancelled' }
      ];
      // ✅ 사용자 주문 내역은 과거 주문도 포함하도록 commenceTime 필터 제거
    }
    
    const orders = await ExchangeOrder.findAll({
      where: whereCondition,
      order: [['createdAt', 'DESC']],
      limit: 50,
      // 🆕 매칭 정보도 함께 조회
      include: [
        {
          model: ExchangeOrderMatch,
          as: 'originalMatches',
          required: false
        },
        {
          model: ExchangeOrderMatch,
          as: 'matchingMatches',
          required: false
        }
      ]
    });
    
    // 🆕 부분 매칭 정보 포함한 응답 + 가중치 적용 + 게임 결과 정보
    const ordersWithMatchInfo = await Promise.all(orders.map(async order => {
      const orderData = order.toJSON();
      
      // 환수율 조정은 프론트엔드에서 처리 (정확한 배열 기반 계산을 위해)
      let displayPrice = orderData.price;
      
        // 🆕 게임 결과 정보 조회
        let gameResult = null;
        if (orderData.homeTeam && orderData.awayTeam && orderData.commenceTime) {
          try {
            // 🚀 중앙화된 경기 결과 조회 사용
            const config = getLocationConfig('exchangeRoutes');
            
            if (config.FEATURE_FLAGS?.USE_CENTRALIZED_QUERY) {
              console.log(`[exchangeRoutes] Using centralized query`);
              gameResult = await GameResultQuery.findByTeamsAndTime(
                orderData.homeTeam,
                orderData.awayTeam,
                orderData.commenceTime,
                'exchangeRoutes'
              );
            } else {
              // 레거시 로직 (Feature Flag가 비활성화된 경우)
              console.log(`[exchangeRoutes] Using legacy query`);
              const GameResult = (await import('../models/gameResultModel.js')).default;
              gameResult = await GameResult.findOne({
                where: {
                  homeTeam: orderData.homeTeam,
                  awayTeam: orderData.awayTeam,
                  commenceTime: new Date(orderData.commenceTime)
                }
              });
            }
            
            if (gameResult) {
              gameResult = {
                score: gameResult.score,
                status: gameResult.status,
                result: gameResult.status, // 호환성을 위해 status를 result로 복사
                homeTeam: gameResult.homeTeam,
                awayTeam: gameResult.awayTeam,
                updatedAt: gameResult.updatedAt
              };
            }
          } catch (error) {
            console.log('게임 결과 조회 오류:', error.message);
          }
        }
      
      // ✅ 내 주문 목록: 매칭하는 사람이 낼 금액 표시
      // - Back 주문 → LAY 매처가 낼 담보금
      // - LAY 주문 → Back 매처가 낼 배팅금
      const remainingAmt = order.remainingAmount || order.amount;
      const displayAmount = order.side === 'back'
        ? Math.floor(remainingAmt * (order.price - 1)) // LAY 담보금
        : remainingAmt; // Back 배팅금

      return {
        ...orderData,
        price: displayPrice, // 사용자에게 표시할 환수율 적용된 배당율
        originalPrice: orderData.price, // 원본 배당율 보존
        displayAmount: displayAmount, // ✅ 매칭할 사람이 낼 금액
        gameResult: gameResult, // 🆕 게임 결과 정보 추가
        // ✅ 멀티배팅 필드 추가
        isMultibet: order.isMultibet || false,
        totalOdds: order.totalOdds,
        selectionCount: order.selectionCount,
        selectionDetails: order.selectionDetails,
        potentialWinnings: order.potentialWinnings,
        matchInfo: {
          originalAmount: order.originalAmount || order.amount,
          filledAmount: order.filledAmount || 0,
          remainingAmount: order.remainingAmount || order.amount,
          partiallyFilled: order.partiallyFilled || false,
          fillPercentage: order.originalAmount ? 
            Math.round((order.filledAmount || 0) / order.originalAmount * 100) : 0,
          matchCount: (order.originalMatches?.length || 0) + (order.matchingMatches?.length || 0)
        }
      };
    }));
    
    res.json(ordersWithMatchInfo);
  } catch (error) {
    console.error('Exchange orders error:', error);
    res.status(500).json({ message: '주문 내역 조회 중 오류가 발생했습니다.' });
  }
});

// 🆕 특정 주문 정보 조회 (공개 API - 토큰 불필요)
router.get('/order/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await ExchangeOrder.findByPk(id);
    
    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }
    
    res.json({
      id: order.id,
      gameId: order.gameId,
      userId: order.userId,
      side: order.side,
      price: order.price,
      amount: order.amount,
      status: order.status,
      createdAt: order.createdAt,
      selection: order.selection,
      market: order.market,
      line: order.line,
      homeTeam: order.homeTeam,
      awayTeam: order.awayTeam,
      commenceTime: order.commenceTime,
      sportKey: order.sportKey,
      stakeAmount: order.stakeAmount,
      potentialProfit: order.potentialProfit,
      originalAmount: order.originalAmount || order.amount,
      remainingAmount: order.remainingAmount || order.amount,
      filledAmount: order.filledAmount || 0,
      partiallyFilled: order.partiallyFilled || false,
      // ✅ 멀티배팅 필드 추가
      isMultibet: order.isMultibet || false,
      totalOdds: order.totalOdds,
      selectionCount: order.selectionCount,
      selectionDetails: order.selectionDetails,
      potentialWinnings: order.potentialWinnings
    });
  } catch (error) {
    console.error('주문 조회 오류:', error);
    res.status(500).json({ message: '주문 조회 중 오류가 발생했습니다.' });
  }
});

// 전체 오픈 주문 조회 (공개 API - 토큰 불필요)
router.get('/all-orders', async (req, res) => {
  try {
    // ✅ 현재 시간보다 미래 경기만 조회 (이미 지난 경기 제외)
    const now = new Date();
    
    // 🆕 부분 매칭된 주문도 포함하여 조회 (matched, active 포함)
    const orders = await ExchangeOrder.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { status: 'open' },
              { 
                status: 'partially_matched',
                remainingAmount: { [Op.gt]: 0 }
              },
              // ✅ matched/active 상태도 remainingAmount가 있으면 포함 (부분 매칭)
              { 
                status: 'matched',
                remainingAmount: { [Op.gt]: 0 }
              },
              { 
                status: 'active',
                remainingAmount: { [Op.gt]: 0 }
              }
            ]
          },
          // ✅ 경기 시작 시간이 현재보다 미래인 주문만 (10분 여유)
          {
            commenceTime: {
              [Op.gt]: new Date(now.getTime() - 10 * 60 * 1000)
            }
          }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    
    // ✅ 올바른 표시 금액 로직: amount는 항상 원래 베팅금
    const ordersWithGameInfo = orders.map(order => {
      // ✅ 오더북: 매칭하는 사람이 낼 금액 표시
      // - Back 주문 → LAY 매처가 낼 담보금
      // - LAY 주문 → Back 매처가 낼 배팅금
      const remainingAmt = order.remainingAmount || order.amount;
      const displayAmount = order.side === 'back'
        ? Math.floor(remainingAmt * (order.price - 1)) // LAY 담보금
        : remainingAmt; // Back 배팅금
      
      console.log(`🔍 [ALL-ORDERS-v2] 주문 ${order.id} displayAmount 계산:`, {
        side: order.side,
        amount: order.amount,
        remainingAmt: remainingAmt,
        price: order.price,
        계산: order.side === 'back' ? `${remainingAmt} × (${order.price} - 1) = ${displayAmount}` : remainingAmt,
        displayAmount: displayAmount
      });
      
      return {
        id: order.id,
        gameId: order.gameId,
        userId: order.userId,
        side: order.side,
        price: order.price,
        amount: order.amount, // ✅ 원래 베팅금 (절대 변경 안 됨!)
        status: order.status,
        createdAt: order.createdAt,
        selection: order.selection,
        market: order.market,
        line: order.line,
        // 게임 정보를 직접 필드로 반환
        homeTeam: order.homeTeam,
        awayTeam: order.awayTeam,
        commenceTime: order.commenceTime,
        sportKey: order.sportKey,
        stakeAmount: order.stakeAmount,
        potentialProfit: order.potentialProfit,
        backOdds: order.backOdds,
        layOdds: order.layOdds,
        oddsSource: order.oddsSource,
        oddsUpdatedAt: order.oddsUpdatedAt,
        // 🆕 부분 매칭 정보 추가
        originalAmount: order.originalAmount || order.amount,
        remainingAmount: order.remainingAmount || order.amount,
        filledAmount: order.filledAmount || 0,
        partiallyFilled: order.partiallyFilled || false,
        displayAmount: displayAmount, // ✅ 매칭할 사람이 낼 금액!
        // 🆕 멀티배팅 필드 추가
        isMultibet: order.isMultibet || false,
        totalOdds: order.totalOdds,
        selectionCount: order.selectionCount,
        selectionDetails: order.selectionDetails,
        potentialWinnings: order.potentialWinnings
      };
    });
    
    console.log('전체 오픈 주문 조회:', ordersWithGameInfo.length, '개');
    res.json(ordersWithGameInfo);
  } catch (error) {
    console.error('전체 오픈 주문 조회 오류:', error);
    res.status(500).json({ message: '전체 주문 조회 중 오류가 발생했습니다.' });
  }
});

// Exchange 거래 통계 조회
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 전체 거래 통계
    const totalOrders = await ExchangeOrder.count({ where: { userId } });
    const matchedOrders = await ExchangeOrder.count({ where: { userId, status: 'matched' } });
    const settledOrders = await ExchangeOrder.count({ where: { userId, status: 'settled' } });
    const cancelledOrders = await ExchangeOrder.count({ where: { userId, status: 'cancelled' } });
    
    // 수익 통계
    const totalStake = await ExchangeOrder.sum('stakeAmount', { where: { userId } });
    const totalPotentialProfit = await ExchangeOrder.sum('potentialProfit', { where: { userId } });
    const totalActualProfit = await ExchangeOrder.sum('actualProfit', { where: { userId, status: 'settled' } });
    
    // 승률 계산
    const winOrders = await ExchangeOrder.count({ 
      where: { userId, status: 'settled', actualProfit: { [require('sequelize').Op.gt]: 0 } }
    });
    const winRate = settledOrders > 0 ? (winOrders / settledOrders * 100).toFixed(2) : 0;
    
    res.json({
      totalOrders,
      matchedOrders,
      settledOrders,
      cancelledOrders,
      totalStake: totalStake || 0,
      totalPotentialProfit: totalPotentialProfit || 0,
      totalActualProfit: totalActualProfit || 0,
      winRate: parseFloat(winRate),
      netProfit: (totalActualProfit || 0) - (totalStake || 0)
    });
  } catch (error) {
    console.error('Exchange stats error:', error);
    res.status(500).json({ message: '통계 조회 중 오류가 발생했습니다.' });
  }
});

// Exchange에서 사용 가능한 게임 목록 조회
router.get('/games', async (req, res) => {
  try {
    const { category, sport } = req.query;
    console.log('🎮 Exchange 게임 목록 요청:', { category, sport });
    
    // 카테고리를 스포츠키로 변환 (복합 카테고리 지원)
    let targetSportKey = sport;
    if (category && !sport) {
      // "축구 > K리그" 형태의 복합 카테고리 처리
      let actualCategory = category;
      if (category.includes(' > ')) {
        const [mainCat, subCat] = category.split(' > ');
        actualCategory = subCat; // 서브 카테고리만 사용
        console.log('🔍 복합 카테고리 파싱:', { mainCat, subCat, actualCategory });
      }
      
      const categoryToSportKey = {
        'KBO': 'baseball_kbo',
        'MLB': 'baseball_mlb', 
        'NBA': 'basketball_nba',
        'KBL': 'basketball_kbl',
        'NFL': 'americanfootball_nfl',
        'K리그': 'soccer_korea_kleague1',
        'EPL': 'soccer_epl',
        'LaLiga': 'soccer_spain_primera_division',
        'Bundesliga': 'soccer_germany_bundesliga',
        'Serie A': 'soccer_italy_serie_a',
        'J리그': 'soccer_japan_j_league',
        'MLS': 'soccer_usa_mls',
        '브라질 세리에 A': 'soccer_brazil_campeonato',
        '아르헨티나 프리메라': 'soccer_argentina_primera_division',
        '중국 슈퍼리그': 'soccer_china_superleague'
      };
      targetSportKey = categoryToSportKey[actualCategory];
    }
    
    console.log('🔍 스포츠키 변환:', { category, sport, targetSportKey });
    
    // 사용 가능한 게임들 조회 (앞으로 7일 이내의 예정된 경기)
    const availableGames = await exchangeGameMappingService.getAvailableGames({
      sportKey: targetSportKey,
      limit: 50
    });
    
    // 카테고리별 필터링 (백업 필터)
    let filteredGames = availableGames;
    if (category && !targetSportKey) {
      // 카테고리 매핑이 없는 경우 직접 필터링
      const categoryFilters = {
        'KBO': (game) => game.sportKey === 'baseball_kbo' || game.category === 'baseball',
        'MLB': (game) => game.sportKey === 'baseball_mlb' || game.category === 'baseball',
        'NBA': (game) => game.sportKey === 'basketball_nba' || game.category === 'basketball',
        'KBL': (game) => game.sportKey === 'basketball_kbl' || game.category === 'basketball',
        'NFL': (game) => game.sportKey === 'american_football_nfl' || game.category === 'american_football'
      };
      
      const filter = categoryFilters[category];
      if (filter) {
        filteredGames = availableGames.filter(filter);
      }
    }
    
    console.log(`📊 전체 게임: ${availableGames.length}개, 필터링 후: ${filteredGames.length}개`);
    
    res.json({
      games: filteredGames,
      total: filteredGames.length
    });
    
  } catch (error) {
    console.error('❌ Exchange 게임 목록 조회 오류:', error);
    res.status(500).json({ message: '게임 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 경기별 Exchange 마켓 정보 조회 (실제 게임 데이터 연동)
router.get('/markets/:gameId', verifyToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    console.log('🏟️ 게임 마켓 정보 조회:', gameId);
    
    // GameResults에서 게임 정보 조회
    const games = await exchangeGameMappingService.getAvailableGames({ limit: 100 });
    const game = games.find(g => g.id === gameId || g.eventId === gameId);
    
    if (!game) {
      return res.status(404).json({ message: '게임을 찾을 수 없습니다.' });
    }
    
    console.log('🎯 게임 정보:', {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      sportKey: game.sportKey
    });
    
    res.json({ 
      game: {
        id: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        commenceTime: game.commenceTime,
        sportKey: game.sportKey,
        league: game.league
      },
      markets: game.availableMarkets
    });
    
  } catch (error) {
    console.error('Exchange markets error:', error);
    res.status(500).json({ message: '마켓 정보 조회 중 오류가 발생했습니다.' });
  }
});

// 새로운 주문 생성 (기존 주문과 즉시 매칭 시도)
router.post('/match-order', verifyToken, async (req, res) => {
  const { gameId, market, line, side, price, amount, selection } = req.body;
  const userId = req.user.userId; // 수정: userId 사용

  try {
    console.log(`🎯 매치 주문 요청: ${side} ${price} (${amount}원) - User: ${userId}`);
    console.log(`📊 요청 데이터:`, { gameId, market, line, side, price, amount, selection });

    // 1. 매칭 가능한 반대편 주문 찾기
    const oppositeSide = side === 'back' ? 'lay' : 'back';
    let matchingOrders;

    console.log(`🔍 매칭 검색 조건: gameId=${gameId}, market=${market}, line=${line}, side=${side}, price=${price}, userId=${userId}`);
    
    if (side === 'back') {
      // Back 주문 → Lay 주문 중 price 이하인 것들과 매칭 (자신의 주문 제외)
      matchingOrders = await ExchangeOrder.findAll({
        where: {
          gameId,
          market,
          line,
          side: 'lay',
          price: { [Op.lte]: price },
          status: 'open',
          userId: { [Op.ne]: userId } // 자신의 주문 제외
        },
        order: [['price', 'ASC']] // 낮은 가격부터
      });
      console.log(`🔍 Back 주문 매칭 검색: ${matchingOrders.length}개 발견`);
    } else {
      // Lay 주문 → Back 주문 중 price 이상인 것들과 매칭 (자신의 주문 제외)
      matchingOrders = await ExchangeOrder.findAll({
        where: {
          gameId,
          market,
          line,
          side: 'back',
          price: { [Op.gte]: price },
          status: 'open',
          userId: { [Op.ne]: userId } // 자신의 주문 제외
        },
        order: [['price', 'DESC']] // 높은 가격부터
      });
      console.log(`🔍 Lay 주문 매칭 검색: ${matchingOrders.length}개 발견`);
    }

    console.log(`📊 매칭 가능한 주문: ${matchingOrders.length}개`);
    
    // 매칭 가능한 주문들의 상세 정보 로깅
    if (matchingOrders.length > 0) {
      console.log(`📋 매칭 가능한 주문 상세:`);
      matchingOrders.forEach((order, index) => {
        console.log(`  ${index + 1}. ID: ${order.id}, User: ${order.userId}, Side: ${order.side}, Price: ${order.price}, Amount: ${order.amount}`);
      });
    }

    // 매칭 가능한 주문이 없는 경우 처리
    if (matchingOrders.length === 0) {
      console.log(`⚠️ 매칭 가능한 주문이 없습니다. 새 주문만 생성합니다.`);
      console.log(`🔒 방어 로직: 자신의 주문(${userId})은 매칭에서 제외됨`);
    }

    let remainingAmount = amount;
    const matches = [];

    // 2. 순차적으로 매칭 처리
    for (const existingOrder of matchingOrders) {
      if (remainingAmount <= 0) break;

      // 🔒 추가 방어 로직: 매칭 시점에서도 사용자 ID 재확인
      if (existingOrder.userId === userId) {
        console.log(`🚫 방어 로직 작동: 자신의 주문(${existingOrder.id})과 매칭 시도 차단`);
        continue; // 이 주문은 건너뛰고 다음 주문으로
      }

      const matchAmount = Math.min(remainingAmount, existingOrder.amount);
      const matchPrice = existingOrder.price; // 기존 주문의 가격으로 매칭

      console.log(`🔄 매칭: ${matchAmount}원 at ${matchPrice} (상대방: ${existingOrder.userId})`);

      // 기존 주문 matched 처리
      await existingOrder.update({
        status: 'matched',
        matchedOrderId: null // 이후에 본인 주문 id로 연결
      });

      // 원본 오더 정보 추출
      const baseSelection = existingOrder.selection;
      const baseHomeTeam = existingOrder.homeTeam;
      const baseAwayTeam = existingOrder.awayTeam;

      // 게임 데이터 매핑 (본인 matched 주문용)
      let orderData = await exchangeGameMappingService.mapGameDataToOrder({
        gameId, market, line, side, price, amount: matchAmount, selection: selection || baseSelection, userId
      });
      // selection, homeTeam, awayTeam을 항상 원본 오더 우선 복사
      orderData.selection = selection || baseSelection;
      orderData.homeTeam = orderData.homeTeam || baseHomeTeam;
      orderData.awayTeam = orderData.awayTeam || baseAwayTeam;

      // 본인 matched 주문 생성
      const myMatchedOrder = await ExchangeOrder.create({
        userId,
        gameId,
        market,
        line,
        side,
        price,
        amount: matchAmount,
        selection: orderData.selection,
        status: side === 'lay' ? 'active' : 'matched', // 🆕 Lay는 active 상태로 생성
        matchedOrderId: existingOrder.id,
        homeTeam: orderData.homeTeam,
        awayTeam: orderData.awayTeam,
        commenceTime: new Date(orderData.commenceTime), // UTC로 변환하여 저장
        sportKey: orderData.sportKey,
        selectionDetails: orderData.selectionDetails,
        stakeAmount: side === 'back' ? matchAmount : Math.floor((price - 1) * matchAmount),
        potentialProfit: side === 'back' ? Math.floor((price - 1) * matchAmount) : matchAmount, // ✅ 순수익
        autoSettlement: true,
        // 🆕 스포츠북 배당율 정보 사용
        backOdds: orderData.backOdds,
        layOdds: orderData.layOdds,
        oddsSource: orderData.oddsSource || 'exchange',
        oddsUpdatedAt: orderData.oddsUpdatedAt || new Date()
      });

      // 기존 주문에도 matchedOrderId 연결
      await existingOrder.update({
        matchedOrderId: myMatchedOrder.id
      });

      remainingAmount -= matchAmount;
      
      matches.push({
        matchedOrderId: existingOrder.id,
        myOrderId: myMatchedOrder.id,
        matchAmount,
        matchPrice,
        counterpartyUserId: existingOrder.userId
      });
    }

    // 3. 새 주문 생성 (남은 금액이 있으면)
    let newOrder = null;
    if (remainingAmount > 0) {
      console.log(`🔧 게임 매핑 시작...`);
      // 게임 데이터 매핑
      const orderData = await exchangeGameMappingService.mapGameDataToOrder({
        gameId, market, line, side, price, amount: remainingAmount, selection, userId
      });
      console.log(`✅ 게임 매핑 완료:`, { 
        sportKey: orderData.sportKey,
        homeTeam: orderData.homeTeam,
        awayTeam: orderData.awayTeam
      });
      
      newOrder = await ExchangeOrder.create({
        userId,
        gameId,
        market,
        line,
        side,
        price,
        amount: remainingAmount,
        selection,
        status: 'open',
        // filledAmount: amount - remainingAmount, // 이 필드는 테이블에 없음
        // 게임 매핑 데이터 추가
        homeTeam: orderData.homeTeam,
        awayTeam: orderData.awayTeam,
        commenceTime: new Date(orderData.commenceTime), // UTC로 변환하여 저장
        sportKey: orderData.sportKey,
        selectionDetails: orderData.selectionDetails,
        stakeAmount: side === 'back' ? remainingAmount : Math.floor((price - 1) * remainingAmount),
        potentialProfit: side === 'back' ? Math.floor((price - 1) * remainingAmount) : remainingAmount, // ✅ 순수익
        autoSettlement: true,
        // 🆕 스포츠북 배당율 정보 사용
        backOdds: orderData.backOdds,
        layOdds: orderData.layOdds,
        oddsSource: orderData.oddsSource || 'exchange',
        oddsUpdatedAt: orderData.oddsUpdatedAt || new Date()
      });
      console.log(`📝 새 주문 생성: ${remainingAmount}원 (부분 매칭)`);
    } else {
      console.log(`✅ 완전 매칭 완료: ${amount}원`);
    }

    // 4. 매칭 결과 응답
    res.json({
      success: true,
      matches: matches.length,
      totalMatched: amount - remainingAmount,
      remainingAmount,
      newOrder: newOrder ? {
        id: newOrder.id,
        amount: newOrder.amount,
        status: newOrder.status
      } : null,
      matchDetails: matches
    });

  } catch (error) {
    console.error('❌ 매치 주문 오류:', error);
    res.status(500).json({ error: '매치 주문 처리 중 오류가 발생했습니다.' });
  }
});

// 🆕 경기 식별자 기반 정산 (관리자 전용) - 점수 입력 방식
router.post('/settle/:homeTeam/:awayTeam/:commenceTime', verifyToken, async (req, res) => {
  try {
    const { homeTeam, awayTeam, commenceTime } = req.params;
    const { homeScore, awayScore } = req.body;
    
    // 관리자 권한 확인
    const user = await User.findByPk(req.user.userId);
    if (!user.isAdmin) {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    // 점수 유효성 검사
    if (homeScore === undefined || awayScore === undefined) {
      return res.status(400).json({ message: '홈팀과 어웨이팀 점수를 모두 입력해주세요.' });
    }
    
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      return res.status(400).json({ message: '올바른 점수를 입력해주세요. (0 이상의 정수)' });
    }
    
    console.log(`🎯 관리자 ${user.username}이 경기 정산 요청: ${homeTeam} vs ${awayTeam} (${homeScore}:${awayScore})`);
    
    // 점수를 기반으로 정산 결과 결정
    let result;
    if (homeScore > awayScore) {
      result = 'home_win';
    } else if (homeScore < awayScore) {
      result = 'away_win';
    } else {
      result = 'draw';
    }
    
    console.log(`📊 정산 결과: ${result} (${homeScore}:${awayScore})`);
    
    const settlementResult = await exchangeSettlementService.settleGameOrdersByMatchWithResult(
      homeTeam, 
      awayTeam, 
      new Date(commenceTime),
      result,
      { homeScore: parseInt(homeScore), awayScore: parseInt(awayScore) }
    );
    
    res.json({
      message: '정산이 완료되었습니다.',
      result: settlementResult,
      gameResult: {
        homeTeam,
        awayTeam,
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        result
      }
    });
    
  } catch (error) {
    console.error('정산 오류:', error);
    res.status(500).json({ 
      message: '정산 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});


// 모든 완료된 경기 자동 정산 (관리자 전용)
router.post('/settle-all', verifyToken, async (req, res) => {
  try {
    // 관리자 권한 확인
    const user = await User.findByPk(req.user.userId);
    if (!user.isAdmin) {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    console.log(`🎯 관리자 ${user.username}이 전체 자동 정산 요청`);
    
    const result = await exchangeSettlementService.settleAllFinishedGames();
    
    res.json({
      message: `${result.settledGames}개 경기 정산이 완료되었습니다.`,
      result
    });
    
  } catch (error) {
    console.error('전체 정산 오류:', error);
    res.status(500).json({ 
      message: '전체 정산 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 🆕 경기 식별자 기반 정산 가능한 주문 조회
router.get('/settleable/:homeTeam/:awayTeam/:commenceTime', verifyToken, async (req, res) => {
  try {
    const { homeTeam, awayTeam, commenceTime } = req.params;
    
    // 경기 식별자로 정산 가능한 주문 조회
    const orders = await ExchangeOrder.findAll({
      where: {
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        commenceTime: {
          [Op.between]: [
            new Date(new Date(commenceTime).getTime() - 2 * 60 * 60 * 1000),
            new Date(new Date(commenceTime).getTime() + 2 * 60 * 60 * 1000)
          ]
        },
        status: { [Op.in]: ['matched', 'partially_matched'] },
        settledAt: null
      }
    });
    
    res.json({
      homeTeam,
      awayTeam,
      commenceTime,
      settlableOrders: orders.length,
      orders: orders.map(order => ({
        id: order.id,
        market: order.market,
        side: order.side,
        selection: order.selection,
        amount: order.amount,
        price: order.price
      }))
    });
    
  } catch (error) {
    console.error('정산 가능한 주문 조회 오류:', error);
    res.status(500).json({ 
      message: '정산 가능한 주문 조회 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});


// 🆕 부분 매칭 통계 조회 API
router.get('/partial-matching-stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 사용자의 부분 매칭 관련 주문들 조회
    const partialMatchingOrders = await ExchangeOrder.findAll({
      where: {
        userId,
        [Op.or]: [
          { status: 'partially_matched' },
          { 
            status: 'open',
            partiallyFilled: true
          }
        ]
      }
    });
    
    // 통계 계산
    const stats = {
      totalPartialMatchingOrders: partialMatchingOrders.length,
      totalOriginalAmount: partialMatchingOrders.reduce((sum, order) => 
        sum + (order.originalAmount || order.amount), 0),
      totalFilledAmount: partialMatchingOrders.reduce((sum, order) => 
        sum + (order.filledAmount || 0), 0),
      totalRemainingAmount: partialMatchingOrders.reduce((sum, order) => 
        sum + (order.remainingAmount || 0), 0),
      averageMatchProgress: partialMatchingOrders.length > 0 ? 
        Math.round(partialMatchingOrders.reduce((sum, order) => {
          const progress = order.originalAmount ? 
            ((order.filledAmount || 0) / order.originalAmount) * 100 : 0;
          return sum + progress;
        }, 0) / partialMatchingOrders.length) : 0
    };
    
    // 상세 정보
    const detailedOrders = partialMatchingOrders.map(order => ({
      id: order.id,
      gameId: order.gameId,
      homeTeam: order.homeTeam,
      awayTeam: order.awayTeam,
      side: order.side,
      price: order.price,
      originalAmount: order.originalAmount || order.amount,
      filledAmount: order.filledAmount || 0,
      remainingAmount: order.remainingAmount || 0,
      matchProgress: order.originalAmount ? 
        Math.round(((order.filledAmount || 0) / order.originalAmount) * 100) : 0,
      createdAt: order.createdAt,
      lastMatchedAt: order.updatedAt
    }));
    
    res.json({
      success: true,
      stats,
      orders: detailedOrders
    });
    
  } catch (error) {
    console.error('부분 매칭 통계 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '부분 매칭 통계 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 🆕 부분 매칭 이력 조회 API
router.get('/partial-matching-history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;
    
    // 사용자의 부분 매칭 이력 조회
    const matches = await ExchangeOrderMatch.findAll({
      where: {
        [Op.or]: [
          { 
            '$originalOrder.userId$': userId 
          },
          { 
            '$matchingOrder.userId$': userId 
          }
        ]
      },
      include: [
        {
          model: ExchangeOrder,
          as: 'originalOrder',
          required: false
        },
        {
          model: ExchangeOrder,
          as: 'matchingOrder',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // 이력 정보 구성
    const history = matches.map(match => {
      const isOriginalOrder = match.originalOrder?.userId === userId;
      const counterpartyOrder = isOriginalOrder ? match.matchingOrder : match.originalOrder;
      
      return {
        id: match.id,
        matchType: isOriginalOrder ? '매칭 요청' : '매칭 응답',
        matchedAmount: match.matchedAmount,
        matchedPrice: match.matchedPrice,
        matchedAt: match.createdAt,
        status: match.status,
        gameInfo: {
          homeTeam: counterpartyOrder?.homeTeam,
          awayTeam: counterpartyOrder?.awayTeam,
          gameId: counterpartyOrder?.gameId
        },
        counterparty: {
          orderId: counterpartyOrder?.id,
          side: counterpartyOrder?.side,
          price: counterpartyOrder?.price
        }
      };
    });
    
    res.json({
      success: true,
      history,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: history.length
      }
    });
    
  } catch (error) {
    console.error('부분 매칭 이력 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '부분 매칭 이력 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 🆕 개인 정산 정보 조회 API (PaymentHistory 기반)
router.get('/settlement-history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, startDate, endDate, limit = 50, offset = 0 } = req.query;
    
    const whereClause = { userId };
    
    // Exchange 정산 관련 필터링
    if (type === 'exchange') {
      whereClause.betId = { [Op.like]: 'EXCHANGE_%' };
    } else if (type === 'settlement') {
      whereClause.memo = { [Op.like]: '%정산%' };
    } else if (type === 'refund') {
      whereClause.memo = { [Op.like]: '%환불%' };
    }
    
    // 날짜 범위 필터링
    if (startDate && endDate) {
      whereClause.paidAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const paymentHistory = await PaymentHistory.findAll({
      where: whereClause,
      order: [['paidAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Exchange 주문 정보와 연결
    const settlementHistory = await Promise.all(
      paymentHistory.map(async (payment) => {
        let exchangeOrderInfo = null;
        
        // Exchange 주문인 경우 추가 정보 조회
        if (payment.betId && payment.betId.startsWith('EXCHANGE_')) {
          const exchangeOrderId = payment.betId.replace('EXCHANGE_', '');
          try {
            const exchangeOrder = await ExchangeOrder.findByPk(exchangeOrderId);
            if (exchangeOrder) {
              exchangeOrderInfo = {
                id: exchangeOrder.id,
                gameId: exchangeOrder.gameId,
                homeTeam: exchangeOrder.homeTeam,
                awayTeam: exchangeOrder.awayTeam,
                side: exchangeOrder.side,
                price: exchangeOrder.price,
                amount: exchangeOrder.amount,
                status: exchangeOrder.status,
                actualProfit: exchangeOrder.actualProfit,
                settledAt: exchangeOrder.settledAt
              };
            }
          } catch (error) {
            console.warn(`Exchange 주문 ${exchangeOrderId} 조회 실패:`, error.message);
          }
        }
        
        return {
          id: payment.id,
          betId: payment.betId,
          amount: parseFloat(payment.amount),
          balanceAfter: parseFloat(payment.balanceAfter),
          memo: payment.memo,
          paidAt: payment.paidAt,
          exchangeOrder: exchangeOrderInfo
        };
      })
    );
    
    // 통계 계산
    const summary = {
      totalAmount: settlementHistory.reduce((sum, p) => sum + p.amount, 0),
      count: settlementHistory.length,
      exchangeCount: settlementHistory.filter(p => p.betId && p.betId.startsWith('EXCHANGE_')).length,
      settlementCount: settlementHistory.filter(p => p.memo && p.memo.includes('정산')).length,
      refundCount: settlementHistory.filter(p => p.memo && p.memo.includes('환불')).length
    };
    
    res.json({
      success: true,
      data: settlementHistory,
      summary,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: settlementHistory.length
      }
    });
    
  } catch (error) {
    console.error('개인 정산 정보 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '개인 정산 정보 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 🆕 통합 정산 리포트 API (Exchange 주문 + PaymentHistory)
router.get('/unified-settlement-report', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, limit = 100 } = req.query;
    
    console.log(`📊 사용자 ${userId} 통합 정산 리포트 생성 중...`);
    
    // 1. 정산된 Exchange 주문 조회
    const exchangeWhereClause = { 
      userId, 
      status: 'settled' 
    };
    
    if (startDate && endDate) {
      exchangeWhereClause.settledAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const settledOrders = await ExchangeOrder.findAll({
      where: exchangeWhereClause,
      order: [['settledAt', 'DESC']],
      limit: parseInt(limit)
    });
    
    // 2. Exchange 관련 PaymentHistory 조회 (기존 데이터 포함)
    const paymentWhereClause = { userId };
    
    // Exchange 관련 필터링 (새로운 형식 + 기존 형식)
    paymentWhereClause[Op.or] = [
      { betId: { [Op.like]: 'EXCHANGE_%' } }, // 새로운 형식
      { 
        betId: null,
        memo: { [Op.or]: [
          { [Op.like]: '%Exchange%' },
          { [Op.like]: '%매칭 배팅%' },
          { [Op.like]: '%정산%' },
          { [Op.like]: '%환불%' }
        ]}
      } // 기존 형식
    ];
    
    if (startDate && endDate) {
      paymentWhereClause.paidAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const paymentHistory = await PaymentHistory.findAll({
      where: paymentWhereClause,
      order: [['paidAt', 'DESC']],
      limit: parseInt(limit)
    });
    
    // 3. 통합 리포트 데이터 구성
    const unifiedReport = [];
    
    // Exchange 주문 데이터 추가
    settledOrders.forEach(order => {
      unifiedReport.push({
        type: 'exchange_order',
        id: order.id,
        betId: `EXCHANGE_${order.id}`,
        amount: parseFloat(order.actualProfit || 0),
        balanceAfter: null, // Exchange 주문에는 잔고 정보 없음
        memo: order.settlementNote || 'Exchange 정산',
        paidAt: order.settledAt,
        exchangeOrder: {
          id: order.id,
          gameId: order.gameId,
          homeTeam: order.homeTeam,
          awayTeam: order.awayTeam,
          side: order.side,
          price: order.price,
          amount: order.amount,
          status: order.status,
          actualProfit: order.actualProfit,
          settledAt: order.settledAt
        }
      });
    });
    
    // PaymentHistory 데이터 추가
    paymentHistory.forEach(payment => {
      let exchangeOrderInfo = null;
      
      // Exchange 주문 정보 연결
      if (payment.betId && payment.betId.startsWith('EXCHANGE_')) {
        const exchangeOrderId = payment.betId.replace('EXCHANGE_', '');
        const order = settledOrders.find(o => o.id == exchangeOrderId);
        if (order) {
          exchangeOrderInfo = {
            id: order.id,
            gameId: order.gameId,
            homeTeam: order.homeTeam,
            awayTeam: order.awayTeam,
            side: order.side,
            price: order.price,
            amount: order.amount,
            status: order.status,
            actualProfit: order.actualProfit,
            settledAt: order.settledAt
          };
        }
      }
      
      unifiedReport.push({
        type: 'payment_history',
        id: payment.id,
        betId: payment.betId,
        amount: parseFloat(payment.amount),
        balanceAfter: parseFloat(payment.balanceAfter),
        memo: payment.memo,
        paidAt: payment.paidAt,
        exchangeOrder: exchangeOrderInfo
      });
    });
    
    // 4. 시간순 정렬 및 중복 제거
    unifiedReport.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
    
    // 5. 통계 계산
    const summary = {
      totalSettledOrders: settledOrders.length,
      totalPaymentHistory: paymentHistory.length,
      totalUnifiedRecords: unifiedReport.length,
      totalAmount: unifiedReport.reduce((sum, r) => sum + r.amount, 0),
      exchangeOrdersWithPaymentHistory: paymentHistory.filter(p => p.betId && p.betId.startsWith('EXCHANGE_')).length,
      legacyPaymentHistory: paymentHistory.filter(p => !p.betId || !p.betId.startsWith('EXCHANGE_')).length,
      settlementCount: unifiedReport.filter(r => r.memo && r.memo.includes('정산')).length,
      refundCount: unifiedReport.filter(r => r.memo && r.memo.includes('환불')).length
    };
    
    // 6. 사용자별 상세 통계
    const userStats = {
      totalProfit: settledOrders.reduce((sum, order) => sum + parseFloat(order.actualProfit || 0), 0),
      averageProfit: settledOrders.length > 0 ? 
        settledOrders.reduce((sum, order) => sum + parseFloat(order.actualProfit || 0), 0) / settledOrders.length : 0,
      winCount: settledOrders.filter(order => parseFloat(order.actualProfit || 0) > 0).length,
      lossCount: settledOrders.filter(order => parseFloat(order.actualProfit || 0) < 0).length,
      winRate: settledOrders.length > 0 ? 
        (settledOrders.filter(order => parseFloat(order.actualProfit || 0) > 0).length / settledOrders.length * 100).toFixed(2) : 0
    };
    
    res.json({
      success: true,
      data: unifiedReport,
      summary,
      userStats,
      pagination: {
        limit: parseInt(limit),
        total: unifiedReport.length
      },
      metadata: {
        reportGeneratedAt: new Date(),
        userId: userId,
        dateRange: startDate && endDate ? { startDate, endDate } : 'all'
      }
    });
    
  } catch (error) {
    console.error('통합 정산 리포트 생성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '통합 정산 리포트 생성 중 오류가 발생했습니다.' 
    });
  }
});

// 정산 가능한 경기 목록 조회 (관리자 전용)
router.get('/settlable-games', verifyToken, async (req, res) => {
  try {
    // 관리자 권한 확인
    const user = await User.findByPk(req.user.userId);
    if (!user.isAdmin) {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }

    // 정산 가능한 주문들이 있는 경기들 조회
    const settlableOrders = await ExchangeOrder.findAll({
      where: {
        status: { [Op.in]: ['matched', 'partially_matched'] },
        settledAt: null
      },
      attributes: ['homeTeam', 'awayTeam', 'commenceTime'],
      order: [['homeTeam', 'ASC'], ['awayTeam', 'ASC'], ['commenceTime', 'ASC']],
      raw: true
    });

    // 중복 제거를 위한 Map 사용 (팀명 + 시간으로 고유 키 생성)
    const uniqueGames = new Map();
    settlableOrders.forEach(order => {
      const key = `${order.homeTeam}|${order.awayTeam}|${order.commenceTime}`;
      if (!uniqueGames.has(key)) {
        uniqueGames.set(key, {
          homeTeam: order.homeTeam,
          awayTeam: order.awayTeam,
          commenceTime: order.commenceTime
        });
      }
    });

    // Map을 배열로 변환
    const games = Array.from(uniqueGames.values());

    res.json({
      games,
      total: games.length
    });

  } catch (error) {
    console.error('정산 가능한 경기 조회 오류:', error);
    res.status(500).json({ 
      message: '정산 가능한 경기 조회 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 정산 내역 내보내기 (CSV) - 관리자 전용
router.get('/settlements/export', verifyToken, async (req, res) => {
  try {
    // 관리자 권한 확인
    const user = await User.findByPk(req.user.userId);
    if (!user.isAdmin) {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }

    const { startDate, endDate } = req.query;
    
    // 정산된 주문들 조회
    const whereClause = { 
      status: 'settled',
      settledAt: { [Op.not]: null }
    };
    
    if (startDate && endDate) {
      whereClause.settledAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const settledOrders = await ExchangeOrder.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'email']
      }],
      order: [['settledAt', 'DESC']]
    });

    // CSV 헤더
    const csvHeader = '경기,시장,선택지,사이드,금액,배당,실제수익,사용자,정산일\n';
    
    // CSV 데이터 생성
    const csvData = settledOrders.map(order => {
      const game = `${order.homeTeam} vs ${order.awayTeam}`;
      const user = order.user ? order.user.username : 'Unknown';
      const settledAt = order.settledAt ? new Date(order.settledAt).toISOString() : '';
      
      return [
        `"${game}"`,
        `"${order.market || ''}"`,
        `"${order.selection || ''}"`,
        `"${order.side || ''}"`,
        order.amount || 0,
        order.price || 0,
        order.actualProfit || 0,
        `"${user}"`,
        `"${settledAt}"`
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvData;

    // CSV 파일로 응답
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=settlements_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('정산 내역 내보내기 오류:', error);
    res.status(500).json({ 
      message: '정산 내역 내보내기 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 정산 검증 - 관리자 전용
router.get('/settlements/verify', verifyToken, async (req, res) => {
  try {
    // 관리자 권한 확인
    const user = await User.findByPk(req.user.userId);
    if (!user.isAdmin) {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }

    // 정산된 주문들 조회
    const settledOrders = await ExchangeOrder.findAll({
      where: {
        status: 'settled',
        settledAt: { [Op.not]: null }
      },
      include: [{
        model: PaymentHistory,
        as: 'paymentHistories',
        where: {
          betId: { [Op.like]: 'EXCHANGE_%' }
        },
        required: false,
        on: {
          betId: require('sequelize').literal(`'EXCHANGE_' || "ExchangeOrder"."id"`)
        }
      }]
    });

    let verified = 0;
    const errors = [];

    // 각 정산 주문 검증
    for (const order of settledOrders) {
      // 1. 실제 수익과 PaymentHistory 일치 확인
      const expectedProfit = order.actualProfit || 0;
      const actualPayments = order.paymentHistories.reduce((sum, payment) => sum + payment.amount, 0);
      
      if (expectedProfit !== actualPayments) {
        errors.push({
          orderId: order.id,
          game: `${order.homeTeam} vs ${order.awayTeam}`,
          issue: '실제수익과 결제내역 불일치',
          expected: expectedProfit,
          actual: actualPayments
        });
      } else {
        verified++;
      }

      // 2. 정산 시간 확인
      if (!order.settledAt) {
        errors.push({
          orderId: order.id,
          game: `${order.homeTeam} vs ${order.awayTeam}`,
          issue: '정산 시간 누락'
        });
      }
    }

    res.json({
      verified,
      total: settledOrders.length,
      errors,
      errorCount: errors.length
    });

  } catch (error) {
    console.error('정산 검증 오류:', error);
    res.status(500).json({ 
      message: '정산 검증 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 🆕 정산 상세 조회 API (PaymentHistory 기반)
router.get('/settlements/:gameKey', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user.isAdmin) {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }

    const { gameKey } = req.params;
    // URL 인코딩된 gameKey를 디코딩하고 '|'를 기준으로 분리
    const [homeTeam, awayTeam, commenceTime] = decodeURIComponent(gameKey).split('|');

    console.log('정산 상세 정보 조회:', { homeTeam, awayTeam, commenceTime });

    if (!homeTeam || !awayTeam || !commenceTime) {
      return res.status(400).json({ message: '잘못된 게임 식별자입니다.' });
    }

    // PaymentHistories 테이블에서 정산 데이터 조회 (환불 제외)
    const searchConditions = {
      memo: {
        [Op.like]: `%${homeTeam}%${awayTeam}%`
      },
      memo: {
        [Op.notLike]: '%환불%'
      },
      memo: {
        [Op.notLike]: '%취소%'
      }
    };

    console.log('검색 조건:', JSON.stringify(searchConditions, null, 2));

    const settledOrders = await PaymentHistory.findAll({
      where: searchConditions,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log(`조회된 정산 주문 수: ${settledOrders.length}`);

    if (settledOrders.length === 0) {
      console.log('정산 내역 없음 - 404 반환');
      return res.status(404).json({ message: '해당 경기에 대한 정산 내역을 찾을 수 없습니다.' });
    }

    // 정산 상세 정보 구성
    const settlementDetail = {
      gameInfo: {
        homeTeam,
        awayTeam,
        commenceTime: new Date(commenceTime).toISOString()
      },
      totalSettledOrders: settledOrders.length,
      totalVolume: settledOrders.reduce((sum, order) => sum + (order.amount || 0), 0),
      orders: settledOrders.map(order => ({
        id: order.id,
        orderId: order.betId,
        username: order.user?.username || 'N/A',
        amount: order.amount || 0,
        balance: order.balanceAfter || 0,
        settledAt: order.paidAt,
        description: order.memo || 'N/A',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }))
    };

    res.json(settlementDetail);

  } catch (error) {
    console.error('정산 상세 내역 조회 오류:', error);
    res.status(500).json({ message: '정산 상세 내역 조회 중 오류가 발생했습니다.' });
  }
});

export default router; 