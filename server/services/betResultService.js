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
        include: [{ model: User, attributes: ['email'] }]
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

  // 개별 배팅 결과 처리
  async processBetResult(bet) {
    // ✅ 환불 기록이 있으면 무조건 cancelled로 고정
    console.log('[DEBUG] PaymentHistory 타입:', typeof PaymentHistory, PaymentHistory?.name);
    console.log('[DEBUG] Op 타입:', typeof Op, Op?.like);
    console.log('[DEBUG] sequelize:', typeof Bet?.sequelize, Bet?.sequelize?.config?.database);
    const whereCond = {
      betId: bet.id,
      memo: { [Op.like]: '%환불%' }
    };
    console.log('[DEBUG] PaymentHistory 쿼리 조건:', whereCond);
    const existingRefund = await PaymentHistory.findOne({ where: whereCond });
    console.log(`[DEBUG] PaymentHistory 환불 기록 조회: betId=${bet.id}, 환불기록=${!!existingRefund}, 결과:`, existingRefund);
    if (existingRefund) {
      if (bet.status !== 'cancelled') {
        bet.status = 'cancelled';
        // selection.result도 모두 cancelled로 강제
        if (Array.isArray(bet.selections)) {
          bet.selections = bet.selections.map(sel => ({ ...sel, result: 'cancelled' }));
        }
        await bet.save();
      }
      return true; // 더 이상 처리하지 않음
    }

    const selections = bet.selections;
    let hasPending = false;
    let hasLost = false;
    let hasWon = false;
    let hasCancelled = false;

    // selections deep copy for comparison
    const prevSelections = JSON.stringify(bet.selections);
    const prevStatus = bet.status;

    for (const selection of selections) {
      // team 정규화 적용
      const normalizedTeam = normalizeTeamName(selection.team);
      selection.team = normalizedTeam;
      const gameResult = await this.getGameResultByTeams(selection);

      // 디버깅: selection과 gameResult의 주요 값 출력
      console.log('[정산 디버그] selection:', {
        desc: selection.desc,
        team: selection.team,
        market: selection.market,
        option: selection.option,
        point: selection.point,
        result: selection.result,
        commence_time: selection.commence_time
      });
      if (gameResult) {
        console.log('[정산 디버그] gameResult:', {
          status: gameResult.status,
          result: gameResult.result,
          score: gameResult.score,
          homeTeam: gameResult.homeTeam,
          awayTeam: gameResult.awayTeam,
          commenceTime: gameResult.commenceTime
        });
      } else {
        console.log('[정산 디버그] gameResult: 없음');
      }

      if (!gameResult) {
        // 경기 결과가 아직 없는 경우
        hasPending = true;
        continue;
      }

      // 취소된 경기 또는 연기된 경기 처리 (즉시 환불)
      if (gameResult.status === 'cancelled' || gameResult.result === 'cancelled' ||
          gameResult.status === 'postponed' || gameResult.result === 'postponed') {
        selection.result = 'cancelled';
        hasCancelled = true;
        console.log(`[취소 처리] ${selection.desc} - 경기 취소/연기로 인한 즉시 환불 처리`);
        continue;
      }

      if (gameResult.status === 'finished') {
        // 경기가 완료된 경우 결과 판정
        const selectionResult = this.determineSelectionResult(selection, gameResult);
        selection.result = selectionResult;
      } else {
        selection.result = 'pending';
      }

      // 집계 플래그 설정
      if (selection.result === 'pending') hasPending = true;
      else if (selection.result === 'lost' || selection.result === 'draw') hasLost = true;
      else if (selection.result === 'won') hasWon = true;
      else if (selection.result === 'cancelled') hasCancelled = true;
    }

    // 전체 베팅 상태 집계 (개선된 로직)
    let betStatus = this.determineBetStatus(hasPending, hasWon, hasLost, hasCancelled, selections);

    // 변경 여부 확인
    const newSelectionsStr = JSON.stringify(selections);
    const statusChanged = betStatus !== prevStatus;
    const selectionsChanged = newSelectionsStr !== prevSelections;

    if (statusChanged || selectionsChanged) {
      // 트랜잭션으로 모든 업데이트 묶기
      const t = await Bet.sequelize.transaction();
      try {
        // 1. bet 업데이트 (selections 배열을 명시적으로 새로 할당)
        bet.status = betStatus;
        bet.selections = [...selections]; // 새로운 배열로 할당
        await bet.save({ transaction: t });

        // 2. 적중(won) 시 배당율 재검증 후 지급
        if (betStatus === 'won' && prevStatus !== 'won') {
          // 🔒 정산 시점 배당율 검증 (간단한 방식)
          const settlementValidation = await simplifiedOddsValidation.validateSettlementOdds(bet);
          
          if (!settlementValidation.isValid) {
            console.log(`[BetResultService] 정산 배당율 검증 실패: bet ${bet.id} - 환불 처리`);
            bet.status = 'cancelled';
            await this.processBetRefund(bet, t, '배당율 검증 실패로 인한 환불');
          } else {
            // 검증 통과 시 정상 지급
            await this.processBetWinnings(bet, t);
            console.log(`[BetResultService] 배당율 검증 통과: bet ${bet.id} - 정상 지급`);
          }
        }

        // 3. 🆕 취소(cancelled) 시 유저에게 환불 처리
        if (betStatus === 'cancelled' && prevStatus !== 'cancelled') {
          await this.processBetRefund(bet, t, '경기 취소/연기로 인한 즉시 환불');
        }

        await t.commit();
        console.log(`Bet ${bet.id} updated to ${betStatus} (won:${hasWon}, lost:${hasLost}, cancelled:${hasCancelled}, pending:${hasPending})`);
      } catch (err) {
        await t.rollback();
        console.error('[BetResultService] 트랜잭션 실패:', err);
      }
    }
    return betStatus !== 'pending';
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
        balanceAfter: user.balance,
        memo: hasCancelledSelections ? '베팅 적중 지급 (일부 경기 취소 반영)' : '베팅 적중 지급',
        paidAt: new Date()
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
        balanceAfter: user.balance,
        memo: memo,
        paidAt: new Date()
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

  // 팀명과 경기 시간으로 경기 결과 조회 (강화된 매칭)
  async getGameResultByTeams(selection) {
    try {
      const desc = selection.desc;
      const teams = desc ? desc.split(' vs ') : [];
      if (teams.length !== 2) {
        console.log(`[getGameResultByTeams] Invalid game description format: ${desc}`);
        return null;
      }
      // team 정규화 적용 (비교용)
      const homeTeamNorm = normalizeTeamNameForComparison(teams[0].trim());
      const awayTeamNorm = normalizeTeamNameForComparison(teams[1].trim());
      // 카테고리 정규화
      const selCatNorm = normalizeCategoryPair(selection.mainCategory, selection.subCategory).mainCategory;
      // commence_time 파싱
      let commenceTime;
      try {
        commenceTime = new Date(selection.commence_time);
        if (isNaN(commenceTime.getTime())) {
          console.log(`[getGameResultByTeams] Invalid commence_time format: ${selection.commence_time} for game: ${desc}`);
          return null;
        }
      } catch (error) {
        console.log(`[getGameResultByTeams] Error parsing commence_time: ${selection.commence_time} for game: ${desc}`);
        return null;
      }
      // ±2시간 범위로 후보군 조회
      const startTime = new Date(commenceTime.getTime() - 2 * 60 * 60 * 1000);
      const endTime = new Date(commenceTime.getTime() + 2 * 60 * 60 * 1000);
      const candidates = await GameResult.findAll({
        where: {
          commenceTime: { [Op.between]: [startTime, endTime] }
        },
        order: [['commenceTime', 'ASC']]
      });
      console.log(`[getGameResultByTeams] 후보군(±2시간): ${candidates.length}개`);
      // 후보군을 status별로 분리
      const finishedCandidates = candidates.filter(c => c.status === 'finished');
      const scheduledCandidates = candidates.filter(c => c.status !== 'finished');
      // 1차: finished 후보군에서 매칭
      for (const candidate of finishedCandidates) {
        const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
        const dbCatNorm = normalizeCategoryPair(candidate.mainCategory, candidate.subCategory).mainCategory;
        if (!allowedCategories.includes(dbCatNorm)) continue; // 비허용 카테고리 skip
        console.log(`[getGameResultByTeams] 후보(finished): id=${candidate.id}, homeTeam=${candidate.homeTeam}(${dbHomeNorm}), awayTeam=${candidate.awayTeam}(${dbAwayNorm}), mainCategory=${candidate.mainCategory}, commenceTime=${candidate.commenceTime}`);
        if (
          ((dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
           (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)) &&
          (!selCatNorm || !dbCatNorm || selCatNorm === dbCatNorm)
        ) {
          console.log(`[getGameResultByTeams] 매칭 성공(카테고리 포함, finished): candidate.id=${candidate.id}`);
          return candidate;
        }
      }
      // 1차: scheduled 등 나머지 후보군에서 매칭
      for (const candidate of scheduledCandidates) {
        const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
        const dbCatNorm = normalizeCategoryPair(candidate.mainCategory, candidate.subCategory).mainCategory;
        if (!allowedCategories.includes(dbCatNorm)) continue; // 비허용 카테고리 skip
        console.log(`[getGameResultByTeams] 후보(scheduled): id=${candidate.id}, homeTeam=${candidate.homeTeam}(${dbHomeNorm}), awayTeam=${candidate.awayTeam}(${dbAwayNorm}), mainCategory=${candidate.mainCategory}, commenceTime=${candidate.commenceTime}`);
        if (
          ((dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
           (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)) &&
          (!selCatNorm || !dbCatNorm || selCatNorm === dbCatNorm)
        ) {
          console.log(`[getGameResultByTeams] 매칭 성공(카테고리 포함, scheduled): candidate.id=${candidate.id}`);
          return candidate;
        }
      }
      // 2차: 카테고리 무시, 팀명만 일치 (finished 우선)
      for (const candidate of finishedCandidates) {
        const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
        if (
          (dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
          (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)
        ) {
          console.log(`[getGameResultByTeams] 매칭 성공(카테고리 무시, finished): candidate.id=${candidate.id}`);
          return candidate;
        }
      }
      for (const candidate of scheduledCandidates) {
        const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
        if (
          (dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
          (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)
        ) {
          console.log(`[getGameResultByTeams] 매칭 성공(카테고리 무시, scheduled): candidate.id=${candidate.id}`);
          return candidate;
        }
      }
      // 3차: commence_time ±12시간으로 확장
      const startTime12 = new Date(commenceTime.getTime() - 12 * 60 * 60 * 1000);
      const endTime12 = new Date(commenceTime.getTime() + 12 * 60 * 60 * 1000);
      const candidates12 = await GameResult.findAll({
        where: {
          commenceTime: { [Op.between]: [startTime12, endTime12] }
        },
        order: [['commenceTime', 'ASC']]
      });
      console.log(`[getGameResultByTeams] 후보군(±12시간): ${candidates12.length}개`);
      for (const candidate of candidates12) {
        const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
        console.log(`[getGameResultByTeams] 후보(±12h): id=${candidate.id}, homeTeam=${candidate.homeTeam}(${dbHomeNorm}), awayTeam=${candidate.awayTeam}(${dbAwayNorm}), mainCategory=${candidate.mainCategory}, commenceTime=${candidate.commenceTime}`);
        if (
          (dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
          (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)
        ) {
          console.log(`[getGameResultByTeams] ±12시간 확장 매칭 성공: candidate.id=${candidate.id}`);
          return candidate;
        }
      }
      // 4차: 팀명만 일치하되 ±48시간 범위 내로 확대 (시간대 오류 대응)
      const startTime48 = new Date(commenceTime.getTime() - 48 * 60 * 60 * 1000);
      const endTime48 = new Date(commenceTime.getTime() + 48 * 60 * 60 * 1000);
      const candidates48 = await GameResult.findAll({
        where: {
          commenceTime: { [Op.between]: [startTime48, endTime48] }
        },
        order: [['commenceTime', 'DESC']]
      });
      console.log(`[getGameResultByTeams] 후보군(±48시간): ${candidates48.length}개`);
      for (const candidate of candidates48) {
        const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
        if (
          (dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
          (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)
        ) {
          console.log(`[getGameResultByTeams] ±48시간 제한 매칭 성공: candidate.id=${candidate.id}, commenceTime=${candidate.commenceTime}`);
          return candidate;
        }
      }

      // 5차: 유사도 기반 팀명 매칭 (±48시간 범위)
      console.log(`[getGameResultByTeams] 유사도 기반 매칭 시도...`);
      let bestMatch = null;
      let bestSimilarity = 0;
      const SIMILARITY_THRESHOLD = 0.8;

      for (const candidate of candidates48) {
        const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
        
        // 정방향 매칭 (home-home, away-away)
        const homeSimilarity = calculateTeamNameSimilarity(homeTeamNorm, dbHomeNorm);
        const awaySimilarity = calculateTeamNameSimilarity(awayTeamNorm, dbAwayNorm);
        const forwardScore = (homeSimilarity + awaySimilarity) / 2;
        
        // 역방향 매칭 (home-away, away-home)
        const homeAwaySimiliarity = calculateTeamNameSimilarity(homeTeamNorm, dbAwayNorm);
        const awayHomeSimiliarity = calculateTeamNameSimilarity(awayTeamNorm, dbHomeNorm);
        const reverseScore = (homeAwaySimiliarity + awayHomeSimiliarity) / 2;
        
        const similarity = Math.max(forwardScore, reverseScore);
        
        console.log(`[getGameResultByTeams] 유사도 검사: ${candidate.homeTeam} vs ${candidate.awayTeam}, 점수: ${similarity.toFixed(3)}`);
        
        if (similarity >= SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
          bestMatch = candidate;
          bestSimilarity = similarity;
        }
      }

      if (bestMatch) {
        console.log(`[getGameResultByTeams] 유사도 매칭 성공: candidate.id=${bestMatch.id}, 유사도=${bestSimilarity.toFixed(3)}, commenceTime=${bestMatch.commenceTime}`);
        return bestMatch;
      }

      // 매칭 실패
      console.log(`[getGameResultByTeams] 매칭 실패: desc=${desc}, homeTeamNorm=${homeTeamNorm}, awayTeamNorm=${awayTeamNorm}, selCatNorm=${selCatNorm}, commence_time=${selection.commence_time}`);
      return null;
    } catch (error) {
      console.error('[getGameResultByTeams] Error:', error.stack || error);
      return null;
    }
  }

  // 클라이언트에서 배당률을 제공하는 모든 게임 목록 수집
  async collectAllBettingGames() {
    try {
      console.log('Collecting all games that have betting odds...');
      
      // 모든 배팅에서 고유한 게임 목록 추출
      const allBets = await Bet.findAll({
        attributes: ['selections']
      });

      const uniqueGames = new Map();

      allBets.forEach(bet => {
        bet.selections.forEach(selection => {
          const gameKey = selection.desc;
          if (gameKey && !uniqueGames.has(gameKey)) {
            uniqueGames.set(gameKey, {
              desc: selection.desc,
              commence_time: selection.commence_time,
              gameId: selection.gameId,
              market: selection.market
            });
          }
        });
      });

      const gamesList = Array.from(uniqueGames.values());
      console.log(`Found ${gamesList.length} unique games with betting odds`);
      
      return gamesList;
    } catch (error) {
      console.error('Error collecting betting games:', error);
      throw error;
    }
  }

  // 누락된 경기 결과 식별
  async identifyMissingGameResults() {
    try {
      console.log('Identifying missing game results...');
      
      const bettingGames = await this.collectAllBettingGames();
      const missingGames = [];

      for (const game of bettingGames) {
        const gameResult = await this.getGameResultByTeams(game);
        if (!gameResult) {
          missingGames.push(game);
        }
      }

      console.log(`Found ${missingGames.length} games missing results out of ${bettingGames.length} total games`);
      return missingGames;
    } catch (error) {
      console.error('Error identifying missing game results:', error);
      throw error;
    }
  }

  // 기존 gameId로 조회하는 메서드 (하위 호환성)
  async getGameResult(gameId) {
    try {
      const gameResult = await GameResult.findOne({
        where: {
          id: gameId
        }
      });

      return gameResult;
    } catch (error) {
      console.error('Error getting game result:', error);
      return null;
    }
  }

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
    
    // 스코어에서 총 점수 계산
    let totalScore = 0;
    if (gameResult.score) {
      let scoreData = gameResult.score;
      // 문자열인 경우 JSON 파싱
      if (typeof scoreData === 'string') {
        try {
          scoreData = JSON.parse(scoreData);
        } catch (e) {
          console.error('Score parsing error:', e, scoreData);
          return 'pending';
        }
      }
      // 배열인지 확인 후 총점 계산
      if (Array.isArray(scoreData)) {
        totalScore = scoreData.reduce((sum, score) => sum + parseInt(score.score || 0), 0);
      }
    }

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

    const selectedTeam = normalizeTeamNameForComparison(selection.team);
    const handicap = selection.handicap || 0;
    
    // 스코어 계산
    let homeScore = 0, awayScore = 0;
    if (gameResult.score) {
      let scoreData = gameResult.score;
      // 문자열인 경우 JSON 파싱
      if (typeof scoreData === 'string') {
        try {
          scoreData = JSON.parse(scoreData);
        } catch (e) {
          console.error('Score parsing error:', e, scoreData);
          return 'pending';
        }
      }
      // 배열인지 확인 후 점수 추출
      if (Array.isArray(scoreData) && scoreData.length >= 2) {
        homeScore = parseInt(scoreData[0]?.score || 0);
        awayScore = parseInt(scoreData[1]?.score || 0);
      }
    }

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