import axios from 'axios';
import OddsCache from '../models/oddsCacheModel.js';
import sportsConfig from '../config/sportsConfig.js';
import { Op } from 'sequelize';
import { normalizeTeamName, normalizeCategory, normalizeCategoryPair } from '../normalizeUtils.js';
import oddsHistoryService from './oddsHistoryService.js';
import { BETTING_CONFIG } from '../config/centralizedConfig.js';
import { ODDS_API_CONFIG, LOG_LEVELS } from '../config/oddsApiConfig.js';

// 클라이언트에서 사용하는 sport key 매핑 (영문으로 통일)
const clientSportKeyMap = {
  // 영문 카테고리명만 사용 (한글 제거)
  'KLEAGUE': 'soccer_korea_kleague1',
  'JLEAGUE': 'soccer_japan_j_league',
  'SERIEA': 'soccer_italy_serie_a',
  'BRASILEIRAO': 'soccer_brazil_campeonato',
  'MLS': 'soccer_usa_mls',
  'ARGENTINA_PRIMERA': 'soccer_argentina_primera_division',
  'CSL': 'soccer_china_superleague',
  'LALIGA': 'soccer_spain_la_liga',
  'BUNDESLIGA': 'soccer_germany_bundesliga',
  'EPL': 'soccer_epl',
  'NBA': 'basketball_nba',
  'MLB': 'baseball_mlb',
  'KBO': 'baseball_kbo',
  'NFL': 'americanfootball_nfl'
};

class OddsApiService {
  constructor() {
    this.apiKey = process.env.ODDS_API_KEY || process.env.THE_ODDS_API_KEY;
    this.baseUrl = 'https://api.the-odds-api.com/v4/sports';
    
    // 🚨 디버깅: API 키 상태 확인
    console.log('[OddsApiService] 생성자에서 API 키 확인:');
    console.log('[OddsApiService] ODDS_API_KEY:', process.env.ODDS_API_KEY ? `${process.env.ODDS_API_KEY.substring(0, 8)}...` : '설정되지 않음');
    console.log('[OddsApiService] THE_ODDS_API_KEY:', process.env.THE_ODDS_API_KEY ? `${process.env.THE_ODDS_API_KEY.substring(0, 8)}...` : '설정되지 않음');
    console.log('[OddsApiService] this.apiKey:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : '설정되지 않음');
    
    // API 사용량 추적
    this.apiCallTracker = {
      dailyCalls: 0,
      monthlyCalls: 0,
      lastResetDate: new Date().toDateString(),
      // 🚨 임시 설정 (디버깅용) - 나중에 원래 값으로 복구 필요
      dailyLimit: 999999,    // 원래: 500 (무료 플랜)
      monthlyLimit: 10000,   // 원래: 10000 (무료 플랜)
      currentHourCalls: 0,
      hourlyLimit: 999999    // 원래: 100 (무료 플랜)
      
      // 🔧 원래 설정 (복구 시 주석 해제)
      // dailyLimit: 500,      // 일일 500회
      // monthlyLimit: 10000,  // 월간 10,000회
      // hourlyLimit: 100      // 시간당 100회
    };
    
    // 성능 모니터링
    this.performanceMetrics = {
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      callCount: 0
    };
  }

  // API 호출량 추적 및 제한 확인
  trackApiCall() {
    const today = new Date().toDateString();
    
    // 날짜가 바뀌면 일일 카운터 리셋
    if (this.apiCallTracker.lastResetDate !== today) {
      this.apiCallTracker.dailyCalls = 0;
      this.apiCallTracker.lastResetDate = today;
      this.apiCallTracker.currentHourCalls = 0;
    }
    
    this.apiCallTracker.dailyCalls++;
    this.apiCallTracker.monthlyCalls++;
    this.apiCallTracker.currentHourCalls++;
    
    console.log(`[DEBUG] API Call Tracker: Daily ${this.apiCallTracker.dailyCalls}, Monthly ${this.apiCallTracker.monthlyCalls}`);
  }

  // API 호출 가능 여부 확인
  canMakeApiCall() {
    // 🚨 임시 설정 (디버깅용) - 모든 API 호출 허용
    console.log(`[DEBUG] API 호출 허용 - Daily: ${this.apiCallTracker.dailyCalls}, Monthly: ${this.apiCallTracker.monthlyCalls}`);
    return true;
    
    // 🔧 원래 설정 (복구 시 주석 해제)
    /*
    const canMakeDaily = this.apiCallTracker.dailyCalls < this.apiCallTracker.dailyLimit;
    const canMakeMonthly = this.apiCallTracker.monthlyCalls < this.apiCallTracker.monthlyLimit;
    const canMakeHourly = this.apiCallTracker.currentHourCalls < this.apiCallTracker.hourlyLimit;
    
    const canMake = canMakeDaily && canMakeMonthly && canMakeHourly;
    
    if (!canMake) {
      console.log(`[DEBUG] API 호출 제한 - Daily: ${this.apiCallTracker.dailyCalls}/${this.apiCallTracker.dailyLimit}, Monthly: ${this.apiCallTracker.monthlyCalls}/${this.apiCallTracker.monthlyLimit}, Hourly: ${this.apiCallTracker.currentHourCalls}/${this.apiCallTracker.hourlyLimit}`);
    }
    
    return canMake;
    */
  }

  // 구조화된 로깅
  logApiCall(category, status, details = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      category,
      status,
      apiCalls: this.apiCallTracker.dailyCalls,
      dailyLimit: this.apiCallTracker.dailyLimit,
      monthlyCalls: this.apiCallTracker.monthlyCalls,
      monthlyLimit: this.apiCallTracker.monthlyLimit,
      ...details
    };
    
    if (status === LOG_LEVELS.ERROR) {
      console.error('[API_ERROR]', JSON.stringify(logData));
    } else if (status === LOG_LEVELS.WARN) {
      console.warn('[API_WARN]', JSON.stringify(logData));
    } else {
      console.log('[API_SUCCESS]', JSON.stringify(logData));
    }
  }



