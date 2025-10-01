import axios from 'axios';
import GameResult from '../models/gameResultModel.js';
import sportsConfig from '../config/sportsConfig.js';
import Bet from '../models/betModel.js';
import { Op } from 'sequelize';
import createScriptSequelize from '../config/scriptDatabase.js';

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();
import betResultService from './betResultService.js';
import OddsCache from '../models/oddsCacheModel.js';
import { normalizeTeamName, normalizeCategory, normalizeCommenceTime, normalizeCategoryPair } from '../normalizeUtils.js';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

// 클라이언트에서 사용하는 sport key 매핑 (영문으로 통일)
const clientSportKeyMap = {
  // 영문 카테고리명
  'KLEAGUE': 'soccer_korea_kleague1',
  'JLEAGUE': 'soccer_japan_j_league',
  'SERIEA': 'soccer_italy_serie_a',
  'BRASILEIRAO': 'soccer_brazil_campeonato',
  'MLS': 'soccer_usa_mls',
  'ARGENTINA_PRIMERA': 'soccer_argentina_primera_division',
  'CSL': 'soccer_china_superleague',
  'LALIGA': 'soccer_spain_la_liga',
  'BUNDESLIGA': 'soccer_germany_bundesliga',
  'EPL': 'soccer_england_premier_league',
  'NBA': 'basketball_nba',
  'MLB': 'baseball_mlb',
  'KBO': 'baseball_kbo',
  'NFL': 'americanfootball_nfl',
  
  // 한글 카테고리명
  '프리미어리그': 'soccer_england_premier_league',
  
  // 기타 영문 변형
  'LaLiga': 'soccer_spain_la_liga',
  'SerieA': 'soccer_italy_serie_a',
  'Ligue1': 'soccer_france_ligue_1',
  'JLeague': 'soccer_japan_j_league',
  'ArgentinaPrimera': 'soccer_argentina_primera_division',
  'Brasileirao': 'soccer_brazil_campeonato'  // ✅ 첫 글자만 대문자 추가
};

// TheSportsDB 리그ID 매핑 (sportKey 기준, 반드시 clientSportKeyMap 값과 일치)
const sportsDbLeagueMap = {
  'soccer_korea_kleague1': '4689',      // K리그
  'soccer_japan_j_league': '4340',      // J리그
  'soccer_italy_serie_a': '4332',       // 세리에 A
  'soccer_brazil_campeonato': '4351',   // 브라질 세리에 A
  'soccer_usa_mls': '4346',             // MLS
  'soccer_argentina_primera_division': '4406', // 아르헨티나 프리메라
  'soccer_china_superleague': '4359',   // 중국 슈퍼리그
  'soccer_spain_la_liga': '4335',       // 라리가
  'soccer_germany_bundesliga': '4331',  // 분데스리가
  'soccer_england_premier_league': '4328', // 프리미어리그
  // 농구
  'basketball_nba': '4387',             // NBA
  'basketball_kbl': '5124',             // KBL
  // 야구
  'baseball_mlb': '4424',               // MLB
  'baseball_kbo': '4830',               // KBO (정확한 ID)
  // 미식축구
  'americanfootball_nfl': '4391'        // NFL
};

const API_KEY = process.env.THESPORTSDB_API_KEY || '116108';

