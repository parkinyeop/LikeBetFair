import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import User from '../models/userModel.js';
import ReferralCode from '../models/referralCodeModel.js';
import AdminCommission from '../models/adminCommissionModel.js';
import Bet from '../models/betModel.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';


const router = express.Router();

// 관리자 권한 확인 미들웨어
const requireAdmin = (minLevel = 1) => {
  return async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id);
      
      if (!user || !user.isAdmin || user.adminLevel < minLevel) {
        return res.status(403).json({ 
          message: '접근 권한이 없습니다.',
          required: `관리자 레벨 ${minLevel} 이상`,
          current: user ? `레벨 ${user.adminLevel}` : '일반 사용자'
        });
      }
      
      req.admin = user;
      next();
    } catch (error) {
      console.error('Admin auth error:', error);
      res.status(500).json({ message: '권한 확인 중 오류가 발생했습니다.' });
    }
  };
};

// =============================================================================
// 대시보드 & 통계
// =============================================================================

// 관리자 대시보드 데이터
router.get('/dashboard', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    // 오늘 날짜 계산 (UTC 기준)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // 오늘 베팅 데이터
    const todayBets = await Bet.findAll({
      where: {
        createdAt: {
          [Op.gte]: todayStart,
          [Op.lt]: todayEnd
        }
      }
    });

    const todayBetsCount = todayBets.length;
    const todayTotalStake = todayBets.reduce((sum, bet) => sum + parseFloat(bet.stake || 0), 0);

    // 전체 통계
    const totalUsers = await User.count();
    const totalBets = await Bet.count();
    const totalStakeResult = await Bet.sum('stake');
    const totalStake = totalStakeResult || 0;

    // 활성 사용자 (최근 30일 내 로그인)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.count({
      where: {
        lastLogin: {
          [Op.gte]: thirtyDaysAgo
        },
        isActive: true
      }
    });

    // 관리자 추천 데이터 (해당 관리자가 추천한 사용자 수)
    const referrals = await User.count({
      where: {
        referrerAdminId: req.admin.id
      }
    });

    // 관리자 수수료 (해당 관리자의 총 수수료)
    const commissionsResult = await AdminCommission.sum('commissionAmount', {
      where: {
        adminId: req.admin.id
      }
    });
    const totalCommissions = commissionsResult || 0;

    // Exchange 통계
    const todayExchangeOrders = await ExchangeOrder.count({
      where: {
        createdAt: {
          [Op.gte]: todayStart,
          [Op.lt]: todayEnd
        }
      }
    });

    const todayMatchedOrders = await ExchangeOrder.count({
      where: {
        status: 'matched',
        createdAt: {
          [Op.gte]: todayStart,
          [Op.lt]: todayEnd
        }
      }
    });

    const todayExchangeVolume = await ExchangeOrder.sum('amount', {
      where: {
        createdAt: {
          [Op.gte]: todayStart,
          [Op.lt]: todayEnd
        }
      }
    });

    // Exchange 수수료 (PaymentHistory에서 Exchange 관련 수수료 조회)
    const todayExchangeCommission = await PaymentHistory.sum('amount', {
      where: {
        memo: { [Op.like]: '%EXCHANGE%' },
        createdAt: {
          [Op.gte]: todayStart,
          [Op.lt]: todayEnd
        }
      }
    });

    const totalOpenOrders = await ExchangeOrder.count({
      where: { status: 'open' }
    });

    const totalMultibets = await ExchangeOrder.count({
      where: { isMultibet: true }
    });

    const totalSettlements = await ExchangeOrder.count({
      where: { status: 'settled' }
    });

    const dashboardData = {
      today: {
        bets: todayBetsCount,
        stake: Math.round(todayTotalStake)
      },
      total: {
        users: totalUsers,
        bets: totalBets,
        stake: Math.round(totalStake),
        activeUsers: activeUsers
      },
      admin: {
        referrals: referrals,
        commissions: Math.round(totalCommissions)
      },
      exchange: {
        today: {
          orders: todayExchangeOrders,
          matchedOrders: todayMatchedOrders,
          totalVolume: Math.round(todayExchangeVolume || 0),
          commission: Math.round(todayExchangeCommission || 0)
        },
        total: {
          openOrders: totalOpenOrders,
          multibets: totalMultibets,
          settlements: totalSettlements
        }
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: '대시보드 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// =============================================================================
// Exchange 관리
// =============================================================================

// Exchange 통계 조회
router.get('/exchange/stats', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todayOrders = await ExchangeOrder.count({
      where: {
        createdAt: {
          [Op.gte]: todayStart,
          [Op.lt]: todayEnd
        }
      }
    });

    const todayMatchedOrders = await ExchangeOrder.count({
      where: {
        status: 'matched',
        createdAt: {
          [Op.gte]: todayStart,
          [Op.lt]: todayEnd
        }
      }
    });

    const todayVolume = await ExchangeOrder.sum('amount', {
      where: {
        createdAt: {
          [Op.gte]: todayStart,
          [Op.lt]: todayEnd
        }
      }
    });

    const todayCommission = await PaymentHistory.sum('amount', {
      where: {
        memo: { [Op.like]: '%EXCHANGE%' },
        createdAt: {
          [Op.gte]: todayStart,
          [Op.lt]: todayEnd
        }
      }
    });

    const totalOpenOrders = await ExchangeOrder.count({
      where: { status: 'open' }
    });

    const totalMultibets = await ExchangeOrder.count({
      where: { isMultibet: true }
    });

    const totalSettlements = await ExchangeOrder.count({
      where: { status: 'settled' }
    });

    res.json({
      today: {
        orders: todayOrders,
        matchedOrders: todayMatchedOrders,
        totalVolume: Math.round(todayVolume || 0),
        commission: Math.round(todayCommission || 0)
      },
      total: {
        openOrders: totalOpenOrders,
        multibets: totalMultibets,
        settlements: totalSettlements
      }
    });
  } catch (error) {
    console.error('Exchange stats error:', error);
    res.status(500).json({ message: 'Exchange 통계를 불러오는 중 오류가 발생했습니다.' });
  }
});

