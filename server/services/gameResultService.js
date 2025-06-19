const axios = require('axios');
const GameResult = require('../models/gameResultModel');
const sportsConfig = require('../config/sportsConfig');
const Bet = require('../models/betModel');

// 클라이언트에서 사용하는 sport key 매핑
const clientSportKeyMap = {
  'K리그': 'soccer_korea_kleague1',
  'J리그': 'soccer_japan_j_league',
  '세리에 A': 'soccer_italy_serie_a',
  '브라질 세리에 A': 'soccer_brazil_campeonato',
  'MLS': 'soccer_usa_mls',
  '아르헨티나 프리메라': 'soccer_argentina_primera_division',
  '중국 슈퍼리그': 'soccer_china_superleague',
  '스페인 2부': 'soccer_spain_segunda_division',
  '스웨덴 알스벤스칸': 'soccer_sweden_allsvenskan',
  'NBA': 'basketball_nba',
  'MLB': 'baseball_mlb',
  'KBO': 'baseball_kbo',
  'NFL': 'americanfootball_nfl'
};

// TheSportsDB 리그ID 매핑 (배당율을 제공하는 실제 스포츠 카테고리)
const sportsDbLeagueMap = {
  // 축구 (Football)
  'k-league': '4689',      // K리그
  'mls': '4346',           // MLS
  'serie-a': '4332',       // 세리에 A
  'j-league': '4340',      // J리그
  'la-liga': '4335',       // 라리가
  'brazil': '4364',        // 브라질 세리에 A
  'argentina': '4367',     // 아르헨티나 프리메라
  
  // 야구 (Baseball)
  'mlb': '4424',           // MLB
  'kbo': '4830',           // KBO (수정)
  
  // 농구 (Basketball)
  'nba': '4387',           // NBA
  
  // 미식축구 (American Football)
  'nfl': '4391',           // NFL
  
  // 아이스하키 (Ice Hockey)
  'nhl': '4380'            // NHL
};

const API_KEY = process.env.THESPORTSDB_API_KEY || '123';

class GameResultService {
  constructor() {
    this.apiKey = process.env.THESPORTSDB_API_KEY || '123';
    this.baseUrl = 'https://api.the-odds-api.com/v4/sports';
  }

  // 누락된 경기 결과 수집 (클라이언트 배팅 게임 기준)
  async collectMissingGameResults() {
    try {
      console.log('Starting collection of missing game results...');
      
      // 배팅 서비스에서 누락된 게임 목록 가져오기
      const betResultService = require('./betResultService');
      const missingGames = await betResultService.identifyMissingGameResults();
      
      console.log(`Found ${missingGames.length} missing game results to collect`);
      
      let collectedCount = 0;
      let errorCount = 0;

      for (const game of missingGames) {
        try {
          const success = await this.collectGameResult(game);
          if (success) {
            collectedCount++;
          }
        } catch (error) {
          console.error(`Error collecting result for ${game.desc}:`, error.message);
          errorCount++;
        }
      }

      console.log(`Game results collection completed: ${collectedCount} collected, ${errorCount} errors`);
      return { collectedCount, errorCount, totalMissing: missingGames.length };
    } catch (error) {
      console.error('Error collecting missing game results:', error);
      throw error;
    }
  }

