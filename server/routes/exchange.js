import express from 'express';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import verifyToken from '../middleware/verifyToken.js';
import exchangeWebSocketService from '../services/exchangeWebSocketService.js';
import { Op } from 'sequelize';

const router = express.Router();

// 주문 등록
router.post('/order', verifyToken, async (req, res) => {
  const { gameId, market, line, side, price, amount, selection } = req.body;
  const userId = req.user.userId;
  
  // 일반 잔고 사용
  const user = await User.findByPk(userId);
  const required = side === 'back' ? amount : Math.floor((price - 1) * amount);
  
  if (!user || user.balance < required) {
    return res.status(400).json({ message: '잔고 부족' });
  }
  
  user.balance -= required;
  await user.save();
  
  const opposite = side === 'back' ? 'lay' : 'back';
  const match = await ExchangeOrder.findOne({
    where: { gameId, market, line, price, amount, side: opposite, status: 'open' }
  });
  
  // 거래 정보 계산
  const stakeAmount = side === 'back' ? amount : Math.floor((price - 1) * amount);
  const potentialProfit = side === 'back' ? Math.floor((price - 1) * amount) : amount;
  
  let order;
  if (match) {
    match.status = 'matched';
    await match.save();
    order = await ExchangeOrder.create({
      userId, gameId, market, line, side, price, amount, selection,
      status: 'matched', matchedOrderId: match.id,
      stakeAmount, potentialProfit
    });
    match.matchedOrderId = order.id;
    await match.save();
  } else {
    order = await ExchangeOrder.create({
      userId, gameId, market, line, side, price, amount, selection, status: 'open',
      stakeAmount, potentialProfit
    });
  }
  
  // WebSocket으로 주문 업데이트 브로드캐스트
  exchangeWebSocketService.broadcastOrderUpdate(gameId, { order });
  
  res.json({ order });
});

// 호가(orderbook) 조회 - 테스트용 (로그인 불필요)
router.get('/orderbook-test', async (req, res) => {
  try {
    const { gameId, market, line } = req.query;
    console.log('테스트 호가 조회 요청:', { gameId, market, line });
    
    const orders = await ExchangeOrder.findAll({
      where: { gameId, market, line, status: 'open' }
    });
    
    console.log('찾은 주문 수:', orders.length);
    console.log('주문 데이터:', orders.map(o => ({
      id: o.id,
      gameId: o.gameId,
      market: o.market,
      line: o.line,
      side: o.side,
      price: o.price,
      amount: o.amount
    })));
    
    res.json({ orders });
  } catch (error) {
    console.error('호가 조회 에러:', error);
    res.status(500).json({ error: error.message });
  }
});