// 표준화된 카테고리 매핑 (영문으로 통일)
const standardizedCategoryMap = {
  // 축구
  'soccer_korea_kleague1': { main: 'soccer', sub: 'KLEAGUE' },
  'soccer_japan_j_league': { main: 'soccer', sub: 'JLEAGUE' },
  'soccer_italy_serie_a': { main: 'soccer', sub: 'SERIEA' },
  'soccer_brazil_campeonato': { main: 'soccer', sub: 'BRASILEIRAO' },
  'soccer_usa_mls': { main: 'soccer', sub: 'MLS' },
  'soccer_argentina_primera_division': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'soccer_china_superleague': { main: 'soccer', sub: 'CSL' },
  'soccer_spain_primera_division': { main: 'soccer', sub: 'LALIGA' },
  'soccer_germany_bundesliga': { main: 'soccer', sub: 'BUNDESLIGA' },
  'soccer_england_premier_league': { main: 'soccer', sub: 'EPL' },
  
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
    this.oddsApiKey = process.env.ODDS_API_KEY || process.env.THE_ODDS_API_KEY || 'b1a67915235b9dd963dcb5be603853ea';
    this.oddsBaseUrl = 'https://api.the-odds-api.com/v4/sports';
    
    // TheSportsDB API는 게임 결과 전용
    const rawApiKey = process.env.THESPORTSDB_API_KEY || '3';
    // API 키 정리: 환경 변수에서 불필요한 문자 제거
    let cleanApiKey = rawApiKey.replace(/THESPORTSDB_API_KEY=/g, '').trim();
    // API 키가 너무 길면 잘라내기 (TheSportsDB는 보통 6자리)
    if (cleanApiKey.length > 20) {
      cleanApiKey = cleanApiKey.substring(0, 20);
    }
    // API 키가 숫자가 아니면 기본값 사용
    if (!/^\d+$/.test(cleanApiKey)) {
      cleanApiKey = '3';
    }
    // API 키가 비어있으면 기본값 사용
    if (!cleanApiKey || cleanApiKey === '') {
      cleanApiKey = '3';
    }
    this.sportsDbApiKey = cleanApiKey;
    this.sportsDbBaseUrl = 'https://www.thesportsdb.com/api/v1/json';
    
    console.log(`[GameResult] TheSportsDB API 키 설정: ${this.sportsDbApiKey} (원본: ${rawApiKey})`);
    
    // API 키 유효성 테스트
    this.testApiKey();
  }

  /**
   * API 키 유효성 테스트
   */
  async testApiKey() {
    try {
      console.log(`[GameResult] API 키 테스트 중...`);
      const response = await axios.get(`${this.sportsDbBaseUrl}/${this.sportsDbApiKey}/search_all_leagues.php`, {
        timeout: 10000
      });
      
      if (response.data && response.data.countries) {
        console.log(`✅ TheSportsDB API 키 유효: ${response.data.countries.length}개 국가/리그 접근 가능`);
      } else {
        console.warn(`⚠️ TheSportsDB API 응답 형식 이상:`, response.data);
      }
    } catch (error) {
      console.error(`❌ TheSportsDB API 키 테스트 실패:`, error.message);
      if (error.response?.status === 404) {
        console.error(`❌ API 키가 잘못되었거나 만료됨: ${this.sportsDbApiKey}`);
      }
    }
  }

  /**
   * TheSportsDB API를 사용하여 경기 결과 데이터 가져오기
   * @param {string} sportKey - 스포츠 키
   * @param {number} daysFrom - 과거 몇 일간의 데이터를 가져올지 (기본값: 15)
   * @param {boolean} includeFuture - 미래 1일 데이터 포함 여부 (기본값: true)
   */
  async fetchResultsWithSportsDB(sportKey, daysFrom = 15, includeFuture = true) {
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
        // 유럽 리그: 최근 + 예정 경기 조합으로 시간 범위 내 데이터 수집
        const [lastResponse, nextResponse] = await Promise.all([
          axios.get(`${this.sportsDbBaseUrl}/${this.sportsDbApiKey}/eventslast.php`, {
            params: { id: leagueId },
            timeout: 15000
          }),
          axios.get(`${this.sportsDbBaseUrl}/${this.sportsDbApiKey}/eventsnext.php`, {
            params: { id: leagueId },
            timeout: 15000
          })
        ]);
        
        const lastEvents = lastResponse.data?.events || [];
        const nextEvents = nextResponse.data?.events || [];
        const allEvents = [...lastEvents, ...nextEvents];
        
        response = { data: { events: allEvents } };
        console.log(`[GameResult] 유럽 리그 최근+예정 API 사용: ${sportKey} (${lastEvents.length}+${nextEvents.length}개)`);
      }

      const events = response.data?.events || [];
      console.log(`[GameResult] TheSportsDB API 성공: ${events.length}개 경기`);
      
      // 🆕 시간 범위 수정: 과거 15일 + 미래 1일 (누락 데이터 복구용 임시 확장)
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - daysFrom * 24 * 60 * 60 * 1000);
      const futureDate = includeFuture ? new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) : now;
      
      console.log(`[GameResult] 시간 범위 설정: ${cutoffDate.toISOString()} ~ ${futureDate.toISOString()}`);
      
      const filteredEvents = events.filter(event => {
        if (!event.dateEvent || !event.strTime) {
          return false; // 날짜/시간 정보가 없으면 제외
        }
        
        // 날짜 비교 최적화: 문자열 비교로 빠른 필터링
        const eventDateStr = event.dateEvent;
        const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);
        const futureDateStr = futureDate.toISOString().slice(0, 10);
        
        // 🆕 날짜가 범위 밖이면 빠르게 제외 (과거 15일 + 미래 1일)
        if (eventDateStr < cutoffDateStr || eventDateStr > futureDateStr) {
          return false;
        }
        
        // 시간까지 정확히 비교가 필요한 경우만 Date 객체 생성
        const eventDateTime = new Date(`${eventDateStr}T${event.strTime}Z`);
        const isInRange = eventDateTime >= cutoffDate && eventDateTime <= futureDate;
        
        // 🆕 디버깅 로그 추가
        if (eventDateTime > now) {
          console.log(`[GameResult] 미래 경기 포함: ${event.strHomeTeam} vs ${event.strAwayTeam} (${eventDateTime.toISOString()})`);
        }
        
        return isInRange;
      });
      
      // 🆕 로그 메시지 수정: 과거 3일 + 미래 1일 표시
      const pastCount = filteredEvents.filter(event => {
        const eventDateTime = new Date(event.dateEvent + ' ' + event.strTime);
        return eventDateTime <= now;
      }).length;
      const futureCount = filteredEvents.filter(event => {
        const eventDateTime = new Date(event.dateEvent + ' ' + event.strTime);
        return eventDateTime > now;
      }).length;
      
      console.log(`[GameResult] 날짜 필터링 결과: ${events.length}개 → ${filteredEvents.length}개 (과거 ${pastCount}개 + 미래 ${futureCount}개)`);
      
      // TheSportsDB 형식을 표준 형식으로 변환 (UTC 시간 사용)
      const convertedData = filteredEvents.map(event => {
        // strTimestamp가 UTC 시간이므로 이를 사용
        let commenceTime = null;
        if (event.strTimestamp) {
          commenceTime = event.strTimestamp;
        } else if (event.dateEvent && event.strTime) {
          // strTimestamp가 없는 경우 fallback으로 dateEvent + strTime 사용
          commenceTime = `${event.dateEvent}T${event.strTime}`;
        }
        
        return {
          id: event.idEvent,
          home_team: event.strHomeTeam,
          away_team: event.strAwayTeam,
          commence_time: commenceTime,
          completed: ['FT', 'Match Finished', 'AET', 'PEN', 'HT'].includes(event.strStatus),
          scores: event.intHomeScore !== null && event.intAwayScore !== null ? [
            { name: event.strHomeTeam, score: event.intHomeScore?.toString() || '0' },
            { name: event.strAwayTeam, score: event.intAwayScore?.toString() || '0' }
          ] : null
        };
      }).filter(game => game.commence_time);

      return { source: 'thesportsdb', data: convertedData };

    } catch (error) {
      console.error(`[GameResult] TheSportsDB API 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 시즌 기반 리그 여부 판단 (eventsseason.php 사용)
   * 북미 리그 + 남미 리그 포함
   */
  isNorthAmericanLeague(sportKey) {
    const seasonBasedLeagues = [
      'soccer_usa_mls',           // MLS
      'baseball_mlb',             // MLB
      'basketball_nba',           // NBA
      'basketball_wnba',          // WNBA
      'americanfootball_nfl',     // NFL
      'americanfootball_ncaaf',   // NCAAF
      'icehockey_nhl',            // NHL
      'baseball_kbo',             // KBO (한국도 단일 연도 시즌)
      'soccer_brazil_campeonato', // ✅ 브라질 세리에 A (시즌 기반)
      'soccer_argentina_primera_division' // ✅ 아르헨티나 프리메라 (시즌 기반)
    ];
    return seasonBasedLeagues.includes(sportKey);
  }

  /**
   * The Odds API 사용 금지 - TheSportsDB API만 사용
   * 경기 결과는 절대로 The Odds API에서 받지 않음
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
        // 유럽 리그: 최근 + 예정 경기 조합으로 시간 범위 내 데이터 수집
        const [lastResponse, nextResponse] = await Promise.all([
          axios.get(`${this.sportsDbBaseUrl}/${this.sportsDbApiKey}/eventslast.php`, {
            params: { id: leagueId },
            timeout: 15000
          }),
          axios.get(`${this.sportsDbBaseUrl}/${this.sportsDbApiKey}/eventsnext.php`, {
            params: { id: leagueId },
            timeout: 15000
          })
        ]);
        
        const lastEvents = lastResponse.data?.events || [];
        const nextEvents = nextResponse.data?.events || [];
        const allEvents = [...lastEvents, ...nextEvents];
        
        response = { data: { events: allEvents } };
        console.log(`[Fallback] 유럽 리그 최근+예정 API 사용: ${sportKey} (${lastEvents.length}+${nextEvents.length}개)`);
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
        const eventDateTime = new Date(`${eventDateStr}T${event.strTime}Z`);
        return eventDateTime >= cutoffDate && eventDateTime <= now;
      });
      
      console.log(`[Fallback] 날짜 필터링 결과: ${events.length}개 → ${filteredEvents.length}개 (과거 ${daysFrom}일간)`);
      
      // TheSportsDB 형식을 표준 형식으로 변환 (UTC 시간 사용)
      const convertedData = filteredEvents.map(event => {
        // strTimestamp가 UTC 시간이므로 이를 사용
        let commenceTime = null;
        if (event.strTimestamp) {
          commenceTime = event.strTimestamp;
        } else if (event.dateEvent && event.strTime) {
          // strTimestamp가 없는 경우 fallback으로 dateEvent + strTime 사용
          commenceTime = `${event.dateEvent}T${event.strTime}`;
        }
        
        return {
          id: event.idEvent,
          home_team: event.strHomeTeam,
          away_team: event.strAwayTeam,
          commence_time: commenceTime,
          completed: ['FT', 'Match Finished', 'AET', 'PEN', 'HT'].includes(event.strStatus),
          scores: event.intHomeScore !== null && event.intAwayScore !== null ? [
            { name: event.strHomeTeam, score: event.intHomeScore?.toString() || '0' },
            { name: event.strAwayTeam, score: event.intAwayScore?.toString() || '0' }
          ] : null
        };
      }).filter(game => game.commence_time); // 시간 정보 있는 것만

      return { source: 'thesportsdb', data: convertedData };

    } catch (error) {
      console.error(`[Fallback] TheSportsDB API 실패: ${error.message}`);
    }

    // 🚫 The Odds API 사용 금지 - 경기 결과는 절대로 받지 않음
    console.log(`[Fallback] The Odds API 사용 금지 - 경기 결과는 TheSportsDB API에서만 수집`);
    console.log(`[Fallback] The Odds API는 배당률 전용으로만 사용됨`);

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
      const sportKey = this.getSportKeyFromClientCategory(league);
      if (!sportKey) continue;
      
      try {
        // 🆕 시간 범위 수정: 과거 15일 + 미래 1일 (누락 데이터 복구용 임시 확장)
        const resultsResponse = await this.fetchResultsWithSportsDB(sportKey, 15, true);
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
          commenceTime: new Date(event.commence_time + 'Z'), // UTC 명시
          status: this.determineGameStatus(event),
          score: event.scores,
          result: this.determineGameResult(event),
          lastUpdated: new Date()
        }, {
          where: {
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            commenceTime: new Date(event.commence_time + 'Z') // UTC 명시
          }
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
      // 🆕 시간 범위 수정: 과거 15일 + 미래 1일 (누락 데이터 복구용 임시 확장)
      const resultsResponse = await this.fetchResultsWithSportsDB(sportKey, 15, true);
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
        const commenceTime = new Date(matchingGame.commence_time + 'Z'); // UTC 명시
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
        }, {
          where: {
            homeTeam: matchingGame.home_team,
            awayTeam: matchingGame.away_team,
            commenceTime
          }
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

  // clientCategory(한글) → sportKey(영문) 매핑 함수 보완
  getSportKeyFromClientCategory(clientCategory) {
    if (clientSportKeyMap[clientCategory]) return clientSportKeyMap[clientCategory];
    // 이미 영문 코드면 그대로 반환
    if (typeof clientCategory === 'string' && sportsDbLeagueMap[clientCategory]) return clientCategory;
    console.error(`[getSportKeyFromClientCategory] Unknown or unmapped clientCategory: ${clientCategory}`);
    return undefined;
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
        const sportKey = this.getSportKeyFromClientCategory(clientCategory);
        if (!sportKey) {
          console.log(`No sport key found for ${clientCategory}`);
          continue;
        }

        console.log(`Fetching results for ${clientCategory} (${sportKey})...`);
        processedCategories.push(clientCategory);
        
        try {
          // TheSportsDB API 사용 (The Odds API 사용 금지)
          // 🆕 시간 범위 수정: 과거 15일 + 미래 1일 (누락 데이터 복구용 임시 확장)
          const resultsResponse = await this.fetchResultsWithSportsDB(sportKey, 15, true);
          
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
                  sportKey: sportKey,
                  sportTitle: this.getSportTitleFromSportKey(sportKey),
                  homeTeam: event.home_team,
                  awayTeam: event.away_team,
                  commenceTime: new Date(event.commence_time + 'Z'), // UTC 명시
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
                    console.log(`Updated existing game: ${event.home_team || event.strHomeTeam} vs ${event.away_team || event.strAwayTeam}`);
                  }
                } else {
                  // 새 데이터 생성
                  await GameResult.create(gameData);
                  newCount++;
                  totalUpdated++;
                                      console.log(`Created new game: ${event.home_team || event.strHomeTeam} vs ${event.away_team || event.strAwayTeam}`);
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

  getSportTitleFromSportKey(sportKey) {
    const sportTitleMap = {
      'soccer_korea_kleague1': 'K-League',
      'soccer_japan_j_league': 'J-League',
      'soccer_italy_serie_a': 'Serie A',
      'soccer_brazil_campeonato': 'Brasileirao',
      'soccer_usa_mls': 'MLS',
      'soccer_argentina_primera_division': 'Argentina Primera',
      'soccer_china_superleague': 'Chinese Super League',
      'soccer_spain_primera_division': 'La Liga',
      'soccer_germany_bundesliga': 'Bundesliga',
      'soccer_england_premier_league': 'English Premier League',
      'basketball_nba': 'NBA',
      'basketball_kbl': 'KBL',
      'baseball_mlb': 'MLB',
      'baseball_kbo': 'KBO',
      'americanfootball_nfl': 'NFL'
    };
    return sportTitleMap[sportKey] || sportKey;
  }

  // 전체 카테고리 업데이트 (기존 메서드)
  async fetchAndUpdateResults() {
    try {
      console.log('Starting game results update for all categories...');
      
      // 클라이언트에서 사용하는 모든 카테고리에 대해 개별적으로 API 호출
      for (const [clientCategory, _] of Object.entries(clientSportKeyMap)) {
        const sportKey = this.getSportKeyFromClientCategory(clientCategory);
        if (!sportKey) {
          console.error(`[fetchAndUpdateResults] Unknown sportKey for clientCategory: ${clientCategory}`);
          continue;
        }
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
                sportKey: sportKey,
                sportTitle: this.getSportTitleFromSportKey(sportKey),
                mainCategory,
                subCategory,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                commenceTime: new Date(game.commence_time + 'Z'), // UTC 명시
                status: this.determineGameStatus(game),
                score: validatedScore,
                result: this.determineGameResult(game),
                lastUpdated: new Date()
              }, {
                where: {
                  homeTeam: game.home_team,
                  awayTeam: game.away_team,
                  commenceTime: new Date(game.commence_time + 'Z') // UTC 명시
                }
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
    const gameTime = new Date(game.commence_time + 'Z');
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
    const gameTime = new Date(game.commence_time + 'Z');
    const now = new Date();
    if (gameTime < now) {
      return 'finished'; // 시간이 지났으면 완료로 간주
    }
    
    return 'scheduled';
  }

  determineGameResult(game) {
    // 1. 연기/취소 상태 우선 확인
    if (game.status === 'postponed' || game.status === 'cancelled') {
      return game.status;
    }
    
    // 2. API에서 명시적으로 finished 상태이고 스코어가 있는 경우
    if (game.status === 'finished' && game.score) {
      let scores;
      
      // 스코어 데이터 파싱 (문자열이면 JSON 파싱, 배열이면 그대로 사용)
      if (typeof game.score === 'string') {
        try {
          scores = JSON.parse(game.score);
        } catch (e) {
          console.log(`Game ID ${game.id}: Invalid score JSON format:`, game.score);
          return 'pending';
        }
      } else if (Array.isArray(game.score)) {
        scores = game.score;
      } else {
        console.log(`Game ID ${game.id}: Invalid score format:`, game.score);
        return 'pending';
      }
      
      if (!Array.isArray(scores) || scores.length < 2) {
        console.log(`Game ID ${game.id}: Insufficient score data:`, scores);
        return 'pending';
      }
      
      const homeScoreData = scores.find(score => score.name === game.homeTeam);
      const awayScoreData = scores.find(score => score.name === game.awayTeam);
      
      if (!homeScoreData || !awayScoreData) {
        console.log(`Game ID ${game.id}: Missing team score data. Home: ${game.homeTeam}, Away: ${game.awayTeam}`);
        console.log(`Available scores:`, scores.map(s => s.name));
        return 'pending';
      }
      
      const homeScore = parseInt(homeScoreData.score);
      const awayScore = parseInt(awayScoreData.score);
      
      if (isNaN(homeScore) || isNaN(awayScore)) {
        console.log(`Game ID ${game.id}: Invalid score values. Home: ${homeScoreData.score}, Away: ${awayScoreData.score}`);
        return 'pending';
      }
      
      console.log(`Game ID ${game.id}: Determining result. Home: ${homeScore}, Away: ${awayScore}`);
      
      if (homeScore > awayScore) {
        return 'home_win';
      } else if (awayScore > homeScore) {
        return 'away_win';
      } else {
        return 'draw';
      }
    }
    
    // 3. 스코어가 있지만 status가 finished가 아닌 경우 - 개선된 시간 기반 처리
    if (game.score) {
      const gameTime = new Date(game.commenceTime + 'Z');
      const now = new Date();
      const hoursSinceGame = (now - gameTime) / (1000 * 60 * 60);
      
      // 스코어가 있고 경기 시간이 지났으면 완료로 처리 (더 유연한 접근)
      if (hoursSinceGame > 0) {
        let scores;
        
        // 스코어 데이터 파싱
        if (typeof game.score === 'string') {
          try {
            scores = JSON.parse(game.score);
          } catch (e) {
            return 'pending';
          }
        } else if (Array.isArray(game.score)) {
          scores = game.score;
        } else {
          return 'pending';
        }
        
        if (!Array.isArray(scores) || scores.length < 2) {
          return 'pending';
        }
        
        const homeScoreData = scores.find(score => score.name === game.homeTeam);
        const awayScoreData = scores.find(score => score.name === game.awayTeam);
        
        if (homeScoreData && awayScoreData) {
          const homeScore = parseInt(homeScoreData.score);
          const awayScore = parseInt(awayScoreData.score);
          
          if (!isNaN(homeScore) && !isNaN(awayScore)) {
            if (homeScore > awayScore) {
              return 'home_win';
            } else if (awayScore > homeScore) {
              return 'away_win';
            } else {
              return 'draw';
            }
          }
        }
      }
    }
    
    // 4. 연기/취소 키워드 감지 (API 응답의 description이나 기타 필드에서)
    if (game.description || game.strStatus) {
      const text = (game.description || game.strStatus || '').toLowerCase();
      const postponedKeywords = ['postponed', 'delayed', 'suspended', '연기', '지연'];
      const cancelledKeywords = ['cancelled', 'abandoned', '취소', '중단'];
      
      if (postponedKeywords.some(keyword => text.includes(keyword))) {
        return 'postponed';
      }
      
      if (cancelledKeywords.some(keyword => text.includes(keyword))) {
        return 'cancelled';
      }
    }
    
    // 5. 기본값: pending
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

  // ❌ DEPRECATED: getGameResultById 메서드 제거됨
  // 팀명+날짜 기반 조회 사용: findGameResultByMatch() 사용

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
  async fetchRecentResults(clientCategory, days = 3) {
    try {
      const sportKey = this.getSportKeyForCategory(clientCategory);
      if (!sportKey) {
        throw new Error(`Unknown category: ${clientCategory}`);
      }

      // 🆕 시간 범위 수정: 과거 15일 + 미래 1일 (누락 데이터 복구용 임시 확장)
      // TheSportsDB API 사용 (The Odds API 사용 금지)
      const resultsResponse = await this.fetchResultsWithSportsDB(sportKey, days, true);

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
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
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
    
    // sportKey와 sportTitle 설정
    const sportKey = data.sportKey || this.getSportKeyForCategory(subCategory);
    const sportTitle = data.sportTitle || this.getSportTitleFromSportKey(sportKey);
    
    const saveData = { 
      ...data, 
      mainCategory, 
      subCategory,
      sportKey: sportKey || null,
      sportTitle: sportTitle || null
    };
    
    return GameResult.upsert(saveData, {
      where: {
        homeTeam: saveData.homeTeam,
        awayTeam: saveData.awayTeam,
        commenceTime: saveData.commenceTime
      }
    });
  }
}

export default new GameResultService(); 