  // 개별 게임 결과 수집
  async collectGameResult(game) {
    try {
      const desc = game.desc;
      const teams = desc.split(' vs ');
      
      if (teams.length !== 2) {
        console.log(`Invalid game description format: ${desc}`);
        return false;
      }

      const homeTeam = teams[0].trim();
      const awayTeam = teams[1].trim();

      // 팀명으로 스포츠 카테고리 추정
      const sportCategory = this.estimateSportCategory(homeTeam, awayTeam);
      const sportKey = this.getSportKeyForCategory(sportCategory);

      if (!sportKey) {
        console.log(`Could not determine sport key for game: ${desc}`);
        return false;
      }

      console.log(`Collecting result for ${desc} (${sportKey})...`);

      // API에서 경기 결과 조회
      const resultsResponse = await axios.get(`${this.baseUrl}/${sportKey}/scores`, {
        params: {
          apiKey: this.apiKey,
          daysFrom: 30 // 최근 30일간의 데이터
        }
      });

      // 해당 팀들의 경기 찾기
      const matchingGame = resultsResponse.data.find(gameData => {
        return (gameData.home_team === homeTeam && gameData.away_team === awayTeam) ||
               (gameData.home_team === awayTeam && gameData.away_team === homeTeam);
      });

      if (matchingGame) {
        // 경기 결과 저장
        const mainCategory = this.determineMainCategory(sportCategory);
        const subCategory = this.determineSubCategory(sportCategory);
        
        await GameResult.upsert({
          mainCategory,
          subCategory,
          homeTeam: matchingGame.home_team,
          awayTeam: matchingGame.away_team,
          commenceTime: new Date(matchingGame.commence_time),
          status: this.determineGameStatus(matchingGame),
          score: matchingGame.scores,
          result: this.determineGameResult(matchingGame),
          lastUpdated: new Date()
        });

        console.log(`Successfully collected result for ${desc}`);
        return true;
      } else {
        console.log(`No matching game found for ${desc}`);
        return false;
      }
    } catch (error) {
      console.error(`Error collecting game result for ${game.desc}:`, error.message);
      return false;
    }
  }

  // 팀명으로 스포츠 카테고리 추정
  estimateSportCategory(homeTeam, awayTeam) {
    const koreanBaseballTeams = [
      'Kia Tigers', 'Samsung Lions', 'LG Twins', 'Doosan Bears', 'Kiwoom Heroes',
      'NC Dinos', 'Lotte Giants', 'KT Wiz', 'SSG Landers', 'Hanwha Eagles'
    ];

    const koreanSoccerTeams = [
      'Daegu FC', 'Pohang Steelers', 'Ulsan Hyundai', 'Jeonbuk Hyundai Motors',
      'FC Seoul', 'Suwon Samsung Bluewings', 'Gangwon FC', 'Jeju United'
    ];

    const mlbTeams = [
      'Chicago Cubs', 'Pittsburgh Pirates', 'New York Yankees', 'Boston Red Sox',
      'Los Angeles Dodgers', 'San Francisco Giants', 'St. Louis Cardinals'
    ];

    // KBO 팀 확인
    if (koreanBaseballTeams.includes(homeTeam) || koreanBaseballTeams.includes(awayTeam)) {
      return 'KBO';
    }

    // K리그 팀 확인
    if (koreanSoccerTeams.includes(homeTeam) || koreanSoccerTeams.includes(awayTeam)) {
      return 'K리그';
    }

    // MLB 팀 확인
    if (mlbTeams.includes(homeTeam) || mlbTeams.includes(awayTeam)) {
      return 'MLB';
    }

    return 'unknown';
  }

  // 카테고리별 스포츠 키 반환
  getSportKeyForCategory(category) {
    const categoryMap = {
      'KBO': 'baseball_kbo',
      'K리그': 'soccer_korea_kleague1',
      'MLB': 'baseball_mlb',
      'NBA': 'basketball_nba',
      'NFL': 'americanfootball_nfl'
    };

    return categoryMap[category] || null;
  }

