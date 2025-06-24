import axios from 'axios';
import GameResult from '../models/gameResultModel.js';
import sportsConfig from '../config/sportsConfig.js';
import Bet from '../models/betModel.js';
import { Op } from 'sequelize';
import betResultService from './betResultService.js';
import OddsCache from '../models/oddsCacheModel.js';
import { normalizeTeamName, normalizeCategory, normalizeCommenceTime, normalizeCategoryPair } from '../normalizeUtils.js';

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
  'soccer_korea_kleague1': '4689',      // K리그
  'soccer_japan_j_league': '5188',      // J리그컵 (기존 4340 → 5188)
  'soccer_italy_serie_a': '4332',       // 세리에 A
  'soccer_brazil_campeonato': '4364',   // 브라질 세리에 A
  'soccer_usa_mls': '4346',             // MLS
  'soccer_argentina_primera_division': '4367', // 아르헨티나 프리메라
  'soccer_china_superleague': '4688',   // 중국 슈퍼리그
  'soccer_spain_segunda_division': '4396', // 스페인 2부
  'soccer_sweden_allsvenskan': '4429',  // 스웨덴 알스벤스칸
  // 농구 (Basketball)
  'basketball_nba': '4387',             // NBA
  'basketball_wnba': null,              // WNBA (TheSportsDB 미지원)
  // 야구 (Baseball)
  'baseball_mlb': '4424',               // MLB
  'baseball_kbo': '4830',               // KBO
  // 미식축구 (American Football)
  'americanfootball_cfl': null,         // CFL (TheSportsDB 미지원)
  'americanfootball_ncaaf': null,       // NCAAF (TheSportsDB 미지원)
  'americanfootball_nfl': '4391',       // NFL
  'americanfootball_nfl_preseason': null, // NFL 프리시즌 (TheSportsDB 미지원)
  // 아이스하키 (Ice Hockey)
  'icehockey_nhl': '4380'               // NHL
};

const API_KEY = process.env.THESPORTSDB_API_KEY || '123';

// 표준화된 카테고리 매핑
const standardizedCategoryMap = {
  // 축구
  'soccer_korea_kleague1': { main: 'soccer', sub: 'kleague1' },
  'soccer_japan_j_league': { main: 'soccer', sub: 'j_league' },
  'soccer_italy_serie_a': { main: 'soccer', sub: 'serie_a' },
  'soccer_brazil_campeonato': { main: 'soccer', sub: 'brasileirao' },
  'soccer_usa_mls': { main: 'soccer', sub: 'mls' },
  'soccer_argentina_primera_division': { main: 'soccer', sub: 'primera' },
  'soccer_china_superleague': { main: 'soccer', sub: 'csl' },
  'soccer_spain_segunda_division': { main: 'soccer', sub: 'laliga2' },
  'soccer_sweden_allsvenskan': { main: 'soccer', sub: 'allsvenskan' },
  
  // 농구
  'basketball_nba': { main: 'basketball', sub: 'nba' },
  'basketball_wnba': { main: 'basketball', sub: 'wnba' },
  
  // 야구
  'baseball_mlb': { main: 'baseball', sub: 'mlb' },
  'baseball_kbo': { main: 'baseball', sub: 'kbo' },
  
  // 미식축구
  'americanfootball_nfl': { main: 'football', sub: 'nfl' },
  'americanfootball_ncaaf': { main: 'football', sub: 'ncaaf' },
  'americanfootball_cfl': { main: 'football', sub: 'cfl' },
  
  // 아이스하키
  'icehockey_nhl': { main: 'hockey', sub: 'nhl' },
  'icehockey_khl': { main: 'hockey', sub: 'khl' },
  'icehockey_ahl': { main: 'hockey', sub: 'ahl' }
};

// 배당률 제공 카테고리만 허용
const allowedCategories = ['baseball', 'soccer', 'basketball']; // 필요시 확장

// 스포츠키로부터 표준화된 카테고리 얻기
function getStandardizedCategory(sportKey) {
  // 기존 매핑 유지, 없으면 normalizeCategoryPair로 보완
  const category = standardizedCategoryMap[sportKey];
  if (category) {
    return { main: category.main, sub: category.sub };
  }
  // sportKey가 없거나 매핑이 없으면 normalizeCategoryPair로 보정
  const parts = sportKey ? sportKey.split('_') : [];
  const main = parts[0] || '';
  const sub = parts.slice(1).join('_') || '';
  return normalizeCategoryPair(main, sub);
}

// 리그/날짜별 API 응답 캐시
const apiResultCache = {};

class GameResultService {
  constructor() {
    this.apiKey = process.env.THESPORTSDB_API_KEY || '123';
    this.baseUrl = 'https://api.the-odds-api.com/v4/sports';
  }

