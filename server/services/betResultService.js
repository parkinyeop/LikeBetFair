import Bet from '../models/betModel.js';
import GameResult from '../models/gameResultModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import simplifiedOddsValidation from './simplifiedOddsValidation.js';
import { Op, fn, col } from 'sequelize';
import { normalizeTeamName, normalizeTeamNameForComparison, normalizeCategory, normalizeCategoryPair, normalizeOption, calculateTeamNameSimilarity, findBestTeamMatch } from '../normalizeUtils.js';

// 배당률 제공 카테고리만 허용 (gameResultService와 동일하게 유지)
const allowedCategories = ['baseball', 'soccer', 'basketball'];

class BetResultService {
  constructor() {
    this.marketResultMap = {
      '승/패': this.determineWinLoseResult.bind(this),
      '언더/오버': this.determineOverUnderResult.bind(this),
      '핸디캡': this.determineHandicapResult.bind(this)
    };
  }

  // 배팅 결과 업데이트 메인 함수
  async updateBetResults() {
    try {
      console.log('Starting bet results update...');
      // GameResult status 자동 보정: score/result가 있고 status가 finished가 아니면 finished로 변경
      const unfinished = await GameResult.findAll({ where: { status: { [Op.not]: 'finished' } } });
      let fixedCount = 0;
      for (const gr of unfinished) {
        if (gr.result && gr.result !== 'pending' && gr.score && Array.isArray(gr.score) && gr.score.length > 0) {
          await gr.update({ status: 'finished' });
          fixedCount++;
        }
      }
      if (fixedCount > 0) {
        console.log(`[자동보정] status가 finished가 아닌데 결과/스코어가 있는 GameResult ${fixedCount}건을 finished로 보정함`);
      }
      
      // pending 상태의 배팅들 조회
      const pendingBets = await Bet.findAll({
        where: { status: 'pending' },
        include: [{ model: User, attributes: ['email', 'username'] }]
      });

      console.log(`Found ${pendingBets.length} pending bets to process`);

      // 🔒 이미 환불 처리된 베팅 제외
      const filteredBets = [];
      for (const bet of pendingBets) {
        const existingRefund = await PaymentHistory.findOne({
          where: {
            betId: bet.id,
            memo: { [Op.like]: '%환불%' }
          }
        });
        
        if (existingRefund) {
          console.log(`[스케줄러] 이미 환불 처리된 베팅 제외: ${bet.id}`);
          // 베팅 상태를 cancelled로 강제 업데이트
          bet.status = 'cancelled';
          await bet.save();
          continue;
        }
        
        filteredBets.push(bet);
      }

      console.log(`Processing ${filteredBets.length} bets (${pendingBets.length - filteredBets.length} excluded due to refunds)`);

      let updatedCount = 0;
      let errorCount = 0;

      for (const bet of filteredBets) {
        try {
          const isCompleted = await this.processBetResult(bet);
          if (isCompleted) {
            updatedCount++;
          }
        } catch (error) {
          console.error(`Error processing bet ${bet.id}:`, error.message);
          errorCount++;
        }
      }

      console.log(`Bet results update completed: ${updatedCount} updated, ${errorCount} errors`);
      return { updatedCount, errorCount };
    } catch (error) {
      console.error('Error updating bet results:', error);
      throw error;
    }
  }

