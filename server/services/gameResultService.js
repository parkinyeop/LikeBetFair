import axios from 'axios';
import GameResult from '../models/gameResultModel.js';
import sportsConfig from '../config/sportsConfig.js';
import Bet from '../models/betModel.js';
import { Op } from 'sequelize';
import betResultService from './betResultService.js';
import OddsCache from '../models/oddsCacheModel.js';
import { normalizeTeamName, normalizeCategory, normalizeCommenceTime, normalizeCategoryPair } from '../normalizeUtils.js';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

// 클라이언트에서 사용하는 sport key 매핑
const clientSportKeyMap = {
  'K리그': 'soccer_korea_kleague1',
  'J리그': 'soccer_japan_j_league',
  '세리에 A': 'soccer_italy_serie_a',
  '브라질 세리에 A': 'soccer_brazil_campeonato',
  'MLS': 'soccer_usa_mls',
  '아르헨티나 프리메라': 'soccer_argentina_primera_division',
  '중국 슈퍼리그': 'soccer_china_superleague',
  '라리가': 'soccer_spain_primera_division',
  '분데스리가': 'soccer_germany_bundesliga',
  'NBA': 'basketball_nba',
  'KBL': 'basketball_kbl',
  'MLB': 'baseball_mlb',
  'KBO': 'baseball_kbo',
  'NFL': 'americanfootball_nfl'
};

// TheSportsDB 리그ID 매핑 (배당율을 제공하는 실제 스포츠 카테고리)
const sportsDbLeagueMap = {
  // 축구 (Football)
  'soccer_korea_kleague1': '4689',      // K리그
  'soccer_japan_j_league': '4340',      // J리그
  'soccer_italy_serie_a': '4332',       // 세리에 A
  'soccer_brazil_campeonato': '4351',   // 브라질 세리에 A
  'soccer_usa_mls': '4346',             // MLS
  'soccer_argentina_primera_division': '4406', // 아르헨티나 프리메라
  'soccer_china_superleague': '4359',   // 중국 슈퍼리그
  'soccer_spain_primera_division': '4335', // 라리가
  'soccer_germany_bundesliga': '4331',  // 분데스리가
  // 농구 (Basketball)
  'basketball_nba': '4387',             // NBA - 수정 필요
  'basketball_kbl': '5124',             // KBL
  // 야구 (Baseball)
  'baseball_mlb': '4424',               // MLB
  'baseball_kbo': '4830',               // KBO
  // 미식축구 (American Football)
  'americanfootball_nfl': '4391'        // NFL
};

const API_KEY = process.env.THESPORTSDB_API_KEY || '123';

// 표준화된 카테고리 매핑
const standardizedCategoryMap = {
  // 축구
  'soccer_korea_kleague1': { main: 'soccer', sub: 'K리그' },
  'soccer_japan_j_league': { main: 'soccer', sub: 'J리그' },
  'soccer_italy_serie_a': { main: 'soccer', sub: '세리에A' },
  'soccer_brazil_campeonato': { main: 'soccer', sub: '브라질리라오' },
  'soccer_usa_mls': { main: 'soccer', sub: 'MLS' },
  'soccer_argentina_primera_division': { main: 'soccer', sub: '아르헨티나프리메라' },
  'soccer_china_superleague': { main: 'soccer', sub: 'CSL' },
  'soccer_spain_primera_division': { main: 'soccer', sub: '라리가' },
  'soccer_germany_bundesliga': { main: 'soccer', sub: '분데스리가' },
  
  // 농구
  'basketball_nba': { main: 'basketball', sub: 'NBA' },
  'basketball_kbl': { main: 'basketball', sub: 'KBL' },
  
  // 야구
  'baseball_mlb': { main: 'baseball', sub: 'MLB' },
  'baseball_kbo': { main: 'baseball', sub: 'KBO' },
  
  // 미식축구
  'americanfootball_nfl': { main: 'american_football', sub: 'NFL' }
};

