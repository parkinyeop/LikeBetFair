const axios = require('axios');
const GameResult = require('../models/gameResultModel');
const sportsConfig = require('../config/sportsConfig');

class GameResultService {
  constructor() {
    this.apiKey = process.env.ODDS_API_KEY;
    this.baseUrl = 'https://api.the-odds-api.com/v4/sports';
  }

  async fetchAndUpdateResults() {
    try {
      for (const [mainCategory, categoryInfo] of Object.entries(sportsConfig)) {
        const sportKey = categoryInfo.key;
        
        // 각 스포츠별로 경기 결과 데이터 가져오기
        const resultsResponse = await axios.get(`${this.baseUrl}/${sportKey}/scores`, {
          params: {
            apiKey: this.apiKey,
            date: new Date().toISOString().split('T')[0] // 오늘 날짜
          }
        });

        // 데이터 캐시에 저장
        for (const game of resultsResponse.data) {
          const subCategory = this.determineSubCategory(game, categoryInfo.subcategories);
          
          await GameResult.upsert({
            mainCategory,
            subCategory,
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            commenceTime: new Date(game.commence_time),
            status: this.determineGameStatus(game),
            score: game.scores,
            result: this.determineGameResult(game),
            lastUpdated: new Date()
          });
        }
      }

      console.log('Game results successfully updated');
    } catch (error) {
      console.error('Error fetching and updating game results:', error);
      throw error;
    }
  }

  determineSubCategory(game, subcategories) {
    const gameInfo = game.sport_title.toLowerCase();
    
    for (const [key, value] of Object.entries(subcategories)) {
      if (gameInfo.includes(key) || gameInfo.includes(value.toLowerCase())) {
        return key;
      }
    }
    
    return 'other';
  }

  determineGameStatus(game) {
    if (game.completed) return 'finished';
    if (game.scores) return 'live';
    if (game.cancelled) return 'cancelled';
    return 'scheduled';
  }

  determineGameResult(game) {
    if (!game.scores || game.cancelled) return 'cancelled';
    if (game.status !== 'final') return 'pending';

    const homeScore = parseInt(game.scores[0].score);
    const awayScore = parseInt(game.scores[1].score);

    if (homeScore > awayScore) return 'home_win';
    if (awayScore > homeScore) return 'away_win';
    return 'draw';
  }

  async getGameResults(mainCategory = null, subCategory = null, status = null, limit = 100) {
    try {
      const whereClause = {};
      if (mainCategory) whereClause.mainCategory = mainCategory;
      if (subCategory) whereClause.subCategory = subCategory;
      if (status) whereClause.status = status;

      const results = await GameResult.findAll({
        where: whereClause,
        order: [['commenceTime', 'DESC']],
        limit
      });
      return results;
    } catch (error) {
      console.error('Error fetching game results:', error);
      throw error;
    }
  }

  async getGameResultById(gameId) {
    try {
      const result = await GameResult.findByPk(gameId);
      return result;
    } catch (error) {
      console.error('Error fetching game result:', error);
      throw error;
    }
  }

  async updateGameResult(gameId, updateData) {
    try {
      const game = await GameResult.findByPk(gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      await game.update({
        ...updateData,
        lastUpdated: new Date()
      });

      return game;
    } catch (error) {
      console.error('Error updating game result:', error);
      throw error;
    }
  }
}

module.exports = new GameResultService(); 