// Exchange 일별 주문 통계 조회 (그래프용)
router.get('/exchange/daily-stats', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // 기본값: 현재 년월
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // month는 0-based
    
    // 해당 월의 시작일과 종료일
    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    
    console.log(`📊 Exchange 일별 통계 조회: ${targetYear}-${targetMonth + 1}`);
    console.log(`   기간: ${monthStart.toISOString()} ~ ${monthEnd.toISOString()}`);
    
    // 해당 월의 모든 Exchange 주문 조회
    const orders = await ExchangeOrder.findAll({
      where: {
        createdAt: { [Op.gte]: monthStart, [Op.lte]: monthEnd }
      },
      attributes: [
        'id',
        'createdAt',
        'status',
        'amount',
        'isMultibet'
      ],
      order: [['createdAt', 'ASC']]
    });
    
    // 일별로 그룹화
    const dailyStats = {};
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    
    // 해당 월의 모든 날짜 초기화
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyStats[dateKey] = {
        date: dateKey,
        totalOrders: 0,
        matchedOrders: 0,
        openOrders: 0,
        settledOrders: 0,
        multibets: 0,
        volume: 0
      };
    }
    
    // 주문 데이터로 통계 계산
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dateKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
      
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].totalOrders++;
        dailyStats[dateKey].volume += order.amount || 0;
        
        if (order.isMultibet) {
          dailyStats[dateKey].multibets++;
        }
        
        switch (order.status) {
          case 'matched':
            dailyStats[dateKey].matchedOrders++;
            break;
          case 'open':
            dailyStats[dateKey].openOrders++;
            break;
          case 'settled':
            dailyStats[dateKey].settledOrders++;
            break;
        }
      }
    });
    
    // 배열로 변환
    const dailyStatsArray = Object.values(dailyStats);
    
    // 월별 요약 통계
    const monthlySummary = {
      totalOrders: orders.length,
      totalVolume: orders.reduce((sum, order) => sum + (order.amount || 0), 0),
      totalMultibets: orders.filter(order => order.isMultibet).length,
      matchedOrders: orders.filter(order => order.status === 'matched').length,
      openOrders: orders.filter(order => order.status === 'open').length,
      settledOrders: orders.filter(order => order.status === 'settled').length
    };
    
    res.json({
      dailyStats: dailyStatsArray,
      monthlySummary,
      period: {
        year: targetYear,
        month: targetMonth + 1,
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Exchange daily stats error:', error);
    res.status(500).json({ message: '일별 통계를 불러오는 중 오류가 발생했습니다.' });
  }
});

