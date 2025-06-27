import express from 'express';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import ExchangeBalance from '../models/exchangeBalanceModel.js';

const router = express.Router();

// 주문 등록
router.post('/order', async (req, res) => {
  const { userId, gameId, market, line, side, price, amount } = req.body;
  const balance = await ExchangeBalance.findByPk(userId);
  const required = side === 'back' ? amount : Math.floor((price - 1) * amount);
  if (!balance || balance.balance < required) {
    return res.status(400).json({ message: '잔고 부족' });
  }
  balance.balance -= required;
  await balance.save();
  const opposite = side === 'back' ? 'lay' : 'back';
  const match = await ExchangeOrder.findOne({
    where: { gameId, market, line, price, amount, side: opposite, status: 'open' }
  });
  let order;
  if (match) {
    match.status = 'matched';
    await match.save();
    order = await ExchangeOrder.create({
      userId, gameId, market, line, side, price, amount, status: 'matched', matchedOrderId: match.id
    });
    match.matchedOrderId = order.id;
    await match.save();
  } else {
    order = await ExchangeOrder.create({
      userId, gameId, market, line, side, price, amount, status: 'open'
    });
  }
  res.json({ order });
});

// 호가(orderbook) 조회
router.get('/orderbook', async (req, res) => {
  const { gameId, market, line } = req.query;
  const orders = await ExchangeOrder.findAll({
    where: { gameId, market, line, status: 'open' }
  });
  res.json({ orders });
});

// 정산(경기 결과 입력)
router.post('/settle', async (req, res) => {
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
    const winnerBalance = await ExchangeBalance.findByPk(winner.userId);
    winnerBalance.balance += payout;
    await winnerBalance.save();
    order.status = 'settled';
    matched.status = 'settled';
    await order.save();
    await matched.save();
  }
  res.json({ message: '정산 완료' });
});

export default router; 