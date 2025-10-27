import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import User from '../models/userModel.js';
import Bet from '../models/betModel.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

const router = express.Router();

// 개인정보 조회
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'username', 'email', 'createdAt', 'lastLogin', 'isActive']
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json(user);
  } catch (error) {
    console.error('개인정보 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 비밀번호 변경
router.put('/password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 유효성 검사
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '새 비밀번호는 6자 이상이어야 합니다.' });
    }

    // 사용자 조회
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 현재 비밀번호 확인
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다.' });
    }

    // 새 비밀번호 해싱 및 저장
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 입출금 내역 조회
router.get('/payment-history', verifyToken, async (req, res) => {
  try {
    const { range = '30d', type = 'all' } = req.query;

    let whereCondition = { userId: req.user.userId };

    console.log('📋 [입출금 내역] 조회 요청:', {
      userId: req.user.userId,
      username: req.user.username,
      whereCondition,
      range,
      type
    });

    // 날짜 범위 필터
    if (range !== 'all') {
      const days = parseInt(range.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      whereCondition.paidAt = { [Op.gte]: startDate };
    }

    // 입출금 타입 필터
    if (type === 'deposit') {
      whereCondition.amount = { [Op.gt]: 0 }; // 입금 (양수)
    } else if (type === 'withdrawal') {
      whereCondition.amount = { [Op.lt]: 0 }; // 출금 (음수)
    }

    const payments = await PaymentHistory.findAll({
      where: whereCondition,
      order: [['paidAt', 'DESC']],
      limit: 100
    });

    console.log('✅ [입출금 내역] 조회 결과:', {
      userId: req.user.userId,
      count: payments.length,
      firstPayment: payments.length > 0 ? { id: payments[0].id, userId: payments[0].userId, amount: payments[0].amount } : null
    });

    res.json({ payments });
  } catch (error) {
    console.error('입출금 내역 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 베팅 내역 조회
router.get('/bets', verifyToken, async (req, res) => {
  try {
    const { status = 'all', range = '30d' } = req.query;

    let whereCondition = { userId: req.user.userId };

    console.log('🎰 [베팅 내역] 조회 요청:', {
      userId: req.user.userId,
      username: req.user.username,
      whereCondition,
      status,
      range
    });

    // 상태 필터
    if (status !== 'all') {
      whereCondition.status = status;
    }

    // 날짜 범위 필터
    if (range !== 'all') {
      const days = parseInt(range.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      whereCondition.createdAt = { [Op.gte]: startDate };
    }

    const bets = await Bet.findAll({
      where: whereCondition,
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    console.log('✅ [베팅 내역] 조회 결과:', {
      userId: req.user.userId,
      count: bets.length,
      firstBet: bets.length > 0 ? { id: bets[0].id, userId: bets[0].userId, stake: bets[0].stake } : null
    });

    res.json({ bets });
  } catch (error) {
    console.error('베팅 내역 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 익스체인지 주문 내역 조회
router.get('/exchange-orders', verifyToken, async (req, res) => {
  try {
    const { status = 'all', range = '30d' } = req.query;

    let whereCondition = { userId: req.user.userId };

    console.log('📊 [익스체인지 주문] 조회 요청:', {
      userId: req.user.userId,
      username: req.user.username,
      whereCondition,
      status,
      range
    });

    // 상태 필터
    if (status !== 'all') {
      whereCondition.status = status;
    }

    // 날짜 범위 필터
    if (range !== 'all') {
      const days = parseInt(range.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      whereCondition.createdAt = { [Op.gte]: startDate };
    }

    const orders = await ExchangeOrder.findAll({
      where: whereCondition,
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    console.log('✅ [익스체인지 주문] 조회 결과:', {
      userId: req.user.userId,
      count: orders.length,
      firstOrder: orders.length > 0 ? { id: orders[0].id, userId: orders[0].userId, amount: orders[0].amount } : null
    });

    res.json({ orders });
  } catch (error) {
    console.error('익스체인지 주문 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

export default router;
