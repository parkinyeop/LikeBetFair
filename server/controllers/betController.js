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
};

exports.getBetHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`[getBetHistory] User ${userId} requesting bet history`);
    
    const bets = await Bet.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    console.log(`[getBetHistory] Found ${bets.length} bets for user ${userId}`);

    // 각 배팅의 selections에 경기 결과 정보 업데이트
    const updatedBets = await Promise.all(bets.map(async (bet) => {
      if (bet.status === 'pending' && Array.isArray(bet.selections)) {
        console.log(`[getBetHistory] Processing pending bet ${bet.id} with ${bet.selections.length} selections`);
        
        const betResultService = require('../services/betResultService');
        const updatedSelections = await Promise.all(bet.selections.map(async (selection) => {
          console.log(`[getBetHistory] Checking result for game: ${selection.desc}`);
          
          // 경기 결과 조회
          const gameResult = await betResultService.getGameResultByTeams(selection);
          
          if (gameResult) {
            console.log(`[getBetHistory] Found game result for ${selection.desc}: status=${gameResult.status}, result=${gameResult.result}`);
            
            if (gameResult.status === 'finished') {
              // 경기가 완료된 경우 결과 판정
              const selectionResult = betResultService.determineSelectionResult(selection, gameResult);
              console.log(`[getBetHistory] Selection result for ${selection.desc}: ${selectionResult}`);
              
              return {
                ...selection,
                result: selectionResult
              };
            }
          } else {
            console.log(`[getBetHistory] No game result found for ${selection.desc}`);
          }
          
          return selection;
        }));

        // 업데이트된 selections로 bet 객체 복사
        return {
          ...bet.toJSON(),
          selections: updatedSelections
        };
      }
      
      return bet.toJSON();
    }));

    console.log(`[getBetHistory] Returning ${updatedBets.length} updated bets`);
    res.json(updatedBets);
  } catch (err) {
    console.error('[getBetHistory] Error:', err);
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