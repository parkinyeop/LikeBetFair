const User = require('../models/userModel');

exports.placeBet = async (req, res) => {
  try {
    const { selections, stake, totalOdds } = req.body;
    const userId = req.user.userId;

    // Validate bet data
    if (!selections || !stake || !totalOdds) {
      return res.status(400).json({ message: 'Missing required bet information' });
    }

    // Get user and check balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < stake) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Create bet
    const bet = {
      selections,
      stake,
      totalOdds,
      potentialWinnings: stake * totalOdds,
      status: 'pending',
      createdAt: new Date()
    };

    // Update user balance and add bet
    user.balance -= stake;
    user.bets.push(bet);
    await user.save();

    res.status(201).json(bet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBetHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.bets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getActiveBets = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const activeBets = user.bets.filter(bet => bet.status === 'pending');
    res.json(activeBets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBetById = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
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