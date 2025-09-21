import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import User from '../models/userModel.js';
import ReferralCode from '../models/referralCodeModel.js';
import AdminCommission from '../models/adminCommissionModel.js';
import Bet from '../models/betModel.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import GameResult from '../models/gameResultModel.js';
import OddsCache from '../models/oddsCacheModel.js';
import { ReferralCodeValidator } from '../utils/referralCodeValidator.js';
import Settings from '../models/settingsModel.js';
import actionItemService from '../services/actionItemService.js';
import BettingAmountSettingsService from '../services/bettingAmountSettingsService.js';
import ExchangeOddsReturnRateService from '../services/exchangeOddsReturnRateService.js';
import CommissionSettingsService from '../services/commissionSettingsService.js';
import SportsbookPayoutRateService from '../services/sportsbookPayoutRateService.js';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import sequelize from '../models/sequelize.js';


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

// 긴급 조치 필요 항목 조회
router.get('/action-items', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    console.log('🔍 액션 아이템 조회 요청:', req.admin.username);

    const actionItems = await actionItemService.getAllActionItems();

    res.json({
      success: true,
      actionItems,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 액션 아이템 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '긴급 조치 항목 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 액션 아이템 상세 정보 조회
router.get('/action-items/:itemId/details', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { itemId } = req.params;
    console.log(`🔍 액션 아이템 상세 조회: ${itemId}`);

    const details = await actionItemService.getActionItemDetails(itemId);

    res.json({
      success: true,
      itemId,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ 액션 아이템 ${req.params.itemId} 상세 조회 실패:`, error);
    res.status(500).json({
      success: false,
      message: '액션 아이템 상세 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

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

    const totalCancelledOrders = await ExchangeOrder.count({
      where: { status: 'cancelled' }
    });

    const totalOrders = await ExchangeOrder.count();

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
        settlements: totalSettlements,
        cancelledOrders: totalCancelledOrders,
        totalOrders: totalOrders
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
        cancelledOrders: 0,
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
          case 'cancelled':
            dailyStats[dateKey].cancelledOrders++;
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

    // paymentMemo 추가 - 취소 관련 PaymentHistory 조회
    const orderIds = orders.map(order => order.id);
    const paymentHistories = await PaymentHistory.findAll({
      where: {
        betId: { [Op.like]: 'EXCHANGE_%' },
        memo: { [Op.like]: '%취소%' }
      },
      attributes: ['betId', 'memo'],
      order: [['createdAt', 'DESC']]
    });

    // orderId별로 paymentMemo 매핑
    const paymentMemoMap = {};
    paymentHistories.forEach(payment => {
      const orderId = payment.betId.replace('EXCHANGE_', '');
      if (!paymentMemoMap[orderId]) {
        paymentMemoMap[orderId] = payment.memo;
      }
    });

    const ordersWithPaymentMemo = orders.map(order => {
      const orderData = order.toJSON();
      orderData.paymentMemo = paymentMemoMap[order.id] || null;
      return orderData;
    });

    res.json({
      orders: ordersWithPaymentMemo,
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
    // PaymentHistory에서 Exchange 관련 실제 정산 데이터 조회 (환불 제외)
    const paymentHistory = await PaymentHistory.findAll({
      where: {
        [Op.and]: [
          { memo: { [Op.like]: '%Exchange%' } },
          { memo: { [Op.notLike]: '%자동 환불%' } },
          { memo: { [Op.notLike]: '%취소%' } },
          {
            [Op.or]: [
              { memo: { [Op.like]: '%완전 매칭%' } },
              { memo: { [Op.like]: '%매칭 배팅 체결%' } }
            ]
          }
        ]
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    // 정산 내역을 실제 PaymentHistory 데이터 기반으로 매핑
    const settlements = [];
    
    for (const payment of paymentHistory) {
      // betId에서 주문 ID 추출 (예: "EXCHANGE_198")
      const orderIdMatch = payment.betId?.match(/EXCHANGE_(\d+)/);
      if (!orderIdMatch) continue;
      
      const orderId = parseInt(orderIdMatch[1]);
      
      // 해당 주문 정보 조회
      const order = await ExchangeOrder.findByPk(orderId, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }]
      });
      
      if (!order) continue;
      
      const gameKey = `${order.homeTeam}|${order.awayTeam}|${order.commenceTime}`;
      
      settlements.push({
        orderId: order.id,
        gameKey,
        homeTeam: order.homeTeam,
        awayTeam: order.awayTeam,
        commenceTime: order.commenceTime,
        settledAt: payment.createdAt,
        userId: order.userId,
        username: order.user?.username || 'Unknown',
        email: order.user?.email || '',
        side: order.side,
        stakeAmount: order.stakeAmount,
        odds: order.price,
        actualProfit: payment.amount, // PaymentHistory의 실제 정산 금액
        isWinner: payment.amount > 0,
        isLoser: payment.amount < 0,
        gameInfo: `${order.homeTeam} vs ${order.awayTeam}`,
        settlementTime: payment.createdAt,
        paymentMemo: payment.memo
      });
    }

    res.json({ 
      settlements,
      paymentHistory,
      totalSettledOrders: settlements.length,
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
    
    // 🆕 환불 정보 조회 (다중 환불 지원)
    let refundInfo = [];
    try {
      const refundHistories = await PaymentHistory.findAll({
        where: {
          betId: `EXCHANGE_${orderId}`,
          memo: { [Op.like]: '%환불%' }
        },
        order: [['createdAt', 'DESC']]
      });

      refundInfo = refundHistories.map(refund => ({
        amount: parseFloat(refund.amount),
        refundedAt: refund.paidAt,
        memo: refund.memo,
        balanceAfter: parseFloat(refund.balanceAfter)
      }));
    } catch (error) {
      console.error('환불 정보 조회 오류:', error);
    }

    // 🆕 경기 결과 데이터 조회
    let gameResults = {};
    
    if (originalOrder.isMultibet && originalOrder.selectionDetails && originalOrder.selectionDetails.selections) {
      // 멀티배팅인 경우 - 각 경기별로 결과 조회
      for (const selection of originalOrder.selectionDetails.selections) {
        try {
          const gameResult = await GameResult.findOne({
            where: {
              homeTeam: selection.homeTeam,
              awayTeam: selection.awayTeam,
              commenceTime: {
                [Op.between]: [
                  new Date(new Date(selection.commenceTime).getTime() - 12 * 60 * 60 * 1000), // ±12시간
                  new Date(new Date(selection.commenceTime).getTime() + 12 * 60 * 60 * 1000)
                ]
              }
            },
            order: [['createdAt', 'DESC']]
          });
          
          if (gameResult) {
            const gameKey = `${selection.homeTeam} vs ${selection.awayTeam}`;
            
            // score를 문자열로 변환
            let scoreString = 'N/A';
            if (gameResult.score) {
              if (Array.isArray(gameResult.score)) {
                // JSONB 배열 형태인 경우
                const homeScore = gameResult.score.find(s => s.name === selection.homeTeam)?.score || '0';
                const awayScore = gameResult.score.find(s => s.name === selection.awayTeam)?.score || '0';
                scoreString = `${homeScore}-${awayScore}`;
              } else if (typeof gameResult.score === 'string') {
                // 문자열 형태인 경우 (예: "5-0")
                scoreString = gameResult.score;
              }
            }
            
            gameResults[gameKey] = {
              result: gameResult.result,
              score: scoreString,
              status: gameResult.status
            };
          }
        } catch (error) {
          console.error(`경기 결과 조회 오류 (${selection.homeTeam} vs ${selection.awayTeam}):`, error);
        }
      }
    } else {
      // 단일 경기인 경우
      try {
        const gameResult = await GameResult.findOne({
          where: {
            homeTeam: originalOrder.homeTeam,
            awayTeam: originalOrder.awayTeam,
            commenceTime: {
              [Op.between]: [
                new Date(new Date(originalOrder.commenceTime).getTime() - 12 * 60 * 60 * 1000), // ±12시간
                new Date(new Date(originalOrder.commenceTime).getTime() + 12 * 60 * 60 * 1000)
              ]
            }
          },
          order: [['createdAt', 'DESC']]
        });
        
        if (gameResult) {
          // score를 문자열로 변환
          let scoreString = 'N/A';
          if (gameResult.score) {
            if (Array.isArray(gameResult.score)) {
              // JSONB 배열 형태인 경우
              const homeScore = gameResult.score.find(s => s.name === originalOrder.homeTeam)?.score || '0';
              const awayScore = gameResult.score.find(s => s.name === originalOrder.awayTeam)?.score || '0';
              scoreString = `${homeScore}-${awayScore}`;
            } else if (typeof gameResult.score === 'string') {
              // 문자열 형태인 경우 (예: "5-0")
              scoreString = gameResult.score;
            }
          }
          
          // 단일 경기 결과를 gameResult 형태로 설정
          originalOrder.gameResult = {
            result: gameResult.result,
            score: scoreString,
            status: gameResult.status
          };
        }
      } catch (error) {
        console.error(`단일 경기 결과 조회 오류:`, error);
      }
    }
    
    // 멀티배팅인 경우 gameResults를 originalOrder에 포함
    if (originalOrder.isMultibet) {
      originalOrder.gameResults = gameResults;
    }
    
    res.json({
      originalOrder,
      matchedOrders,
      gameResults, // 멀티배팅용 경기 결과들
      refundInfo // 환불 정보 추가
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

// 사용자 정보 수정 (추천코드, 추천인 등)
router.patch('/users/:id', verifyToken, requireAdmin(3), async (req, res) => {
  try {
    const { referralCode, referredBy, reason } = req.body;
    
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const updateData = {};
    const logMessages = [];

    // 추천코드 설정
    if (referralCode !== undefined) {
      if (referralCode === null || referralCode === '') {
        updateData.referralCode = null;
        logMessages.push(`추천코드 제거: ${user.referralCode || '없음'} -> 없음`);
      } else {
        // 통합 추천코드 검증
        const codeValidation = await ReferralCodeValidator.validateCodeForUser(referralCode, user.id);
        if (!codeValidation.isValid) {
          return res.status(400).json({ message: codeValidation.message });
        }

        updateData.referralCode = referralCode;
        logMessages.push(`추천코드 설정: ${user.referralCode || '없음'} -> ${referralCode}`);
      }
    }

    // 추천인 코드 설정
    if (referredBy !== undefined) {
      if (referredBy === null || referredBy === '') {
        updateData.referredBy = null;
        updateData.referrerAdminId = null;
        logMessages.push(`추천인 코드 제거: ${user.referredBy || '없음'} -> 없음`);
      } else {
        // 추천인 코드 존재 확인
        const referrerValidation = await ReferralCodeValidator.validateReferrerCode(referredBy);
        if (!referrerValidation.exists) {
          return res.status(400).json({ message: referrerValidation.message });
        }

        // ReferralCode 정보 다시 조회하여 adminId 가져오기
        const referralCodeExists = await ReferralCode.findOne({
          where: { code: referredBy, isActive: true }
        });

        updateData.referredBy = referredBy;
        updateData.referrerAdminId = referralCodeExists.adminId;
        logMessages.push(`추천인 코드 설정: ${user.referredBy || '없음'} -> ${referredBy}`);
        
        // 추천코드 사용자 수 증가
        await referralCodeExists.incrementUserCount();
      }
    }

    // 업데이트할 데이터가 있는지 확인
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: '수정할 데이터가 없습니다.' });
    }

    // 사용자 정보 업데이트
    await user.update(updateData);

    // 로그 기록
    const logMessage = `User updated by admin ${req.admin.username}: ${user.username} - ${logMessages.join(', ')}. Reason: ${reason || 'N/A'}`;
    console.log(logMessage);

    res.json({ 
      message: '사용자 정보가 성공적으로 수정되었습니다.',
      updatedFields: Object.keys(updateData),
      log: logMessages
    });

  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ message: '사용자 정보 수정 중 오류가 발생했습니다.' });
  }
});

// 사용자별 추천코드 현황 조회
router.get('/users/:id/referral-stats', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'referralCode', 'referredBy', 'referrerAdminId']
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    let referralStats = {
      user: user,
      hasReferralCode: !!user.referralCode,
      referredBy: user.referredBy,
      referredUsers: [],
      referralCodeInfo: null,
      referrerInfo: null
    };

    // 사용자의 추천코드 정보 조회
    if (user.referralCode) {
      const referralCodeInfo = await ReferralCode.findOne({
        where: { code: user.referralCode },
        include: [{
          model: User,
          as: 'admin',
          attributes: ['id', 'username', 'email', 'adminLevel']
        }]
      });

      if (referralCodeInfo) {
        referralStats.referralCodeInfo = {
          id: referralCodeInfo.id,
          code: referralCodeInfo.code,
          commissionRate: referralCodeInfo.commissionRate,
          isActive: referralCodeInfo.isActive,
          maxUsers: referralCodeInfo.maxUsers,
          currentUsers: referralCodeInfo.currentUsers,
          expiresAt: referralCodeInfo.expiresAt,
          admin: referralCodeInfo.admin
        };

        // 이 추천코드로 가입한 사용자들 조회
        const referredUsers = await User.findAll({
          where: { referredBy: user.referralCode },
          attributes: ['id', 'username', 'email', 'createdAt', 'isActive', 'balance'],
          order: [['createdAt', 'DESC']],
          limit: 50
        });

        referralStats.referredUsers = referredUsers.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          isActive: user.isActive,
          balance: user.balance
        }));
      }
    }

    // 사용자가 추천받은 정보 조회
    if (user.referredBy) {
      const referrerInfo = await ReferralCode.findOne({
        where: { code: user.referredBy },
        include: [{
          model: User,
          as: 'admin',
          attributes: ['id', 'username', 'email', 'adminLevel']
        }]
      });

      if (referrerInfo) {
        referralStats.referrerInfo = {
          code: referrerInfo.code,
          commissionRate: referrerInfo.commissionRate,
          admin: referrerInfo.admin
        };
      }
    }

    res.json({
      message: '사용자 추천코드 현황 조회 성공',
      stats: referralStats
    });

  } catch (error) {
    console.error('User referral stats error:', error);
    res.status(500).json({ message: '사용자 추천코드 현황 조회 중 오류가 발생했습니다.' });
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
        [sequelize.fn('COUNT', sequelize.col('Bet.id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('Bet.stake')), 'totalStake'],
        [sequelize.fn('SUM', sequelize.col('Bet.potentialWinnings')), 'totalWinnings']
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
    const { code, commissionRate, maxUsers, expiresAt, assignToUserId } = req.body;
    
    if (commissionRate < 0 || commissionRate > 0.2) {
      return res.status(400).json({ message: '수수료율은 0-20% 사이여야 합니다.' });
    }

    // 통합 추천코드 검증
    const codeValidation = await ReferralCodeValidator.validateCode(code);
    if (!codeValidation.isValid) {
      return res.status(400).json({ message: codeValidation.message });
    }

    const newCode = await ReferralCode.create({
      adminId: req.admin.id,
      code,
      commissionRate,
      maxUsers: maxUsers || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    let assignedUser = null;

    // 특정 사용자에게 즉시 할당
    if (assignToUserId) {
      const targetUser = await User.findByPk(assignToUserId);
      if (targetUser) {
        // 기존 추천코드가 있다면 제거
        if (targetUser.referralCode) {
          const existingUserReferralCode = await ReferralCode.findOne({ 
            where: { code: targetUser.referralCode } 
          });
          if (existingUserReferralCode) {
            await existingUserReferralCode.decrement('currentUsers');
          }
        }

        // 새 추천코드 할당
        await targetUser.update({ 
          referralCode: code,
          referredBy: null, // 사용자 자신의 추천코드이므로 referredBy는 null
          referrerAdminId: req.admin.id
        });

        // ReferralCode의 currentUsers 증가
        await newCode.increment('currentUsers');
        
        assignedUser = {
          id: targetUser.id,
          username: targetUser.username,
          email: targetUser.email
        };

        console.log(`Referral code ${code} assigned to user ${targetUser.username} by admin ${req.admin.username}`);
      }
    }

    res.status(201).json({ 
      message: assignedUser 
        ? `추천코드가 성공적으로 생성되고 ${assignedUser.username}님에게 할당되었습니다.`
        : '추천코드가 성공적으로 생성되었습니다.',
      code: newCode,
      assignedUser
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

// =============================================================================
// 경기 데이터 관리
// =============================================================================

// 경기 목록 조회
router.get('/games', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { sport_key, status, search, page = 1, limit = 50 } = req.query;
    
    const whereCondition = {};
    
    if (sport_key && sport_key !== 'all') {
      whereCondition.sport_key = sport_key;
    }
    
    if (status && status !== 'all') {
      const now = new Date();
      switch (status) {
        case 'upcoming':
          whereCondition.commence_time = { [Op.gt]: now };
          break;
        case 'live':
          whereCondition.commence_time = { [Op.lte]: now };
          whereCondition.status = 'live';
          break;
        case 'completed':
          whereCondition.status = 'completed';
          break;
      }
    }
    
    if (search) {
      whereCondition[Op.or] = [
        { home_team: { [Op.iLike]: `%${search}%` } },
        { away_team: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);
    
    const games = await OddsCache.findAll({
      where: whereCondition,
      order: [['commence_time', 'DESC']],
      limit: Number(limit),
      offset: offset
    });

    const totalCount = await OddsCache.count({ where: whereCondition });

    res.json({
      games: games.map(game => ({
        id: game.id,
        sport_key: game.sport_key,
        sport_title: game.sport_title,
        commence_time: game.commence_time,
        home_team: game.home_team,
        away_team: game.away_team,
        home_team_odds: game.home_team_odds,
        away_team_odds: game.away_team_odds,
        draw_odds: game.draw_odds,
        status: game.status || 'upcoming',
        is_active: game.is_active !== false,
        created_at: game.createdAt,
        updated_at: game.updatedAt
      })),
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit))
    });
  } catch (error) {
    console.error('경기 데이터 조회 실패:', error);
    res.status(500).json({ error: '경기 데이터 조회에 실패했습니다.' });
  }
});

// 경기 추가
router.post('/games', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    const {
      sport_key,
      sport_title,
      commence_time,
      home_team,
      away_team,
      home_team_odds,
      away_team_odds,
      draw_odds,
      is_active = true
    } = req.body;

    const newGame = await OddsCache.create({
      sport_key,
      sport_title,
      commence_time: new Date(commence_time),
      home_team,
      away_team,
      home_team_odds: parseFloat(home_team_odds),
      away_team_odds: parseFloat(away_team_odds),
      draw_odds: draw_odds ? parseFloat(draw_odds) : null,
      is_active,
      status: 'upcoming'
    });

    res.status(201).json({ 
      message: '경기가 성공적으로 추가되었습니다.',
      game: newGame 
    });
  } catch (error) {
    console.error('경기 추가 실패:', error);
    res.status(500).json({ error: '경기 추가에 실패했습니다.' });
  }
});

// 경기 수정
router.put('/games/:id', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      commence_time,
      home_team,
      away_team,
      home_team_odds,
      away_team_odds,
      draw_odds,
      is_active,
      status
    } = req.body;

    const game = await OddsCache.findByPk(Number(id));
    
    if (!game) {
      return res.status(404).json({ error: '경기를 찾을 수 없습니다.' });
    }

    const updateData = {};
    
    if (commence_time !== undefined) updateData.commence_time = new Date(commence_time);
    if (home_team !== undefined) updateData.home_team = home_team;
    if (away_team !== undefined) updateData.away_team = away_team;
    if (home_team_odds !== undefined) updateData.home_team_odds = parseFloat(home_team_odds);
    if (away_team_odds !== undefined) updateData.away_team_odds = parseFloat(away_team_odds);
    if (draw_odds !== undefined) updateData.draw_odds = draw_odds ? parseFloat(draw_odds) : null;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (status !== undefined) updateData.status = status;

    await game.update(updateData);

    res.json({ 
      message: '경기가 성공적으로 수정되었습니다.',
      game: game 
    });
  } catch (error) {
    console.error('경기 수정 실패:', error);
    res.status(500).json({ error: '경기 수정에 실패했습니다.' });
  }
});

// 리그 목록 조회
router.get('/leagues', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const leagues = await OddsCache.findAll({
      attributes: [
        'sport_key',
        'sport_title',
        'is_active',
        [OddsCache.sequelize.fn('COUNT', OddsCache.sequelize.col('id')), 'game_count']
      ],
      group: ['sport_key', 'sport_title', 'is_active'],
      order: [['sport_title', 'ASC']]
    });

    const leagueMap = new Map();
    
    leagues.forEach((league) => {
      const key = league.sport_key;
      const data = leagueMap.get(key) || {
        sport_key: league.sport_key,
        sport_title: league.sport_title,
        is_active: league.is_active,
        game_count: 0
      };
      
      data.game_count += parseInt(league.dataValues.game_count);
      leagueMap.set(key, data);
    });

    const result = Array.from(leagueMap.values());

    res.json({ leagues: result });
  } catch (error) {
    console.error('리그 데이터 조회 실패:', error);
    res.status(500).json({ error: '리그 데이터 조회에 실패했습니다.' });
  }
});

// 리그 상태 변경
router.put('/leagues', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    const { sport_key, is_active } = req.body;

    if (!sport_key) {
      return res.status(400).json({ error: 'sport_key가 필요합니다.' });
    }

    const [affectedRows] = await OddsCache.update(
      { is_active },
      { where: { sport_key } }
    );

    res.json({ 
      message: `리그가 ${is_active ? '활성화' : '비활성화'}되었습니다.`,
      affectedRows 
    });
  } catch (error) {
    console.error('리그 상태 변경 실패:', error);
    res.status(500).json({ error: '리그 상태 변경에 실패했습니다.' });
  }
});

// =============================================================================
// 통계 및 리포트
// =============================================================================

// 매출 분석 데이터
router.get('/analytics/sales', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const salesData = await Bet.findAll({
      attributes: [
        [Bet.sequelize.fn('DATE', Bet.sequelize.col('createdAt')), 'date'],
        [Bet.sequelize.fn('COUNT', Bet.sequelize.col('Bet.id')), 'total_bets'],
        [Bet.sequelize.fn('SUM', Bet.sequelize.col('amount')), 'total_sales'],
        [Bet.sequelize.fn('COUNT', Bet.sequelize.fn('DISTINCT', Bet.sequelize.col('userId'))), 'total_users']
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: now
        }
      },
      group: [Bet.sequelize.fn('DATE', Bet.sequelize.col('createdAt'))],
      order: [[Bet.sequelize.fn('DATE', Bet.sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    const refundData = await PaymentHistory.findAll({
      attributes: [
        [PaymentHistory.sequelize.fn('DATE', PaymentHistory.sequelize.col('createdAt')), 'date'],
        [PaymentHistory.sequelize.fn('SUM', PaymentHistory.sequelize.col('amount')), 'total_refunds']
      ],
      where: {
        type: 'refund',
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: now
        }
      },
      group: [PaymentHistory.sequelize.fn('DATE', PaymentHistory.sequelize.col('createdAt'))],
      raw: true
    });

    const payoutData = await PaymentHistory.findAll({
      attributes: [
        [PaymentHistory.sequelize.fn('DATE', PaymentHistory.sequelize.col('createdAt')), 'date'],
        [PaymentHistory.sequelize.fn('SUM', PaymentHistory.sequelize.col('amount')), 'total_payouts']
      ],
      where: {
        type: 'payout',
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: now
        }
      },
      group: [PaymentHistory.sequelize.fn('DATE', PaymentHistory.sequelize.col('createdAt'))],
      raw: true
    });

    const refundMap = new Map();
    refundData.forEach((item) => {
      refundMap.set(item.date, parseFloat(item.total_refunds) || 0);
    });

    const payoutMap = new Map();
    payoutData.forEach((item) => {
      payoutMap.set(item.date, parseFloat(item.total_payouts) || 0);
    });

    const result = salesData.map((item) => {
      const date = item.date;
      const totalSales = parseFloat(item.total_sales) || 0;
      const totalRefunds = refundMap.get(date) || 0;
      const totalPayouts = payoutMap.get(date) || 0;
      const profit = totalSales - totalRefunds - totalPayouts;

      return {
        date,
        total_sales: totalSales,
        total_bets: parseInt(item.total_bets) || 0,
        total_users: parseInt(item.total_users) || 0,
        profit: Math.max(0, profit)
      };
    });

    res.json({ data: result });
  } catch (error) {
    console.error('매출 분석 데이터 조회 실패:', error);
    res.status(500).json({ error: '매출 분석 데이터 조회에 실패했습니다.' });
  }
});

// 사용자 분석 데이터
router.get('/analytics/users', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const newUsersData = await User.findAll({
      attributes: [
        [User.sequelize.fn('DATE', User.sequelize.col('createdAt')), 'date'],
        [User.sequelize.fn('COUNT', User.sequelize.col('User.id')), 'new_users']
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: now
        }
      },
      group: [User.sequelize.fn('DATE', User.sequelize.col('createdAt'))],
      order: [[User.sequelize.fn('DATE', User.sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    const activeUsersData = await Bet.findAll({
      attributes: [
        [Bet.sequelize.fn('DATE', Bet.sequelize.col('createdAt')), 'date'],
        [Bet.sequelize.fn('COUNT', Bet.sequelize.fn('DISTINCT', Bet.sequelize.col('userId'))), 'active_users'],
        [Bet.sequelize.fn('COUNT', Bet.sequelize.col('Bet.id')), 'total_bets'],
        [Bet.sequelize.fn('AVG', Bet.sequelize.col('amount')), 'avg_bet_amount']
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: now
        }
      },
      group: [Bet.sequelize.fn('DATE', Bet.sequelize.col('createdAt'))],
      order: [[Bet.sequelize.fn('DATE', Bet.sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    const newUsersMap = new Map();
    newUsersData.forEach((item) => {
      newUsersMap.set(item.date, parseInt(item.new_users) || 0);
    });

    const result = activeUsersData.map((item) => {
      const date = item.date;
      const newUsers = newUsersMap.get(date) || 0;

      return {
        date,
        new_users: newUsers,
        active_users: parseInt(item.active_users) || 0,
        total_bets: parseInt(item.total_bets) || 0,
        avg_bet_amount: parseFloat(item.avg_bet_amount) || 0
      };
    });

    res.json({ data: result });
  } catch (error) {
    console.error('사용자 분석 데이터 조회 실패:', error);
    res.status(500).json({ error: '사용자 분석 데이터 조회에 실패했습니다.' });
  }
});

// 스포츠북 패턴 분석 데이터
router.get('/analytics/sportsbook', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const sportsbookData = await Bet.findAll({
      attributes: [
        'sport_key',
        [Bet.sequelize.fn('COUNT', Bet.sequelize.col('Bet.id')), 'total_bets'],
        [Bet.sequelize.fn('SUM', Bet.sequelize.col('amount')), 'total_amount'],
        [Bet.sequelize.fn('AVG', Bet.sequelize.col('odds')), 'avg_odds']
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: now
        }
      },
      group: ['sport_key'],
      order: [[Bet.sequelize.fn('SUM', Bet.sequelize.col('amount')), 'DESC']],
      raw: true
    });

    const sportTitles = await OddsCache.findAll({
      attributes: ['sport_key', 'sport_title'],
      where: {
        sport_key: {
          [Op.in]: sportsbookData.map((item) => item.sport_key)
        }
      },
      group: ['sport_key', 'sport_title'],
      raw: true
    });

    const sportTitleMap = new Map();
    sportTitles.forEach((item) => {
      sportTitleMap.set(item.sport_key, item.sport_title);
    });

    const winningBets = await Bet.findAll({
      attributes: [
        'sport_key',
        [Bet.sequelize.fn('COUNT', Bet.sequelize.col('Bet.id')), 'winning_bets']
      ],
      where: {
        result: 'win',
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: now
        }
      },
      group: ['sport_key'],
      raw: true
    });

    const winningBetsMap = new Map();
    winningBets.forEach((item) => {
      winningBetsMap.set(item.sport_key, parseInt(item.winning_bets) || 0);
    });

    const result = sportsbookData.map((item) => {
      const sportKey = item.sport_key;
      const totalBets = parseInt(item.total_bets) || 0;
      const winningBets = winningBetsMap.get(sportKey) || 0;
      const winRate = totalBets > 0 ? winningBets / totalBets : 0;

      return {
        sport_key: sportKey,
        sport_title: sportTitleMap.get(sportKey) || sportKey,
        total_bets: totalBets,
        total_amount: parseFloat(item.total_amount) || 0,
        avg_odds: parseFloat(item.avg_odds) || 0,
        win_rate: winRate
      };
    });

    res.json({ data: result });
  } catch (error) {
    console.error('스포츠북 패턴 분석 데이터 조회 실패:', error);
    res.status(500).json({ error: '스포츠북 패턴 분석 데이터 조회에 실패했습니다.' });
  }
});

// 관리자 성과 분석 데이터
router.get('/analytics/admin', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const admins = await User.findAll({
      where: {
        isAdmin: true
      },
      attributes: ['id', 'username', 'email', 'lastLogin'],
      raw: true
    });

    const adminPerformance = await Promise.all(admins.map(async (admin) => {
      const betActions = await Bet.findAll({
        attributes: [
          [Bet.sequelize.fn('COUNT', Bet.sequelize.col('Bet.id')), 'total_actions'],
          [Bet.sequelize.fn('COUNT', Bet.sequelize.literal('CASE WHEN result IS NOT NULL THEN 1 END')), 'successful_actions']
        ],
        where: {
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: now
          }
        },
        raw: true
      });

      const exchangeActions = await ExchangeOrder.findAll({
        attributes: [
          [ExchangeOrder.sequelize.fn('COUNT', ExchangeOrder.sequelize.col('ExchangeOrder.id')), 'total_actions'],
          [ExchangeOrder.sequelize.fn('COUNT', ExchangeOrder.sequelize.literal('CASE WHEN status IN (\'settled\', \'cancelled\') THEN 1 END')), 'successful_actions']
        ],
        where: {
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: now
          }
        },
        raw: true
      });

      const betData = betActions[0] || { total_actions: 0, successful_actions: 0 };
      const exchangeData = exchangeActions[0] || { total_actions: 0, successful_actions: 0 };

      const totalActions = parseInt(betData.total_actions) + parseInt(exchangeData.total_actions);
      const successfulActions = parseInt(betData.successful_actions) + parseInt(exchangeData.successful_actions);
      const errorRate = totalActions > 0 ? (totalActions - successfulActions) / totalActions : 0;

      return {
        admin_id: admin.id,
        admin_name: admin.username || admin.email,
        total_actions: totalActions,
        successful_actions: successfulActions,
        error_rate: errorRate,
        last_activity: admin.lastLogin || admin.createdAt
      };
    }));

    adminPerformance.sort((a, b) => b.total_actions - a.total_actions);

    res.json({ data: adminPerformance });
  } catch (error) {
    console.error('관리자 성과 분석 데이터 조회 실패:', error);
    res.status(500).json({ error: '관리자 성과 분석 데이터 조회에 실패했습니다.' });
  }
});

// =============================================================================
// 시스템 설정
// =============================================================================

// 공개 설정 조회 (인증 불필요)
router.get('/public-settings', async (req, res) => {
  try {
    // 기본 설정값들
    const defaultSettings = {
      site_name: 'LikeBetFair',
      site_description: '스포츠 베팅 플랫폼',
      maintenance_mode: false
    };

    // 데이터베이스에서 설정 조회
    const dbSettings = await Settings.findAll();
    const settings = { ...defaultSettings };

    // 데이터베이스에 저장된 설정으로 덮어쓰기
    dbSettings.forEach(setting => {
      if (setting.key in settings) {
        let value = setting.value;
        if (typeof defaultSettings[setting.key] === 'boolean') {
          value = value === 'true';
        }
        settings[setting.key] = value;
      }
    });

    res.json({ settings });
  } catch (error) {
    console.error('공개 설정 조회 실패:', error);
    res.status(500).json({ error: '설정 조회에 실패했습니다.' });
  }
});

// 시스템 설정 조회
router.get('/settings', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    // 기본 설정값들
    const defaultSettings = {
      site_name: 'LikeBetFair',
      site_description: '스포츠 베팅 플랫폼',
      maintenance_mode: false,
      max_bet_amount: 1000000,
      min_bet_amount: 1000,
      sportsbook_commission_rate: 0.05,
      exchange_commission_rate: 0.03,
      auto_settlement_enabled: true,
      odds_update_interval: 30,
      email_notifications: true,
      sms_notifications: false
    };

    // 데이터베이스에서 설정 조회
    const dbSettings = await Settings.findAll();
    const settings = { ...defaultSettings };

    // 데이터베이스에 저장된 설정으로 덮어쓰기
    dbSettings.forEach(setting => {
      if (setting.key in settings) {
        // 타입에 따라 적절히 변환
        let value = setting.value;
        if (typeof defaultSettings[setting.key] === 'boolean') {
          value = value === 'true';
        } else if (typeof defaultSettings[setting.key] === 'number') {
          value = parseFloat(value);
        }
        settings[setting.key] = value;
      }
    });

    res.json({ settings });
  } catch (error) {
    console.error('설정 조회 실패:', error);
    res.status(500).json({ error: '설정 조회에 실패했습니다.' });
  }
});

// 시스템 설정 업데이트
router.put('/settings', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    const updatedSettings = req.body;
    
    // 각 설정을 데이터베이스에 저장
    for (const [key, value] of Object.entries(updatedSettings)) {
      await Settings.upsert({
        key: key,
        value: String(value),
        category: 'general'
      });
    }
    
    res.json({ 
      message: '설정이 성공적으로 저장되었습니다.',
      settings: updatedSettings 
    });
  } catch (error) {
    console.error('설정 저장 실패:', error);
    res.status(500).json({ error: '설정 저장에 실패했습니다.' });
  }
});

// =============================================================================
// 베팅 금액 설정 관리
// =============================================================================

// 익스체인지 배당율 환수율 설정 관리
// =============================================================================

// 익스체인지 배당율 환수율 설정 조회
router.get('/settings/exchange-odds-return-rate', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    console.log('🔍 익스체인지 배당율 환수율 설정 조회 요청:', req.admin.username);
    
    const settings = await ExchangeOddsReturnRateService.getOddsReturnRateSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('익스체인지 배당율 환수율 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '설정 조회 중 오류가 발생했습니다.'
    });
  }
});

// 익스체인지 배당율 환수율 설정 조회 (공개 API - 토큰 불필요)
router.get('/public-settings/exchange-odds-return-rate', async (req, res) => {
  try {
    console.log('🔍 공개 익스체인지 배당율 환수율 설정 조회 요청');
    
    const settings = await ExchangeOddsReturnRateService.getOddsReturnRateSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('익스체인지 배당율 환수율 설정 조회 오류:', error);
    res.json({
      success: true,
      data: { returnRate: 0.95, enabled: true } // 기본값 반환
    });
  }
});

// 익스체인지 배당율 환수율 설정 업데이트
router.put('/settings/exchange-odds-return-rate', verifyToken, requireAdmin(3), async (req, res) => {
  try {
    const { returnRate, enabled } = req.body;
    
    console.log('🔧 익스체인지 배당율 환수율 설정 업데이트 요청:', {
      admin: req.admin.username,
      returnRate,
      enabled
    });
    
    // 입력값 검증 - 환수율은 0과 0.998 사이 (99.8%까지)
    if (returnRate !== undefined && (isNaN(returnRate) || returnRate <= 0 || returnRate > 0.998)) {
      return res.status(400).json({
        success: false,
        error: '환수율은 0과 0.998 사이의 값이어야 합니다. (0.95 = 95%, 최대 99.8%)'
      });
    }
    
    const result = await ExchangeOddsReturnRateService.updateOddsReturnRateSettings({
      returnRate,
      enabled
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: '익스체인지 배당율 환수율 설정이 업데이트되었습니다.'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || '설정 업데이트 중 오류가 발생했습니다.'
      });
    }
  } catch (error) {
    console.error('익스체인지 배당율 환수율 설정 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: '설정 업데이트 중 오류가 발생했습니다.'
    });
  }
});

// 베팅 금액 설정 관리
// =============================================================================

// 베팅 금액 설정 조회
router.get('/settings/betting-amounts', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    console.log('🔍 베팅 금액 설정 조회 요청:', req.admin.username);
    
    const settings = await BettingAmountSettingsService.getBettingAmountSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('베팅 금액 설정 조회 실패:', error);
    res.status(500).json({ 
      success: false,
      error: '베팅 금액 설정 조회에 실패했습니다.' 
    });
  }
});

// 특정 플랫폼 베팅 금액 설정 조회
router.get('/settings/betting-amounts/:platform', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { platform } = req.params;
    
    if (!['sportsbook', 'exchange'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: '지원하지 않는 플랫폼입니다. (sportsbook, exchange만 지원)'
      });
    }
    
    console.log(`🔍 ${platform} 베팅 금액 설정 조회 요청:`, req.admin.username);
    
    const settings = await BettingAmountSettingsService.getPlatformBettingSettings(platform);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error(`${req.params.platform} 베팅 금액 설정 조회 실패:`, error);
    res.status(500).json({ 
      success: false,
      error: '베팅 금액 설정 조회에 실패했습니다.' 
    });
  }
});

// 베팅 금액 설정 업데이트
router.put('/settings/betting-amounts/:platform', verifyToken, requireAdmin(3), async (req, res) => {
  try {
    const { platform } = req.params;
    const { minBetAmount, maxBetAmount } = req.body;
    
    if (!['sportsbook', 'exchange'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: '지원하지 않는 플랫폼입니다. (sportsbook, exchange만 지원)'
      });
    }
    
    // 입력값 검증
    if (minBetAmount !== undefined && (isNaN(minBetAmount) || minBetAmount < 0)) {
      return res.status(400).json({
        success: false,
        error: '최소 베팅 금액은 0 이상의 숫자여야 합니다.'
      });
    }
    
    if (maxBetAmount !== undefined && (isNaN(maxBetAmount) || maxBetAmount < 0)) {
      return res.status(400).json({
        success: false,
        error: '최대 베팅 금액은 0 이상의 숫자여야 합니다.'
      });
    }
    
    if (minBetAmount !== undefined && maxBetAmount !== undefined && minBetAmount > maxBetAmount) {
      return res.status(400).json({
        success: false,
        error: '최소 베팅 금액은 최대 베팅 금액보다 작아야 합니다.'
      });
    }
    
    console.log(`🔧 ${platform} 베팅 금액 설정 업데이트 요청:`, req.admin.username, { minBetAmount, maxBetAmount });
    
    const updatedSettings = await BettingAmountSettingsService.updateBettingAmountSettings(platform, {
      minBetAmount,
      maxBetAmount
    });
    
    res.json({
      success: true,
      message: `${platform} 베팅 금액 설정이 성공적으로 업데이트되었습니다.`,
      data: updatedSettings
    });
  } catch (error) {
    console.error(`${req.params.platform} 베팅 금액 설정 업데이트 실패:`, error);
    res.status(500).json({ 
      success: false,
      error: '베팅 금액 설정 업데이트에 실패했습니다.' 
    });
  }
});

// 관리자 목록 조회
router.get('/settings/admins', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const admins = await User.findAll({
      where: { isAdmin: true },
      attributes: ['id', 'username', 'email', 'isActive', 'lastLogin', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({ admins });
  } catch (error) {
    console.error('관리자 목록 조회 실패:', error);
    res.status(500).json({ error: '관리자 목록 조회에 실패했습니다.' });
  }
});

// 관리자 추가
router.post('/settings/admins', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: '이미 존재하는 이메일입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await User.create({
      username,
      email,
      password: hashedPassword,
      isAdmin: true,
      isActive: true
    });

    res.status(201).json({ 
      message: '관리자가 성공적으로 추가되었습니다.',
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
        isActive: newAdmin.isActive
      }
    });
  } catch (error) {
    console.error('관리자 추가 실패:', error);
    res.status(500).json({ error: '관리자 추가에 실패했습니다.' });
  }
});

// 관리자 상태 변경
router.put('/settings/admins/:id', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const admin = await User.findByPk(Number(id));
    
    if (!admin) {
      return res.status(404).json({ error: '관리자를 찾을 수 없습니다.' });
    }

    if (!admin.isAdmin) {
      return res.status(400).json({ error: '관리자가 아닌 사용자입니다.' });
    }

    await admin.update({ isActive });

    res.json({ 
      message: `관리자가 ${isActive ? '활성화' : '비활성화'}되었습니다.`,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('관리자 상태 변경 실패:', error);
    res.status(500).json({ error: '관리자 상태 변경에 실패했습니다.' });
  }
});

// 시스템 로그 조회
router.get('/settings/logs', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    // 임시 로그 데이터 (실제로는 로그 파일이나 데이터베이스에서 조회)
    const logs = [];
    const levels = ['info', 'warn', 'error'];
    const sources = ['auth', 'bet', 'exchange', 'payment', 'system'];
    const messages = [
      '사용자 로그인 성공',
      '베팅 처리 완료',
      'Exchange 주문 생성',
      '결제 처리 중 오류 발생',
      '시스템 시작',
      '데이터베이스 연결 실패',
      '배당 업데이트 완료',
      '자동 정산 실행',
      '백업 생성 완료',
      '관리자 권한 변경'
    ];

    for (let i = 0; i < 50; i++) {
      const level = levels[Math.floor(Math.random() * levels.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

      logs.push({
        id: i + 1,
        level,
        message,
        timestamp: timestamp.toISOString(),
        source
      });
    }

    res.json({ logs: logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) });
  } catch (error) {
    console.error('로그 조회 실패:', error);
    res.status(500).json({ error: '로그 조회에 실패했습니다.' });
  }
});

// 백업 상태 조회
router.get('/settings/backup', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    // 임시 백업 상태 (실제로는 데이터베이스에서 조회)
    const status = {
      last_backup: null,
      backup_size: 0,
      is_backing_up: false
    };

    res.json({ status });
  } catch (error) {
    console.error('백업 상태 조회 실패:', error);
    res.status(500).json({ error: '백업 상태 조회에 실패했습니다.' });
  }
});

// 백업 생성
router.post('/settings/backup', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    // 백업 생성 시뮬레이션
    res.json({ 
      message: '백업이 시작되었습니다.',
      status: {
        last_backup: new Date().toISOString(),
        backup_size: Math.floor(Math.random() * 100000000),
        is_backing_up: true
      }
    });
  } catch (error) {
    console.error('백업 생성 실패:', error);
    res.status(500).json({ error: '백업 생성에 실패했습니다.' });
  }
});

// 수수료 현황 조회
router.get('/commissions', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    console.log('🔍 수수료 현황 조회 요청:', req.admin.username);
    
    const { period = '7d', type = 'all' } = req.query;
    
    // 기간 설정
    let dateFilter = {};
    const now = new Date();
    switch (period) {
      case '1d':
        dateFilter = { createdAt: { [Op.gte]: new Date(now - 24 * 60 * 60 * 1000) } };
        break;
      case '7d':
        dateFilter = { createdAt: { [Op.gte]: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { [Op.gte]: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case '90d':
        dateFilter = { createdAt: { [Op.gte]: new Date(now - 90 * 24 * 60 * 60 * 1000) } };
        break;
      default:
        dateFilter = {};
    }
    
    // 유형 필터
    let typeFilter = {};
    if (type !== 'all') {
      typeFilter = { type: type };
    }
    
    const whereClause = {
      ...dateFilter,
      ...typeFilter
    };
    
    // 수수료 통계 조회
    const commissionStats = await AdminCommission.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('AdminCommission.id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('AdminCommission.commissionAmount')), 'totalAmount'],
        [sequelize.fn('AVG', sequelize.col('AdminCommission.commissionAmount')), 'avgAmount']
      ],
      where: whereClause,
      group: ['type']
    });
    
    // 최근 수수료 내역
    const recentCommissions = await AdminCommission.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: 20,
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['email', 'username'],
          required: false 
        }
      ]
    });
    
    // 일별 수수료 통계 (최근 7일)
    const dailyStats = await AdminCommission.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('AdminCommission.createdAt')), 'date'],
        'type',
        [sequelize.fn('COUNT', sequelize.col('AdminCommission.id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('AdminCommission.commissionAmount')), 'totalAmount']
      ],
      where: {
        createdAt: { [Op.gte]: new Date(now - 7 * 24 * 60 * 60 * 1000) },
        ...(type !== 'all' ? { type: type } : {})
      },
      group: [
        sequelize.fn('DATE', sequelize.col('createdAt')),
        'type'
      ],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'DESC']]
    });
    
    // 수수료 수취자별 통계 (include 없이 별도 조회)
    const adminStatsRaw = await AdminCommission.findAll({
      attributes: [
        'adminId',
        [sequelize.fn('COUNT', sequelize.col('AdminCommission.id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('AdminCommission.commissionAmount')), 'totalAmount']
      ],
      where: whereClause,
      group: ['adminId']
    });
    
    // 각 adminId에 대해 사용자 정보 조회
    const adminStats = await Promise.all(adminStatsRaw.map(async (stat) => {
      const admin = await User.findByPk(stat.adminId, {
        attributes: ['email', 'username']
      });
      return {
        adminId: stat.adminId,
        count: parseInt(stat.dataValues.count || 0),
        totalAmount: parseFloat(stat.dataValues.totalAmount || 0),
        admin: admin ? {
          email: admin.email,
          username: admin.username
        } : null
      };
    }));
    
    res.json({
      success: true,
      data: {
        summary: {
          totalCommissions: commissionStats.reduce((sum, stat) => sum + parseFloat(stat.dataValues.totalAmount || 0), 0),
          totalCount: commissionStats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count || 0), 0),
          byType: commissionStats.map(stat => ({
            type: stat.type,
            count: parseInt(stat.dataValues.count || 0),
            totalAmount: parseFloat(stat.dataValues.totalAmount || 0),
            avgAmount: parseFloat(stat.dataValues.avgAmount || 0)
          }))
        },
        recentCommissions: recentCommissions.map(commission => ({
          id: commission.id,
          type: commission.type,
          amount: parseFloat(commission.commissionAmount),
          rate: parseFloat(commission.commissionRate),
          status: commission.status,
          createdAt: commission.createdAt,
          user: commission.user ? {
            email: commission.user.email,
            username: commission.user.username
          } : null
        })),
        dailyStats: dailyStats.map(stat => ({
          date: stat.dataValues.date,
          type: stat.type,
          count: parseInt(stat.dataValues.count || 0),
          totalAmount: parseFloat(stat.dataValues.totalAmount || 0)
        })),
        adminStats: adminStats
      }
    });
  } catch (error) {
    console.error('수수료 현황 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '수수료 현황 조회 중 오류가 발생했습니다.'
    });
  }
});

// 수수료율 설정 조회
router.get('/settings/commission-rates', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    console.log('🔍 수수료율 설정 조회 요청:', req.admin.username);
    
    const commissionRates = await CommissionSettingsService.getAllCommissionRates();
    
    res.json({
      success: true,
      data: commissionRates
    });
  } catch (error) {
    console.error('수수료율 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '수수료율 설정 조회 중 오류가 발생했습니다.'
    });
  }
});

// 수수료율 설정 업데이트
router.put('/settings/commission-rates/:platform', verifyToken, requireAdmin(3), async (req, res) => {
  try {
    const { platform } = req.params;
    const { rate } = req.body;
    
    if (!['sportsbook', 'exchange'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: '잘못된 플랫폼입니다. sportsbook 또는 exchange만 허용됩니다.'
      });
    }
    
    console.log('🔧 수수료율 설정 업데이트 요청:', {
      admin: req.admin.username,
      platform,
      rate
    });
    
    const result = await CommissionSettingsService.updateCommissionRate(platform, rate);
    
    if (result.success) {
      res.json({
        success: true,
        message: `${platform} 수수료율이 업데이트되었습니다.`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || '수수료율 업데이트 중 오류가 발생했습니다.'
      });
    }
  } catch (error) {
    console.error('수수료율 설정 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: '수수료율 업데이트 중 오류가 발생했습니다.'
    });
  }
});

// =============================================================================
// 스포츠북 평균 환수율 API
// =============================================================================

// 전체 스포츠북 평균 환수율 조회
router.get('/sportsbook-payout-rate', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    console.log('📊 스포츠북 평균 환수율 조회 요청:', {
      admin: req.admin.username
    });
    
    const result = await SportsbookPayoutRateService.getOverallAveragePayoutRate();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('스포츠북 평균 환수율 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '스포츠북 평균 환수율 조회 중 오류가 발생했습니다.'
    });
  }
});

// 특정 스포츠의 평균 환수율 조회
router.get('/sportsbook-payout-rate/:sportKey', verifyToken, requireAdmin(1), async (req, res) => {
  try {
    const { sportKey } = req.params;
    
    console.log(`📊 ${sportKey} 스포츠북 평균 환수율 조회 요청:`, {
      admin: req.admin.username,
      sportKey
    });
    
    const result = await SportsbookPayoutRateService.getSportAveragePayoutRate(sportKey);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error(`${req.params.sportKey} 스포츠북 평균 환수율 조회 오류:`, error);
    res.status(500).json({
      success: false,
      error: '스포츠북 평균 환수율 조회 중 오류가 발생했습니다.'
    });
  }
});

// 실시간 평균 환수율 업데이트
router.post('/sportsbook-payout-rate/update', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    console.log('🔄 스포츠북 평균 환수율 실시간 업데이트 요청:', {
      admin: req.admin.username
    });
    
    const result = await SportsbookPayoutRateService.updateRealtimeAveragePayoutRate();
    
    if (result) {
      res.json({
        success: true,
        data: result,
        message: '스포츠북 평균 환수율이 업데이트되었습니다.'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '평균 환수율 업데이트에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('스포츠북 평균 환수율 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: '평균 환수율 업데이트 중 오류가 발생했습니다.'
    });
  }
});

export default router; 