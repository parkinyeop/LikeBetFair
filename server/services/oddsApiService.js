import axios from 'axios';
import OddsCache from '../models/oddsCacheModel.js';
import sportsConfig from '../config/sportsConfig.js';
import { Op } from 'sequelize';
import { normalizeTeamName, normalizeCategory, normalizeCategoryPair } from '../normalizeUtils.js';
import oddsHistoryService from './oddsHistoryService.js';
import { BETTING_CONFIG } from '../config/centralizedConfig.js';
import { ODDS_API_CONFIG, LOG_LEVELS } from '../config/oddsApiConfig.js';

// 클라이언트에서 사용하는 sport key 매핑
const clientSportKeyMap = {
  // 축구 (Soccer)
  'K리그': 'soccer_korea_kleague1',
  'J리그': 'soccer_japan_j_league',
  '세리에 A': 'soccer_italy_serie_a',
  '브라질 세리에 A': 'soccer_brazil_campeonato',
  'MLS': 'soccer_usa_mls',
  '아르헨티나 프리메라': 'soccer_argentina_primera_division',
  '중국 슈퍼리그': 'soccer_china_superleague',
  '라리가': 'soccer_spain_la_liga',
  '분데스리가': 'soccer_germany_bundesliga',
  '프리미어리그': 'soccer_epl',
  
  // 농구 (Basketball)
  'NBA': 'basketball_nba',
  
  // 야구 (Baseball)
  'MLB': 'baseball_mlb',
  'KBO': 'baseball_kbo',
  
  // 미식축구 (American Football)
  'NFL': 'americanfootball_nfl'
};

class OddsApiService {
  constructor() {
    this.apiKey = process.env.ODDS_API_KEY || process.env.THE_ODDS_API_KEY;
    this.baseUrl = 'https://api.the-odds-api.com/v4/sports';
    
    // API 사용량 추적 (디버깅을 위해 완전히 비활성화)
    this.apiCallTracker = {
      dailyCalls: 0,
      monthlyCalls: 0,
      lastResetDate: new Date().toDateString(),
      dailyLimit: 999999,
      monthlyLimit: 999999,
      currentHourCalls: 0,
      hourlyLimit: 999999
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

  // API 호출 가능 여부 확인 (디버깅을 위해 완전히 비활성화)
  canMakeApiCall() {
    // 디버깅 모드: 모든 API 호출 허용
    console.log(`[DEBUG] API 호출 허용 - Daily: ${this.apiCallTracker.dailyCalls}, Monthly: ${this.apiCallTracker.monthlyCalls}`);
    return true;
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
    return game && 
           game.home_team && 
           game.away_team && 
           game.commence_time && 
           game.bookmakers && 
           Array.isArray(game.bookmakers) && 
           game.bookmakers.length > 0;
  }

  // 전체 카테고리 업데이트
  async fetchAndCacheOdds() {
    try {
      console.log('[DEBUG] Starting odds update for all categories...');
      
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

          // === 추가: UTC 기준 7일 이내 경기만 저장 ===
          const now = new Date();
          const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const filteredGames = oddsResponse.data.filter(game => {
            const commence = new Date(game.commence_time);
            return commence >= now && commence < weekLater;
          });
          console.log(`[DEBUG] ${clientCategory}: ${filteredGames.length}개 경기(7일 이내) 처리 시작`);
          // === 끝 ===

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
              const upsertData = {
                mainCategory,
                subCategory,
                sportKey: sportKey,
                sportTitle: clientCategory,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                commenceTime: new Date(game.commence_time),
                odds: game.bookmakers, // odds 필드 추가
                bookmakers: game.bookmakers,
                market: 'h2h', // 기본값 추가
                officialOdds: this.calculateAverageOdds(game.bookmakers),
                lastUpdated: new Date()
              };
              
              console.log(`[DEBUG] Upsert 데이터:`, JSON.stringify(upsertData, null, 2));
              
              const [oddsRecord, created] = await OddsCache.upsert(upsertData, {
                returning: true
              });

              if (created) {
                totalNewCount++;
                console.log(`[DEBUG] ✅ 새 배당률 저장: ${game.home_team} vs ${game.away_team}`);
              } else {
                totalUpdatedCount++;
                console.log(`[DEBUG] 🔄 기존 배당률 업데이트: ${game.home_team} vs ${game.away_team}`);
              }

              // 배당률 히스토리 저장
              if (oddsRecord) {
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
              console.log(`[DEBUG] ❌ 데이터 검증 실패: ${game.home_team} vs ${game.away_team}`);
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
  async fetchAndCacheOddsForCategories(activeCategories, priorityLevel = 'medium') {
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
            timeout: 30000,
            headers: {
              'User-Agent': 'LikeBetFair/1.0'
            }
          });

          console.log(`[DEBUG] Found ${oddsResponse.data.length} games for ${clientCategory}`);

          // === 추가: UTC 기준 7일 이내 경기만 저장 ===
          const now = new Date();
          const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const filteredGames = oddsResponse.data.filter(game => {
            const commence = new Date(game.commence_time);
            return commence >= now && commence < weekLater;
          });
          // === 끝 ===

          // 데이터 검증 및 저장
          for (const game of filteredGames) {
            if (this.validateOddsData(game)) {
              const mainCategory = this.determineMainCategory(clientCategory);
              const subCategory = this.determineSubCategory(clientCategory);
              
              if (!mainCategory || !subCategory) {
                console.error(`[DEBUG] mainCategory/subCategory 누락: ${mainCategory}/${subCategory}`);
                totalSkippedCount++;
                continue;
              }
              
              const upsertData = {
                mainCategory,
                subCategory,
                sportKey: sportKey,
                sportTitle: clientCategory,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                commenceTime: new Date(game.commence_time),
                odds: game.bookmakers,
                bookmakers: game.bookmakers,
                market: 'h2h',
                officialOdds: this.calculateAverageOdds(game.bookmakers),
                lastUpdated: new Date()
              };
              
              const [oddsRecord, created] = await OddsCache.upsert(upsertData, {
                returning: true
              });

              if (created) {
                totalNewCount++;
              } else {
                totalUpdatedCount++;
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
}

const oddsApiService = new OddsApiService();
export default oddsApiService; 