// Exchange 주문 목록 조회
router.get('/exchange/orders', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const offset = (page - 1) * limit;

    const whereCondition = {};
    if (status && status !== 'all') {
      whereCondition.status = status;
    }
    if (search) {
      whereCondition[Op.or] = [
        { homeTeam: { [Op.iLike]: `%${search}%` } },
        { awayTeam: { [Op.iLike]: `%${search}%` } },
        { gameId: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const orders = await ExchangeOrder.findAll({
      where: whereCondition,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }],
      attributes: { exclude: [] }, // 모든 필드 포함
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalCount = await ExchangeOrder.count({ where: whereCondition });

    res.json({
      orders: orders,
      totalCount: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Exchange orders error:', error);
    res.status(500).json({ message: 'Exchange 주문을 불러오는 중 오류가 발생했습니다.' });
  }
});

// Exchange 멀티배팅 목록 조회
router.get('/exchange/multibets', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const multibets = await ExchangeOrder.findAll({
      where: { isMultibet: true },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ multibets });
  } catch (error) {
    console.error('Exchange multibets error:', error);
    res.status(500).json({ message: '멀티배팅 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// Exchange 정산 내역 조회
router.get('/exchange/settlements', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    // Exchange 관련 정산된 주문들 조회
    const settledOrders = await ExchangeOrder.findAll({
      where: {
        status: 'settled',
        settledAt: { [Op.not]: null }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }],
      order: [['settledAt', 'DESC']],
      limit: 100
    });

    // PaymentHistory에서 Exchange 관련 결제 내역 조회
    const paymentHistory = await PaymentHistory.findAll({
      where: {
        memo: { [Op.like]: '%Exchange%' }
      },
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    // 정산 내역을 경기별로 그룹화
    const settlementsByGame = {};
    
    settledOrders.forEach(order => {
      const gameKey = `${order.homeTeam} vs ${order.awayTeam}`;
      if (!settlementsByGame[gameKey]) {
        settlementsByGame[gameKey] = {
          gameKey,
          homeTeam: order.homeTeam,
          awayTeam: order.awayTeam,
          settledAt: order.settledAt,
          settledOrders: 0,
          totalVolume: 0,        // 총 거래량 (양쪽 베팅 금액 합계)
          totalCommission: 0,    // 총 수수료 (Exchange 수익)
          winningAmount: 0,      // 승리한 베터들의 총 수익
          losingAmount: 0,       // 패배한 베터들의 총 손실
          orders: []
        };
      }
      
      settlementsByGame[gameKey].settledOrders++;
      
      // Exchange는 제로섬 게임이므로 실제 수익/손실을 분리해서 계산
      const profit = parseFloat(order.actualProfit || 0);
      if (profit > 0) {
        settlementsByGame[gameKey].winningAmount += profit;
      } else if (profit < 0) {
        settlementsByGame[gameKey].losingAmount += Math.abs(profit);
      }
      
      // 총 거래량 (베팅 금액의 절댓값 합계)
      settlementsByGame[gameKey].totalVolume += Math.abs(profit) + Math.abs(order.stakeAmount || 0);
      
      settlementsByGame[gameKey].orders.push(order);
    });

    const settlements = Object.values(settlementsByGame);

    res.json({ 
      settlements,
      paymentHistory,
      totalSettledOrders: settledOrders.length,
      totalPaymentRecords: paymentHistory.length
    });
  } catch (error) {
    console.error('Exchange settlements error:', error);
    res.status(500).json({ message: '정산 내역을 불러오는 중 오류가 발생했습니다.' });
  }
});

// Exchange 주문의 매치된 주문들 조회
router.get('/exchange/orders/:orderId/matches', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // 원본 주문 조회
    const originalOrder = await ExchangeOrder.findByPk(orderId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }],
      attributes: { exclude: [] } // 모든 필드 포함
    });
    
    if (!originalOrder) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }
    
    let matchedOrders = [];
    
    // 매치된 주문들 조회 (양방향)
    if (originalOrder.matchedOrderId) {
      // 이 주문이 다른 주문과 매치된 경우 - 매치된 원본 주문 조회
      const matchedOriginalOrder = await ExchangeOrder.findByPk(originalOrder.matchedOrderId, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }],
        attributes: { exclude: [] } // 모든 필드 포함
      });
      if (matchedOriginalOrder) {
        matchedOrders.push(matchedOriginalOrder);
      }
    }
    
    // 이 주문과 매치된 다른 주문들 조회 (matchedOrderId가 현재 주문 ID인 주문들)
    const ordersMatchedToThis = await ExchangeOrder.findAll({
      where: {
        matchedOrderId: orderId
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }],
      attributes: { exclude: [] }, // 모든 필드 포함
      order: [['createdAt', 'ASC']]
    });
    
    matchedOrders = matchedOrders.concat(ordersMatchedToThis);
    
    res.json({
      originalOrder,
      matchedOrders
    });
  } catch (error) {
    console.error('Exchange order matches error:', error);
    res.status(500).json({ message: '매치된 주문 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// Exchange 주문 상태 변경
router.patch('/exchange/orders/:orderId/status', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await ExchangeOrder.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    await order.update({ status });
    
    res.json({ message: '주문 상태가 변경되었습니다.' });
  } catch (error) {
    console.error('Exchange order status change error:', error);
    res.status(500).json({ message: '주문 상태 변경 중 오류가 발생했습니다.' });
  }
});

// =============================================================================
// 사용자 관리
// =============================================================================

// 사용자 목록 조회
router.get('/users', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status = 'all', 
      adminLevel = 'all',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // 검색 필터
    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { referralCode: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // 상태 필터
    if (status !== 'all') {
      where.isActive = status === 'active';
    }

    // 관리자 레벨 필터
    if (adminLevel !== 'all') {
      where.adminLevel = parseInt(adminLevel);
    }

    // 정렬 설정
    let orderClause;
    switch (sortBy) {
      case 'username':
        orderClause = [['username', sortOrder]];
        break;
      case 'balance':
        orderClause = [['balance', sortOrder]];
        break;
      case 'lastLogin':
        orderClause = [['lastLogin', sortOrder]];
        break;
      default: // createdAt
        orderClause = [['createdAt', sortOrder]];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: orderClause
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      message: '사용자 목록 조회 성공',
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ message: '사용자 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 사용자 상세 정보
router.get('/users/:id', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Bet,
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 베팅 통계 계산
    const totalBets = await Bet.count({ where: { userId: user.id } });
    const totalStakeResult = await Bet.sum('stake', { where: { userId: user.id } });
    const totalStake = totalStakeResult || 0;

    const wonBets = await Bet.findAll({
      where: { 
        userId: user.id,
        status: 'won'
      },
      attributes: ['potentialWinnings']
    });

    const totalWinnings = wonBets.reduce((sum, bet) => sum + parseFloat(bet.potentialWinnings), 0);

    // 레퍼럴 정보 계산
    let referralInfo = null;
    if (user.referredBy) {
      // 추천한 관리자 정보 조회
      const referrerAdmin = await User.findByPk(user.referrerAdminId, {
        attributes: ['id', 'username', 'adminLevel']
      });
      
      // 추천코드 정보 조회
      const referralCode = await ReferralCode.findOne({
        where: { code: user.referredBy },
        attributes: ['id', 'code', 'commissionRate', 'isActive', 'currentUsers', 'maxUsers', 'expiresAt']
      });

      referralInfo = {
        referredBy: user.referredBy,
        referrerAdmin: referrerAdmin ? {
          id: referrerAdmin.id,
          username: referrerAdmin.username,
          adminLevel: referrerAdmin.adminLevel
        } : null,
        referralCode: referralCode ? {
          id: referralCode.id,
          code: referralCode.code,
          commissionRate: parseFloat(referralCode.commissionRate),
          isActive: referralCode.isActive,
          currentUsers: referralCode.currentUsers,
          maxUsers: referralCode.maxUsers,
          expiresAt: referralCode.expiresAt
        } : null
      };
    }

    // 이 사용자가 추천한 사용자들 조회 (관리자인 경우)
    let referredUsers = [];
    if (user.isAdmin) {
      referredUsers = await User.findAll({
        where: { referrerAdminId: user.id },
        attributes: ['id', 'username', 'email', 'createdAt', 'isActive'],
        order: [['createdAt', 'DESC']],
        limit: 10
      });
    }

    res.json({
      user,
      stats: {
        totalBets,
        totalStake: parseFloat(totalStake),
        totalWinnings
      },
      referralInfo,
      referredUsers
    });

  } catch (error) {
    console.error('User detail error:', error);
    res.status(500).json({ message: '사용자 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 사용자 잔액 수정
router.patch('/users/:id/balance', verifyToken, requireAdmin(4), async (req, res) => {
  try {
    const { balance, reason } = req.body;
    
    if (typeof balance !== 'number' || balance < 0) {
      return res.status(400).json({ message: '올바른 잔액을 입력해주세요.' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const oldBalance = user.balance;
    await user.update({ balance });

    console.log(`Balance updated by admin ${req.admin.username}: User ${user.username} ${oldBalance} -> ${balance}. Reason: ${reason}`);

    res.json({ 
      message: '잔액이 성공적으로 수정되었습니다.',
      oldBalance: parseFloat(oldBalance),
      newBalance: parseFloat(balance)
    });

  } catch (error) {
    console.error('Balance update error:', error);
    res.status(500).json({ message: '잔액 수정 중 오류가 발생했습니다.' });
  }
});

// 사용자 계정 상태 변경
router.patch('/users/:id/status', verifyToken, requireAdmin(3), async (req, res) => {
  try {
    const { isActive, reason } = req.body;
    
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    await user.update({ isActive });

    console.log(`User status updated by admin ${req.admin.username}: User ${user.username} active: ${isActive}. Reason: ${reason}`);

    res.json({ 
      message: `계정이 ${isActive ? '활성화' : '비활성화'}되었습니다.`
    });

  } catch (error) {
    console.error('User status update error:', error);
    res.status(500).json({ message: '계정 상태 변경 중 오류가 발생했습니다.' });
  }
});

// =============================================================================
// 베팅 관리 (기존 bet.js의 관리자 기능을 확장)
// =============================================================================

// 베팅 목록 조회
router.get('/bets', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'all', 
      userId = '', 
      startDate = '', 
      endDate = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    const where = {};

    // 상태 필터
    if (status !== 'all') {
      where.status = status;
    }
    
    // 사용자 필터
    if (userId) {
      where.userId = userId;
    }
    
    // 날짜 필터
    if (startDate && endDate) {
      where.createdAt = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }

    // 정렬 설정
    let orderClause;
    switch (sortBy) {
      case 'stake':
        orderClause = [['stake', sortOrder]];
        break;
      case 'potentialWinnings':
        orderClause = [['potentialWinnings', sortOrder]];
        break;
      case 'status':
        orderClause = [['status', sortOrder]];
        break;
      default: // createdAt
        orderClause = [['createdAt', sortOrder]];
    }

    const { count, rows: bets } = await Bet.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: orderClause,
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }]
    });

    res.json({
      bets,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Bets list error:', error);
    res.status(500).json({ message: '베팅 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 베팅 상세 정보
router.get('/bets/:id', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const bet = await Bet.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email', 'balance']
        }
      ]
    });

    if (!bet) {
      return res.status(404).json({ message: '베팅을 찾을 수 없습니다.' });
    }

    res.json({ bet });
  } catch (error) {
    console.error('Bet detail error:', error);
    res.status(500).json({ message: '베팅 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 베팅 통계
router.get('/bets/stats/summary', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }

    const totalBets = await Bet.count({ where });
    const totalStake = await Bet.sum('stake', { where }) || 0;
    const totalPotentialWinnings = await Bet.sum('potentialWinnings', { where }) || 0;
    
    const statusCounts = await Bet.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('stake')), 'totalStake'],
        [sequelize.fn('SUM', sequelize.col('potentialWinnings')), 'totalWinnings']
      ],
      where,
      group: ['status']
    });

    const wonBets = await Bet.findAll({
      where: { ...where, status: 'won' },
      attributes: ['potentialWinnings']
    });
    const actualWinnings = wonBets.reduce((sum, bet) => sum + parseFloat(bet.potentialWinnings), 0);

    res.json({
      summary: {
        totalBets,
        totalStake: parseFloat(totalStake),
        totalPotentialWinnings: parseFloat(totalPotentialWinnings),
        actualWinnings: parseFloat(actualWinnings),
        netProfit: parseFloat(totalStake) - parseFloat(actualWinnings)
      },
      statusBreakdown: statusCounts.map(item => ({
        status: item.status,
        count: parseInt(item.dataValues.count),
        totalStake: parseFloat(item.dataValues.totalStake || 0),
        totalWinnings: parseFloat(item.dataValues.totalWinnings || 0)
      }))
    });
  } catch (error) {
    console.error('Bet stats error:', error);
    res.status(500).json({ message: '베팅 통계를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 베팅 수동 결과 처리
router.patch('/bets/:id/result', verifyToken, requireAdmin(3), async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    if (!['won', 'lost', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: '올바른 상태를 선택해주세요.' });
    }

    const bet = await Bet.findByPk(req.params.id, {
      include: [{ model: User }]
    });
    
    if (!bet) {
      return res.status(404).json({ message: '베팅을 찾을 수 없습니다.' });
    }

    if (bet.status !== 'pending') {
      return res.status(400).json({ message: '이미 처리된 베팅입니다.' });
    }

    // 베팅 상태 업데이트
    await bet.update({ status });

    // 당첨 시 사용자 잔액 증가
    if (status === 'won') {
      await bet.User.increment('balance', { by: bet.potentialWinnings });
    }
    // 취소 시 베팅금 환불
    else if (status === 'cancelled') {
      await bet.User.increment('balance', { by: bet.stake });
    }

    console.log(`Bet result updated by admin ${req.admin.username}: Bet ${bet.id} -> ${status}. Reason: ${reason}`);

    res.json({ 
      message: '베팅 결과가 성공적으로 처리되었습니다.',
      bet: {
        id: bet.id,
        status,
        stake: parseFloat(bet.stake),
        potentialWinnings: parseFloat(bet.potentialWinnings)
      }
    });

  } catch (error) {
    console.error('Bet result update error:', error);
    res.status(500).json({ message: '베팅 결과 처리 중 오류가 발생했습니다.' });
  }
});

// =============================================================================
// 추천코드 관리
// =============================================================================

// 추천코드 목록 조회
router.get('/referral-codes', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'all', 
      adminId = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    let where = {};

    // 권한에 따른 필터링
    if (req.admin.adminLevel < 3) {
      where.adminId = req.admin.id;
    } else if (adminId) {
      where.adminId = adminId;
    }

    // 상태 필터
    if (status !== 'all') {
      where.isActive = status === 'active';
    }

    // 정렬 설정
    let orderClause;
    switch (sortBy) {
      case 'code':
        orderClause = [['code', sortOrder]];
        break;
      case 'commissionRate':
        orderClause = [['commissionRate', sortOrder]];
        break;
      case 'currentUsers':
        orderClause = [['currentUsers', sortOrder]];
        break;
      default: // createdAt
        orderClause = [['createdAt', sortOrder]];
    }

    const { count, rows: codes } = await ReferralCode.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'admin',
        attributes: ['id', 'username', 'email', 'adminLevel']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: orderClause
    });

    res.json({
      codes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Referral codes list error:', error);
    res.status(500).json({ message: '추천코드 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 추천코드 상세 정보
router.get('/referral-codes/:id', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const code = await ReferralCode.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'admin',
        attributes: ['id', 'username', 'email', 'adminLevel']
      }]
    });

    if (!code) {
      return res.status(404).json({ message: '추천코드를 찾을 수 없습니다.' });
    }

    // 권한 확인
    if (code.adminId !== req.admin.id && req.admin.adminLevel < 3) {
      return res.status(403).json({ message: '해당 추천코드를 조회할 권한이 없습니다.' });
    }

    // 이 코드로 가입한 사용자들 조회
    const referredUsers = await User.findAll({
      where: { referredBy: code.code },
      attributes: ['id', 'username', 'email', 'createdAt', 'isActive'],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.json({ 
      code,
      referredUsers
    });
  } catch (error) {
    console.error('Referral code detail error:', error);
    res.status(500).json({ message: '추천코드 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 추천코드 통계
router.get('/referral-codes/stats/summary', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let where = {};
    if (req.admin.adminLevel < 3) {
      where.adminId = req.admin.id;
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }

    const totalCodes = await ReferralCode.count({ where });
    const activeCodes = await ReferralCode.count({ where: { ...where, isActive: true } });
    const totalUsers = await ReferralCode.sum('currentUsers', { where }) || 0;

    // 수수료 통계
    const commissionStats = await ReferralCode.findAll({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('commissionRate')), 'avgCommissionRate'],
        [sequelize.fn('MIN', sequelize.col('commissionRate')), 'minCommissionRate'],
        [sequelize.fn('MAX', sequelize.col('commissionRate')), 'maxCommissionRate']
      ],
      where
    });

    res.json({
      summary: {
        totalCodes,
        activeCodes,
        totalUsers: parseInt(totalUsers),
        avgCommissionRate: parseFloat(commissionStats[0]?.dataValues?.avgCommissionRate || 0),
        minCommissionRate: parseFloat(commissionStats[0]?.dataValues?.minCommissionRate || 0),
        maxCommissionRate: parseFloat(commissionStats[0]?.dataValues?.maxCommissionRate || 0)
      }
    });
  } catch (error) {
    console.error('Referral codes stats error:', error);
    res.status(500).json({ message: '추천코드 통계를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 추천코드 생성
router.post('/referral-codes', verifyToken, requireAdmin(3), async (req, res) => {
  try {
    const { code, commissionRate, maxUsers, expiresAt } = req.body;
    
    if (!code || code.length < 5 || code.length > 20) {
      return res.status(400).json({ message: '추천코드는 5-20자 사이여야 합니다.' });
    }

    if (commissionRate < 0 || commissionRate > 0.2) {
      return res.status(400).json({ message: '수수료율은 0-20% 사이여야 합니다.' });
    }

    // 코드 중복 확인
    const existingCode = await ReferralCode.findOne({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ message: '이미 존재하는 추천코드입니다.' });
    }

    const newCode = await ReferralCode.create({
      adminId: req.admin.id,
      code,
      commissionRate,
      maxUsers: maxUsers || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    res.status(201).json({ 
      message: '추천코드가 성공적으로 생성되었습니다.',
      code: newCode
    });

  } catch (error) {
    console.error('Referral code creation error:', error);
    res.status(500).json({ message: '추천코드 생성 중 오류가 발생했습니다.' });
  }
});

// 추천코드 활성화/비활성화
router.patch('/referral-codes/:id/status', verifyToken, requireAdmin(3), async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const code = await ReferralCode.findByPk(req.params.id);
    if (!code) {
      return res.status(404).json({ message: '추천코드를 찾을 수 없습니다.' });
    }

    // 자신의 코드이거나 레벨 4 이상인 경우만 수정 가능
    if (code.adminId !== req.admin.id && req.admin.adminLevel < 4) {
      return res.status(403).json({ message: '해당 추천코드를 수정할 권한이 없습니다.' });
    }

    await code.update({ isActive });

    res.json({ 
      message: `추천코드가 ${isActive ? '활성화' : '비활성화'}되었습니다.`
    });

  } catch (error) {
    console.error('Referral code status update error:', error);
    res.status(500).json({ message: '추천코드 상태 변경 중 오류가 발생했습니다.' });
  }
});

// 수동 배당 데이터 수집 API
router.post('/manual-odds-update', async (req, res) => {
  try {
    console.log('🔧 관리자 요청: 수동 배당 데이터 수집 시작');
    
    // 비동기로 실행 (응답을 기다리지 않음)
    manualOddsUpdate()
      .then(() => {
        console.log('✅ 수동 배당 데이터 수집 완료');
      })
      .catch((error) => {
        console.error('❌ 수동 배당 데이터 수집 실패:', error);
      });
    
    res.json({
      success: true,
      message: '수동 배당 데이터 수집이 시작되었습니다. 로그를 확인해주세요.',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 수동 배당 데이터 수집 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '수동 배당 데이터 수집 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

export default router; 