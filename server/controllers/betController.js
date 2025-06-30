import betResultService from '../services/betResultService.js';
import User from '../models/userModel.js';
import Bet from '../models/betModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import sequelize from '../models/sequelize.js';

export async function placeBet(req, res) {
  try {
    const { selections, stake, totalOdds } = req.body;
    const userId = req.user.userId;

    // Validate bet data
    if (!selections || !stake || !totalOdds) {
      return res.status(400).json({ message: 'Missing required bet information' });
    }

    // 베팅 가능 시간 체크 (경기 시작 10분 전 마감)
    const now = new Date();
    const marginMinutes = 10;
    const maxDays = 7;
    const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
    for (const selection of selections) {
      if (!selection.commence_time) {
        return res.status(400).json({ message: `경기 시작 시간이 없는 경기 포함: ${selection.desc}` });
      }
      const gameTime = new Date(selection.commence_time);
      if (gameTime <= new Date(now.getTime() + marginMinutes * 60000)) {
        return res.status(400).json({ message: `베팅 마감된 경기 포함(10분 전 마감): ${selection.desc}` });
      }
      if (gameTime > maxDate) {
        return res.status(400).json({ message: `너무 먼 미래의 경기 포함(7일 초과): ${selection.desc}` });
      }
    }

    // Get user and check balance
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < stake) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Create bet
    const bet = await Bet.create({
      userId,
      selections,
      stake,
      totalOdds,
      potentialWinnings: stake * totalOdds,
      status: 'pending'
    });

    // Update user balance and add bet
    user.balance -= stake;
    await user.save();

    // 베팅 정보와 갱신된 잔액을 함께 반환
    res.status(201).json({ bet, balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function getBetHistory(req, res) {
  try {
    const userId = req.user.userId;
    console.log(`[getBetHistory] User ${userId} requesting bet history`);
    
    const bets = await Bet.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    console.log(`[getBetHistory] Found ${bets.length} bets for user ${userId}`);

    // selection별 result와 전체 status 동기화 + gameResult(score 등) 포함
    const updatedBets = await Promise.all(bets.map(async (bet) => {
      await betResultService.processBetResult(bet);
      // selections에 gameResult 정보 추가
      const selectionsWithResults = await Promise.all(
        bet.selections.map(async (selection) => {
          const gameResult = await betResultService.getGameResultByTeams(selection);
          return {
            ...selection,
            gameResult: gameResult ? {
              status: gameResult.status,
              result: gameResult.result,
              score: gameResult.score ? (typeof gameResult.score === 'string' ? JSON.parse(gameResult.score) : gameResult.score) : null,
              homeTeam: gameResult.homeTeam,
              awayTeam: gameResult.awayTeam
            } : null
          };
        })
      );
      return {
        ...bet.toJSON(),
        selections: selectionsWithResults
      };
    }));

    console.log(`[getBetHistory] Returning ${updatedBets.length} updated bets (with gameResult)`);
    res.json(updatedBets);
  } catch (err) {
    console.error('[getBetHistory] Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function getActiveBets(req, res) {
  try {
    const userId = req.user.userId;
    const activeBets = await Bet.findAll({
      where: { userId, status: 'pending' },
      order: [['createdAt', 'DESC']]
    });
    // selection별 result와 전체 status 동기화
    await Promise.all(activeBets.map(bet => betResultService.processBetResult(bet)));
    res.json(activeBets.map(bet => bet.toJSON()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function getBetById(req, res) {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 단일 베팅 조회
    const bet = await Bet.findByPk(req.params.id);
    if (!bet) {
      return res.status(404).json({ message: 'Bet not found' });
    }
    // selection별 result와 전체 status 동기화
    await betResultService.processBetResult(bet);
    res.json(bet.toJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function cancelBet(req, res) {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.userId;
    const betId = req.params.id;
    const bet = await Bet.findByPk(betId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!bet) {
      await t.rollback();
      return res.status(404).json({ message: 'Bet not found' });
    }
    if (bet.userId !== userId) {
      await t.rollback();
      return res.status(403).json({ message: 'No permission to cancel this bet' });
    }
    if (bet.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ message: '이미 진행된 베팅은 취소할 수 없습니다.' });
    }
    if (!Array.isArray(bet.selections) || !bet.selections.every(sel => sel.result === 'pending' || !sel.result)) {
      await t.rollback();
      return res.status(400).json({ message: '이미 일부 경기가 시작되어 취소할 수 없습니다.' });
    }
    // 경기 시작 10분 전 이후에는 취소 불가
    const now = new Date();
    const marginMinutes = 10;
    for (const sel of bet.selections) {
      if (!sel.commence_time) continue;
      const gameTime = new Date(sel.commence_time);
      if (gameTime <= new Date(now.getTime() + marginMinutes * 60000)) {
        await t.rollback();
        return res.status(400).json({ message: `경기 시작 10분 전 이후에는 취소할 수 없습니다. (${sel.desc})` });
      }
    }
    // 환불 및 상태 변경 트랜잭션 처리
    bet.status = 'cancelled';
    await bet.save({ transaction: t });
    const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
    user.balance = Number(user.balance) + Number(bet.stake);
    await user.save({ transaction: t });
    await PaymentHistory.create({
      userId: user.id,
      betId: bet.id,
      amount: bet.stake,
      balanceAfter: user.balance,
      memo: '베팅 취소 환불',
      paidAt: new Date()
    }, { transaction: t });
    await t.commit();
    res.json({ message: '베팅이 취소되었습니다.', balance: user.balance });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
} 