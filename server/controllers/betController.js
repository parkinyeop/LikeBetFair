import betResultService from '../services/betResultService.js';
import simplifiedOddsValidation from '../services/simplifiedOddsValidation.js';
import seasonValidationService from '../services/seasonValidationService.js'; // ✅ 시즌 검증 재활성화
import User from '../models/userModel.js';
import Bet from '../models/betModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import GameResult from '../models/gameResultModel.js';
import createScriptSequelize from '../config/scriptDatabase.js';
import GameResultQuery from '../utils/gameResultQuery.js';
import { getLocationConfig } from '../config/gameResultQuery.js';

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();
import { Op } from 'sequelize';
import BettingAmountSettingsService from '../services/bettingAmountSettingsService.js';
import balanceService from '../services/balanceService.js';

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

    // ✅ 시즌 상태 검증 (1순위: 시즌 검증 → 2순위: 배당율 검증)
    console.log(`[BetController] 시즌 상태 검증 시작: ${selections.length}개 선택`);
    for (const selection of selections) {
      const sportKey = selection.sport_key;
      if (sportKey) {
        try {
          const seasonValidation = await seasonValidationService.validateBettingEligibility(sportKey);
          if (!seasonValidation.isEligible) {
            console.log(`[BetController] 시즌 상태 검증 실패: ${selection.desc} - ${seasonValidation.reason}`);
            
            // 시즌 검증 실패 시 베팅 거부
            return res.status(400).json({ 
              message: `베팅 불가능한 리그: ${selection.desc}`,
              reason: seasonValidation.reason,
              status: seasonValidation.status,
              dataSource: seasonValidation.seasonStatus?.dataSource || 'Unknown',
              code: 'SEASON_OFFSEASON'
            });
          } else {
            // 시즌 상태 로깅
            console.log(`[BetController] 시즌 상태 검증 통과: ${selection.desc} - ${seasonValidation.reason} (${seasonValidation.seasonStatus?.dataSource || 'Unknown'})`);
          }
        } catch (seasonError) {
          console.log(`[BetController] 시즌 상태 검증 오류: ${selection.desc} - ${seasonError.message}`);
          // ⚠️ 시즌 검증 오류는 경고만 하고 배당율 검증으로 진행 (안전장치)
          console.warn(`[BetController] 시즌 검증 실패, 배당율 검증으로 진행: ${selection.desc}`);
        }
      } else {
        console.log(`[BetController] sport_key 없음 (시즌 검증 건너뜀): ${selection.desc}`);
      }
    }

    // 🔒 배당율 검증 (2순위: 시즌 검증 통과 후 배당율 검증)
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

    // 🔒 동일 경기 중복 마켓 검증 (Win/Loss + Handicap 동시 베팅 방지)
    console.log('[BetController] 동일 경기 중복 마켓 검증 시작');
    const gameSelections = {};

    for (const selection of selections) {
      // gameId 또는 desc+time 기반으로 경기 식별
      let gameKey;
      if (selection.gameId) {
        gameKey = selection.gameId;
      } else {
        // gameId 없는 레거시 데이터 처리
        gameKey = `${selection.desc}|${selection.commence_time}`;
        console.warn(`[BetController] gameId 없는 selection, desc+time 기반 검증: ${selection.desc}`);
      }

      if (!gameSelections[gameKey]) {
        gameSelections[gameKey] = { markets: [], desc: selection.desc };
      }
      gameSelections[gameKey].markets.push(selection.market);
    }

    for (const gameKey in gameSelections) {
      const { markets, desc } = gameSelections[gameKey];

      // 다양한 마켓 이름(영문, 한글, 약어)을 모두 포함하여 검증
      const hasWinLoss = markets.some(m => ['Win/Loss', '승패', 'h2h'].includes(m));
      const hasHandicap = markets.some(m => ['Handicap', '핸디캡', 'spreads'].includes(m));

      if (hasWinLoss && hasHandicap) {
        console.error(`[BetController] ❌ 검증 실패: ${desc}에 Win/Loss + Handicap 동시 베팅 시도`);
        return res.status(400).json({
          success: false,
          message: '같은 경기에서 승패와 핸디캡을 동시에 베팅할 수 없습니다.',
          game: desc,
          code: 'DUPLICATE_MARKET_TYPE'
        });
      }
    }
    console.log('[BetController] ✅ 동일 경기 중복 마켓 검증 통과');

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

    // 베팅 금액 제한 검증 (동적 설정 사용)
    try {
      const bettingSettings = await BettingAmountSettingsService.getPlatformBettingSettings('sportsbook');
      console.log('🎯 [PlaceBet] 스포츠북 베팅 설정:', bettingSettings);
      
      if (bettingSettings.minBetAmount && stake < bettingSettings.minBetAmount) {
        console.log('❌ [PlaceBet] 최소 베팅 금액 미달:', { 
          stake, 
          minBetAmount: bettingSettings.minBetAmount 
        });
        return res.status(400).json({ 
          message: `최소 베팅 금액은 ${bettingSettings.minBetAmount.toLocaleString()}원입니다.` 
        });
      }
      
      if (bettingSettings.maxBetAmount && stake > bettingSettings.maxBetAmount) {
        console.log('❌ [PlaceBet] 최대 베팅 금액 초과:', { 
          stake, 
          maxBetAmount: bettingSettings.maxBetAmount 
        });
        return res.status(400).json({ 
          message: `최대 베팅 금액은 ${bettingSettings.maxBetAmount.toLocaleString()}원입니다.` 
        });
      }
    } catch (settingsError) {
      console.error('❌ [PlaceBet] 베팅 설정 조회 오류:', settingsError);
      // 설정 조회 실패 시 기본값 사용 (기존 동작 유지)
      if (stake < 1000) {
        return res.status(400).json({ message: '최소 베팅 금액은 1,000원입니다.' });
      }
    }

    console.log('💰 [PlaceBet] 잔액 확인:', { userBalance: user.balance, betStake: stake });
    if (user.balance < stake) {
      console.log('❌ [PlaceBet] 잔액 부족:', { balance: user.balance, stake });
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Create bet with precise decimal calculation (floor to 3 decimal places)
    const potentialWinnings = Math.floor(stake * totalOdds * 100) / 100; // 소수점 2자리로 내림
    
    // ✅ selections 데이터 검증 및 정규화
    console.log('🔍 [PlaceBet] selections 데이터 검증 시작');
    
    /**
     * @typedef {Object} NormalizedSelection
     * @property {string} desc - 경기 설명
     * @property {string} commence_time - 경기 시작 시간 (ISO 8601)
     * @property {number} odds - 배당율
     * @property {string} market - 마켓 타입
     * @property {string} selection - 선택한 항목
     * @property {string} homeTeam - 홈 팀 이름
     * @property {string} awayTeam - 어웨이 팀 이름
     * @property {string} commenceTime - 정규화된 경기 시작 시간
     */
    
    /** @type {NormalizedSelection[]} */
    const normalizedSelections = selections.map((selection, index) => {
      // 필수 필드 검증
      if (!selection.desc) {
        throw new Error(`Selection ${index + 1}: 경기 설명(desc)이 없습니다.`);
      }
      if (!selection.commence_time) {
        throw new Error(`Selection ${index + 1}: 경기 시작 시간(commence_time)이 없습니다.`);
      }
      if (!selection.odds) {
        throw new Error(`Selection ${index + 1}: 배당율(odds)이 없습니다.`);
      }
      if (!selection.market) {
        throw new Error(`Selection ${index + 1}: 마켓(market)이 없습니다.`);
      }
      if (!selection.selection && !selection.team) {
        throw new Error(`Selection ${index + 1}: 선택(selection 또는 team)이 없습니다.`);
      }
      
      // ✅ 제미나이 제안: 정규식을 사용한 유연한 팀 이름 파싱
      // ' vs ', ' VS ', ' v ', ' v. ' 등 다양한 형식 지원
      const teams = selection.desc.split(/\s+vs?\s+|\s+v\.\s+/i);
      
      if (teams.length !== 2) {
        console.error(`[PlaceBet] 팀 파싱 실패:`, {
          desc: selection.desc,
          parsedTeams: teams,
          length: teams.length
        });
        throw new Error(
          `Selection ${index + 1}: 경기 설명 형식이 올바르지 않습니다. ` +
          `(예: Team A vs Team B, 현재: ${selection.desc})`
        );
      }
      
      const homeTeam = teams[0].trim();
      const awayTeam = teams[1].trim();
      
      // 팀 이름 유효성 검증
      if (!homeTeam || !awayTeam) {
        throw new Error(
          `Selection ${index + 1}: 팀 이름이 비어있습니다. ` +
          `(홈: "${homeTeam}", 어웨이: "${awayTeam}")`
        );
      }
      
      console.log(`[PlaceBet] Selection ${index + 1} 파싱 성공:`, {
        desc: selection.desc,
        homeTeam,
        awayTeam
      });
      
      // 정규화된 selection 반환
      return {
        ...selection,
        homeTeam,
        awayTeam,
        commenceTime: selection.commence_time,
        selection: selection.selection || selection.team // ✅ selection 필드 보정
      };
    });
    
    console.log('✅ [PlaceBet] selections 데이터 검증 완료:', normalizedSelections.length);
    
    // ✅ 원자적 트랜잭션: Bet 생성 + 잔액 차감을 하나의 트랜잭션으로 처리
    const transaction = await sequelize.transaction();
    try {
      // 1. Bet 생성
      const bet = await Bet.create({
        userId,
        selections: normalizedSelections, // ✅ 정규화된 데이터 저장
        stake,
        totalOdds,
        potentialWinnings,
        status: 'pending'
      }, { transaction });

      // 2. 잔액 차감 (PaymentHistory 자동 기록)
      await balanceService.deductBalance(
        userId,
        stake,
        `스포츠북 베팅 - ${bet.id}`,
        bet.id,
        transaction
      );

      // 3. 트랜잭션 커밋
      await transaction.commit();
      
      // 베팅 정보와 갱신된 잔액을 함께 반환
      const updatedUser = await User.findByPk(userId);
      res.status(201).json({ bet, balance: updatedUser.balance });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function getBetHistory(req, res) {
  try {
    const userId = req.user.userId;
    console.log(`[getBetHistory] User ${userId} requesting bet history`);
    
    // ✅ cancelled 상태 제외 (히스토리에 노출하지 않음)
    const bets = await Bet.findAll({
      where: { 
        userId,
        status: {
          [Op.ne]: 'cancelled' // cancelled 상태 제외
        }
      },
      order: [['createdAt', 'DESC']]
    });

    console.log(`[getBetHistory] Found ${bets.length} bets for user ${userId}`);

    // selection별 result와 전체 status 동기화 + gameResult(score 등) 포함
    const updatedBets = await Promise.all(bets.map(async (bet, betIndex) => {
      try {
        console.log(`[getBetHistory] Processing bet ${betIndex + 1}/${bets.length}: ${bet.id}`);
        
        // selections에 gameResult 정보 추가 (processBetResult와 독립적으로 실행)
        const selectionsWithResults = await Promise.all(
          bet.selections.map(async (selection, selectionIndex) => {
            try {
              console.log(`[getBetHistory] Processing selection ${selectionIndex + 1}/${bet.selections.length}: ${selection.desc}`);
              
              // 스코어 유무 기반으로 게임 결과 조회
              const teams = selection.desc ? selection.desc.split(' vs ') : [];
              let gameResult = null;
              
              console.log(`[getBetHistory] Selection ${selectionIndex + 1} - 팀 분석:`, {
                desc: selection.desc,
                teams: teams,
                commence_time: selection.commence_time
              });
              
              if (teams.length === 2) {
                const homeTeam = teams[0].trim();
                const awayTeam = teams[1].trim();
                // 시간 형식 수정: 이미 Z가 포함된 경우와 그렇지 않은 경우 처리
                let timeString = selection.commence_time;
                if (!timeString.includes('Z') && !timeString.includes('+') && !timeString.includes('-', 10)) {
                  timeString = timeString + 'Z';
                }
                const commenceTime = new Date(timeString);
                
                console.log(`[getBetHistory] Selection ${selectionIndex + 1} - 게임 결과 조회 시도:`, {
                  homeTeam,
                  awayTeam,
                  commenceTime: commenceTime.toISOString(),
                  isValidTime: !isNaN(commenceTime.getTime())
                });
                
                if (!isNaN(commenceTime.getTime())) {
                  try {
                    // 🚀 중앙화된 경기 결과 조회 사용
                    const config = getLocationConfig('betController');
                    
                    if (config.FEATURE_FLAGS?.USE_CENTRALIZED_QUERY) {
                      console.log(`[getBetHistory] Using centralized query for selection ${selectionIndex + 1}`);
                      gameResult = await GameResultQuery.findByTeamsAndTime(
                        homeTeam,
                        awayTeam,
                        commenceTime,
                        'betController'
                      );
                    } else {
                      // 레거시 로직 (Feature Flag가 비활성화된 경우)
                      console.log(`[getBetHistory] Using legacy query for selection ${selectionIndex + 1}`);
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
                    
                    console.log(`[getBetHistory] Selection ${selectionIndex + 1} - 게임 결과 조회 결과:`, {
                      found: !!gameResult,
                      gameResult: gameResult ? {
                        id: gameResult.id,
                        homeTeam: gameResult.homeTeam,
                        awayTeam: gameResult.awayTeam,
                        score: gameResult.score,
                        status: gameResult.status
                      } : null
                    });
                  } catch (dbError) {
                    console.error(`[getBetHistory] Selection ${selectionIndex + 1} - DB 조회 오류:`, dbError);
                  }
                }
              } else {
                console.log(`[getBetHistory] Selection ${selectionIndex + 1} - 팀 정보 부족:`, teams);
              }
              
              return {
                ...selection,
                gameResult: gameResult ? {
                  status: gameResult.status,
                  result: gameResult.status, // 호환성을 위해 status를 result로 복사
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