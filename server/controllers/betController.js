import betResultService from '../services/betResultService.js';
import simplifiedOddsValidation from '../services/simplifiedOddsValidation.js';
// import seasonValidationService from '../services/seasonValidationService.js'; // 시즌 검증 주석처리
import User from '../models/userModel.js';
import Bet from '../models/betModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import GameResult from '../models/gameResultModel.js';
import sequelize from '../models/sequelize.js';
import { Op } from 'sequelize';

export async function placeBet(req, res) {
  try {
    console.log('🎯 [PlaceBet] 요청 데이터:', {
      body: req.body,
      user: req.user,
      headers: {
        'x-auth-token': req.headers['x-auth-token']?.substring(0, 20) + '...'
      }
    });
    
    // 더 자세한 로깅 추가
    console.log('🔍 [PlaceBet] 상세 데이터 분석:');
    console.log('- selections 타입:', typeof req.body.selections);
    console.log('- selections 길이:', req.body.selections?.length);
    console.log('- selections 내용:', JSON.stringify(req.body.selections, null, 2));
    console.log('- stake 타입:', typeof req.body.stake);
    console.log('- stake 값:', req.body.stake);
    console.log('- totalOdds 타입:', typeof req.body.totalOdds);
    console.log('- totalOdds 값:', req.body.totalOdds);

    const { selections, stake, totalOdds } = req.body;
    
    // req.user 구조 확인
    console.log('🔍 [PlaceBet] req.user 구조:', JSON.stringify(req.user, null, 2));
    
    const userId = req.user.userId || req.user.id;
    
    if (!userId) {
      console.log('❌ [PlaceBet] userId 없음:', req.user);
      return res.status(400).json({ message: 'User ID not found in token' });
    }

    // Validate bet data
    if (!selections || !stake || !totalOdds) {
      console.log('❌ [PlaceBet] 필수 데이터 누락:', { selections: !!selections, stake: !!stake, totalOdds: !!totalOdds });
      return res.status(400).json({ message: 'Missing required bet information' });
    }

    // 🆕 시즌 상태 검증 주석처리 (배당율 정보가 있다는 것은 이미 시즌 진행 중을 의미)
    // console.log(`[BetController] 시즌 상태 검증 시작: ${selections.length}개 선택`);
    // for (const selection of selections) {
    //   const sportKey = selection.sport_key;
    //   if (sportKey) {
    //     try {
    //       const seasonValidation = await seasonValidationService.validateBettingEligibility(sportKey);
    //       if (!seasonValidation.isEligible) {
    //         console.log(`[BetController] 시즌 상태 검증 실패: ${selection.desc} - ${seasonValidation.reason}`);
    //         
    //         // 시즌 검증 실패 시 베팅 거부
    //         return res.status(400).json({ 
    //           message: `베팅 불가능한 리그: ${selection.desc}`,
    //           reason: seasonValidation.reason,
    //           status: seasonValidation.status,
    //           dataSource: seasonValidation.seasonStatus?.dataSource || 'Unknown',
    //           code: 'SEASON_OFFSEASON'
    //         });
    //       } else {
    //         // 시즌 상태 로깅
    //         console.log(`[BetController] 시즌 상태 검증 통과: ${selection.desc} - ${seasonValidation.reason} (${seasonValidation.seasonStatus?.dataSource || 'Unknown'})`);
    //       }
    //     } catch (seasonError) {
    //       console.log(`[BetController] 시즌 상태 검증 오류: ${selection.desc} - ${seasonError.message}`);
    //       return res.status(500).json({ 
    //         message: `시즌 상태 확인 중 오류 발생: ${selection.desc}`,
    //         error: seasonError.message
    //       });
    //     }
    //   } else {
    //     console.log(`[BetController] sport_key 없음 (시즌 검증 건너뜀): ${selection.desc}`);
    //   }
    // }

    // 🔒 배당율 검증 추가 (개선된 버전)
    console.log(`[BetController] 베팅 요청 배당율 검증 시작: ${selections.length}개 선택`);
    for (const selection of selections) {
      try {
        const oddsValidation = await simplifiedOddsValidation.validateBetOdds(selection);
        if (!oddsValidation.isValid) {
          console.log(`[BetController] 배당율 검증 실패: ${selection.desc} - ${oddsValidation.reason}`);
          
          // 배당율이 변경된 경우 특별 처리
          if (oddsValidation.code === 'ODDS_CHANGED') {
            return res.status(409).json({ // 409 Conflict
              success: false,
              code: 'ODDS_CHANGED',
              message: oddsValidation.message,
              selection: selection.desc,
              oldOdds: oddsValidation.requestedOdds,
              newOdds: oddsValidation.currentOdds,
              newBettingData: oddsValidation.newBettingData,
              action: 'confirm_new_odds' // 프론트엔드에서 처리할 액션
            });
          }
          
          // 기타 검증 실패
          return res.status(400).json({ 
            success: false,
            message: `배당율 검증 실패: ${selection.desc}`,
            reason: oddsValidation.reason,
            code: oddsValidation.code,
            currentOdds: oddsValidation.currentOdds,
            requestedOdds: selection.odds
          });
        }
        
        // 경고가 있는 경우 로깅
        if (oddsValidation.warning) {
          console.log(`[BetController] 배당율 경고: ${selection.desc} - ${oddsValidation.reason}`);
        } else {
          console.log(`[BetController] 배당율 검증 성공: ${selection.desc}`);
        }
      } catch (oddsError) {
        console.log(`[BetController] 배당율 검증 오류 (무시): ${selection.desc} - ${oddsError.message}`);
        // 배당율 검증 오류는 무시하고 계속 진행
      }
    }

    // 베팅 가능 시간 체크 (경기 시작 10분 전 마감) - UTC 기준
    const now = new Date();
    const marginMinutes = 10;
    const maxDays = 7;
    const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
    for (const selection of selections) {
      if (!selection.commence_time) {
        return res.status(400).json({ message: `경기 시작 시간이 없는 경기 포함: ${selection.desc}` });
      }
      const gameTime = new Date(selection.commence_time + 'Z');
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
      console.log('❌ [PlaceBet] 사용자 없음:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('💰 [PlaceBet] 잔액 확인:', { userBalance: user.balance, betStake: stake });
    if (user.balance < stake) {
      console.log('❌ [PlaceBet] 잔액 부족:', { balance: user.balance, stake });
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Create bet with precise decimal calculation
    const potentialWinnings = Math.round(stake * totalOdds * 100) / 100; // 소수점 2자리로 반올림
    
    const bet = await Bet.create({
      userId,
      selections,
      stake,
      totalOdds,
      potentialWinnings,
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
    const updatedBets = await Promise.all(bets.map(async (bet, betIndex) => {
      try {
        console.log(`[getBetHistory] Processing bet ${betIndex + 1}/${bets.length}: ${bet.id}`);
        await betResultService.processBetResult(bet);
        
        // selections에 gameResult 정보 추가
        const selectionsWithResults = await Promise.all(
          bet.selections.map(async (selection, selectionIndex) => {
            try {
              console.log(`[getBetHistory] Processing selection ${selectionIndex + 1}/${bet.selections.length}: ${selection.desc}`);
              
              // 스코어 유무 기반으로 게임 결과 조회
              const teams = selection.desc ? selection.desc.split(' vs ') : [];
              let gameResult = null;
              
              if (teams.length === 2) {
                const homeTeam = teams[0].trim();
                const awayTeam = teams[1].trim();
                const commenceTime = new Date(selection.commence_time + 'Z');
                
                if (!isNaN(commenceTime.getTime())) {
                  gameResult = await GameResult.findOne({
                    where: {
                      homeTeam: { [Op.iLike]: `%${homeTeam}%` },
                      awayTeam: { [Op.iLike]: `%${awayTeam}%` },
                      commenceTime: {
                        [Op.between]: [
                          new Date(commenceTime.getTime() - 24 * 60 * 60 * 1000),
                          new Date(commenceTime.getTime() + 24 * 60 * 60 * 1000)
                        ]
                      }
                    },
                    order: [['createdAt', 'DESC']]
                  });
                }
              }
              
              return {
                ...selection,
                gameResult: gameResult ? {
                  status: gameResult.status,
                  result: gameResult.result,
                  score: gameResult.score ? (typeof gameResult.score === 'string' ? 
                    (() => {
                      try {
                        return JSON.parse(gameResult.score);
                      } catch (parseError) {
                        console.error('[getBetHistory] Score parse error:', parseError);
                        return gameResult.score; // 파싱 실패 시 원본 반환
                      }
                    })() : gameResult.score) : null,
                  homeTeam: gameResult.homeTeam,
                  awayTeam: gameResult.awayTeam
                } : null
              };
            } catch (selectionError) {
              console.error(`[getBetHistory] Selection ${selectionIndex + 1} processing error:`, selectionError);
              console.error(`[getBetHistory] Selection data:`, JSON.stringify(selection, null, 2));
              return {
                ...selection,
                gameResult: null
              };
            }
          })
        );
        return {
          ...bet.toJSON(),
          selections: selectionsWithResults
        };
      } catch (betError) {
        console.error(`[getBetHistory] Bet ${betIndex + 1} processing error:`, betError);
        console.error(`[getBetHistory] Bet data:`, JSON.stringify(bet.toJSON(), null, 2));
        // 개별 베팅 처리 실패 시에도 전체 요청을 중단하지 않고 기본 데이터 반환
        return {
          ...bet.toJSON(),
          selections: bet.selections,
          processingError: betError.message
        };
      }
    }));

    console.log(`[getBetHistory] Returning ${updatedBets.length} updated bets (with gameResult)`);
    res.json(updatedBets);
  } catch (err) {
    console.error('[getBetHistory] Error:', err);
    console.error('[getBetHistory] Error stack:', err.stack);
    res.status(500).json({ message: 'Server error', details: err.message });
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
    // 경기 시작 10분 전 이후에는 취소 불가 - UTC 기준
    const now = new Date();
    const marginMinutes = 10;
    for (const sel of bet.selections) {
      if (!sel.commence_time) continue;
      const gameTime = new Date(sel.commence_time + 'Z');
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
      memo: '베팅 취소 환불',
      paidAt: new Date(),
      balanceAfter: user.balance
    }, { transaction: t });
    await t.commit();
    res.json({ message: '베팅이 취소되었습니다.', balance: user.balance });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
} 