  // 개별 배팅 결과 처리 (스코어 유무 기반)
  async processBetResult(bet) {
    // ✅ 환불 기록이 있으면 무조건 cancelled로 고정
    const whereCond = {
      betId: bet.id,
      memo: { [Op.like]: '%환불%' }
    };
    const existingRefund = await PaymentHistory.findOne({ where: whereCond });
    if (existingRefund) {
      if (bet.status !== 'cancelled') {
        bet.status = 'cancelled';
        if (Array.isArray(bet.selections)) {
          bet.selections = bet.selections.map(sel => ({ ...sel, result: 'cancelled' }));
        }
        await bet.save();
      }
      return true;
    }

    const selections = bet.selections;
    let hasPending = false;
    let hasLost = false;
    let hasWon = false;
    let hasCancelled = false;

    // selections deep copy for comparison
    const prevSelections = JSON.stringify(bet.selections);
    const prevStatus = bet.status;

    // 각 선택에 대해 스코어 유무로 결과 처리
    for (const selection of selections) {
      const desc = selection.desc;
      const teams = desc ? desc.split(' vs ') : [];
      if (teams.length !== 2) {
        selection.result = 'pending';
        hasPending = true;
        continue;
      }
      
      const homeTeam = teams[0].trim();
      const awayTeam = teams[1].trim();
      let commenceTime;
      try {
        commenceTime = new Date(selection.commence_time);
        if (isNaN(commenceTime.getTime())) {
          selection.result = 'pending';
          hasPending = true;
          continue;
        }
      } catch {
        selection.result = 'pending';
        hasPending = true;
        continue;
      }

      // 해당 경기의 GameResult 조회 (스코어 유무 확인)
      const gameResult = await GameResult.findOne({
        where: {
          homeTeam: { [Op.iLike]: `%${homeTeam}%` },
          awayTeam: { [Op.iLike]: `%${awayTeam}%` },
          commenceTime: {
            [Op.between]: [
              new Date(commenceTime.getTime() - 24 * 60 * 60 * 1000), // 24시간 전
              new Date(commenceTime.getTime() + 24 * 60 * 60 * 1000)  // 24시간 후
            ]
          }
        },
        order: [['createdAt', 'DESC']]
      });

      // 스코어가 없으면 pending 유지
      if (!gameResult || !gameResult.score || !Array.isArray(gameResult.score) || gameResult.score.length === 0) {
        selection.result = 'pending';
        hasPending = true;
        continue;
      }

      // 취소/연기 처리
      if (gameResult.status === 'cancelled' || gameResult.result === 'cancelled' ||
          gameResult.status === 'postponed' || gameResult.result === 'postponed') {
        selection.result = 'cancelled';
        hasCancelled = true;
        continue;
      }

      // 스코어가 있으면 결과 처리
      const selectionResult = this.determineSelectionResult(selection, gameResult);
      selection.result = selectionResult;
      
      if (selection.result === 'pending') hasPending = true;
      else if (selection.result === 'lost' || selection.result === 'draw') hasLost = true;
      else if (selection.result === 'won') hasWon = true;
      else if (selection.result === 'cancelled') hasCancelled = true;
    }

    // 전체 베팅 상태 집계 (기존 로직)
    let betStatus = this.determineBetStatus(hasPending, hasWon, hasLost, hasCancelled, selections);
    const newSelectionsStr = JSON.stringify(selections);
    const statusChanged = betStatus !== prevStatus;
    const selectionsChanged = newSelectionsStr !== prevSelections;
    if (statusChanged || selectionsChanged) {
      const t = await Bet.sequelize.transaction();
      try {
        bet.status = betStatus;
        bet.selections = [...selections];
        await bet.save({ transaction: t });
        if (betStatus === 'won') {
          await this.processBetWinnings(bet, t);
        } else if (betStatus === 'cancelled') {
          await this.processBetRefund(bet, t);
        }
        await t.commit();
      } catch (err) {
        await t.rollback();
        throw err;
      }
    }
    return bet.status !== 'pending';
  }

  // 🆕 베팅 전체 상태 결정 로직 (취소 경기 포함)
  determineBetStatus(hasPending, hasWon, hasLost, hasCancelled, selections) {
    // 모든 selection이 취소된 경우
    if (hasCancelled && !hasWon && !hasLost && !hasPending) {
      return 'cancelled';
    }

    // pending이 있으면 대기
    if (hasPending) {
      return 'pending';
    }

    // draw 결과도 lost로 처리
    const hasDrawOrLost = selections.some(s => s.result === 'lost' || s.result === 'draw');
    
    // 하나라도 실패하면 전체 실패 (취소된 것은 무시)
    if (hasLost || hasDrawOrLost) {
      return 'lost';
    }

    // 모든 완료된 selection이 성공 또는 취소인 경우
    if (hasWon || hasCancelled) {
      // 실제로 승리한 selection이 있는지 확인
      const hasActualWin = selections.some(s => s.result === 'won');
      if (hasActualWin) {
        return 'won';
      } else if (hasCancelled) {
        // 모든 selection이 취소된 경우
        return 'cancelled';
      }
    }

    return 'pending';
  }