// 배당률 제공 카테고리만 허용
const allowedCategories = ['baseball', 'soccer', 'basketball', 'american_football']; // 필요시 확장

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
    // The Odds API는 배당률 전용으로만 사용
    this.oddsApiKey = process.env.ODDS_API_KEY || process.env.THE_ODDS_API_KEY || '123';
    this.oddsBaseUrl = 'https://api.the-odds-api.com/v4/sports';
    
    // TheSportsDB API는 게임 결과 전용
    const rawApiKey = process.env.THESPORTSDB_API_KEY || '3';
    let cleanApiKey = rawApiKey.replace(/THESPORTSDB_API_KEY=/g, '');
    if (cleanApiKey.length > 6) {
      cleanApiKey = cleanApiKey.substring(0, 6);
    }
    this.sportsDbApiKey = cleanApiKey;
    this.sportsDbBaseUrl = 'https://www.thesportsdb.com/api/v1/json';
  }

  /**
   * 게임 결과는 TheSportsDB API만 사용 (The Odds API 사용 금지)
   */
  async fetchResultsWithSportsDB(sportKey, daysFrom = 7) {
    try {
      console.log(`[GameResult] TheSportsDB API 사용: ${sportKey}`);
      const leagueId = this.getSportsDbLeagueIdBySportKey(sportKey);
      if (!leagueId) {
        throw new Error(`No TheSportsDB league ID for ${sportKey}`);
      }

      // MLS, MLB 등 북미 리그는 eventsseason.php 사용, 유럽 리그는 eventsround.php 사용
      const isNorthAmericanLeague = this.isNorthAmericanLeague(sportKey);
      let response;
      
      if (isNorthAmericanLeague) {
        // 북미 리그: 시즌 기반 (MLS, MLB, NBA, NFL 등)
        const currentYear = new Date().getFullYear();
        response = await axios.get(`${this.sportsDbBaseUrl}/${this.sportsDbApiKey}/eventsseason.php`, {
          params: {
            id: leagueId,
            s: currentYear.toString() // 2025
          },
          timeout: 15000
        });
        console.log(`[GameResult] 북미 리그 시즌 API 사용: ${sportKey} (${currentYear})`);
      } else {
        // 유럽 리그: 라운드 기반 (EPL, 세리에A, 라리가 등)
        response = await axios.get(`${this.sportsDbBaseUrl}/${this.sportsDbApiKey}/eventsround.php`, {
          params: {
            id: leagueId,
            r: 'current'
          },
          timeout: 15000
        });
        console.log(`[GameResult] 유럽 리그 라운드 API 사용: ${sportKey}`);
      }

      const events = response.data?.events || [];
      console.log(`[GameResult] TheSportsDB API 성공: ${events.length}개 경기`);
      
      // 날짜 필터링: 과거 daysFrom일간의 경기만 수집 (최적화)
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - daysFrom * 24 * 60 * 60 * 1000);
      
      const filteredEvents = events.filter(event => {
        if (!event.dateEvent || !event.strTime) {
          return false; // 날짜/시간 정보가 없으면 제외
        }
        
        // 날짜 비교 최적화: 문자열 비교로 빠른 필터링
        const eventDateStr = event.dateEvent;
        const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);
        const nowDateStr = now.toISOString().slice(0, 10);
        
        // 날짜가 범위 밖이면 빠르게 제외
        if (eventDateStr < cutoffDateStr || eventDateStr > nowDateStr) {
          return false;
        }
        
        // 시간까지 정확히 비교가 필요한 경우만 Date 객체 생성
        const eventDateTime = new Date(eventDateStr + ' ' + event.strTime);
        return eventDateTime >= cutoffDate && eventDateTime <= now;
      });
      
      console.log(`[GameResult] 날짜 필터링 결과: ${events.length}개 → ${filteredEvents.length}개 (과거 ${daysFrom}일간)`);
      
      // TheSportsDB 형식을 표준 형식으로 변환
      const convertedData = filteredEvents.map(event => ({
        id: event.idEvent,
        home_team: event.strHomeTeam,
        away_team: event.strAwayTeam,
        commence_time: event.dateEvent ? `${event.dateEvent}T${event.strTime || '00:00:00'}` : null,
        completed: event.strStatus === 'Match Finished',
        scores: event.intHomeScore !== null && event.intAwayScore !== null ? [
          { name: event.strHomeTeam, score: event.intHomeScore?.toString() || '0' },
          { name: event.strAwayTeam, score: event.intAwayScore?.toString() || '0' }
        ] : null
      })).filter(game => game.commence_time);

      return { source: 'thesportsdb', data: convertedData };

    } catch (error) {
      console.error(`[GameResult] TheSportsDB API 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 북미 리그 여부 판단
   */
  isNorthAmericanLeague(sportKey) {
    const northAmericanLeagues = [
      'soccer_usa_mls',           // MLS
      'baseball_mlb',             // MLB
      'basketball_nba',           // NBA
      'basketball_wnba',          // WNBA
      'americanfootball_nfl',     // NFL
      'americanfootball_ncaaf',   // NCAAF
      'icehockey_nhl',            // NHL
      'baseball_kbo'              // KBO (한국도 단일 연도 시즌)
    ];
    return northAmericanLeagues.includes(sportKey);
  }

  /**
   * The Odds API 실패 시 TheSportsDB API를 대체 소스로 사용
   */
  async fetchResultsWithFallback(sportKey, daysFrom = 7) {
    try {
      // 1차: TheSportsDB API 시도 (무료이고 게임 결과 전용)
      console.log(`[Fallback] 1차 시도: TheSportsDB API (${sportKey})`);
      const leagueId = this.getSportsDbLeagueIdBySportKey(sportKey);
      if (!leagueId) {
        throw new Error(`No TheSportsDB league ID for ${sportKey}`);
      }

      // MLS, MLB 등 북미 리그는 eventsseason.php 사용, 유럽 리그는 eventsround.php 사용
      const isNorthAmericanLeague = this.isNorthAmericanLeague(sportKey);
      let response;
      
      if (isNorthAmericanLeague) {
        // 북미 리그: 시즌 기반 (MLS, MLB, NBA, NFL 등)
        const currentYear = new Date().getFullYear();
        response = await axios.get(`${this.sportsDbBaseUrl}/${this.sportsDbApiKey}/eventsseason.php`, {
          params: {
            id: leagueId,
            s: currentYear.toString() // 2025
          },
          timeout: 15000
        });
        console.log(`[Fallback] 북미 리그 시즌 API 사용: ${sportKey} (${currentYear})`);
      } else {
        // 유럽 리그: 라운드 기반 (EPL, 세리에A, 라리가 등)
        response = await axios.get(`${this.sportsDbBaseUrl}/${this.sportsDbApiKey}/eventsround.php`, {
          params: {
            id: leagueId,
            r: 'current' // 현재 라운드
          },
          timeout: 15000 // 15초 타임아웃
        });
        console.log(`[Fallback] 유럽 리그 라운드 API 사용: ${sportKey}`);
      }

      const events = response.data?.events || [];
      console.log(`[Fallback] TheSportsDB API 성공: ${events.length}개 경기`);
      
      // 날짜 필터링: 과거 daysFrom일간의 경기만 수집 (최적화)
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - daysFrom * 24 * 60 * 60 * 1000);
      
      const filteredEvents = events.filter(event => {
        if (!event.dateEvent || !event.strTime) {
          return false; // 날짜/시간 정보가 없으면 제외
        }
        
        // 날짜 비교 최적화: 문자열 비교로 빠른 필터링
        const eventDateStr = event.dateEvent;
        const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);
        const nowDateStr = now.toISOString().slice(0, 10);
        
        // 날짜가 범위 밖이면 빠르게 제외
        if (eventDateStr < cutoffDateStr || eventDateStr > nowDateStr) {
          return false;
        }
        
        // 시간까지 정확히 비교가 필요한 경우만 Date 객체 생성
        const eventDateTime = new Date(eventDateStr + ' ' + event.strTime);
        return eventDateTime >= cutoffDate && eventDateTime <= now;
      });
      
      console.log(`[Fallback] 날짜 필터링 결과: ${events.length}개 → ${filteredEvents.length}개 (과거 ${daysFrom}일간)`);
      
      // TheSportsDB 형식을 The Odds API 형식으로 변환
      const convertedData = filteredEvents.map(event => ({
        id: event.idEvent,
        home_team: event.strHomeTeam,
        away_team: event.strAwayTeam,
        commence_time: event.dateEvent ? `${event.dateEvent}T${event.strTime || '00:00:00'}` : null,
        completed: event.strStatus === 'Match Finished',
        scores: event.intHomeScore !== null && event.intAwayScore !== null ? [
          { name: event.strHomeTeam, score: event.intHomeScore?.toString() || '0' },
          { name: event.strAwayTeam, score: event.intAwayScore?.toString() || '0' }
        ] : null
      })).filter(game => game.commence_time); // 시간 정보 있는 것만

      return { source: 'thesportsdb', data: convertedData };

    } catch (error) {
      console.error(`[Fallback] TheSportsDB API 실패: ${error.message}`);
    }

    try {
      // 2차: The Odds API 시도 (유료이지만 배당률 API, 게임 결과는 제한적)
      if (this.oddsApiKey && this.oddsApiKey !== '123') {
        console.log(`[Fallback] 2차 시도: The Odds API (${sportKey})`);
        const response = await axios.get(`${this.oddsBaseUrl}/${sportKey}/scores`, {
          params: {
            apiKey: this.oddsApiKey,
            daysFrom: daysFrom
          },
          timeout: 10000 // 10초 타임아웃
        });
        console.log(`[Fallback] The Odds API 성공: ${response.data.length}개 경기`);
        return { source: 'the-odds-api', data: response.data };
      }
    } catch (error) {
      console.log(`[Fallback] The Odds API 실패: ${error.message}`);
    }

    // 3차: 로컬 스케줄 기반 추정 (최후의 수단)
    console.log(`[Fallback] 3차 시도: 로컬 스케줄 기반 추정`);
    return this.generateEstimatedResults(sportKey);
  }

  /**
   * 경기 스케줄 기반으로 추정 결과 생성 (최후의 수단)
   */
  async generateEstimatedResults(sportKey) {
    try {
      // OddsCache에서 해당 sportKey의 과거 경기들 조회
      const pastGames = await OddsCache.findAll({
        where: {
          sportKey: sportKey,
          commenceTime: {
            [Op.between]: [
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7일 전
              new Date() // 현재
            ]
          }
        },
        attributes: ['homeTeam', 'awayTeam', 'commenceTime'],
        group: ['homeTeam', 'awayTeam', 'commenceTime']
      });

      console.log(`[Fallback] 로컬 스케줄에서 ${pastGames.length}개 경기 발견`);

      // 경기 시간이 2시간 이상 지난 경기들을 완료로 추정
      const estimatedResults = pastGames
        .filter(game => {
          const gameTime = new Date(game.commenceTime);
          const hoursElapsed = (Date.now() - gameTime.getTime()) / (1000 * 60 * 60);
          return hoursElapsed >= 2; // 2시간 이상 경과
        })
        .map(game => ({
          id: `estimated_${game.homeTeam}_${game.awayTeam}`,
          home_team: game.homeTeam,
          away_team: game.awayTeam,
          commence_time: game.commenceTime,
          completed: true,
          scores: null, // 점수는 추정 불가
          estimated: true // 추정 데이터 표시
        }));

      console.log(`[Fallback] ${estimatedResults.length}개 경기를 완료 상태로 추정`);
      return { source: 'estimated', data: estimatedResults };

    } catch (error) {
      console.error(`[Fallback] 로컬 추정도 실패: ${error.message}`);
      return { source: 'none', data: [] };
    }
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
      // 모든 리그를 TheSportsDB API로 fetch (The Odds API 사용 금지)
      const sportKey = this.getSportKeyForCategory(league);
      if (!sportKey) continue;
      
      try {
        const resultsResponse = await this.fetchResultsWithSportsDB(sportKey, 30);
        const events = resultsResponse.data || [];
        console.log(`Found ${events.length} events for ${league} from TheSportsDB API`);

        for (const event of events) {
          if (this.validateGameData(event)) {
            const mainCategory = this.determineMainCategory(sportKey);
            const subCategory = this.determineSubCategory(sportKey);
            
            await GameResult.upsert({
              mainCategory,
              subCategory,
              homeTeam: event.home_team,
              awayTeam: event.away_team,
              commenceTime: new Date(event.commence_time),
              status: this.determineGameStatus(event),
              score: event.scores,
              result: this.determineGameResult(event),
              lastUpdated: new Date()
            });
            savedCount++;
          }
        }
      } catch (error) {
        console.error(`Error fetching results for ${league}:`, error.message);
        continue;
      }
    }
    console.log(`Saved ${savedCount} game results from TheSportsDB API`);
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
      
      // TheSportsDB API 사용 (The Odds API 사용 금지)
      const sportKey = this.getSportKeyForCategory(sportCategory);
      if (!sportKey) {
        console.log(`Could not determine sport key for game: ${desc}`);
        return false;
      }
      
      console.log(`[결과수집] TheSportsDB API 요청: ${sportKey}`);
      const resultsResponse = await this.fetchResultsWithSportsDB(sportKey, 30);
      console.log(`[결과수집] TheSportsDB API 응답 데이터 수: ${resultsResponse.data.length}개`);
      
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
        const commenceTime = new Date(matchingGame.commence_time);
        if (commenceTime > new Date()) {
          // 미래 경기는 저장하지 않음
          return false;
        }
        // 경기 결과 저장
        const mainCategory = this.determineMainCategory(sportKey);
        const subCategory = this.determineSubCategory(sportKey);
        await GameResult.upsert({
          mainCategory,
          subCategory,
          homeTeam: matchingGame.home_team,
          awayTeam: matchingGame.away_team,
          commenceTime,
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
      console.log('Starting game results update for active categories...');
      let totalUpdated = 0;
      let newCount = 0;
      let updatedExistingCount = 0;
      let skippedCount = 0;
      const processedCategories = [];

      for (const clientCategory of activeCategories) {
        const sportKey = this.getSportKeyForCategory(clientCategory);
        if (!sportKey) {
          console.log(`No sport key found for ${clientCategory}`);
          continue;
        }

        console.log(`Fetching results for ${clientCategory} (${sportKey})...`);
        processedCategories.push(clientCategory);
        
        try {
          // TheSportsDB API 사용 (The Odds API 사용 금지)
          const resultsResponse = await this.fetchResultsWithSportsDB(sportKey, 7);
          
          if (resultsResponse.data && Array.isArray(resultsResponse.data)) {
            console.log(`Found ${resultsResponse.data.length} events for ${clientCategory}`);
            
            for (const event of resultsResponse.data) {
              if (this.validateGameData(event)) {
                const mainCategory = this.determineMainCategory(sportKey);
                const subCategory = this.determineSubCategory(sportKey);
                
                // 기존 데이터 확인
                const existingGame = await GameResult.findOne({
                  where: {
                    eventId: event.id,
                    mainCategory,
                    subCategory
                  }
                });
                
                // 스코어 형식 검증 및 수정
                let validatedScore = event.scores;
                if (event.scores && Array.isArray(event.scores)) {
                  // 올바른 형식인지 확인: [{"name":"팀명","score":"점수"}]
                  const isValidFormat = event.scores.every(score => 
                    typeof score === 'object' && 
                    score.name && 
                    score.score !== undefined
                  );
                  
                  if (!isValidFormat) {
                    console.log(`[Score Validation] Invalid score format detected for ${event.home_team} vs ${event.away_team}:`, event.scores);
                    // 잘못된 형식이면 null로 설정
                    validatedScore = null;
                  }
                }

                const gameData = {
                  mainCategory,
                  subCategory,
                  homeTeam: event.home_team,
                  awayTeam: event.away_team,
                  commenceTime: new Date(event.commence_time),
                  status: this.determineGameStatus(event),
                  score: validatedScore,
                  result: this.determineGameResult(event),
                  eventId: event.id,
                  lastUpdated: new Date()
                };

                if (existingGame) {
                  // 기존 데이터 업데이트
                  const [updatedCount] = await GameResult.update(gameData, {
                    where: { id: existingGame.id }
                  });
                  
                  if (updatedCount > 0) {
                    totalUpdated++;
                    updatedExistingCount++;
                    console.log(`Updated existing game: ${event.strHomeTeam} vs ${event.strAwayTeam}`);
                  }
                } else {
                  // 새 데이터 생성
                  await GameResult.create(gameData);
                  newCount++;
                  totalUpdated++;
                  console.log(`Created new game: ${event.strHomeTeam} vs ${event.strAwayTeam}`);
                }
              } else {
                skippedCount++;
              }
            }
            
            console.log(`${clientCategory} update summary: ${newCount} new, ${totalUpdated} updated, ${skippedCount} skipped`);
            
          } else if (resultsResponse.data && resultsResponse.data.events === null) {
            console.log(`${clientCategory}: 시즌 오프 상태 - 다가오는 이벤트 없음`);
          } else {
            console.log(`${clientCategory}: 예상치 못한 응답 형식`);
          }
        } catch (error) {
          console.error(`Error fetching results for ${clientCategory}:`, error.message);
          // 개별 스포츠 에러가 전체 프로세스를 중단시키지 않도록 계속 진행
          continue;
        }
      }

      // 기존 데이터 정리 (30일 이상 된 데이터 삭제)
      await this.cleanupOldData();
      
      console.log(`Game results update completed for active categories. Total: ${newCount} new, ${totalUpdated} updated, ${skippedCount} skipped`);
      
      return {
        updatedCount: totalUpdated,
        newCount: newCount,
        updatedExistingCount: updatedExistingCount,
        skippedCount: skippedCount,
        categories: processedCategories
      };
      
    } catch (error) {
      console.error('Error fetching and updating results for active categories:', error);
      throw error;
    }
  }

  /**
   * 모든 활성 카테고리에 대해 게임 결과를 가져와서 저장 (스케줄러용)
   */
  async fetchAndSaveAllResults() {
    try {
      console.log('[GameResult] Starting fetchAndSaveAllResults for all active categories...');
      
      // 활성 카테고리 목록 (현재 운영 중인 리그들)
      const activeCategories = [
        'KBO', 'MLB', 'NBA', 'KBL', 'NFL', 'MLS', 'CSL',
        'EPL', 'LaLiga', 'Bundesliga', 'SerieA', 'Ligue1',
        'JLeague', 'ArgentinaPrimera', 'Brasileirao'
      ];
      
      const result = await this.fetchAndUpdateResultsForCategories(activeCategories);
      
      console.log(`[GameResult] fetchAndSaveAllResults completed: ${result.newCount} new, ${result.updatedCount} updated, ${result.skippedCount} skipped`);
      
      return result;
      
    } catch (error) {
      console.error('[GameResult] Error in fetchAndSaveAllResults:', error);
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
          // TheSportsDB API 사용 (The Odds API 사용 금지)
          const resultsResponse = await this.fetchResultsWithSportsDB(sportKey, 7);

          console.log(`Found ${resultsResponse.data.length} games for ${clientCategory}`);

          // 데이터 검증 및 저장
          for (const game of resultsResponse.data) {
            if (this.validateGameData(game)) {
              const mainCategory = this.determineMainCategory(sportKey);
              const subCategory = this.determineSubCategory(sportKey);
              
              // 스코어 형식 검증 및 수정
              let validatedScore = game.scores;
              if (game.scores && Array.isArray(game.scores)) {
                // 올바른 형식인지 확인: [{"name":"팀명","score":"점수"}]
                const isValidFormat = game.scores.every(score => 
                  typeof score === 'object' && 
                  score.name && 
                  score.score !== undefined
                );
                
                if (!isValidFormat) {
                  console.log(`[Score Validation] Invalid score format detected for ${game.home_team} vs ${game.away_team}:`, game.scores);
                  // 잘못된 형식이면 null로 설정
                  validatedScore = null;
                }
              }

              await GameResult.upsert({
                mainCategory,
                subCategory,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                commenceTime: new Date(game.commence_time),
                status: this.determineGameStatus(game),
                score: validatedScore,
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
    // 문자열이나 배열이 아닌 객체인지 먼저 확인
    if (typeof game !== 'object' || game === null || Array.isArray(game)) {
      return false;
    }
    
    // 변환된 데이터 형식에 맞게 필수 필드 검증
    if (!game.home_team || !game.away_team || !game.commence_time) {
      console.log(`Invalid game data: missing required fields for ${game.home_team || 'unknown'} vs ${game.away_team || 'unknown'}`);
      return false;
    }

    // 팀명이 같은 경기 제외 (비현실적)
    if (game.home_team === game.away_team) {
      console.log(`Invalid game: same team playing against itself`, game);
      return false;
    }

    // 경기 시간이 미래로 너무 먼 경우 제외 (1년 이상)
    const gameTime = new Date(game.commence_time);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    if (gameTime > oneYearFromNow) {
      console.log(`Invalid game: too far in future`, game);
      return false;
    }

    return true;
  }

  determineGameStatus(game) {
    // 변환된 데이터 형식에 맞게 상태 결정
    if (game.completed === true) {
      return 'finished';
    }
    
    // 경기 시간이 지났지만 완료되지 않은 경우
    const gameTime = new Date(game.commence_time);
    const now = new Date();
    if (gameTime < now) {
      return 'finished'; // 시간이 지났으면 완료로 간주
    }
    
    return 'scheduled';
  }

  determineGameResult(game) {
    // 스코어가 없는 경우
    if (!game.scores || !Array.isArray(game.scores) || game.scores.length !== 2) {
      // 경기 시간이 지났지만 스코어가 없으면 pending
      const gameTime = new Date(game.commence_time);
      const now = new Date();
      if (gameTime < now) {
        return 'pending';
      }
      return 'pending';
    }
    
    // 경기가 완료된 경우 결과 계산
    if (game.completed === true) {
      const homeScoreData = game.scores.find(score => score.name === game.home_team);
      const awayScoreData = game.scores.find(score => score.name === game.away_team);
      
      if (!homeScoreData || !awayScoreData) {
        return 'pending';
      }
      
      const homeScore = parseInt(homeScoreData.score);
      const awayScore = parseInt(awayScoreData.score);
      
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
      const sportKey = this.getSportKeyForCategory(clientCategory);
      if (!sportKey) {
        throw new Error(`Unknown category: ${clientCategory}`);
      }

      // TheSportsDB API 사용 (The Odds API 사용 금지)
      const resultsResponse = await this.fetchResultsWithSportsDB(sportKey, days);

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

export default new GameResultService(); 