// 호가(orderbook) 조회
router.get('/orderbook', verifyToken, async (req, res) => {
  const { gameId, market, line } = req.query;
  const orders = await ExchangeOrder.findAll({
    where: { gameId, market, line, status: 'open' }
  });
  res.json({ orders });
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
      balanceAfter: winnerUser.balance,
      memo: `Exchange 정산 수익`,
      paidAt: new Date()
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
    
    // 잔고 환불 (일반 잔고 사용)
    const user = await User.findByPk(userId);
    const refundAmount = order.side === 'back' ? order.amount : Math.floor((order.price - 1) * order.amount);
    
    user.balance += refundAmount;
    await user.save();
    
    // PaymentHistory 기록 (실제 환불만)
    await PaymentHistory.create({
      userId: userId,
      betId: '00000000-0000-0000-0000-000000000000', // Exchange 거래용 더미 ID
      amount: refundAmount,
      balanceAfter: user.balance,
      memo: `Exchange 주문 취소 환불`,
      paidAt: new Date()
    });
    
    // 주문 상태 변경
    order.status = 'cancelled';
    await order.save();
    
    res.json({ 
      message: '주문이 취소되었습니다.',
      refundAmount: refundAmount,
      newBalance: balance.balance
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

// 사용자 주문 내역 조회
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const orders = await ExchangeOrder.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    res.json({ orders });
  } catch (error) {
    console.error('Exchange orders error:', error);
    res.status(500).json({ message: '주문 내역 조회 중 오류가 발생했습니다.' });
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

// 경기별 Exchange 마켓 정보 조회
router.get('/markets/:gameId', verifyToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // 실제 경기 데이터에서 마켓 정보 가져오기
    // 여기서는 더미 데이터를 반환하지만, 실제로는 odds_cache 테이블에서 가져와야 함
    const markets = [
      {
        name: 'Moneyline',
        type: 'h2h',
        selections: [
          { name: 'Home Team', price: 2.16 },
          { name: 'Away Team', price: 1.83 },
        ]
      },
      {
        name: 'Handicap',
        type: 'spreads',
        line: 1.5,
        selections: [
          { name: 'Home Team +1.5', price: 1.51 },
          { name: 'Away Team -1.5', price: 2.52 },
        ]
      },
      {
        name: 'Total',
        type: 'totals',
        line: 9.5,
        selections: [
          { name: 'Over 9.5', price: 1.93 },
          { name: 'Under 9.5', price: 1.98 },
        ]
      }
    ];
    
    res.json({ markets });
  } catch (error) {
    console.error('Exchange markets error:', error);
    res.status(500).json({ message: '마켓 정보 조회 중 오류가 발생했습니다.' });
  }
});

// 새로운 주문 생성 (기존 주문과 즉시 매칭 시도)
router.post('/match-order', verifyToken, async (req, res) => {
  const { gameId, market, line, side, price, amount, selection } = req.body;
  const userId = req.user.id;

  try {
    console.log(`🎯 매치 주문 요청: ${side} ${price} (${amount}원) - User: ${userId}`);

    // 1. 매칭 가능한 반대편 주문 찾기
    const oppositeSide = side === 'back' ? 'lay' : 'back';
    let matchingOrders;

    if (side === 'back') {
      // Back 주문 → Lay 주문 중 price 이하인 것들과 매칭
      matchingOrders = await ExchangeOrder.findAll({
        where: {
          gameId,
          market,
          line,
          side: 'lay',
          price: { [Op.lte]: price },
          status: 'open'
        },
        order: [['price', 'ASC']] // 낮은 가격부터
      });
    } else {
      // Lay 주문 → Back 주문 중 price 이상인 것들과 매칭
      matchingOrders = await ExchangeOrder.findAll({
        where: {
          gameId,
          market,
          line,
          side: 'back',
          price: { [Op.gte]: price },
          status: 'open'
        },
        order: [['price', 'DESC']] // 높은 가격부터
      });
    }

    console.log(`📊 매칭 가능한 주문: ${matchingOrders.length}개`);

    let remainingAmount = amount;
    const matches = [];

    // 2. 순차적으로 매칭 처리
    for (const existingOrder of matchingOrders) {
      if (remainingAmount <= 0) break;

      const matchAmount = Math.min(remainingAmount, existingOrder.amount);
      const matchPrice = existingOrder.price; // 기존 주문의 가격으로 매칭

      console.log(`🔄 매칭: ${matchAmount}원 at ${matchPrice}`);

      // 기존 주문 업데이트
      if (existingOrder.amount === matchAmount) {
        // 완전 매칭 - 주문 완료 처리
        await existingOrder.update({
          status: 'filled',
          filledAmount: existingOrder.amount
        });
      } else {
        // 부분 매칭 - 남은 금액으로 업데이트
        await existingOrder.update({
          amount: existingOrder.amount - matchAmount,
          filledAmount: (existingOrder.filledAmount || 0) + matchAmount
        });
      }

      remainingAmount -= matchAmount;
      
      matches.push({
        matchedOrderId: existingOrder.id,
        matchAmount,
        matchPrice,
        counterpartyUserId: existingOrder.userId
      });
    }

    // 3. 새 주문 생성 (남은 금액이 있으면)
    let newOrder = null;
    if (remainingAmount > 0) {
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
        filledAmount: amount - remainingAmount
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

export default router; 