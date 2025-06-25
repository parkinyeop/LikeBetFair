import Bet from '../models/betModel.js';
import GameResult from '../models/gameResultModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import { Op, fn, col } from 'sequelize';
import { normalizeTeamName, normalizeCategory, normalizeCategoryPair } from '../normalizeUtils.js';

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

      let updatedCount = 0;
      let errorCount = 0;

      for (const bet of pendingBets) {
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
    const selections = bet.selections;
    let hasPending = false;
    let hasLost = false;
    let hasWon = false;
    let hasCancel = false;

    // selections deep copy for comparison
    const prevSelections = JSON.stringify(bet.selections);
    const prevStatus = bet.status;

    for (const selection of selections) {
      // team 정규화 적용
      const normalizedTeam = normalizeTeamName(selection.team);
      selection.team = normalizedTeam;
      const gameResult = await this.getGameResultByTeams(selection);

      if (!gameResult) {
        // 경기 결과가 아직 없는 경우
        hasPending = true;
        console.log(`[processBetResult] No GameResult for ${selection.desc} (${selection.commence_time})`);
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
      else if (selection.result === 'lost') hasLost = true;
      else if (selection.result === 'won') hasWon = true;
      else if (selection.result === 'cancel') hasCancel = true;
    }

    // 전체 베팅 상태 집계
    let betStatus = 'pending';
    if (hasPending) {
      betStatus = 'pending';
    } else if (hasLost) {
      betStatus = 'lost';
    } else if (hasWon && !hasLost && !hasPending) {
      betStatus = 'won';
    } else if (hasCancel && !hasWon && !hasLost && !hasPending) {
      betStatus = 'cancel';
    }

    // 변경 여부 확인
    const newSelectionsStr = JSON.stringify(selections);
    const statusChanged = betStatus !== prevStatus;
    const selectionsChanged = newSelectionsStr !== prevSelections;

    if (statusChanged || selectionsChanged) {
      await bet.update({
        status: betStatus,
        selections: selections
      });
      // 적중(won) 시 유저 balance 지급 (중복 지급 방지, 트랜잭션 적용)
      if (betStatus === 'won' && prevStatus !== 'won') {
        const t = await User.sequelize.transaction();
        try {
          const user = await User.findByPk(bet.userId, { transaction: t, lock: t.LOCK.UPDATE });
          if (user) {
            user.balance = Number(user.balance) + Number(bet.potentialWinnings);
            await user.save({ transaction: t });
            await PaymentHistory.create({
              userId: user.id,
              betId: bet.id,
              amount: bet.potentialWinnings,
              balanceAfter: user.balance,
              memo: '베팅 적중 지급',
              paidAt: new Date()
            }, { transaction: t });
            await t.commit();
            console.log(`[BetResultService] 적중 지급: userId=${user.id}, betId=${bet.id}, 지급액=${bet.potentialWinnings}, 잔고=${user.balance}`);
          } else {
            await t.rollback();
            console.error(`[BetResultService] 적중 지급 실패: userId=${bet.userId} (유저 없음)`);
          }
        } catch (err) {
          await t.rollback();
          console.error('[BetResultService] 적중 지급 트랜잭션 실패:', err);
        }
      }
      // 상태 변화 로그
      console.log(`Bet ${bet.id} updated to ${betStatus} (won:${hasWon}, lost:${hasLost}, cancel:${hasCancel}, pending:${hasPending})`);
    }
    return betStatus !== 'pending';
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
      // team 정규화 적용
      const homeTeamNorm = normalizeTeamName(teams[0].trim());
      const awayTeamNorm = normalizeTeamName(teams[1].trim());
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
        const dbHomeNorm = normalizeTeamName(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamName(candidate.awayTeam);
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
        const dbHomeNorm = normalizeTeamName(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamName(candidate.awayTeam);
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
        const dbHomeNorm = normalizeTeamName(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamName(candidate.awayTeam);
        if (
          (dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
          (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)
        ) {
          console.log(`[getGameResultByTeams] 매칭 성공(카테고리 무시, finished): candidate.id=${candidate.id}`);
          return candidate;
        }
      }
      for (const candidate of scheduledCandidates) {
        const dbHomeNorm = normalizeTeamName(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamName(candidate.awayTeam);
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
        const dbHomeNorm = normalizeTeamName(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamName(candidate.awayTeam);
        console.log(`[getGameResultByTeams] 후보(±12h): id=${candidate.id}, homeTeam=${candidate.homeTeam}(${dbHomeNorm}), awayTeam=${candidate.awayTeam}(${dbAwayNorm}), mainCategory=${candidate.mainCategory}, commenceTime=${candidate.commenceTime}`);
        if (
          (dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
          (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)
        ) {
          console.log(`[getGameResultByTeams] ±12시간 확장 매칭 성공: candidate.id=${candidate.id}`);
          return candidate;
        }
      }
      // 4차: 팀명만 일치(시간 무시, 가장 최근 경기)
      const allCandidates = await GameResult.findAll({
        order: [['commenceTime', 'DESC']]
      });
      console.log(`[getGameResultByTeams] 후보군(전체): ${allCandidates.length}개`);
      for (const candidate of allCandidates) {
        const dbHomeNorm = normalizeTeamName(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamName(candidate.awayTeam);
        if (
          (dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
          (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)
        ) {
          console.log(`[getGameResultByTeams] 시간 무시, 팀명만 일치 매칭 성공: candidate.id=${candidate.id}`);
          return candidate;
        }
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
    const marketType = selection.market;
    const resultFunction = this.marketResultMap[marketType];
    
    if (resultFunction) {
      return resultFunction(selection, gameResult);
    }
    
    return 'pending';
  }

  // 승/패 결과 판정
  determineWinLoseResult(selection, gameResult) {
    if (gameResult.result === 'cancelled') {
      return 'cancel';
    }

    if (gameResult.result === 'pending') {
      return 'pending';
    }

    // team 정규화 적용
    const selectedTeam = normalizeTeamName(selection.team);
    const gameResultData = gameResult.result;
    const homeTeam = normalizeTeamName(gameResult.homeTeam);
    const awayTeam = normalizeTeamName(gameResult.awayTeam);

    if (gameResultData === 'home_win') {
      return selectedTeam === homeTeam ? 'won' : 'lost';
    } else if (gameResultData === 'away_win') {
      return selectedTeam === awayTeam ? 'won' : 'lost';
    } else if (gameResultData === 'draw') {
      // 무승부의 경우 보통 배팅이 무효 처리되거나 특별한 규칙 적용
      return 'cancel';
    }

    return 'pending';
  }

  // 언더/오버 결과 판정
  determineOverUnderResult(selection, gameResult) {
    if (gameResult.result === 'cancelled') {
      return 'cancel';
    }

    if (gameResult.result === 'pending') {
      return 'pending';
    }

    // robust하게 옵션 추출 (예: 'Overbet365', 'UnderPinnacle' 등)
    const option = (selection.option && selection.option !== '')
      ? require('../normalizeUtils.js').normalizeOption(selection.option)
      : require('../normalizeUtils.js').normalizeOption(selection.team);
    const point = selection.point;
    
    // 스코어에서 총 점수 계산
    let totalScore = 0;
    if (gameResult.score && Array.isArray(gameResult.score)) {
      totalScore = gameResult.score.reduce((sum, score) => sum + parseInt(score.score || 0), 0);
    }

    // point가 없으면 무효
    if (typeof point !== 'number' || isNaN(point)) {
      return 'cancel';
    }

    // 무효 조건: totalScore와 point가 같으면 push/cancel 처리
    if (totalScore === point) {
      return 'cancel';
    }

    if (option === 'Over') {
      return totalScore > point ? 'won' : 'lost';
    } else if (option === 'Under') {
      return totalScore < point ? 'won' : 'lost';
    }

    return 'pending';
  }

  // 핸디캡 결과 판정
  determineHandicapResult(selection, gameResult) {
    if (gameResult.result === 'cancelled') {
      return 'cancel';
    }

    if (gameResult.result === 'pending') {
      return 'pending';
    }

    const selectedTeam = normalizeTeamName(selection.team);
    const handicap = selection.handicap || 0;
    
    // 스코어 계산
    let homeScore = 0, awayScore = 0;
    if (gameResult.score && Array.isArray(gameResult.score)) {
      homeScore = parseInt(gameResult.score[0]?.score || 0);
      awayScore = parseInt(gameResult.score[1]?.score || 0);
    }

    // 핸디캡 적용
    if (selectedTeam === gameResult.homeTeam) {
      const adjustedScore = homeScore + handicap;
      return adjustedScore > awayScore ? 'won' : 'lost';
    } else if (selectedTeam === gameResult.awayTeam) {
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