  // 🆕 베팅 적중 시 상금 지급
  async processBetWinnings(bet, transaction) {
    const user = await User.findByPk(bet.userId, { 
      transaction, 
      lock: transaction.LOCK.UPDATE 
    });
    
    if (user) {
      // 취소된 selection이 있는 경우 배당률 재계산
      const adjustedWinnings = this.calculateAdjustedWinnings(bet);
      const hasCancelledSelections = bet.selections.some(s => s.result === 'cancelled');
      
      user.balance = Number(user.balance) + Number(adjustedWinnings);
      await user.save({ transaction });
      
      await PaymentHistory.create({
        userId: user.id,
        betId: bet.id,
        amount: adjustedWinnings,
        memo: hasCancelledSelections ? '베팅 적중 지급 (일부 경기 취소 반영)' : '베팅 적중 지급',
        paidAt: new Date(),
        balanceAfter: user.balance
      }, { transaction });
      
      console.log(`[적중 지급] 베팅 ${bet.id}: ${adjustedWinnings}원 지급`);
    } else {
      throw new Error(`[BetResultService] 적중 지급 실패: userId=${bet.userId} (유저 없음)`);
    }
  }

  // 🆕 베팅 환불 처리
  async processBetRefund(bet, transaction, memo = '경기 취소로 인한 환불') {
    const user = await User.findByPk(bet.userId, { 
      transaction, 
      lock: transaction.LOCK.UPDATE 
    });
    
    if (user) {
      user.balance = Number(user.balance) + Number(bet.stake);
      await user.save({ transaction });
      
      await PaymentHistory.create({
        userId: user.id,
        betId: bet.id,
        amount: bet.stake,
        memo: memo,
        paidAt: new Date(),
        balanceAfter: user.balance
      }, { transaction });
      
      console.log(`[환불 처리] 베팅 ${bet.id}: ${bet.stake}원 환불`);
    } else {
      throw new Error(`[BetResultService] 환불 실패: userId=${bet.userId} (유저 없음)`);
    }
  }

  // 🆕 취소된 selection을 고려한 상금 재계산
  calculateAdjustedWinnings(bet) {
    const selections = bet.selections;
    let adjustedOdds = 1.0;
    
    for (const selection of selections) {
      if (selection.result === 'won') {
        // 실제 승리한 경우만 배당률 곱하기
        adjustedOdds *= selection.odds || 1.0;
      } else if (selection.result === 'cancelled') {
        // 취소된 경우는 배당률 1.0으로 처리 (무효)
        adjustedOdds *= 1.0;
      }
      // lost나 pending은 전체 베팅에 영향을 주므로 여기서는 고려하지 않음
    }
    
    // 원래 잠재 수익과 조정된 수익 중 작은 값 반환 (안전장치)
    const adjustedWinnings = Number(bet.stake) * adjustedOdds;
    return Math.min(adjustedWinnings, Number(bet.potentialWinnings));
  }

