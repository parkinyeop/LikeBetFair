import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import User from '../models/userModel.js';
import ReferralCode from '../models/referralCodeModel.js';
import AdminCommission from '../models/adminCommissionModel.js';
import Bet from '../models/betModel.js';
import bcrypt from 'bcryptjs';


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
          [require('sequelize').Op.gte]: todayStart,
          [require('sequelize').Op.lt]: todayEnd
        }
      }
    });

    const todayBetsCount = todayBets.length;
    const todayTotalStake = todayBets.reduce((sum, bet) => sum + parseFloat(bet.amount || bet.stake || 0), 0);

    // 전체 통계
    const totalUsers = await User.count();
    const totalBets = await Bet.count();
    const totalStakeResult = await Bet.sum('amount');
    const totalStake = totalStakeResult || 0;

    // 활성 사용자 (최근 30일 내 로그인)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.count({
      where: {
        lastLogin: {
          [require('sequelize').Op.gte]: thirtyDaysAgo
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
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: '대시보드 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// =============================================================================
// 사용자 관리
// =============================================================================

// 사용자 목록 조회
router.get('/users', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      message: '사용자 목록 조회 성공',
      users
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

    res.json({
      user,
      stats: {
        totalBets,
        totalStake: parseFloat(totalStake),
        totalWinnings
      }
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
router.get('/bets', verifyToken, requireAdmin(2), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bets = await Bet.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        attributes: ['username', 'email']
      }]
    });

    res.json({
      bets: bets.rows,
      pagination: {
        total: bets.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(bets.count / limit)
      }
    });

  } catch (error) {
    console.error('Bets list error:', error);
    res.status(500).json({ message: '베팅 목록을 불러오는 중 오류가 발생했습니다.' });
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
    // 일반 관리자는 자신의 추천코드만, 레벨 3 이상은 모든 추천코드
    const where = req.admin.adminLevel >= 3 ? {} : { adminId: req.admin.id };

    const codes = await ReferralCode.findAll({
      where,
      include: [{
        model: User,
        as: 'admin',
        attributes: ['username', 'email', 'adminLevel']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ codes });

  } catch (error) {
    console.error('Referral codes list error:', error);
    res.status(500).json({ message: '추천코드 목록을 불러오는 중 오류가 발생했습니다.' });
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