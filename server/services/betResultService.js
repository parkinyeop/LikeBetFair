const Bet = require('../models/betModel');
const GameResult = require('../models/gameResultModel');
const User = require('../models/userModel');

class BetResultService {
  constructor() {
    this.marketResultMap = {
      '승/패': this.determineWinLoseResult,
      '언더/오버': this.determineOverUnderResult,
      '핸디캡': this.determineHandicapResult
    };
  }

  // 배팅 결과 업데이트 메인 함수
  async updateBetResults() {
    try {
      console.log('Starting bet results update...');
      
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
    let allSelectionsCompleted = true;
    let hasWinningSelection = true;

    for (const selection of selections) {
      const gameResult = await this.getGameResultByTeams(selection);
      
      if (!gameResult) {
        // 경기 결과가 아직 없는 경우
        allSelectionsCompleted = false;
        continue;
      }

      if (gameResult.status === 'finished') {
        // 경기가 완료된 경우 결과 판정
        const selectionResult = this.determineSelectionResult(selection, gameResult);
        
        if (selectionResult === 'pending') {
          allSelectionsCompleted = false;
        } else if (selectionResult === 'lost') {
          hasWinningSelection = false;
        }
        
        // selection 결과 업데이트
        selection.result = selectionResult;
      } else {
        allSelectionsCompleted = false;
      }
    }

    // 모든 selection이 완료된 경우 배팅 결과 업데이트
    if (allSelectionsCompleted) {
      const betStatus = hasWinningSelection ? 'won' : 'lost';
      await bet.update({
        status: betStatus,
        selections: selections
      });

      console.log(`Bet ${bet.id} updated to ${betStatus} for user ${bet.User.email}`);
      return true;
    }

    return false;
  }

  // 팀명과 경기 시간으로 경기 결과 조회
  async getGameResultByTeams(selection) {
    try {
      // selection의 desc에서 팀명 추출 (예: "Daegu FC vs Pohang Steelers")
      const desc = selection.desc;
      const teams = desc.split(' vs ');
      
      if (teams.length !== 2) {
        console.log(`Invalid game description format: ${desc}`);
        return null;
      }

      const homeTeam = teams[0].trim();
      const awayTeam = teams[1].trim();

      // commence_time이 비어있는 경우 처리
      if (!selection.commence_time) {
        console.log(`No commence_time for game: ${desc}`);
        // 날짜 없이 팀명만으로 조회
        const gameResult = await GameResult.findOne({
          where: {
            homeTeam: homeTeam,
            awayTeam: awayTeam
          },
          order: [['commenceTime', 'DESC']]
        });
        return gameResult;
      }

      // 경기 시간 파싱 (안전한 파싱)
      let commenceTime;
      try {
        commenceTime = new Date(selection.commence_time);
        if (isNaN(commenceTime.getTime())) {
          console.log(`Invalid commence_time format: ${selection.commence_time} for game: ${desc}`);
          // 날짜 없이 팀명만으로 조회
          const gameResult = await GameResult.findOne({
            where: {
              homeTeam: homeTeam,
              awayTeam: awayTeam
            },
            order: [['commenceTime', 'DESC']]
          });
          return gameResult;
        }
      } catch (error) {
        console.log(`Error parsing commence_time: ${selection.commence_time} for game: ${desc}`);
        // 날짜 없이 팀명만으로 조회
        const gameResult = await GameResult.findOne({
          where: {
            homeTeam: homeTeam,
            awayTeam: awayTeam
          },
          order: [['commenceTime', 'DESC']]
        });
        return gameResult;
      }

      const startOfDay = new Date(commenceTime);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(commenceTime);
      endOfDay.setHours(23, 59, 59, 999);

      // 팀명과 날짜로 경기 결과 조회
      const gameResult = await GameResult.findOne({
        where: {
          homeTeam: homeTeam,
          awayTeam: awayTeam,
          commenceTime: {
            [require('sequelize').Op.between]: [startOfDay, endOfDay]
          }
        }
      });

      return gameResult;
    } catch (error) {
      console.error('Error getting game result by teams:', error);
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

    const selectedTeam = selection.team;
    const gameResultData = gameResult.result;

    if (gameResultData === 'home_win') {
      return selectedTeam === gameResult.homeTeam ? 'won' : 'lost';
    } else if (gameResultData === 'away_win') {
      return selectedTeam === gameResult.awayTeam ? 'won' : 'lost';
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

    const selectedType = selection.team; // 'Over' or 'Under'
    const point = selection.point;
    
    // 스코어에서 총 골 수 계산
    let totalScore = 0;
    if (gameResult.score && Array.isArray(gameResult.score)) {
      totalScore = gameResult.score.reduce((sum, score) => sum + parseInt(score.score || 0), 0);
    }

    if (selectedType.includes('Over')) {
      return totalScore > point ? 'won' : 'lost';
    } else if (selectedType.includes('Under')) {
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

    const selectedTeam = selection.team;
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
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
          [require('sequelize').fn('SUM', require('sequelize').col('stake')), 'totalStake'],
          [require('sequelize').fn('SUM', require('sequelize').col('potentialWinnings')), 'totalWinnings']
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
}

module.exports = new BetResultService(); 