  // 🚫 더 이상 사용하지 않는 메서드 (스코어 유무 기반으로 변경됨)
  // async getGameResultByTeams(selection, pendingGameResultsCache = null) {
  //   try {
  //     const desc = selection.desc;
  //     const teams = desc ? desc.split(' vs ') : [];
  //     if (teams.length !== 2) {
  //       console.log(`[getGameResultByTeams] Invalid game description format: ${desc}`);
  //       return null;
  //     }
  //     // team 정규화 적용 (비교용)
  //     const homeTeamNorm = normalizeTeamNameForComparison(teams[0].trim());
  //     const awayTeamNorm = normalizeTeamNameForComparison(teams[1].trim());
  //     // 날짜 추출 (commence_time)
  //     let commenceTime;
  //     try {
  //         commenceTime = new Date(selection.commence_time);
  //         if (isNaN(commenceTime.getTime())) {
  //           console.log(`[getGameResultByTeams] Invalid commence_time format: ${selection.commence_time} for game: ${desc}`);
  //           return null;
  //         }
  //     } catch (error) {
  //       console.log(`[getGameResultByTeams] Error parsing commence_time: ${selection.commence_time} for game: ${desc}`);
  //       return null;
  //     }
  //     // 날짜 범위 (해당 날짜 00:00~23:59)
  //     const dayStart = new Date(commenceTime);
  //     dayStart.setUTCHours(0,0,0,0);
  //     const dayEnd = new Date(commenceTime);
  //     dayEnd.setUTCHours(23,59,59,999);
  //     // pendingGameResultsCache가 없으면 한 번만 조회
  //     let pendingGameResults = pendingGameResultsCache;
  //     if (!pendingGameResults) {
  //       pendingGameResults = await GameResult.findAll({
  //         where: {
  //           commenceTime: { [Op.between]: [dayStart, dayEnd] },
  //           status: 'finished'
  //         }
  //       });
  //     }
  //     // 메모리상에서 팀명 매칭
  //     for (const candidate of pendingGameResults) {
  //       const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
  //       const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
  //       if (
  //         (dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
  //         (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)
  //       ) {
  //         return candidate;
  //       }
  //     }
  //     // 매칭 실패
  //     return null;
  //   } catch (error) {
  //     console.error('[getGameResultByTeams] Error:', error.stack || error);
  //     return null;
  //   }
  // }

  // 🚫 더 이상 사용하지 않는 메서드들 (스코어 유무 기반으로 변경됨)
  // async collectAllBettingGames() {
  //   try {
  //     console.log('Collecting all games that have betting odds...');
  //     
  //     // 모든 배팅에서 고유한 게임 목록 추출
  //     const allBets = await Bet.findAll({
  //       attributes: ['selections']
  //     });

  //     const uniqueGames = new Map();

  //     allBets.forEach(bet => {
  //       bet.selections.forEach(selection => {
  //         const gameKey = selection.desc;
  //         if (gameKey && !uniqueGames.has(gameKey)) {
  //           uniqueGames.set(gameKey, {
  //             desc: selection.desc,
  //             commence_time: selection.commence_time,
  //             gameId: selection.gameId,
  //             market: selection.market
  //           });
  //         }
  //       });
  //     });

  //     const gamesList = Array.from(uniqueGames.values());
  //     console.log(`Found ${gamesList.length} unique games with betting odds`);
  //     
  //     return gamesList;
  //   } catch (error) {
  //     console.error('Error collecting betting games:', error);
  //     throw error;
  //   }
  // }

  // // 누락된 경기 결과 식별
  // async identifyMissingGameResults() {
  //   try {
  //     console.log('Identifying missing game results...');
  //     
  //     const bettingGames = await this.collectAllBettingGames();
  //     const missingGames = [];

  //     for (const game of bettingGames) {
  //         const gameResult = await this.getGameResultByTeams(game);
  //         if (!gameResult) {
  //           missingGames.push(game);
  //         }
  //       }

  //     console.log(`Found ${missingGames.length} games missing results out of ${bettingGames.length} total games`);
  //     return missingGames;
  //   } catch (error) {
  //     console.error('Error identifying missing game results:', error);
  //     throw error;
  //   }
  // }

  // // 기존 gameId로 조회하는 메서드 (하위 호환성)
  // async getGameResult(gameId) {
  //   try {
  //     const gameResult = await GameResult.findOne({
  //       where: {
  //         id: gameId
  //       }
  //     });

  //     return gameResult;
  //   } catch (error) {
  //     console.error('Error getting game result:', error);
  //     return null;
  //   }
  // }

  // 개별 selection 결과 판정
  determineSelectionResult(selection, gameResult) {
    // market alias 매핑
    let marketType = selection.market;
    if (marketType === 'h2h') marketType = '승/패';
    if (marketType === 'totals') marketType = '언더/오버';
    if (marketType === 'spreads') marketType = '핸디캡';
    const resultFunction = this.marketResultMap[marketType];
    if (resultFunction) {
      return resultFunction(selection, gameResult);
    }
    return 'pending';
  }