  // 성능 모니터링
  updatePerformanceMetrics(processingTime) {
    this.performanceMetrics.totalProcessingTime += processingTime;
    this.performanceMetrics.callCount++;
    this.performanceMetrics.averageProcessingTime = 
      this.performanceMetrics.totalProcessingTime / this.performanceMetrics.callCount;
    
    console.log(`[DEBUG] Performance: ${processingTime}ms (avg: ${this.performanceMetrics.averageProcessingTime.toFixed(2)}ms)`);
  }

  // 유틸리티: 대기 함수
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 공식 평균 배당률 계산
  calculateAverageOdds(bookmakers) {
    if (!bookmakers || !Array.isArray(bookmakers) || bookmakers.length === 0) {
      return null;
    }

    const officialOdds = {};

    // 모든 북메이커의 markets를 순회
    for (const bookmaker of bookmakers) {
      if (!bookmaker.markets || !Array.isArray(bookmaker.markets)) continue;

      for (const market of bookmaker.markets) {
        const marketKey = market.key; // h2h, totals, spreads 등
        if (!market.outcomes || !Array.isArray(market.outcomes)) continue;

        // 각 market별로 outcome 그룹화
        if (!officialOdds[marketKey]) {
          officialOdds[marketKey] = {};
        }

        for (const outcome of market.outcomes) {
          const outcomeKey = outcome.name; // 팀명, Over, Under, Draw 등
          const point = outcome.point; // 핸디캡, 언더/오버 기준점
          
          // point가 있는 경우 outcomeKey에 포함 (예: "Over 2.5", "Under 2.5")
          const finalKey = point !== undefined ? `${outcomeKey} ${point}` : outcomeKey;

          if (!officialOdds[marketKey][finalKey]) {
            officialOdds[marketKey][finalKey] = {
              prices: [],
              averagePrice: 0,
              count: 0
            };
          }

          // 유효한 배당률만 수집
          if (outcome.price && typeof outcome.price === 'number' && outcome.price > 1.0) {
            officialOdds[marketKey][finalKey].prices.push(outcome.price);
            officialOdds[marketKey][finalKey].count++;
          }
        }
      }
    }

    // 각 outcome별 평균 배당률 계산
    for (const marketKey in officialOdds) {
      for (const outcomeKey in officialOdds[marketKey]) {
        const outcome = officialOdds[marketKey][outcomeKey];
        if (outcome.prices.length > 0) {
          outcome.averagePrice = outcome.prices.reduce((sum, price) => sum + price, 0) / outcome.prices.length;
          // 소수점 3자리까지 반올림
          outcome.averagePrice = Math.round(outcome.averagePrice * 1000) / 1000;
        }
        // prices 배열은 제거 (최종 결과만 유지)
        delete outcome.prices;
      }
    }

    return officialOdds;
  }

