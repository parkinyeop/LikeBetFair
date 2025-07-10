import express from 'express';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import verifyToken from '../middleware/verifyToken.js';
import exchangeWebSocketService from '../services/exchangeWebSocketService.js';
import exchangeGameMappingService from '../services/exchangeGameMappingService.js';
import exchangeSettlementService from '../services/exchangeSettlementService.js';
import { Op } from 'sequelize';

const router = express.Router();

// 주문 등록 (게임 데이터 연동 포함)
router.post('/order', verifyToken, async (req, res) => {
  try {
    const { gameId, market, line, side, price, amount, selection, homeTeam, awayTeam, commenceTime } = req.body;
    const userId = req.user.userId;
    
    console.log('🎯 Exchange 주문 생성 요청:', { gameId, market, line, side, price, amount, selection });
    
    // 게임 데이터 매핑
    const orderData = await exchangeGameMappingService.mapGameDataToOrder({
      gameId, market, line, side, price, amount, selection, homeTeam, awayTeam, commenceTime, userId
    });
    
    console.log('📊 매핑된 게임 데이터:', {
      gameResultId: orderData.gameResultId,
      homeTeam: orderData.homeTeam,
      awayTeam: orderData.awayTeam,
      sportKey: orderData.sportKey
    });
    
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
    const orderCreateData = {
      userId, 
      gameId, 
      market, 
      line, 
      side, 
      price, 
      amount, 
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
      autoSettlement: true
    };
    
    if (match) {
      match.status = 'matched';
      await match.save();
      order = await ExchangeOrder.create({
        ...orderCreateData,
        status: 'matched', 
        matchedOrderId: match.id
      });
      match.matchedOrderId = order.id;
      await match.save();
      console.log('✅ 즉시 매칭 완료:', { orderId: order.id, matchedWith: match.id });
    } else {
      order = await ExchangeOrder.create({
        ...orderCreateData,
        status: 'open'
      });
      console.log('📝 새 주문 생성:', { orderId: order.id, status: 'open' });
    }
    
    // WebSocket으로 주문 업데이트 브로드캐스트
    exchangeWebSocketService.broadcastOrderUpdate(gameId, { order });
    
    res.json({ 
      order: order.toJSON(),
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

// 호가(orderbook) 조회 - 테스트용 (로그인 불필요)
router.get('/orderbook-test', async (req, res) => {
  try {
    const { gameId, market, line } = req.query;
    console.log('테스트 호가 조회 요청:', { gameId, market, line });
    
    // Where 조건을 동적으로 구성
    const whereCondition = { gameId, market, status: 'open' };
    if (line !== undefined && line !== null && line !== '') {
      whereCondition.line = line;
    }
    
    const orders = await ExchangeOrder.findAll({
      where: whereCondition
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
  try {
    const { gameId, market, line } = req.query;
    
    // Where 조건을 동적으로 구성
    const whereCondition = { gameId, market, status: 'open' };
    if (line !== undefined && line !== null && line !== '') {
      whereCondition.line = line;
    }
    
    const orders = await ExchangeOrder.findAll({
      where: whereCondition
    });
    
    res.json({ orders });
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

// Exchange에서 사용 가능한 게임 목록 조회
router.get('/games', async (req, res) => {
  try {
    const { category, sport } = req.query;
    console.log('🎮 Exchange 게임 목록 요청:', { category, sport });
    
    // 카테고리를 스포츠키로 변환
    let targetSportKey = sport;
    if (category && !sport) {
      const categoryToSportKey = {
        'KBO': 'baseball_kbo',
        'MLB': 'baseball_mlb', 
        'NBA': 'basketball_nba',
        'KBL': 'basketball_kbl',
        'NFL': 'american_football_nfl',
        'K리그': 'soccer_k_league',
        'EPL': 'soccer_epl',
        'LaLiga': 'soccer_laliga',
        'Bundesliga': 'soccer_bundesliga',
        'Serie A': 'soccer_serie_a',
        'J리그': 'soccer_j_league',
        'MLS': 'soccer_mls',
        '브라질 세리에 A': 'soccer_brasileirao',
        '아르헨티나 프리메라': 'soccer_argentina_primera',
        '중국 슈퍼리그': 'soccer_chinese_super_league'
      };
      targetSportKey = categoryToSportKey[category];
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
  const { gameId, market, line, side, price, amount, selection, homeTeam, awayTeam, commenceTime } = req.body;
  const userId = req.user.userId; // 수정: userId 사용

  try {
    console.log(`🎯 매치 주문 요청: ${side} ${price} (${amount}원) - User: ${userId}`);
    console.log(`📊 요청 데이터:`, { gameId, market, line, side, price, amount, selection });

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
          status: 'matched',
          matchedOrderId: null // 매치된 주문 ID는 별도 처리 필요
        });
      } else {
        // 부분 매칭 - 남은 금액으로 업데이트 (부분 매칭은 복잡하므로 현재는 지원하지 않음)
        // 전체 매칭만 지원
        await existingOrder.update({
          status: 'matched',
          matchedOrderId: null
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
      console.log(`🔧 게임 매핑 시작...`);
      // 게임 데이터 매핑
      const orderData = await exchangeGameMappingService.mapGameDataToOrder({
        gameId, market, line, side, price, amount: remainingAmount, selection, 
        homeTeam, awayTeam, commenceTime, userId
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
        autoSettlement: true
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

export default router; 