  // 승/패 결과 판정
  determineWinLoseResult(selection, gameResult) {
    // 경기 취소 또는 연기 시 즉시 환불
    if (gameResult.result === 'cancelled' || gameResult.status === 'cancelled' ||
        gameResult.result === 'postponed' || gameResult.status === 'postponed') {
      return 'cancelled';
    }

    if (gameResult.result === 'pending') {
      return 'pending';
    }

    // team 정규화 적용 (비교용)
    const selectedTeam = normalizeTeamNameForComparison(selection.team);
    const gameResultData = gameResult.result;
    const homeTeam = normalizeTeamNameForComparison(gameResult.homeTeam);
    const awayTeam = normalizeTeamNameForComparison(gameResult.awayTeam);

    if (gameResultData === 'home_win') {
      return selectedTeam === homeTeam ? 'won' : 'lost';
    } else if (gameResultData === 'away_win') {
      return selectedTeam === awayTeam ? 'won' : 'lost';
    } else if (gameResultData === 'draw') {
      // 무승부: 승/패 선택 모두 실패 (베팅에서는 lost 처리)
      return 'lost';
    }

    return 'pending';
  }

  // 언더/오버 결과 판정
  determineOverUnderResult(selection, gameResult) {
    // 경기 취소 또는 연기 시 즉시 환불
    if (gameResult.result === 'cancelled' || gameResult.status === 'cancelled' ||
        gameResult.result === 'postponed' || gameResult.status === 'postponed') {
      return 'cancelled';
    }

    if (gameResult.result === 'pending') {
      return 'pending';
    }

    // robust하게 옵션 추출 (예: 'Overbet365', 'UnderPinnacle' 등)
    let option = '';
    if (selection.option && selection.option !== '') {
      option = normalizeOption(selection.option);
    } else if (selection.team && selection.team !== '') {
      option = normalizeOption(selection.team);
    } else {
      // option과 team이 모두 빈 문자열인 경우 기본값으로 Over 가정
      // 이는 일반적인 스포츠 베팅에서 기본 선택이 Over이기 때문
      option = 'Over';
      console.log(`[언더/오버 판정] option과 team이 비어있음. 기본값 'Over'로 설정`);
    }
    const point = selection.point;
    
    // 스코어에서 총 점수 계산 (방어 코드 사용)
    const totalScore = this.calculateTotalScore(gameResult.score);

    // point가 없으면 무효
    if (typeof point !== 'number' || isNaN(point)) {
      return 'cancelled';
    }

    // 무효 조건: totalScore와 point가 같으면 push/cancel 처리
    if (totalScore === point) {
      return 'cancelled';
    }

    console.log(`[언더/오버 판정] 총점: ${totalScore}, 기준: ${point}, 타입: ${option}`);
    
    if (option === 'Over') {
      const result = totalScore > point ? 'won' : 'lost';
      console.log(`[언더/오버 판정] Over ${point}: ${totalScore} > ${point} = ${result}`);
      return result;
    } else if (option === 'Under') {
      const result = totalScore < point ? 'won' : 'lost';
      console.log(`[언더/오버 판정] Under ${point}: ${totalScore} < ${point} = ${result}`);
      return result;
    }

    console.log(`[언더/오버 판정] 알 수 없는 옵션: ${option}`);
    return 'pending';
  }

  // 핸디캡 결과 판정
  determineHandicapResult(selection, gameResult) {
    // 경기 취소 또는 연기 시 즉시 환불
    if (gameResult.result === 'cancelled' || gameResult.status === 'cancelled' ||
        gameResult.result === 'postponed' || gameResult.status === 'postponed') {
      return 'cancelled';
    }

    if (gameResult.result === 'pending') {
      return 'pending';
    }

    // 핸디캡 베팅에서 팀명과 핸디캡 분리
    let selectedTeam, handicap;
    if (selection.team && selection.team.includes(' -')) {
      // "Doosan Bears -1" 형식에서 팀명과 핸디캡 분리
      const parts = selection.team.split(' -');
      selectedTeam = normalizeTeamNameForComparison(parts[0]);
      handicap = parseInt(parts[1]) || 0;
    } else {
      // 기존 방식 (selection.team이 팀명만 있는 경우)
      selectedTeam = normalizeTeamNameForComparison(selection.team);
      handicap = selection.handicap || 0;
    }
    
    // 스코어 계산 (방어 코드 사용)
    const { homeScore, awayScore } = this.extractHomeAwayScores(gameResult.score, gameResult.homeTeam, gameResult.awayTeam);

    // 핸디캡 적용 (팀명 비교용 정규화)
    const homeTeamNorm = normalizeTeamNameForComparison(gameResult.homeTeam);
    const awayTeamNorm = normalizeTeamNameForComparison(gameResult.awayTeam);
    
    if (selectedTeam === homeTeamNorm) {
      const adjustedScore = homeScore + handicap;
      return adjustedScore > awayScore ? 'won' : 'lost';
    } else if (selectedTeam === awayTeamNorm) {
      const adjustedScore = awayScore + handicap;
      return adjustedScore > homeScore ? 'won' : 'lost';
    }

    return 'pending';
  }