  // 1. OddsCache에서 배당률이 노출된 모든 경기의 고유 목록 추출
  async collectAllOddsGames() {
    const allOdds = await OddsCache.findAll({
      attributes: ['mainCategory', 'subCategory', 'homeTeam', 'awayTeam', 'commenceTime', 'sportKey'],
      raw: true
    });
    // 고유 경기(홈팀, 원정팀, 날짜) 기준 중복 제거
    const uniqueGames = new Map();
    allOdds.forEach(game => {
      const key = `${normalizeTeamName(game.homeTeam)}_${normalizeTeamName(game.awayTeam)}_${game.commenceTime.toISOString().slice(0,10)}`;
      if (!uniqueGames.has(key)) {
        uniqueGames.set(key, game);
      }
    });
    return Array.from(uniqueGames.values());
  }

  // 2. GameResults에 이미 저장된 경기와 비교하여 누락 경기만 추출
  async identifyMissingOddsGameResults() {
    const oddsGames = await this.collectAllOddsGames();
    const missingGames = [];
    for (const game of oddsGames) {
      const exists = await GameResult.findOne({
        where: {
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          commenceTime: game.commenceTime
        }
      });
      if (!exists) missingGames.push(game);
    }
    return missingGames;
  }

  // 3. 리그/날짜별로 TheSportsDB API에서 결과 한 번에 받아와, 내부 표준화 매칭 함수로만 매칭하여 DB에 저장
  async fetchAndSaveResultsForMissingOddsGames() {
    const missingGames = await this.identifyMissingOddsGameResults();
    // 리그별로 그룹화
    const leagueMap = {};
    for (const game of missingGames) {
      const league = game.mainCategory;
      if (!leagueMap[league]) leagueMap[league] = [];
      leagueMap[league].push(game);
    }
    let savedCount = 0;
    for (const league of Object.keys(leagueMap)) {
      // 모든 리그를 the-odds-api.com(v2)로 fetch
      const sportKey = this.getSportKeyForCategory(league);
      if (!sportKey) continue;
      const apiUrl = `${this.baseUrl}/${sportKey}/scores`;
      try {
        const resultsResponse = await axios.get(apiUrl, {
          params: {
            apiKey: this.apiKey,
            daysFrom: 30 // 최근 30일간의 데이터
          }
        });
        const events = resultsResponse.data || [];
        for (const game of leagueMap[league]) {
          const homeTeam = game.homeTeam;
          const awayTeam = game.awayTeam;
          const commenceDate = game.commenceTime.toISOString().slice(0, 10);
          const match = events.find(ev =>
            (ev.home_team === homeTeam && ev.away_team === awayTeam ||
             ev.home_team === awayTeam && ev.away_team === homeTeam) &&
            ev.commence_time && ev.commence_time.slice(0, 10) === commenceDate
          );
          if (match) {
            await GameResult.upsert({
              mainCategory: this.determineMainCategory(sportKey),
              subCategory: this.determineSubCategory(sportKey),
              homeTeam: match.home_team,
              awayTeam: match.away_team,
              commenceTime: new Date(match.commence_time),
              status: this.determineGameStatus(match),
              score: match.scores,
              result: this.determineGameResult(match),
              lastUpdated: new Date()
            });
            savedCount++;
          }
        }
      } catch (error) {
        console.error(`[fetchAndSaveResultsForMissingOddsGames] Error fetching results for ${league}:`, error.message);
        continue;
      }
    }
    return savedCount;
  }