  // 활성 카테고리만 업데이트 (비용 절약용)
  async fetchAndUpdateResultsForCategories(activeCategories) {
    try {
      console.log(`Starting game results update for active categories: ${activeCategories.join(', ')}`);
      
      // 활성 카테고리만 필터링
      const categoriesToUpdate = activeCategories.filter(category => 
        clientSportKeyMap.hasOwnProperty(category)
      );
      
      console.log(`Filtered categories to update: ${categoriesToUpdate.join(', ')}`);
      
      for (const clientCategory of categoriesToUpdate) {
        const sportKey = clientSportKeyMap[clientCategory];
        console.log(`Fetching results for ${clientCategory} (${sportKey})...`);
        
        try {
          // TheSportsDB API 사용 (The Odds API 대신)
          const resultsResponse = await axios.get(`https://www.thesportsdb.com/api/v1/json/${this.apiKey}/eventsnextleague.php?id=${this.getSportsDbLeagueId(clientCategory)}`);
          
          if (resultsResponse.data && resultsResponse.data.events) {
            console.log(`Found ${resultsResponse.data.events.length} events for ${clientCategory}`);
            
            for (const event of resultsResponse.data.events) {
              if (this.validateGameData(event)) {
                const mainCategory = this.determineMainCategory(clientCategory);
                const subCategory = this.determineSubCategory(clientCategory);
                
                await GameResult.upsert({
                  mainCategory,
                  subCategory,
                  homeTeam: event.strHomeTeam,
                  awayTeam: event.strAwayTeam,
                  commenceTime: new Date(event.dateEvent + ' ' + event.strTime),
                  status: this.determineGameStatus(event),
                  score: [event.intHomeScore, event.intAwayScore],
                  result: this.determineGameResult(event),
                  eventId: event.idEvent,
                  lastUpdated: new Date()
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching results for ${clientCategory}:`, error.message);
          // 개별 스포츠 에러가 전체 프로세스를 중단시키지 않도록 계속 진행
          continue;
        }
      }

      // 기존 데이터 정리 (30일 이상 된 데이터 삭제)
      await this.cleanupOldData();
      
      console.log('Game results update completed for active categories');
    } catch (error) {
      console.error('Error fetching and updating results for active categories:', error);
      throw error;
    }
  }

  // TheSportsDB 리그 ID 반환
  getSportsDbLeagueId(clientCategory) {
    const categoryMap = {
      'KBO': '4830', // KBO (수정)
      'MLB': '4424', 
      'NBA': '4387',
      'NFL': '4391'
    };
    return categoryMap[clientCategory] || null;
  }

  // 전체 카테고리 업데이트 (기존 메서드)
  async fetchAndUpdateResults() {
    try {
      console.log('Starting game results update for all categories...');
      
      // 클라이언트에서 사용하는 모든 카테고리에 대해 개별적으로 API 호출
      for (const [clientCategory, sportKey] of Object.entries(clientSportKeyMap)) {
        console.log(`Fetching results for ${clientCategory} (${sportKey})...`);
        
        try {
          // 최근 7일간의 경기 결과 데이터 가져오기
          const resultsResponse = await axios.get(`${this.baseUrl}/${sportKey}/scores`, {
            params: {
              apiKey: this.apiKey,
              daysFrom: 7 // 최근 7일간의 데이터
            }
          });

          console.log(`Found ${resultsResponse.data.length} games for ${clientCategory}`);

          // 데이터 검증 및 저장
          for (const game of resultsResponse.data) {
            if (this.validateGameData(game)) {
              const mainCategory = this.determineMainCategory(clientCategory);
              const subCategory = this.determineSubCategory(clientCategory);
              
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
        } catch (error) {
          console.error(`Error fetching results for ${clientCategory}:`, error.message);
          // 개별 스포츠 에러가 전체 프로세스를 중단시키지 않도록 계속 진행
          continue;
        }
      }

      // 기존 데이터 정리 (30일 이상 된 cancelled 데이터 삭제)
      await this.cleanupOldData();
      
      console.log('Game results successfully updated for all categories');
    } catch (error) {
      console.error('Error fetching and updating game results:', error);
      throw error;
    }
  }

  determineMainCategory(clientCategory) {
    if (['K리그', 'J리그', '세리에 A', '브라질 세리에 A', 'MLS', '아르헨티나 프리메라', '중국 슈퍼리그', '스페인 2부', '스웨덴 알스벤스칸'].includes(clientCategory)) {
      return 'football';
    } else if (clientCategory === 'NBA') {
      return 'basketball';
    } else if (['MLB', 'KBO'].includes(clientCategory)) {
      return 'baseball';
    } else if (clientCategory === 'NFL') {
      return 'americanfootball';
    }
    return 'other';
  }

  determineSubCategory(clientCategory) {
    const categoryMap = {
      'K리그': 'k-league',
      'J리그': 'j-league',
      '세리에 A': 'serie-a',
      '브라질 세리에 A': 'brazil',
      'MLS': 'mls',
      '아르헨티나 프리메라': 'argentina',
      '중국 슈퍼리그': 'china',
      '스페인 2부': 'spain-2nd',
      '스웨덴 알스벤스칸': 'sweden',
      'NBA': 'nba',
      'MLB': 'mlb',
      'KBO': 'kbo',
      'NFL': 'nfl'
    };
    
    return categoryMap[clientCategory] || 'other';
  }

  validateGameData(game) {
    // TheSportsDB API 형식에 맞게 필수 필드 검증
    if (!game.strHomeTeam || !game.strAwayTeam || !game.dateEvent || !game.strTime) {
      console.log(`Invalid game data: missing required fields`, game);
      return false;
    }

    // 팀명이 같은 경기 제외 (비현실적)
    if (game.strHomeTeam === game.strAwayTeam) {
      console.log(`Invalid game: same team playing against itself`, game);
      return false;
    }

    // 경기 시간이 미래로 너무 먼 경우 제외 (1년 이상)
    const gameTime = new Date(game.dateEvent + ' ' + game.strTime);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    if (gameTime > oneYearFromNow) {
      console.log(`Invalid game: too far in future`, game);
      return false;
    }

    return true;
  }

  determineGameStatus(game) {
    // TheSportsDB API 형식에 맞게 상태 결정
    if (game.strStatus === 'FT' || game.strStatus === 'AET' || game.strStatus === 'PEN') {
      return 'finished';
    }
    
    if (game.strStatus === 'HT' || game.strStatus === '1H' || game.strStatus === '2H') {
      return 'live';
    }
    
    if (game.strStatus === 'CANC' || game.strStatus === 'POST') {
      return 'cancelled';
    }
    
    // 경기 시간이 지났지만 완료되지 않은 경우
    const gameTime = new Date(game.dateEvent + ' ' + game.strTime);
    const now = new Date();
    if (gameTime < now && game.strStatus !== 'FT') {
      return 'finished'; // 시간이 지났으면 완료로 간주
    }
    
    return 'scheduled';
  }

  determineGameResult(game) {
    // 경기가 취소된 경우
    if (game.strStatus === 'CANC' || game.strStatus === 'POST') {
      return 'cancelled';
    }
    
    // 스코어가 없는 경우
    if (!game.intHomeScore || !game.intAwayScore) {
      // 경기 시간이 지났지만 스코어가 없으면 pending
      const gameTime = new Date(game.dateEvent + ' ' + game.strTime);
      const now = new Date();
      if (gameTime < now) {
        return 'pending';
      }
      return 'pending';
    }
    
    // 경기가 완료된 경우 결과 계산
    if (game.strStatus === 'FT' || game.strStatus === 'AET' || game.strStatus === 'PEN') {
      const homeScore = parseInt(game.intHomeScore);
      const awayScore = parseInt(game.intAwayScore);
      
      if (isNaN(homeScore) || isNaN(awayScore)) {
        return 'pending';
      }
      
      if (homeScore > awayScore) {
        return 'home_win';
      } else if (awayScore > homeScore) {
        return 'away_win';
      } else {
        return 'draw';
      }
    }
    
    return 'pending';
  }

  async cleanupOldData() {
    try {
      // 30일 이상 된 cancelled 데이터 삭제
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const deletedCount = await GameResult.destroy({
        where: {
          result: 'cancelled',
          commenceTime: {
            [require('sequelize').Op.lt]: thirtyDaysAgo
          }
        }
      });
      
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old cancelled games`);
      }
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
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

  // 새로운 메서드: 특정 스포츠의 최근 경기 결과만 가져오기
  async fetchRecentResults(clientCategory, days = 7) {
    try {
      const sportKey = clientSportKeyMap[clientCategory];
      if (!sportKey) {
        throw new Error(`Unknown category: ${clientCategory}`);
      }

      const resultsResponse = await axios.get(`${this.baseUrl}/${sportKey}/scores`, {
        params: {
          apiKey: this.apiKey,
          daysFrom: days
        }
      });

      return resultsResponse.data;
    } catch (error) {
      console.error(`Error fetching recent results for ${clientCategory}:`, error);
      throw error;
    }
  }

  // 새로운 메서드: 데이터베이스 통계 정보
  async getDatabaseStats() {
    try {
      const stats = await GameResult.findAll({
        attributes: [
          'mainCategory',
          'subCategory',
          'status',
          'result',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['mainCategory', 'subCategory', 'status', 'result'],
        raw: true
      });

      return stats;
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  // 새로운 메서드: API 호출 비용 추정
  async getApiCostEstimate() {
    try {
      const stats = await this.getDatabaseStats();
      const totalGames = stats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
      
      return {
        totalGames,
        estimatedApiCalls: {
          daily: totalGames * 2, // 하루 2번 업데이트
          monthly: totalGames * 2 * 30,
          costEstimate: `$${(totalGames * 2 * 30 * 0.001).toFixed(2)}/month` // 예상 비용
        },
        optimization: {
          activeCategoriesOnly: 'Reduces calls by ~70%',
          selectiveUpdates: 'Reduces calls by ~50%',
          smartCaching: 'Reduces calls by ~30%'
        }
      };
    } catch (error) {
      console.error('Error getting API cost estimate:', error);
      throw error;
    }
  }
}

async function fetchAndSaveResultsFromSportsDB(category) {
  const leagueId = sportsDbLeagueMap[category];
  if (!leagueId) return;
  const url = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventspastleague.php?id=${leagueId}`;
  console.log('[TheSportsDB 요청 URL]', url);
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'curl/7.64.1'
      }
    });
    const events = res.data.events || [];
    for (const event of events) {
      try {
        // homeTeam이나 awayTeam이 null인 경우 저장하지 않음
        if (!event.strHomeTeam || !event.strAwayTeam) {
          console.log(`[건너뜀] 팀명이 null인 경기: ${event.strHomeTeam} vs ${event.strAwayTeam} (${event.dateEvent})`);
          continue;
        }

        await GameResult.upsert({
          eventId: event.idEvent,
          mainCategory: category,
          subCategory: event.strLeague,
          homeTeam: event.strHomeTeam,
          awayTeam: event.strAwayTeam,
          commenceTime: new Date(event.dateEvent + 'T' + (event.strTime || '00:00:00') + 'Z'),
          status: event.strStatus === 'Match Finished' ? 'finished' : 'scheduled',
          score: [
            { team: event.strHomeTeam, score: event.intHomeScore },
            { team: event.strAwayTeam, score: event.intAwayScore }
          ],
          result: determineResult(event),
          lastUpdated: new Date()
        });
        console.log(`[DB 저장 성공] ${event.strHomeTeam} vs ${event.strAwayTeam} (${event.dateEvent})`);
      } catch (err) {
        console.error(`[DB 저장 실패] ${event.strHomeTeam} vs ${event.strAwayTeam} (${event.dateEvent})`, err);
      }
    }
  } catch (err) {
    if (err.response) {
      console.error('[TheSportsDB 422 에러 응답]', err.response.status, err.response.data);
    } else {
      console.error('[TheSportsDB 요청 에러]', err);
    }
  }
}

function determineResult(event) {
  if (event.intHomeScore == null || event.intAwayScore == null) return 'pending';
  if (event.intHomeScore > event.intAwayScore) return 'home_win';
  if (event.intHomeScore < event.intAwayScore) return 'away_win';
  if (event.intHomeScore === event.intAwayScore) return 'draw';
  return 'pending';
}

async function fetchAndSaveAllResults() {
  console.log('배당율을 제공하는 스포츠 카테고리의 경기 결과를 업데이트합니다...');
  
  // 배당율을 제공하는 실제 스포츠 카테고리만 처리
  const activeCategories = Object.keys(sportsDbLeagueMap);
  console.log(`처리할 카테고리: ${activeCategories.join(', ')}`);
  
  for (const category of activeCategories) {
    try {
      await fetchAndSaveResultsFromSportsDB(category);
      console.log(`[완료] ${category} 카테고리 업데이트 완료`);
    } catch (error) {
      console.error(`[에러] ${category} 카테고리 업데이트 실패:`, error.message);
    }
  }
  
  console.log('모든 카테고리 업데이트 완료');
}

// 배팅내역에 있는 경기 중 결과가 없는 경우 TheSportsDB에서 가져와 저장
async function updateMissingGameResultsFromBets() {
  const allBets = await Bet.findAll({ attributes: ['selections'] });
  const uniqueGames = new Map();
  allBets.forEach(bet => {
    bet.selections.forEach(sel => {
      const key = sel.desc || `${sel.team}_${sel.commence_time}`;
      if (key && !uniqueGames.has(key)) {
        uniqueGames.set(key, sel);
      }
    });
  });
  let updatedCount = 0;
  for (const sel of uniqueGames.values()) {
    const home = sel.desc?.split(' vs ')[0]?.trim();
    const away = sel.desc?.split(' vs ')[1]?.trim();
    const exists = await GameResult.findOne({
      where: {
        homeTeam: home,
        awayTeam: away,
        commenceTime: sel.commence_time
      }
    });
    if (!exists) {
      await fetchAndSaveResultsFromSportsDBByTeams(sel);
      updatedCount++;
    }
  }
  return updatedCount;
}

function normalizeTeamName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/fc|st|united|motors|citizen|hd|sk|giants|heroes|eagles|twins|wiz|landers|lions|dinos|tigers|bears|ag|\.|\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function isTeamMatch(a, b) {
  return normalizeTeamName(a) === normalizeTeamName(b);
}

function isDateMatch(a, b) {
  // a, b: ISO string or YYYY-MM-DD
  return a.slice(0, 10) === b.slice(0, 10);
}

async function fetchAndSaveResultsFromSportsDBByTeams(sel) {
  // 카테고리 추정 (예시: K리그)
  const leagueId = sportsDbLeagueMap['kbo']; // KBO 리그 ID를 4830으로 수정
  const url = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventspastleague.php?id=${leagueId}`;
  const res = await axios.get(url);
  const events = res.data.events || [];
  const home = sel.desc?.split(' vs ')[0]?.trim();
  const away = sel.desc?.split(' vs ')[1]?.trim();
  const match = events.find(ev =>
    isTeamMatch(ev.strHomeTeam, home) &&
    isTeamMatch(ev.strAwayTeam, away) &&
    isDateMatch(ev.dateEvent, sel.commence_time)
  );
  if (match) {
    await GameResult.upsert({
      eventId: match.idEvent,
      mainCategory: 'k-league', // 실제로는 sel에서 추정
      subCategory: match.strLeague,
      homeTeam: match.strHomeTeam,
      awayTeam: match.strAwayTeam,
      commenceTime: new Date(match.dateEvent + 'T' + (match.strTime || '00:00:00') + 'Z'),
      status: match.strStatus === 'Match Finished' ? 'finished' : 'scheduled',
      score: [
        { team: match.strHomeTeam, score: match.intHomeScore },
        { team: match.strAwayTeam, score: match.intAwayScore }
      ],
      result: determineResult(match),
      lastUpdated: new Date()
    });
  } else {
    console.log('[매칭 실패] home:', home, 'away:', away, 'date:', sel.commence_time);
    for (const ev of events) {
      if (isDateMatch(ev.dateEvent, sel.commence_time)) {
        console.log('  후보:', ev.strHomeTeam, 'vs', ev.strAwayTeam, 'date:', ev.dateEvent);
      }
    }
  }
}

// 1시간마다 배당율을 제공하는 스포츠 카테고리의 경기 결과 업데이트
setInterval(async () => {
  try {
    console.log('[Scheduler] Updating game results from TheSportsDB...');
    const result = await fetchAndSaveAllResults();
    console.log(`[Scheduler] Game results update completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[Scheduler] Error updating game results:', error);
  }
}, 60 * 60 * 1000); // 1시간

// 배팅 결과 업데이트 스케줄러 추가
const betResultService = require('./betResultService');

module.exports = new GameResultService();
module.exports.fetchAndSaveAllResults = fetchAndSaveAllResults;
module.exports.updateMissingGameResultsFromBets = updateMissingGameResultsFromBets; 