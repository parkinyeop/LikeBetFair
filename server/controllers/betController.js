const User = require('../models/userModel');
const Bet = require('../models/betModel');

exports.placeBet = async (req, res) => {
  try {
    const { selections, stake, totalOdds } = req.body;
    const userId = req.user.userId;

    // Validate bet data
    if (!selections || !stake || !totalOdds) {
      return res.status(400).json({ message: 'Missing required bet information' });
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
};

exports.getBetHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bets = await Bet.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    res.json(bets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getActiveBets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const activeBets = await Bet.findAll({
      where: { userId, status: 'pending' },
      order: [['createdAt', 'DESC']]
    });
    res.json(activeBets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBetById = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const bet = user.bets.id(req.params.id);
    if (!bet) {
      return res.status(404).json({ message: 'Bet not found' });
    }

    res.json(bet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.cancelBet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const betId = req.params.id;
    const bet = await Bet.findByPk(betId);
    if (!bet) return res.status(404).json({ message: 'Bet not found' });
    if (bet.userId !== userId) return res.status(403).json({ message: 'No permission to cancel this bet' });
    if (bet.status !== 'pending') return res.status(400).json({ message: '이미 진행된 베팅은 취소할 수 없습니다.' });
    if (!Array.isArray(bet.selections) || !bet.selections.every(sel => sel.result === 'pending' || !sel.result)) {
      return res.status(400).json({ message: '이미 일부 경기가 시작되어 취소할 수 없습니다.' });
    }
    // 환불 처리
    const user = await User.findByPk(userId);
    user.balance = Number(user.balance) + Number(bet.stake);
    await user.save();
    // status를 cancel로 변경
    bet.status = 'cancel';
    await bet.save();
    console.log(`[Bet Cancel] betId=${bet.id}, userId=${userId}, status=${bet.status}, 환불금액=${bet.stake}`);
    res.json({ message: '베팅이 취소되었습니다.', balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}; 