  // 스코어 형식 검증 및 정규화 함수 추가
  validateAndNormalizeScore(scoreData) {
    if (!scoreData) {
      return null;
    }

    // 문자열인 경우 JSON 파싱 시도
    if (typeof scoreData === 'string') {
      try {
        scoreData = JSON.parse(scoreData);
      } catch (e) {
        console.error('[Score Validation] JSON 파싱 실패:', e.message, scoreData);
        return null;
      }
    }

    // 배열이 아닌 경우
    if (!Array.isArray(scoreData)) {
      console.error('[Score Validation] 배열이 아님:', scoreData);
      return null;
    }

    // 잘못된 형식: ["1", "0"] 형태 감지
    if (scoreData.length === 2 && 
        typeof scoreData[0] === 'string' && 
        typeof scoreData[1] === 'string' &&
        !scoreData[0].hasOwnProperty('name') && 
        !scoreData[1].hasOwnProperty('name')) {
      console.error('[Score Validation] 잘못된 스코어 형식 감지 (The Odds API 형식):', scoreData);
      console.error('[Score Validation] 올바른 형식: [{"name":"팀명","score":"점수"}]');
      return null;
    }

    // 올바른 형식: [{"name":"팀명","score":"점수"}] 형태 검증
    if (scoreData.length >= 2 && 
        scoreData[0].hasOwnProperty('name') && 
        scoreData[0].hasOwnProperty('score') &&
        scoreData[1].hasOwnProperty('name') && 
        scoreData[1].hasOwnProperty('score')) {
      return scoreData;
    }

    console.error('[Score Validation] 알 수 없는 스코어 형식:', scoreData);
    return null;
  }

  // 스코어에서 총 점수 계산 (방어 코드 포함)
  calculateTotalScore(scoreData) {
    const normalizedScore = this.validateAndNormalizeScore(scoreData);
    if (!normalizedScore) {
      console.error('[Score Calculation] 스코어 형식 검증 실패');
      return 0;
    }

    try {
      return normalizedScore.reduce((sum, score) => {
        const scoreValue = parseInt(score.score || 0);
        return sum + (isNaN(scoreValue) ? 0 : scoreValue);
      }, 0);
    } catch (error) {
      console.error('[Score Calculation] 총점 계산 오류:', error.message);
      return 0;
    }
  }

  // 스코어에서 홈/원정 점수 추출 (방어 코드 포함)
  extractHomeAwayScores(scoreData, homeTeam, awayTeam) {
    const normalizedScore = this.validateAndNormalizeScore(scoreData);
    if (!normalizedScore) {
      console.error('[Score Extraction] 스코어 형식 검증 실패');
      return { homeScore: 0, awayScore: 0 };
    }

    try {
      let homeScore = 0, awayScore = 0;
      
      for (const score of normalizedScore) {
        if (score.name === homeTeam) {
          homeScore = parseInt(score.score || 0);
        } else if (score.name === awayTeam) {
          awayScore = parseInt(score.score || 0);
        }
      }

      return { homeScore, awayScore };
    } catch (error) {
      console.error('[Score Extraction] 점수 추출 오류:', error.message);
      return { homeScore: 0, awayScore: 0 };
    }
  }

  // 사용자별 배팅 통계
  async getUserBetStats(userId) {
    try {
      const bets = await Bet.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });

      const stats = {
        total: bets.length,
        pending: 0,
        won: 0,
        lost: 0,
        cancelled: 0,
        totalStake: 0,
        totalWinnings: 0,
        winRate: 0
      };