  // 메인 카테고리 결정
  determineMainCategory(clientCategory) {
    if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
      return 'baseball';
    } else if (clientCategory.includes('NBA') || clientCategory.includes('KBL')) {
      return 'basketball';
    } else if (clientCategory.includes('NFL')) {
      return 'american_football';
    } else if (clientCategory.includes('리그') || clientCategory.includes('MLS') || clientCategory.includes('프리미어') || clientCategory.includes('라리가') || clientCategory.includes('분데스리가') || clientCategory.includes('세리에') || clientCategory.includes('J리그')) {
      return 'soccer';
    }
    return 'soccer'; // 기본값
  }

  // 서브 카테고리 결정
  determineSubCategory(clientCategory) {
    return clientCategory.toUpperCase();
  }

  // 배당률 데이터 검증
  validateOddsData(game) {
    // 기본 데이터 검증
    const basicValidation = game && 
           game.home_team && 
           game.away_team && 
           game.commence_time && 
           game.bookmakers && 
           Array.isArray(game.bookmakers) && 
           game.bookmakers.length > 0;
    
    if (!basicValidation) return false;
    

    
    return true;
  }

  // 전체 카테고리 업데이트
  async fetchAndCacheOdds(forceUpdate = false) {
    try {
      console.log(`[DEBUG] Starting odds update for all categories... Force Update: ${forceUpdate}`);
      
      // API 키 확인
      if (!this.apiKey) {
        throw new Error('ODDS_API_KEY 환경변수가 설정되지 않았습니다. Render 대시보드에서 환경변수를 확인해주세요.');
      }
      
      let totalNewCount = 0;
      let totalUpdatedCount = 0;
      let totalSkippedCount = 0;
      let totalApiCalls = 0;
      
      // 클라이언트에서 사용하는 모든 카테고리에 대해 개별적으로 API 호출
      for (const [clientCategory, sportKey] of Object.entries(clientSportKeyMap)) {
        console.log(`[DEBUG] Fetching odds for ${clientCategory} (${sportKey})...`);
        
        try {
          // API 호출 가능 여부 확인
          if (!this.canMakeApiCall()) {
            console.warn(`[DEBUG] API 호출 제한으로 ${clientCategory} 건너뜀`);
            continue;
          }

          // API 호출 추적
          this.trackApiCall();
          totalApiCalls++;

          // 최근 7일간의 경기 배당률 데이터 가져오기
          const oddsResponse = await axios.get(`${this.baseUrl}/${sportKey}/odds`, {
            params: {
              apiKey: this.apiKey,
              regions: 'us',
              markets: 'h2h,spreads,totals',
              oddsFormat: 'decimal',
              dateFormat: 'iso'
            },
            timeout: 30000, // 30초 타임아웃
            headers: {
              'User-Agent': 'LikeBetFair/1.0'
            }
          });

          console.log(`[DEBUG] Found ${oddsResponse.data.length} games with odds for ${clientCategory}`);

          // 과거 3일부터 미래 14일까지의 경기 저장 (필터링 조건 대폭 완화)
          const now = new Date();
          const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
          const filteredGames = oddsResponse.data.filter(game => {
            // 🆕 올바른 UTC 시간 처리 로직
            let commence;
            try {
              // OddsAPI에서 받은 시간을 UTC로 명시적 변환
              commence = new Date(game.commence_time + 'Z');
              
              if (isNaN(commence.getTime())) {
                return false;
              }
            } catch (timeError) {
              return false;
            }
            
            return commence >= threeDaysAgo && commence <= fourteenDaysLater;
          });
          console.log(`[DEBUG] ${clientCategory}: ${filteredGames.length}개 경기 처리 시작 (과거 3일 ~ 미래 14일)`);
          console.log(`[DEBUG] 원본 데이터: ${oddsResponse.data.length}개, 필터링 후: ${filteredGames.length}개`);

          // 데이터 검증 및 저장
          for (const game of filteredGames) {
            console.log(`[DEBUG] 경기 검증: ${game.home_team} vs ${game.away_team}`);
            if (this.validateOddsData(game)) {
              const mainCategory = this.determineMainCategory(clientCategory);
              const subCategory = this.determineSubCategory(clientCategory);
              
              if (!mainCategory || !subCategory) {
                console.error(`[DEBUG] mainCategory/subCategory 누락: mainCategory=${mainCategory}, subCategory=${subCategory}`);
                totalSkippedCount++;
                continue;
              }
              
              console.log(`[DEBUG] 카테고리 매핑 성공: ${mainCategory}/${subCategory}`);
              
              // 디버깅: upsert 데이터 확인
              const calculatedOdds = this.calculateAverageOdds(game.bookmakers);
              console.log(`[DEBUG] calculateAverageOdds 결과:`, JSON.stringify(calculatedOdds, null, 2));
              
              // 🆕 강제 UTC 시간 처리 로직
              let commenceTime;
              try {
                // OddsAPI에서 받은 시간이 이미 UTC 형식인지 확인
                let timeString = game.commence_time;
                if (!timeString.endsWith('Z') && !timeString.includes('+') && !timeString.includes('-', 10)) {
                  // UTC 형식이 아니면 Z 추가
                  timeString = timeString + 'Z';
                }
                
                const utcDate = new Date(timeString);
                
                if (isNaN(utcDate.getTime())) {
                  console.error(`[DEBUG] 유효하지 않은 시간: ${game.commence_time} (변환 시도: ${timeString})`);
                  continue;
                }
                
                // 🆕 UTC로 명시적 저장 (ISO 문자열로 저장)
                commenceTime = utcDate.toISOString();
                
                // 🆕 디버깅: 시간 변환 결과 확인
                console.log(`[DEBUG] 강제 UTC 변환: ${game.commence_time} → ${commenceTime}`);
                
              } catch (timeError) {
                console.error(`[DEBUG] 시간 변환 오류: ${timeError.message}`);
                continue;
              }
              
              const upsertData = {
                mainCategory,
                subCategory,
                sportKey: sportKey,
                sportTitle: this.getSportTitleFromSportKey(sportKey),
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                commenceTime: commenceTime, // ✅ UTC ISO 문자열로 저장 (이미 toISOString() 적용됨)
                odds: game.bookmakers, // odds 필드 추가
                bookmakers: game.bookmakers,
                market: 'h2h', // 기본값 추가
                officialOdds: calculatedOdds,
                lastUpdated: new Date()
              };
              
              console.log(`[DEBUG] Upsert 데이터:`, JSON.stringify(upsertData, null, 2));
              
              // 강제 업데이트 모드: 기존 데이터와 관계없이 항상 업데이트
              if (forceUpdate) {
                console.log(`[DEBUG] 🔄 강제 업데이트 모드: ${game.home_team} vs ${game.away_team}`);
                
                // 기존 레코드 찾기
                const existingRecord = await OddsCache.findOne({
                  where: {
                    mainCategory,
                    subCategory,
                    homeTeam: game.home_team,  
                    awayTeam: game.away_team,
                    commenceTime: new Date(commenceTime) // UTC 문자열을 Date 객체로 변환하여 비교
                  }
                });
                
                if (existingRecord) {
                  // 기존 레코드 업데이트
                  await existingRecord.update(upsertData);
                  totalUpdatedCount++;
                  console.log(`[DEBUG] ✅ 강제 업데이트 완료: ${game.home_team} vs ${game.away_team}`);
                } else {
                  // 새 레코드 생성
                  await OddsCache.create(upsertData);
                  totalNewCount++;
                  console.log(`[DEBUG] ✅ 강제 새로 생성: ${game.home_team} vs ${game.away_team}`);
                }
              } else {
                // 기존 로직: findOrCreate 사용
                const [oddsRecord, created] = await OddsCache.findOrCreate({
                  where: {
                    mainCategory,
                    subCategory,
                    homeTeam: game.home_team,  
                    awayTeam: game.away_team,
                    commenceTime: new Date(commenceTime) // UTC 문자열을 Date 객체로 변환하여 비교
                  },
                  defaults: upsertData
                });
                
                // 기존 레코드 업데이트
                if (!created) {
                  await oddsRecord.update(upsertData);
                }

                if (created) {
                  totalNewCount++;
                  console.log(`[DEBUG] ✅ 새 배당률 저장: ${game.home_team} vs ${game.away_team}`);
                } else {
                  totalUpdatedCount++;
                  console.log(`[DEBUG] 🔄 기존 배당률 업데이트: ${game.home_team} vs ${game.away_team}`);
                }
              }

              if (created) {
                totalNewCount++;
                console.log(`[DEBUG] ✅ 새 배당률 저장: ${game.home_team} vs ${game.away_team}`);
              } else {
                totalUpdatedCount++;
                console.log(`[DEBUG] 🔄 기존 배당률 업데이트: ${game.home_team} vs ${game.away_team}`);
              }

              // 배당률 히스토리 저장 (강제 업데이트 모드에서는 건너뛰기)
              if (!forceUpdate && oddsRecord) {
                console.log('[DEBUG] saveOddsSnapshot 호출 직전:', {
                  id: oddsRecord.id,
                  homeTeam: oddsRecord.homeTeam,
                  awayTeam: oddsRecord.awayTeam,
                  commenceTime: oddsRecord.commenceTime,
                  bookmakersType: typeof oddsRecord.bookmakers
                });
                try {
                  const historyCount = await oddsHistoryService.saveOddsSnapshot(oddsRecord);
                  console.log('[DEBUG] saveOddsSnapshot 반환값:', historyCount);
                  if (historyCount > 0) {
                    console.log(`[DEBUG] ${clientCategory} 히스토리 ${historyCount}개 저장됨`);
                  }
                } catch (historyError) {
                  console.error(`[DEBUG] 히스토리 저장 실패 (${clientCategory}):`, historyError.message);
                }
              }
            } else {
              totalSkippedCount++;
              console.log(`[DEBUG] ${clientCategory} ❌ 데이터 검증 실패: ${game.home_team} vs ${game.away_team}`);
              console.log(`[DEBUG] ${clientCategory} 검증 실패 상세:`, {
                has_game: !!game,
                has_home_team: !!game?.home_team,
                has_away_team: !!game?.away_team, 
                has_commence_time: !!game?.commence_time,
                has_bookmakers: !!game?.bookmakers,
                bookmakers_is_array: Array.isArray(game?.bookmakers),
                bookmakers_length: game?.bookmakers?.length || 0
              });
            }
          }
        } catch (error) {
          console.error(`[DEBUG] Error fetching odds for ${clientCategory}:`, error.message);
          continue;
        }
      }

      console.log(`[DEBUG] Odds update completed. Total: ${totalNewCount} new, ${totalUpdatedCount} updated, ${totalSkippedCount} skipped, ${totalApiCalls} API calls`);
      
      return {
        updatedCount: totalUpdatedCount + totalNewCount,
        newCount: totalNewCount,
        updatedExistingCount: totalUpdatedCount,
        skippedCount: totalSkippedCount,
        apiCalls: totalApiCalls
      };
      
    } catch (error) {
      console.error('[DEBUG] Error fetching and caching odds:', error);
      throw error;
    }
  }

  // 카테고리 목록 가져오기
  async getCategories() {
    try {
      const categories = [];
      
      // 클라이언트에서 사용하는 모든 카테고리 반환
      for (const [clientCategory, sportKey] of Object.entries(clientSportKeyMap)) {
        const mainCategory = this.determineMainCategory(clientCategory);
        const subCategory = this.determineSubCategory(clientCategory);
        
        categories.push({
          clientCategory,
          sportKey,
          mainCategory,
          subCategory,
          displayName: clientCategory
        });
      }
      
      return categories;
    } catch (error) {
      console.error('[DEBUG] Error getting categories:', error);
      throw error;
    }
  }

  // 캐시된 배당률 데이터 가져오기
  async getCachedOdds(sportKey, subCategory = null, limit = 100) {
    try {
      console.log(`[DEBUG] Fetching cached odds for sportKey: ${sportKey}, subCategory: ${subCategory}, limit: ${limit}`);
      
      // sportKey를 클라이언트 카테고리로 변환
      const clientCategory = this.getClientCategoryFromSportKey(sportKey);
      if (!clientCategory) {
        console.log(`[DEBUG] Unknown sportKey: ${sportKey}`);
        return [];
      }
      
      const mainCategory = this.determineMainCategory(clientCategory);
      const actualSubCategory = subCategory || this.determineSubCategory(clientCategory);
      
      console.log(`[DEBUG] Mapped to mainCategory: ${mainCategory}, subCategory: ${actualSubCategory}`);
      
      const whereClause = {
        mainCategory: mainCategory,
        subCategory: actualSubCategory
      };
      
      const odds = await OddsCache.findAll({
        where: whereClause,
        order: [['commenceTime', 'ASC']],
        limit: limit
      });
      
      console.log(`[DEBUG] Found ${odds.length} cached odds`);
      
      // 클라이언트에서 기대하는 형식으로 변환
      const formattedOdds = odds.map(oddsRecord => ({
        id: oddsRecord.id,
        sport: sportKey,
        home_team: oddsRecord.homeTeam,
        away_team: oddsRecord.awayTeam,
        commence_time: oddsRecord.commenceTime,
        bookmakers: oddsRecord.bookmakers,
        officialOdds: oddsRecord.officialOdds,
        lastUpdated: oddsRecord.lastUpdated
      }));
      
      console.log(`[DEBUG] Formatted odds for ${sportKey}:`, formattedOdds.length, '개');
      if (formattedOdds.length > 0) {
        console.log(`[DEBUG] 첫 번째 경기 샘플:`, {
          id: formattedOdds[0].id,
          home_team: formattedOdds[0].home_team,
          away_team: formattedOdds[0].away_team,
          commence_time: formattedOdds[0].commence_time,
          hasBookmakers: !!formattedOdds[0].bookmakers,
          hasOfficialOdds: !!formattedOdds[0].officialOdds
        });
      }
      
      return formattedOdds;
    } catch (error) {
      console.error('[DEBUG] Error fetching cached odds:', error);
      throw error;
    }
  }

  // sportKey에서 클라이언트 카테고리 찾기
  getClientCategoryFromSportKey(sportKey) {
    for (const [clientCategory, key] of Object.entries(clientSportKeyMap)) {
      if (key === sportKey) {
        return clientCategory;
      }
    }
    return null;
  }

  // OddsCache 테이블의 총 레코드 수 반환
  async getOddsCount() {
    try {
      const count = await OddsCache.count();
      return count;
    } catch (error) {
      console.error('[DEBUG] getOddsCount 오류:', error);
      throw error;
    }
  }

  // 활성 카테고리만 업데이트 (스케줄러용)
  async fetchAndCacheOddsForCategories(activeCategories, priorityLevel = 'medium', forceUpdate = false) {
    let totalUpdatedCount = 0;
    let totalNewCount = 0;
    let totalSkippedCount = 0;
    let totalApiCalls = 0;
    
    try {
      console.log(`[DEBUG] Starting odds update for categories: ${activeCategories.join(', ')}`);
      
      // 활성 카테고리만 필터링
      const categoriesToUpdate = activeCategories.filter(category => 
        clientSportKeyMap.hasOwnProperty(category)
      );
      
      console.log(`[DEBUG] Filtered categories: ${categoriesToUpdate.join(', ')}`);
      
      for (const clientCategory of categoriesToUpdate) {
        try {
          const sportKey = clientSportKeyMap[clientCategory];
          console.log(`[DEBUG] Processing category: ${clientCategory} (${sportKey})`);
          
          // 🆕 야구 전용 디버깅 로그 추가
          if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
            console.log(`[야구 디버깅] 🏟️ ${clientCategory} 처리 시작`);
            console.log(`[야구 디버깅] 📡 API URL: ${this.baseUrl}/${sportKey}/odds`);
            console.log(`[야구 디버깅] 🔑 API Key: ${this.apiKey ? '설정됨' : '설정안됨'}`);
          }
          
          // API 호출 가능 여부 확인
          if (!this.canMakeApiCall()) {
            console.warn(`[DEBUG] API 호출 제한으로 ${clientCategory} 건너뜀`);
            continue;
          }

          // API 호출 추적
          this.trackApiCall();
          totalApiCalls++;

          // 🆕 야구 전용 디버깅 로그 추가
          if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
            console.log(`[야구 디버깅] 📞 API 호출 시작: ${clientCategory}`);
          }

          // 최근 7일간의 경기 배당률 데이터 가져오기
          const oddsResponse = await axios.get(`${this.baseUrl}/${sportKey}/odds`, {
            params: {
              apiKey: this.apiKey,
              regions: 'us',
              markets: 'h2h,spreads,totals',
              oddsFormat: 'decimal',
              dateFormat: 'iso'
            },
            timeout: 30000,
            headers: {
              'User-Agent': 'LikeBetFair/1.0'
            }
          });

          // 🆕 야구 전용 디버깅 로그 추가
          if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
            console.log(`[야구 디버깅] ✅ API 응답 성공: ${clientCategory}`);
            console.log(`[야구 디버깅] 📊 응답 데이터 길이: ${oddsResponse.data.length}`);
            console.log(`[야구 디버깅] 📅 첫 번째 경기 시간: ${oddsResponse.data[0]?.commence_time || 'N/A'}`);
            console.log(`[야구 디버깅] 📅 마지막 경기 시간: ${oddsResponse.data[oddsResponse.data.length-1]?.commence_time || 'N/A'}`);
          }

          console.log(`[DEBUG] Found ${oddsResponse.data.length} games for ${clientCategory}`);

          // === 수정: UTC 기준 과거 1일 + 미래 14일 경기만 저장 ===
          const now = new Date();
          const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
          const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
          
          // 🆕 야구 전용 디버깅 로그 추가
          if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
            console.log(`[야구 디버깅] ⏰ 시간 필터링 정보:`);
            console.log(`[야구 디버깅]   현재 시간: ${now.toISOString()}`);
            console.log(`[야구 디버깅]   1일 전: ${oneDayAgo.toISOString()}`);
            console.log(`[야구 디버깅]   14일 후: ${fourteenDaysLater.toISOString()}`);
          }
          
          const filteredGames = oddsResponse.data.filter(game => {
            // 🆕 야구 전용 디버깅 로그 추가 - 시간 형식 확인
            if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
              console.log(`[야구 디버깅] 🏈 경기: ${game.home_team} vs ${game.away_team}`);
              console.log(`[야구 디버깅]   원본 시간: ${game.commence_time}`);
              console.log(`[야구 디버깅]   시간 타입: ${typeof game.commence_time}`);
              console.log(`[야구 디버깅]   시간 길이: ${game.commence_time?.length || 'N/A'}`);
            }
            
            // 🆕 안전한 시간 변환 로직 추가
            let commence;
            try {
              // OddsAPI 시간을 UTC로 명시적 변환
              if (game.commence_time) {
                // 이미 UTC 형식인지 확인 후 Z 추가
                let timeString = game.commence_time;
                if (!timeString.endsWith('Z') && !timeString.includes('+') && !timeString.includes('-', 10)) {
                  timeString = timeString + 'Z';
                }
                commence = new Date(timeString);
              } else {
                console.error(`[야구 디버깅] ❌ commence_time이 null/undefined: ${game.commence_time}`);
                return false;
              }
              
              // 🆕 야구 전용 디버깅 로그 추가
              if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
                console.log(`[야구 디버깅]   변환된 시간: ${commence.toISOString()}`);
                console.log(`[야구 디버깅]   시간 유효성: ${!isNaN(commence.getTime()) ? '유효' : '무효'}`);
              }
              
            } catch (timeError) {
              console.error(`[야구 디버깅] ❌ 시간 변환 오류: ${timeError.message}`);
              console.error(`[야구 디버깅]   원본 시간: ${game.commence_time}`);
              return false;
            }
            
            // 시간이 유효하지 않으면 제외
            if (isNaN(commence.getTime())) {
              console.error(`[야구 디버깅] ❌ 유효하지 않은 시간: ${game.commence_time}`);
              return false;
            }
            
            const isInRange = commence >= oneDayAgo && commence <= fourteenDaysLater;
            
            // 🆕 야구 전용 디버깅 로그 추가
            if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
              console.log(`[야구 디버깅]   필터링 결과: ${isInRange ? '✅ 포함' : '❌ 제외'}`);
            }
            
            return isInRange;
          });
          // === 끝 ===

          // 🆕 야구 전용 디버깅 로그 추가
          if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
            console.log(`[야구 디버깅] 🔍 필터링 결과:`);
            console.log(`[야구 디버깅]   원본 데이터: ${oddsResponse.data.length}개`);
            console.log(`[야구 디버깅]   필터링 후: ${filteredGames.length}개`);
          }

          // 데이터 검증 및 저장
          console.log(`[DEBUG] ${clientCategory} Processing ${filteredGames.length} games for database storage`);
          for (const game of filteredGames) {
            console.log(`[DEBUG] ${clientCategory} Validating game: ${game.home_team} vs ${game.away_team}`);
            
            // 🆕 야구 전용 디버깅 로그 추가
            if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
              console.log(`[야구 디버깅] 🔍 데이터 검증 시작: ${game.home_team} vs ${game.away_team}`);
              console.log(`[야구 디버깅]   home_team: ${game.home_team}`);
              console.log(`[야구 디버깅]   away_team: ${game.away_team}`);
              console.log(`[야구 디버깅]   commence_time: ${game.commence_time}`);
              console.log(`[야구 디버깅]   bookmakers: ${Array.isArray(game.bookmakers) ? game.bookmakers.length + '개' : '배열아님'}`);
            }
            
            const isValid = this.validateOddsData(game);
            
            // 🆕 야구 전용 디버깅 로그 추가
            if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
              console.log(`[야구 디버깅] ✅ 검증 결과: ${isValid ? '성공' : '실패'}`);
            }
            
            console.log(`[DEBUG] ${clientCategory} Validation result: ${isValid} for ${game.home_team} vs ${game.away_team}`);
            
            if (isValid) {
              const mainCategory = this.determineMainCategory(clientCategory);
              const subCategory = this.determineSubCategory(clientCategory);
              
              if (!mainCategory || !subCategory) {
                console.error(`[DEBUG] mainCategory/subCategory 누락: ${mainCategory}/${subCategory}`);
                totalSkippedCount++;
                continue;
              }
              
              // 🆕 강제 UTC 시간 처리 로직 (통일)
              let commenceTime;
              try {
                // OddsAPI에서 받은 시간이 이미 UTC 형식인지 확인
                let timeString = game.commence_time;
                if (!timeString.endsWith('Z') && !timeString.includes('+') && !timeString.includes('-', 10)) {
                  timeString = timeString + 'Z';
                }
                
                const utcDate = new Date(timeString);
                
                if (isNaN(utcDate.getTime())) {
                  console.error(`[야구 디버깅] ❌ 유효하지 않은 시간: ${game.commence_time} (변환 시도: ${timeString})`);
                  continue;
                }
                
                // 🆕 UTC로 명시적 저장 (ISO 문자열로 저장)
                commenceTime = utcDate.toISOString();
                
                // 🆕 디버깅: 시간 변환 결과 확인
                console.log(`[야구 디버깅] 강제 UTC 변환: ${game.commence_time} → ${commenceTime}`);
                
              } catch (timeError) {
                console.error(`[야구 디버깅] ❌ 시간 변환 오류: ${timeError.message}`);
                continue;
              }
              
              const upsertData = {
                mainCategory,
                subCategory,
                sportKey: sportKey,
                sportTitle: this.getSportTitleFromSportKey(sportKey),
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                commenceTime: commenceTime, // ✅ UTC ISO 문자열로 저장 (이미 toISOString() 적용됨)
                odds: game.bookmakers,
                bookmakers: game.bookmakers,
                market: 'h2h',
                officialOdds: this.calculateAverageOdds(game.bookmakers),
                lastUpdated: new Date()
              };
              
              // 🆕 야구 전용 디버깅 로그 추가
              if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
                console.log(`[야구 디버깅] 💾 데이터베이스 저장 시작:`);
                console.log(`[야구 디버깅]   mainCategory: ${mainCategory}`);
                console.log(`[야구 디버깅]   subCategory: ${subCategory}`);
                console.log(`[야구 디버깅]   sportKey: ${sportKey}`);
                console.log(`[야구 디버깅]   homeTeam: ${game.home_team}`);
                console.log(`[야구 디버깅]   awayTeam: ${game.away_team}`);
                console.log(`[야구 디버깅]   commenceTime: ${commenceTime}`); // ✅ UTC ISO 문자열 (이미 toISOString() 적용됨)
              }
              
              // 변수를 상위 스코프에서 선언
              let oddsRecord = null;
              let created = false;
              
              // 강제 업데이트 모드: 기존 데이터와 관계없이 항상 업데이트
              if (forceUpdate) {
                console.log(`[DEBUG] 🔄 강제 업데이트 모드: ${game.home_team} vs ${game.away_team}`);
                
                // 기존 레코드 찾기
                oddsRecord = await OddsCache.findOne({
                  where: {
                    mainCategory,
                    subCategory,
                    homeTeam: game.home_team,
                    awayTeam: game.away_team,
                    commenceTime: new Date(commenceTime) // UTC 문자열을 Date 객체로 변환하여 비교
                  }
                });
                
                if (oddsRecord) {
                  // 기존 레코드 업데이트
                  await oddsRecord.update(upsertData);
                  totalUpdatedCount++;
                  console.log(`[DEBUG] ✅ 강제 업데이트 완료: ${game.home_team} vs ${game.away_team}`);
                } else {
                  // 새 레코드 생성
                  oddsRecord = await OddsCache.create(upsertData);
                  created = true;
                  totalNewCount++;
                  console.log(`[DEBUG] ✅ 강제 새로 생성: ${game.home_team} vs ${game.away_team}`);
                }
              } else {
                // 기존 로직: findOrCreate 사용
                const [record, isCreated] = await OddsCache.findOrCreate({
                  where: {
                    mainCategory,
                    subCategory,
                    homeTeam: game.home_team,
                    awayTeam: game.away_team,
                    commenceTime: new Date(commenceTime) // UTC 문자열을 Date 객체로 변환하여 비교
                  },
                  defaults: upsertData
                });
                
                oddsRecord = record;
                created = isCreated;
                
                // 기존 레코드 업데이트
                if (!created) {
                  await oddsRecord.update(upsertData);
                }

                if (created) {
                  totalNewCount++;
                  console.log(`[DEBUG] ✅ 새 배당률 저장: ${game.home_team} vs ${game.away_team}`);
                } else {
                  totalUpdatedCount++;
                  console.log(`[DEBUG] 🔄 기존 배당률 업데이트: ${game.home_team} vs ${game.away_team}`);
                }
              }
              
              // 🆕 야구 전용 디버깅 로그 추가
              if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
                console.log(`[야구 디버깅] 💾 데이터베이스 저장 결과:`);
                console.log(`[야구 디버깅]   새로 생성: ${created ? '예' : '아니오'}`);
                console.log(`[야구 디버깅]   레코드 ID: ${oddsRecord?.id || 'N/A'}`);
              }

              // OddsHistory 저장 추가
              if (oddsRecord) {
                try {
                  const historyCount = await oddsHistoryService.saveOddsSnapshot(oddsRecord);
                  if (historyCount > 0) {
                    console.log(`[OddsHistory] ${clientCategory} 히스토리 ${historyCount}개 저장됨`);
                  } else {
                    console.log(`[OddsHistory] ${clientCategory} 히스토리 저장 없음`);
                  }
                } catch (historyError) {
                  console.error(`[OddsHistory] 히스토리 저장 실패 (${clientCategory}):`, historyError.message);
                }
              }
            } else {
              totalSkippedCount++;
            }
          }
          
        } catch (error) {
          // 🆕 야구 전용 디버깅 로그 추가
          if (clientCategory.includes('KBO') || clientCategory.includes('MLB')) {
            console.error(`[야구 디버깅] ❌ 오류 발생: ${clientCategory}`);
            console.error(`[야구 디버깅]   오류 메시지: ${error.message}`);
            console.error(`[야구 디버깅]   오류 스택: ${error.stack}`);
          }
          
          console.error(`[DEBUG] Error processing ${clientCategory}:`, error.message);
          totalSkippedCount++;
        }
      }
      
      console.log(`[DEBUG] Odds update completed. Total: ${totalUpdatedCount + totalNewCount} updated, ${totalNewCount} new, ${totalSkippedCount} skipped, ${totalApiCalls} API calls`);
      
      return {
        updatedCount: totalUpdatedCount + totalNewCount,
        newCount: totalNewCount,
        updatedExistingCount: totalUpdatedCount,
        skippedCount: totalSkippedCount,
        apiCalls: totalApiCalls,
        categories: categoriesToUpdate
      };
      
    } catch (error) {
      console.error('[DEBUG] Error in fetchAndCacheOddsForCategories:', error);
      throw error;
    }
  }

  // sportKey에서 sportTitle 가져오기 (영문)
  getSportTitleFromSportKey(sportKey) {
    const sportTitleMap = {
      'soccer_korea_kleague1': 'K League 1',
      'soccer_japan_j_league': 'J League',
      'soccer_italy_serie_a': 'Serie A',
      'soccer_brazil_campeonato': 'Brasileirao',
      'soccer_usa_mls': 'MLS',
      'soccer_argentina_primera_division': 'Primera Division',
      'soccer_china_superleague': 'Chinese Super League',
      'soccer_spain_la_liga': 'La Liga',
      'soccer_germany_bundesliga': 'Bundesliga',
      'soccer_england_premier_league': 'Premier League',
      'basketball_nba': 'NBA',
      'basketball_kbl': 'KBL',
      'baseball_mlb': 'MLB',
      'baseball_kbo': 'KBO',
      'americanfootball_nfl': 'NFL'
    };
    return sportTitleMap[sportKey] || sportKey;
  }

  // 동적 우선순위 레벨 확인 (스케줄러용)
  getDynamicPriorityLevel() {
    // API 사용량에 따른 동적 우선순위 결정
    const dailyUsage = this.apiCallTracker.dailyCalls;
    const monthlyUsage = this.apiCallTracker.monthlyCalls;
    
    if (dailyUsage > 800 || monthlyUsage > 20000) {
      return 'high';
    } else if (dailyUsage > 400 || monthlyUsage > 10000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // 단일 스포츠의 배당율 가져오기 (외부 스크립트용)
  async fetchOdds(sportKey, options = {}) {
    try {
      if (!this.canMakeApiCall()) {
        throw new Error('API 호출 한도 초과');
      }

      this.trackApiCall();
      
      const params = new URLSearchParams({
        apiKey: this.apiKey,
        ...options
      });

      const url = `${this.baseUrl}/${sportKey}/odds?${params}`;
      console.log(`[DEBUG] Fetching odds from: ${url.replace(this.apiKey, '***')}`);
      
      const response = await axios.get(url);
      
      if (response.status === 200) {
        console.log(`[DEBUG] Successfully fetched ${response.data.length} odds for ${sportKey}`);
        return response.data;
      } else {
        throw new Error(`API 응답 오류: ${response.status}`);
      }
      
    } catch (error) {
      console.error(`[DEBUG] Error fetching odds for ${sportKey}:`, error.message);
      throw error;
    }
  }
}

const oddsApiService = new OddsApiService();
export default oddsApiService; 