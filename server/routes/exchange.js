import express from 'express';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import ExchangeOrderMatch from '../models/exchangeOrderMatchModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import verifyToken from '../middleware/verifyToken.js';
import exchangeWebSocketService from '../services/exchangeWebSocketService.js';
import exchangeGameMappingService from '../services/exchangeGameMappingService.js';
import exchangeSettlementService from '../services/exchangeSettlementService.js';
import { Op } from 'sequelize';

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
    const newFilledAmount = (existingOrder.filledAmount || 0) + matchAmount;
    const newStatus = newRemainingAmount > 0 ? 'open' : 'matched';
    
    await existingOrder.update({
      remainingAmount: newRemainingAmount,
      filledAmount: newFilledAmount,
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
    
    // 🆕 부분 매칭 처리 로직
    const actualMatchAmount = Math.min(matchAmount, targetOrder.remainingAmount || targetOrder.amount);
    
    if (actualMatchAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: '매칭 가능한 금액이 없습니다.' 
      });
    }
    
    // 사용자 잔고 확인
    const user = await User.findByPk(userId);
    const required = matchType === 'back' ? actualMatchAmount : Math.floor((targetOrder.price - 1) * actualMatchAmount);
    
    if (!user || parseInt(user.balance) < required) {
      return res.status(400).json({ success: false, message: '잔고 부족' });
    }
    
    // 잔고 차감
    user.balance = parseInt(user.balance) - required;
    await user.save();
    
    // 🆕 매칭 주문 생성 (매치 배팅자용)
    const matchOrder = await ExchangeOrder.create({
      userId: userId,
      gameId: targetOrder.gameId,
      market: targetOrder.market,
      line: targetOrder.line,
      side: matchType,
      price: targetOrder.price,
      amount: actualMatchAmount,
      status: 'matched',
      matchedOrderId: targetOrder.id,
      homeTeam: targetOrder.homeTeam,
      awayTeam: targetOrder.awayTeam,
      commenceTime: targetOrder.commenceTime,
      sportKey: targetOrder.sportKey,
      gameResultId: targetOrder.gameResultId,
      selection: targetOrder.selection,
      selectionDetails: targetOrder.selectionDetails,
      stakeAmount: matchType === 'back' ? actualMatchAmount : Math.floor((targetOrder.price - 1) * actualMatchAmount),
      potentialProfit: matchType === 'back' ? Math.floor((targetOrder.price - 1) * actualMatchAmount) : actualMatchAmount,
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
    });

    // 🆕 대상 주문 상태 업데이트 (부분 매칭 처리)
    if (actualMatchAmount >= (targetOrder.remainingAmount || targetOrder.amount)) {
      // 완전 매칭
      targetOrder.status = 'matched';
      targetOrder.originalAmount = targetOrder.originalAmount || targetOrder.amount; // 🆕 originalAmount 설정
      targetOrder.filledAmount = targetOrder.originalAmount;
      targetOrder.remainingAmount = 0;
      targetOrder.partiallyFilled = false;
    } else {
      // 부분 매칭
      targetOrder.originalAmount = targetOrder.originalAmount || targetOrder.amount; // 🆕 originalAmount 설정
      targetOrder.partiallyFilled = true;
      targetOrder.filledAmount = (targetOrder.filledAmount || 0) + actualMatchAmount;
      targetOrder.remainingAmount = (targetOrder.remainingAmount || targetOrder.amount) - actualMatchAmount;
      targetOrder.status = 'partially_matched'; // 🆕 새로운 상태 사용
    }
    
    await targetOrder.save();

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
    });
    
    console.log('✅ ExchangeOrderMatch 생성 완료:', exchangeOrderMatch.id);

    // 거래 내역 기록
    // targetOrder 사용자 잔고 조회
    const targetUser = await User.findByPk(targetOrder.userId);
    
    await PaymentHistory.create({
      userId: targetOrder.userId,
      amount: actualMatchAmount,
      balanceAfter: targetUser.balance, // 🆕 잔고 후 금액
      memo: `매칭 배팅 체결: ${targetOrder.homeTeam} vs ${targetOrder.awayTeam}`,
      paidAt: new Date() // 🆕 지급 시간
    });
    
    await PaymentHistory.create({
      userId: userId,
      amount: actualMatchAmount,
      balanceAfter: user.balance, // 🆕 잔고 후 금액
      memo: `매칭 배팅 체결: ${targetOrder.homeTeam} vs ${targetOrder.awayTeam}`,
      paidAt: new Date() // 🆕 지급 시간
    });
    
    // WebSocket으로 실시간 업데이트
    exchangeWebSocketService.broadcastOrderUpdate({
      type: 'order_matched',
      targetOrder: targetOrder,
      matchInfo: {
        matchedAmount: actualMatchAmount,
        matchedType: matchType
      }
    });
    
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
      gameResultId: orderData.gameResultId,
      homeTeam: orderData.homeTeam,
      awayTeam: orderData.awayTeam,
      sportKey: orderData.sportKey
    });
    
    // 일반 잔고 사용 (데이터 타입 통일)
    const user = await User.findByPk(userId);
    const required = side === 'back' ? amount : Math.floor((price - 1) * amount);
    
    // 잔고를 정수로 변환하여 비교
    const userBalance = parseInt(user.balance);
    
    console.log('🔍 잔고 검증 상세:', { 
      userId,
      originalBalance: user.balance,
      userBalance, 
      required, 
      side, 
      price, 
      amount,
      calculation: side === 'back' ? `${amount} (back)` : `Math.floor((${price} - 1) * ${amount}) = ${Math.floor((price - 1) * amount)} (lay)`
    });
    
    if (!user || userBalance < required) {
      console.log('❌ 잔고 부족:', { userBalance, required, side, price, amount });
      return res.status(400).json({ message: '잔고 부족' });
    }
    
    user.balance = userBalance - required;
    await user.save();
    
    // 🆕 부분 매칭 처리
    const partialMatchResult = await processPartialMatching({
      gameId, market, line, side, price, amount, userId
    });
    
    console.log('🎯 부분 매칭 결과:', {
      totalMatched: partialMatchResult.totalMatched,
      remainingAmount: partialMatchResult.remainingAmount,
      matchCount: partialMatchResult.matches.length
    });
    
    // 거래 정보 계산
    const stakeAmount = side === 'back' ? amount : Math.floor((price - 1) * amount);
    const potentialProfit = side === 'back' ? Math.floor((price - 1) * amount) : amount;
    
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
      commenceTime: orderData.commenceTime,
      sportKey: orderData.sportKey,
      gameResultId: orderData.gameResultId,
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
      const matchedOrder = await ExchangeOrder.create({
        ...baseOrderData,
        amount: match.matchAmount,
        status: 'matched',
        matchedOrderId: match.existingOrder.id,
        stakeAmount: side === 'back' ? match.matchAmount : Math.floor((match.matchPrice - 1) * match.matchAmount),
        potentialProfit: side === 'back' ? Math.floor((match.matchPrice - 1) * match.matchAmount) : match.matchAmount
      });
      
      // 매칭 기록 업데이트 (새 주문 ID 연결)
      await match.matchRecord.update({
        matchingOrderId: matchedOrder.id
      });
      
      // 기존 주문에도 매칭 정보 업데이트
      if (match.existingOrder.matchedOrderId === null) {
        await match.existingOrder.update({
          matchedOrderId: matchedOrder.id
        });
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
        hasGameMapping: !!orderData.gameResultId
      }
    });
    
  } catch (error) {
    console.error('❌ Exchange 주문 생성 오류:', error);
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
    
    // Where 조건을 동적으로 구성
    const whereCondition = { gameId, market, status: 'open' };
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
    
    // 🆕 부분 매칭을 고려한 주문 정보 반환
    const ordersWithRemainingAmount = orders.map(order => ({
      ...order.toJSON(),
      displayAmount: order.remainingAmount || order.amount, // 화면에 표시할 금액
      originalAmount: order.originalAmount || order.amount,
      filledAmount: order.filledAmount || 0,
      partiallyFilled: order.partiallyFilled || false
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
    // 예시: Back이 이기면 배당금 지급, Lay는 증거금 차감
    let winner, payout;
    if ((result === 'over' && order.side === 'back') || (result === 'under' && order.side === 'lay')) {
      winner = order;
      payout = order.price * order.amount;
    } else {
      winner = matched;
      payout = matched.price * matched.amount;
    }
    const winnerUser = await User.findByPk(winner.userId);
    winnerUser.balance += payout;
    await winnerUser.save();
    
    // PaymentHistory 기록 (실제 수익 지급만)
    await PaymentHistory.create({
      userId: winner.userId,
      betId: '00000000-0000-0000-0000-000000000000', // Exchange 거래용 더미 ID
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

// 주문 취소
router.post('/cancel/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    
    const order = await ExchangeOrder.findOne({
      where: { id: orderId, userId: userId }
    });
    
    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }
    
    if (order.status !== 'open') {
      return res.status(400).json({ message: '취소할 수 없는 주문 상태입니다.' });
    }
    
    // 🆕 부분 매칭된 주문의 경우 remainingAmount만 환불
    const user = await User.findByPk(userId);
    const refundableAmount = order.remainingAmount || order.amount;
    const refundAmount = order.side === 'back' ? refundableAmount : Math.floor((order.price - 1) * refundableAmount);
    
    console.log('💰 취소 환불 계산:', {
      orderId: order.id,
      originalAmount: order.originalAmount || order.amount,
      remainingAmount: order.remainingAmount || order.amount,
      filledAmount: order.filledAmount || 0,
      refundableAmount,
      refundAmount,
      side: order.side,
      price: order.price
    });
    
    user.balance += refundAmount;
    await user.save();
    
    // PaymentHistory 기록 (실제 환불만)
    await PaymentHistory.create({
      userId: userId,
      betId: '00000000-0000-0000-0000-000000000000', // Exchange 거래용 더미 ID
      amount: refundAmount,
      memo: `Exchange 주문 취소 환불`,
      paidAt: new Date(),
      balanceAfter: user.balance
    });
    
    // 주문 상태 변경
    order.status = 'cancelled';
    await order.save();
    
    res.json({ 
      message: '주문이 취소되었습니다.',
      refundAmount: refundAmount,
      newBalance: user.balance
    });
    
  } catch (error) {
    console.error('Order cancellation error:', error);
    res.status(500).json({ message: '주문 취소 중 오류가 발생했습니다.' });
  }
});

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
    
    // Where 조건 구성
    const whereCondition = { userId };
    if (status) {
      whereCondition.status = status;
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
    
    // 🆕 부분 매칭 정보 포함한 응답
    const ordersWithMatchInfo = orders.map(order => ({
      ...order.toJSON(),
      matchInfo: {
        originalAmount: order.originalAmount || order.amount,
        filledAmount: order.filledAmount || 0,
        remainingAmount: order.remainingAmount || order.amount,
        partiallyFilled: order.partiallyFilled || false,
        fillPercentage: order.originalAmount ? 
          Math.round((order.filledAmount || 0) / order.originalAmount * 100) : 0,
        matchCount: (order.originalMatches?.length || 0) + (order.matchingMatches?.length || 0)
      }
    }));
    
    res.json(ordersWithMatchInfo);
  } catch (error) {
    console.error('Exchange orders error:', error);
    res.status(500).json({ message: '주문 내역 조회 중 오류가 발생했습니다.' });
  }
});

// 전체 오픈 주문 조회 (공개 API - 토큰 불필요)
router.get('/all-orders', async (req, res) => {
  try {
    // 🆕 부분 매칭된 주문도 포함하여 조회
    const orders = await ExchangeOrder.findAll({
      where: {
        [Op.or]: [
          { status: 'open' },
          { 
            status: 'partially_matched',
            remainingAmount: { [Op.gt]: 0 }
          }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    
    // 🆕 표시 금액 계산 로직
    const ordersWithGameInfo = orders.map(order => {
      let displayAmount = order.amount;
      
      if (order.partiallyFilled && order.remainingAmount > 0) {
        // 부분 매칭된 경우 남은 금액을 표시
        displayAmount = order.remainingAmount;
      }
      
      return {
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
        displayAmount: displayAmount
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
        status: 'matched',
        matchedOrderId: existingOrder.id,
        homeTeam: orderData.homeTeam,
        awayTeam: orderData.awayTeam,
        commenceTime: orderData.commenceTime,
        sportKey: orderData.sportKey,
        gameResultId: orderData.gameResultId,
        selectionDetails: orderData.selectionDetails,
        stakeAmount: side === 'back' ? matchAmount : Math.floor((price - 1) * matchAmount),
        potentialProfit: side === 'back' ? Math.floor((price - 1) * matchAmount) : matchAmount,
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
        gameResultId: orderData.gameResultId, 
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
        commenceTime: orderData.commenceTime,
        sportKey: orderData.sportKey,
        gameResultId: orderData.gameResultId,
        selectionDetails: orderData.selectionDetails,
        stakeAmount: side === 'back' ? remainingAmount : Math.floor((price - 1) * remainingAmount),
        potentialProfit: side === 'back' ? Math.floor((price - 1) * remainingAmount) : remainingAmount,
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

// 특정 경기 자동 정산 (관리자 전용)
router.post('/settle/:gameResultId', verifyToken, async (req, res) => {
  try {
    const { gameResultId } = req.params;
    
    // 관리자 권한 확인
    const user = await User.findByPk(req.user.userId);
    if (!user.isAdmin) {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    console.log(`🎯 관리자 ${user.username}이 경기 ${gameResultId} 정산 요청`);
    
    const result = await exchangeSettlementService.settleGameOrders(gameResultId);
    
    res.json({
      message: '정산이 완료되었습니다.',
      result
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

// 정산 가능한 주문 조회
router.get('/settleable/:gameResultId', verifyToken, async (req, res) => {
  try {
    const { gameResultId } = req.params;
    
    const orders = await exchangeSettlementService.getSettlableOrders(gameResultId);
    
    res.json({
      gameResultId,
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
    console.error('정산 가능 주문 조회 오류:', error);
    res.status(500).json({ message: '조회 중 오류가 발생했습니다.' });
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

export default router; 