      bets.forEach(bet => {
        stats[bet.status]++;
        stats.totalStake += parseFloat(bet.stake);
        
        if (bet.status === 'won') {
          stats.totalWinnings += parseFloat(bet.potentialWinnings);
        }
      });

      const completedBets = stats.won + stats.lost;
      stats.winRate = completedBets > 0 ? (stats.won / completedBets * 100).toFixed(2) : 0;

      return stats;
    } catch (error) {
      console.error('Error getting user bet stats:', error);
      throw error;
    }
  }

  // 전체 배팅 통계
  async getOverallBetStats() {
    try {
      const stats = await Bet.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('stake')), 'totalStake'],
          [fn('SUM', col('potentialWinnings')), 'totalWinnings']
        ],
        group: ['status'],
        raw: true
      });

      return stats;
    } catch (error) {
      console.error('Error getting overall bet stats:', error);
      throw error;
    }
  }

  // 특정 배팅 상세 정보
  async getBetDetails(betId) {
    try {
      const bet = await Bet.findByPk(betId, {
        include: [{ model: User, attributes: ['email'] }]
      });

      if (!bet) {
        return null;
      }

      // 각 selection의 경기 결과 정보 추가
      const selectionsWithResults = [];
      for (const selection of bet.selections) {
        const gameResult = await this.getGameResultByTeams(selection);
        selectionsWithResults.push({
          ...selection,
          gameResult: gameResult ? {
            status: gameResult.status,
            result: gameResult.result,
            score: gameResult.score,
            homeTeam: gameResult.homeTeam,
            awayTeam: gameResult.awayTeam
          } : null
        });
      }

      return {
        ...bet.toJSON(),
        selections: selectionsWithResults
      };
    } catch (error) {
      console.error('Error getting bet details:', error);
      throw error;
    }
  }

  // 특정 desc/commence_time 리스트만 업데이트하는 임시 함수
  async updateSpecificSelections() {
    // 예시: desc, commence_time 쌍 리스트
    const targets = [
      { desc: 'LG Twins vs NC Dinos', commence_time: '2025-06-19T09:30:00.000Z' },
      { desc: 'Samsung Lions vs Doosan Bears', commence_time: '2025-06-19T09:30:00.000Z' },
      { desc: 'Lotte Giants vs Hanwha Eagles', commence_time: '2025-06-19T09:30:00.000Z' },
      { desc: 'Kia Tigers vs KT Wiz', commence_time: '2025-06-19T09:30:00.000Z' },
      { desc: 'Kiwoom Heroes vs SSG Landers', commence_time: '2025-06-19T09:30:00.000Z' },
      { desc: 'Jeonbuk Hyundai Motors vs FC Seoul', commence_time: '2025-06-21T10:00:00.000Z' },
      { desc: 'Pohang Steelers vs Jeju United FC', commence_time: '2025-06-21T10:00:00.000Z' },
      { desc: 'Gwangju FC vs Daejeon Citizen', commence_time: '2025-06-22T10:00:00.000Z' },
      { desc: 'Sangju Sangmu FC vs FC Anyang', commence_time: '2025-06-22T10:00:00.000Z' }
    ];
    for (const target of targets) {
      // 해당 selection이 포함된 모든 Bet을 찾음
      const bets = await Bet.findAll({
        where: {},
      });
      for (const bet of bets) {
        let updated = false;
        for (const selection of bet.selections) {
          if (selection.desc === target.desc && selection.commence_time === target.commence_time) {
            const gameResult = await this.getGameResultByTeams(selection);
            if (gameResult) {
              const selectionResult = this.determineSelectionResult(selection, gameResult);
              selection.result = selectionResult;
              updated = true;
              console.log(`[updateSpecificSelections] desc=${selection.desc}, commence_time=${selection.commence_time}, result=${selectionResult}`);
            } else {
              console.log(`[updateSpecificSelections] desc=${selection.desc}, commence_time=${selection.commence_time}, result=매칭실패`);
            }
          }
        }
        if (updated) {
          await bet.update({ selections: bet.selections });
        }
      }
    }
  }
}

const betResultService = new BetResultService();
export default betResultService; 