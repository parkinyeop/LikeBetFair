import axios from 'axios';
import OddsCache from '../models/oddsCacheModel.js';
import sportsConfig from '../config/sportsConfig.js';
import { Op } from 'sequelize';
import { normalizeTeamName, normalizeCategory, normalizeCategoryPair } from '../normalizeUtils.js';

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
  '스페인 2부': 'soccer_spain_segunda_division',
  '스웨덴 알스벤스칸': 'soccer_sweden_allsvenskan',
  
  // 농구 (Basketball)
  'NBA': 'basketball_nba',
  
  // 야구 (Baseball)
  'MLB': 'baseball_mlb',
  'KBO': 'baseball_kbo',
  
  // 아이스하키 (Ice Hockey)
  'NHL': 'icehockey_nhl'
};

class OddsApiService {
  constructor() {
    this.apiKey = process.env.ODDS_API_KEY;
    this.baseUrl = 'https://api.the-odds-api.com/v4/sports';
  }

  // 활성 카테고리만 업데이트 (비용 절약용)
  async fetchAndCacheOddsForCategories(activeCategories) {
    try {
      console.log(`Starting odds update for active categories: ${activeCategories.join(', ')}`);
      
      // 활성 카테고리만 필터링
      const categoriesToUpdate = activeCategories.filter(category => 
        clientSportKeyMap.hasOwnProperty(category)
      );
      
      console.log(`Filtered categories to update: ${categoriesToUpdate.join(', ')}`);
      
      for (const clientCategory of categoriesToUpdate) {
        const sportKey = clientSportKeyMap[clientCategory];
        console.log(`Fetching odds for ${clientCategory} (${sportKey})...`);
        
        try {
          // 최근 7일간의 경기 배당률 데이터 가져오기
          const oddsResponse = await axios.get(`${this.baseUrl}/${sportKey}/odds`, {
            params: {
              apiKey: this.apiKey,
              regions: 'us',
              markets: 'h2h,spreads,totals',
              oddsFormat: 'decimal',
              dateFormat: 'iso'
            }
          });

          console.log(`Found ${oddsResponse.data.length} games with odds for ${clientCategory}`);

          // 데이터 검증 및 저장
          for (const game of oddsResponse.data) {
            if (this.validateOddsData(game)) {
              const mainCategory = this.determineMainCategory(clientCategory);
              const subCategory = this.determineSubCategory(clientCategory);
              
              if (!mainCategory || !subCategory) {
                console.error(`[oddsApiService] mainCategory/subCategory 누락: mainCategory=${mainCategory}, subCategory=${subCategory}, data=`, { mainCategory, subCategory, sportKey, sportTitle: clientCategory, homeTeam: game.home_team, awayTeam: game.away_team, commenceTime: new Date(game.commence_time), bookmakers: game.bookmakers });
                continue;
              }
              
              await OddsCache.upsert({
                mainCategory,
                subCategory,
                sportKey: sportKey,
                sportTitle: clientCategory,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                commenceTime: new Date(game.commence_time),
                bookmakers: game.bookmakers,
                lastUpdated: new Date()
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching odds for ${clientCategory}:`, error.message);
          // 개별 스포츠 에러가 전체 프로세스를 중단시키지 않도록 계속 진행
          continue;
        }
      }

      // 기존 데이터 정리 (7일 이상 된 데이터 삭제)
      await this.cleanupOldData();
      
      console.log('Odds update completed for active categories');
    } catch (error) {
      console.error('Error fetching and caching odds for active categories:', error);
      throw error;
    }
  }

  // 전체 카테고리 업데이트 (기존 메서드)
  async fetchAndCacheOdds() {
    try {
      console.log('Starting odds update for all categories...');
      
      // 클라이언트에서 사용하는 모든 카테고리에 대해 개별적으로 API 호출
      for (const [clientCategory, sportKey] of Object.entries(clientSportKeyMap)) {
        console.log(`Fetching odds for ${clientCategory} (${sportKey})...`);
        
        try {
          // 최근 7일간의 경기 배당률 데이터 가져오기
          const oddsResponse = await axios.get(`${this.baseUrl}/${sportKey}/odds`, {
            params: {
              apiKey: this.apiKey,
              regions: 'us',
              markets: 'h2h,spreads,totals',
              oddsFormat: 'decimal',
              dateFormat: 'iso'
            }
          });

          console.log(`Found ${oddsResponse.data.length} games with odds for ${clientCategory}`);

          // 데이터 검증 및 저장
          for (const game of oddsResponse.data) {
            if (this.validateOddsData(game)) {
              const mainCategory = this.determineMainCategory(clientCategory);
              const subCategory = this.determineSubCategory(clientCategory);
              
              if (!mainCategory || !subCategory) {
                console.error(`[oddsApiService] mainCategory/subCategory 누락: mainCategory=${mainCategory}, subCategory=${subCategory}, data=`, { mainCategory, subCategory, sportKey, sportTitle: clientCategory, homeTeam: game.home_team, awayTeam: game.away_team, commenceTime: new Date(game.commence_time), bookmakers: game.bookmakers });
                continue;
              }
              
              await OddsCache.upsert({
                mainCategory,
                subCategory,
                sportKey: sportKey,
                sportTitle: clientCategory,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                commenceTime: new Date(game.commence_time),
                bookmakers: game.bookmakers,
                lastUpdated: new Date()
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching odds for ${clientCategory}:`, error.message);
          // 개별 스포츠 에러가 전체 프로세스를 중단시키지 않도록 계속 진행
          continue;
        }
      }

      // 기존 데이터 정리 (7일 이상 된 데이터 삭제)
      await this.cleanupOldData();
      
      console.log('Odds successfully updated for all categories');
    } catch (error) {
      console.error('Error fetching and caching odds:', error);
      throw error;
    }
  }

  // sportKey에서 mainCategory/subCategory 직접 추출 (fallback)
  parseMainAndSubFromSportKey(sportKey) {
    if (!sportKey) return { mainCategory: '', subCategory: '' };
    const parts = sportKey.split('_');
    const main = parts[0] || '';
    const sub = parts.slice(1).join('_') || '';
    // normalizeCategoryPair는 mainCategory: 소문자, subCategory: 대문자 반환
    return normalizeCategoryPair(main, sub);
  }

  // 기존 메서드 보완: sportKey 자체도 허용
  getClientCategoryFromSportKey(sportKey) {
    const reverseMap = {};
    for (const [clientCategory, key] of Object.entries(clientSportKeyMap)) {
      reverseMap[key] = clientCategory;
    }
    // fallback: sportKey 자체 반환
    return reverseMap[sportKey] || sportKey;
  }

  // 기존 메서드 보완: clientCategory 또는 sportKey 모두 허용
  determineMainCategory(clientCategoryOrSportKey) {
    if (clientSportKeyMap[clientCategoryOrSportKey]) {
      // clientCategory일 때 기존 방식
      const sportKey = clientSportKeyMap[clientCategoryOrSportKey];
      const parts = sportKey.split('_');
      const main = parts[0] || '';
      const sub = parts.slice(1).join('_') || '';
      return normalizeCategoryPair(main, sub).mainCategory;
    } else {
      // sportKey일 때 fallback
      return this.parseMainAndSubFromSportKey(clientCategoryOrSportKey).mainCategory;
    }
  }

  determineSubCategory(clientCategoryOrSportKey) {
    if (clientSportKeyMap[clientCategoryOrSportKey]) {
      const sportKey = clientSportKeyMap[clientCategoryOrSportKey];
      const parts = sportKey.split('_');
      const main = parts[0] || '';
      const sub = parts.slice(1).join('_') || '';
      return normalizeCategoryPair(main, sub).subCategory;
    } else {
      return this.parseMainAndSubFromSportKey(clientCategoryOrSportKey).subCategory;
    }
  }

  validateOddsData(game) {
    // 필수 필드 검증
    if (!game.home_team || !game.away_team || !game.commence_time) {
      console.log(`Invalid odds data: missing required fields`, game);
      return false;
    }

    // 팀명이 같은 경기 제외 (비현실적)
    if (game.home_team === game.away_team) {
      console.log(`Invalid odds: same team playing against itself`, game);
      return false;
    }

    // 경기 시간이 미래로 너무 먼 경우 제외 (1년 이상)
    const gameTime = new Date(game.commence_time);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    if (gameTime > oneYearFromNow) {
      console.log(`Invalid odds: too far in future`, game);
      return false;
    }

    // bookmakers 데이터가 있는지 확인
    if (!game.bookmakers || game.bookmakers.length === 0) {
      console.log(`Invalid odds: no bookmakers data`, game);
      return false;
    }

    return true;
  }

  async cleanupOldData() {
    try {
      // 7일 이상 된 데이터 삭제
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const deletedCount = await OddsCache.destroy({
        where: {
          commenceTime: {
            [Op.lt]: sevenDaysAgo
          }
        }
      });
      
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old odds records`);
      }
    } catch (error) {
      console.error('Error cleaning up old odds data:', error);
    }
  }

  async getOdds(mainCategory = null, subCategory = null, limit = 100) {
    try {
      const whereClause = {};
      if (mainCategory) whereClause.mainCategory = mainCategory;
      if (subCategory) whereClause.subCategory = subCategory;

      const odds = await OddsCache.findAll({
        where: whereClause,
        order: [['commenceTime', 'ASC']],
        limit
      });
      return odds;
    } catch (error) {
      console.error('Error fetching odds:', error);
      throw error;
    }
  }

  async getOddsById(oddsId) {
    try {
      const odds = await OddsCache.findByPk(oddsId);
      return odds;
    } catch (error) {
      console.error('Error fetching odds:', error);
      throw error;
    }
  }

  async updateOdds(oddsId, updateData) {
    try {
      const odds = await OddsCache.findByPk(oddsId);
      if (!odds) {
        throw new Error('Odds not found');
      }

      await odds.update({
        ...updateData,
        lastUpdated: new Date()
      });

      return odds;
    } catch (error) {
      console.error('Error updating odds:', error);
      throw error;
    }
  }

  // 새로운 메서드: 특정 스포츠의 최근 배당률만 가져오기
  async fetchRecentOdds(clientCategory) {
    try {
      const sportKey = clientSportKeyMap[clientCategory];
      if (!sportKey) {
        throw new Error(`Unknown category: ${clientCategory}`);
      }

      const oddsResponse = await axios.get(`${this.baseUrl}/${sportKey}/odds`, {
        params: {
          apiKey: this.apiKey,
          regions: 'us',
          markets: 'h2h,spreads,totals',
          oddsFormat: 'decimal',
          dateFormat: 'iso'
        }
      });

      return oddsResponse.data;
    } catch (error) {
      console.error(`Error fetching recent odds for ${clientCategory}:`, error);
      throw error;
    }
  }

  // 새로운 메서드: 배당률 데이터베이스 통계
  async getOddsStats() {
    try {
      const stats = await OddsCache.findAll({
        attributes: [
          'mainCategory',
          'subCategory',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['mainCategory', 'subCategory'],
        raw: true
      });

      return stats;
    } catch (error) {
      console.error('Error getting odds stats:', error);
      throw error;
    }
  }

  // 새로운 메서드: API 호출 비용 추정
  async getApiCostEstimate() {
    try {
      const stats = await this.getOddsStats();
      const totalGames = stats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
      
      return {
        totalGames,
        estimatedApiCalls: {
          daily: totalGames * 1.5, // 하루 1.5번 업데이트
          monthly: totalGames * 1.5 * 30,
          costEstimate: `$${(totalGames * 1.5 * 30 * 0.001).toFixed(2)}/month` // 예상 비용
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

  // 누락된 메서드: 카테고리 목록 가져오기
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
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  // 누락된 메서드: 캐시된 배당률 데이터 가져오기
  async getCachedOdds(sportKey, subCategory = null, limit = 100) {
    try {
      console.log(`Fetching cached odds for sportKey: ${sportKey}, subCategory: ${subCategory}, limit: ${limit}`);
      
      // sportKey를 클라이언트 카테고리로 변환
      const clientCategory = this.getClientCategoryFromSportKey(sportKey);
      if (!clientCategory) {
        console.log(`Unknown sportKey: ${sportKey}`);
        return [];
      }
      
      const mainCategory = this.determineMainCategory(clientCategory);
      const actualSubCategory = subCategory || this.determineSubCategory(clientCategory);
      
      console.log(`Mapped to mainCategory: ${mainCategory}, subCategory: ${actualSubCategory}`);
      
      const whereClause = {
        mainCategory: mainCategory,
        subCategory: actualSubCategory
      };
      
      const odds = await OddsCache.findAll({
        where: whereClause,
        order: [['commenceTime', 'ASC']],
        limit: limit
      });
      
      console.log(`Found ${odds.length} cached odds records`);
      
      // 클라이언트에서 기대하는 형식으로 변환
      const formattedOdds = odds.map(oddsRecord => ({
        id: oddsRecord.id,
        sport: sportKey,
        home_team: oddsRecord.homeTeam,
        away_team: oddsRecord.awayTeam,
        commence_time: oddsRecord.commenceTime,
        bookmakers: oddsRecord.bookmakers,
        lastUpdated: oddsRecord.lastUpdated
      }));
      
      return formattedOdds;
    } catch (error) {
      console.error('Error fetching cached odds:', error);
      throw error;
    }
  }

  // OddsCache 저장/업데이트 시 정규화 적용 예시 (insert, upsert, update 등 모든 저장 지점에 적용 필요)
  async upsertOddsCache(data) {
    // data: { mainCategory, subCategory, ... }
    const { mainCategory, subCategory } = normalizeCategoryPair(data.mainCategory, data.subCategory);
    const saveData = { ...data, mainCategory, subCategory };
    if (!mainCategory || !subCategory) {
      console.error(`[oddsApiService] mainCategory/subCategory 누락: mainCategory=${mainCategory}, subCategory=${subCategory}, data=`, data);
      return; // 저장 skip
    }
    return OddsCache.upsert(saveData);
  }
}

const oddsApiService = new OddsApiService();
export default oddsApiService; 