  // 4. collectMissingGameResults 함수는 OddsCache 기준으로 동작하도록 전면 리팩토링
  async collectMissingGameResults() {
    console.log('Starting collection of missing game results (OddsCache 기준)...');
    const savedCount = await this.fetchAndSaveResultsForMissingOddsGames();
    console.log(`Game results collection completed: ${savedCount} collected`);
    return { savedCount };
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
      console.log(`\n[결과수집] 경기: ${desc}`);
      console.log(`[결과수집] 추정된 카테고리: ${sportCategory}`);
      // 모든 리그를 the-odds-api.com(v2)로 fetch
      const sportKey = this.getSportKeyForCategory(sportCategory);
      if (!sportKey) {
        console.log(`Could not determine sport key for game: ${desc}`);
        return false;
      }
      // API에서 경기 결과 조회 (The Odds API)
      const apiUrl = `${this.baseUrl}/${sportKey}/scores`;
      console.log(`[결과수집] API 요청: ${apiUrl}`);
      const resultsResponse = await axios.get(apiUrl, {
        params: {
          apiKey: this.apiKey,
          daysFrom: 30 // 최근 30일간의 데이터
        }
      });
      console.log(`[결과수집] API 응답 데이터 수: ${resultsResponse.data.length}개`);
      // 해당 팀들의 경기 찾기
      const matchingGame = resultsResponse.data.find(gameData => {
        const isMatch = (gameData.home_team === homeTeam && gameData.away_team === awayTeam) ||
                       (gameData.home_team === awayTeam && gameData.away_team === homeTeam);
        if (isMatch) {
          console.log(`[결과수집] 매칭된 경기 발견: ${gameData.home_team} vs ${gameData.away_team}`);
        }
        return isMatch;
      });
      if (matchingGame) {
        // 경기 결과 저장
        const mainCategory = this.determineMainCategory(sportKey);
        const subCategory = this.determineSubCategory(sportKey);
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
        console.log(`[결과수집] 성공: ${desc} 결과 저장 완료`);
        return true;
      } else {
        console.log(`[결과수집] 실패: API 응답에서 ${desc} 경기를 찾을 수 없음`);
        if (resultsResponse.data.length > 0) {
          console.log(`[결과수집] API 응답 데이터 형식 예시:`, JSON.stringify(resultsResponse.data[0], null, 2));
        }
        return false;
      }
    } catch (error) {
      console.error(`[결과수집] 오류 발생 (${game.desc}):`, error.message);
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

    const chineseSuperLeagueTeams = [
      'Henan FC', 'Shanghai SIPG FC', 'Shenzhen Peng City FC', 
      'Wuhan Three Towns', 'Beijing Guoan', 'Guangzhou FC',
      'Shandong Taishan', 'Changchun Yatai'
    ];

    // KBO 팀 확인
    if (koreanBaseballTeams.includes(homeTeam) || koreanBaseballTeams.includes(awayTeam)) {
      return 'KBO';
    }

    // K리그 팀 확인
    if (koreanSoccerTeams.includes(homeTeam) || koreanSoccerTeams.includes(awayTeam)) {
      return 'K리그';
    }

    // 중국 슈퍼리그 팀 확인
    if (chineseSuperLeagueTeams.includes(homeTeam) || chineseSuperLeagueTeams.includes(awayTeam)) {
      return '중국 슈퍼리그';
    }

    // MLB 팀 확인
    if (mlbTeams.includes(homeTeam) || mlbTeams.includes(awayTeam)) {
      return 'MLB';
    }

    console.log(`Unknown teams: ${homeTeam} vs ${awayTeam}`);
    return 'unknown';
  }

  // 카테고리별 스포츠 키 반환
  getSportKeyForCategory(category) {
    const map = {
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
      'WNBA': 'basketball_wnba',
      'MLB': 'baseball_mlb',
      'KBO': 'baseball_kbo',
      'CFL': 'americanfootball_cfl',
      'NCAAF': 'americanfootball_ncaaf',
      'NFL': 'americanfootball_nfl',
      'NFL 프리시즌': 'americanfootball_nfl_preseason',
      'NHL': 'icehockey_nhl'
    };
    return map[category] || null;
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
                const mainCategory = this.determineMainCategory(sportKey);
                const subCategory = this.determineSubCategory(sportKey);
                
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
    const sportKey = this.getSportKeyForCategory(clientCategory);
    return this.getSportsDbLeagueIdBySportKey(sportKey);
  }

  // TheSportsDB 리그ID 반환 (clientSportKeyMap과 1:1)
  getSportsDbLeagueIdBySportKey(sportKey) {
    return sportsDbLeagueMap[sportKey] || null;
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
              const mainCategory = this.determineMainCategory(sportKey);
              const subCategory = this.determineSubCategory(sportKey);
              
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

  determineMainCategory(sportKey) {
    return getStandardizedCategory(sportKey).main;
  }

  determineSubCategory(sportKey) {
    return getStandardizedCategory(sportKey).sub;
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
            [Op.lt]: thirtyDaysAgo
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
          [Op.count(Op.col('id'))],
          'count'
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

  // GameResult 저장/업데이트 시 정규화 적용 예시 (insert, upsert, update 등 모든 저장 지점에 적용 필요)
  async saveOrUpdateGameResult(data) {
    // data: { mainCategory, subCategory, ... }
    const { mainCategory, subCategory } = normalizeCategoryPair(data.mainCategory, data.subCategory);
    if (!allowedCategories.includes(mainCategory)) {
      console.log(`[GameResultService] 비허용 카테고리(${mainCategory}) 저장 skip:`, data.homeTeam, data.awayTeam, data.commenceTime);
      return null;
    }
    const saveData = { ...data, mainCategory, subCategory };
    return GameResult.upsert(saveData);
  }
}

export default GameResultService; 