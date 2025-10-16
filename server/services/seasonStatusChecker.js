import axios from 'axios';
import { SEASON_SCHEDULES } from '../config/sportsMapping.js';
import { updateSeasonStatus } from './seasonStatusUpdater.js';

class SeasonStatusChecker {
  constructor() {
    this.theSportsDbApiKey = process.env.THESPORTSDB_API_KEY;
    this.oddsApiKey = process.env.ODDS_API_KEY;
  }

  /**
   * 모든 리그의 시즌 상태를 자동으로 체크하고 업데이트
   */
  async checkAllLeagues() {
    console.log('🔍 시즌 상태 자동 체크 시작...');
    
    const results = [];
    const oddsProvisionRecommendations = [];
    
    for (const [sportKey, seasonInfo] of Object.entries(SEASON_SCHEDULES)) {
      try {
        console.log(`\n📊 ${seasonInfo.name} 체크 중...`);
        
        const status = await this.checkLeagueStatus(sportKey, seasonInfo);
        const result = {
          league: seasonInfo.name,
          sportKey,
          oldStatus: seasonInfo.status,
          newStatus: status.status,
          reason: status.reason,
          changed: seasonInfo.status !== status.status
        };
        
        results.push(result);
        
        // 배당율 제공 권장사항 생성
        const oddsRecommendation = this.getOddsProvisionRecommendation(result);
        if (oddsRecommendation) {
          oddsProvisionRecommendations.push(oddsRecommendation);
        }
        
        // 상태가 변경된 경우 업데이트
        if (seasonInfo.status !== status.status) {
          await updateSeasonStatus(sportKey, status);
        }
        
      } catch (error) {
        console.error(`❌ ${seasonInfo.name} 체크 실패:`, error.message);
        results.push({
          league: seasonInfo.name,
          sportKey,
          error: error.message
        });
      }
    }
    
    // 배당율 제공 권장사항 출력
    if (oddsProvisionRecommendations.length > 0) {
      console.log('\n💰 배당율 제공 권장사항:');
      console.log('='.repeat(50));
      oddsProvisionRecommendations.forEach(rec => {
        console.log(`${rec.action === 'stop' ? '🔴' : rec.action === 'reduce' ? '🟡' : '🟢'} ${rec.league}`);
        console.log(`   권장: ${rec.recommendation}`);
        console.log(`   이유: ${rec.reason}`);
      });
    }
    
    return results;
  }

  /**
   * 개별 리그의 시즌 상태 체크
   */
  async checkLeagueStatus(sportKey, seasonInfo) {
    // Odds API 키 매핑 (실제 API에서 사용하는 키로 변환)
    const oddsApiKey = this.getOddsApiKey(sportKey);
    
    const checks = await Promise.all([
      this.checkOddsAvailability(oddsApiKey),
      this.checkRecentGames(sportKey),
      this.checkUpcomingGames(sportKey),
      this.checkDatabaseGames(sportKey)  // ✅ 실제 DB 데이터 체크 추가
    ]);

    const [hasOdds, recentGames, upcomingGames, dbGames] = checks;

    return this.determineSeasonStatus({
      hasOdds,
      recentGames,
      upcomingGames,
      dbGames,
      sportKey,
      currentStatus: seasonInfo.status
    });
  }

  /**
   * sportKey를 Odds API 키로 변환
   */
  getOddsApiKey(sportKey) {
    // sportKey는 이미 Odds API 형식이므로 그대로 사용
    return sportKey;
  }

  /**
   * sportKey를 TheSportsDB 리그 ID로 변환
   */
  getTheSportsDbId(sportKey) {
    const mapping = {
      'soccer_korea_kleague1': '4370',
      'soccer_japan_j_league': '4414', 
      'soccer_italy_serie_a': '4332',
      'soccer_brazil_campeonato': '4351',
      'soccer_usa_mls': '4346',
      'soccer_argentina_primera_division': '4406',
      'soccer_china_superleague': '4359',
      'soccer_spain_primera_division': '4335',
      'soccer_germany_bundesliga': '4331',
      'basketball_nba': '4387',
      'basketball_kbl': '5124',
      'baseball_mlb': '4424',
      'baseball_kbo': '4830', // KBO 리그 ID (정확한 ID)
      'americanfootball_nfl': '4391'
    };
    
    return mapping[sportKey];
  }

  /**
   * Odds API에서 배당율 제공 여부 확인
   */
  async checkOddsAvailability(oddsApiKey) {
    try {
      const response = await axios.get(
        `https://api.the-odds-api.com/v4/sports/${oddsApiKey}/odds/`,
        {
          params: {
            apiKey: this.oddsApiKey,
            regions: 'us,uk',
            markets: 'h2h',
            oddsFormat: 'decimal'
          },
          timeout: 10000
        }
      );

      const games = response.data || [];
      const now = new Date();
      
      const upcomingGames = games.filter(game => 
        new Date(game.commence_time + 'Z') > now
      );

      // 가장 가까운 경기 날짜 찾기
      let nextGameDate = null;
      if (upcomingGames.length > 0) {
        const sortedGames = upcomingGames.sort((a, b) => 
          new Date(a.commence_time + 'Z') - new Date(b.commence_time + 'Z')
        );
        nextGameDate = sortedGames[0].commence_time;
      }

      return {
        hasOdds: games.length > 0,
        upcomingCount: upcomingGames.length,
        totalCount: games.length,
        nextGameDate: nextGameDate,
        games: games
      };
    } catch (error) {
      console.log(`⚠️ Odds API 체크 실패: ${error.message}`);
      return { hasOdds: false, upcomingCount: 0, totalCount: 0, nextGameDate: null, games: [] };
    }
  }

  /**
   * TheSportsDB에서 최근 경기 확인 (지난 30일)
   */
  async checkRecentGames(sportKey) {
    try {
      const leagueId = this.getTheSportsDbId(sportKey);
      if (!leagueId) {
        console.log(`⚠️ ${sportKey}에 대한 TheSportsDB ID를 찾을 수 없습니다`);
        return { count: 0, lastGameDate: null };
      }

      const currentSeason = new Date().getFullYear();
      const response = await axios.get(
        `https://www.thesportsdb.com/api/v1/json/${this.theSportsDbApiKey}/eventsseason.php`,
        {
          params: {
            id: leagueId,
            s: currentSeason
          },
          timeout: 10000
        }
      );

      if (!response.data?.events) {
        return { count: 0, lastGameDate: null };
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentGames = response.data.events.filter(event => {
        const gameDate = new Date(event.dateEvent);
        return gameDate >= thirtyDaysAgo && 
               (event.strStatus === 'Match Finished' || event.intHomeScore !== null);
      });

      const lastGame = recentGames
        .sort((a, b) => new Date(b.dateEvent) - new Date(a.dateEvent))[0];

      return {
        count: recentGames.length,
        lastGameDate: lastGame ? lastGame.dateEvent : null
      };
    } catch (error) {
      console.log(`⚠️ 최근 경기 체크 실패: ${error.message}`);
      return { count: 0, lastGameDate: null };
    }
  }

  /**
   * 향후 30일 내 예정된 경기 확인
   */
  async checkUpcomingGames(sportKey) {
    try {
      const leagueId = this.getTheSportsDbId(sportKey);
      if (!leagueId) {
        console.log(`⚠️ ${sportKey}에 대한 TheSportsDB ID를 찾을 수 없습니다`);
        return { count: 0, nextGameDate: null };
      }

      const currentSeason = new Date().getFullYear();
      const response = await axios.get(
        `https://www.thesportsdb.com/api/v1/json/${this.theSportsDbApiKey}/eventsseason.php`,
        {
          params: {
            id: leagueId,
            s: currentSeason
          },
          timeout: 10000
        }
      );

      if (!response.data?.events) {
        return { count: 0, nextGameDate: null };
      }

      const now = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      const upcomingGames = response.data.events.filter(event => {
        const gameDate = new Date(event.dateEvent);
        return gameDate >= now && 
               gameDate <= thirtyDaysLater &&
               event.strStatus !== 'Match Finished';
      });

      const nextGame = upcomingGames
        .sort((a, b) => new Date(a.dateEvent) - new Date(b.dateEvent))[0];

      return {
        count: upcomingGames.length,
        nextGameDate: nextGame ? nextGame.dateEvent : null
      };
    } catch (error) {
      console.log(`⚠️ 예정 경기 체크 실패: ${error.message}`);
      return { count: 0, nextGameDate: null };
    }
  }

  /**
   * 실제 데이터베이스에서 경기 데이터 확인
   */
  async checkDatabaseGames(sportKey) {
    try {
      // OddsCache 모델 import (동적 import 사용)
      const { default: OddsCache } = await import('../models/oddsCacheModel.js');
      
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      
      // 최근 30일 + 향후 7일 범위에서 경기 데이터 확인
      const games = await OddsCache.findAll({
        where: {
          sportKey: sportKey,
          commenceTime: {
            [require('sequelize').Op.between]: [thirtyDaysAgo, sevenDaysLater]
          }
        },
        order: [['commenceTime', 'ASC']]
      });
      
      const nowTime = now.getTime();
      const recentGames = games.filter(game => new Date(game.commenceTime).getTime() < nowTime);
      const upcomingGames = games.filter(game => new Date(game.commenceTime).getTime() >= nowTime);
      
      const nextGame = upcomingGames.length > 0 ? upcomingGames[0] : null;
      
      return {
        totalCount: games.length,
        recentCount: recentGames.length,
        upcomingCount: upcomingGames.length,
        nextGameDate: nextGame ? nextGame.commenceTime : null,
        hasData: games.length > 0
      };
    } catch (error) {
      console.log(`⚠️ DB 경기 체크 실패: ${error.message}`);
      return { totalCount: 0, recentCount: 0, upcomingCount: 0, nextGameDate: null, hasData: false };
    }
  }

  /**
   * 수집된 정보를 바탕으로 시즌 상태 결정 (개선된 범용 로직)
   */
  determineSeasonStatus({ hasOdds, recentGames, upcomingGames, dbGames, sportKey, currentStatus }) {
    const reasons = [];
    
    // 0. 실제 DB에 경기 데이터가 있는 경우 - 최우선 지표
    if (dbGames.hasData) {
      if (dbGames.upcomingCount > 0) {
        reasons.push(`DB 경기 데이터 존재 (${dbGames.upcomingCount}개 예정 경기)`);
        if (dbGames.recentCount > 0) {
          reasons.push(`최근 ${dbGames.recentCount}개 경기 완료`);
        }
        return {
          status: 'active',
          reason: reasons.join(', ')
        };
      } else if (dbGames.recentCount > 0) {
        reasons.push(`DB 경기 데이터 존재 (최근 ${dbGames.recentCount}개 경기)`);
        return {
          status: 'active',
          reason: reasons.join(', ')
        };
      }
    }
    
    // 1. 배당율 제공 중인 경우 - 가장 중요한 지표
    if (hasOdds.hasOdds) {
      // 1-1. 향후 경기가 있는 경우 - 시작 시점 확인 필요
      if (hasOdds.upcomingCount > 0) {
        const nextGameDate = hasOdds.nextGameDate || upcomingGames.nextGameDate;
        if (nextGameDate) {
          const gameDate = new Date(nextGameDate);
          const daysUntilNext = Math.ceil((gameDate - new Date()) / (1000 * 60 * 60 * 24));
          
          // 7일 이내면 active, 그 이상이면 offseason (조기 배당율 제공)
          if (daysUntilNext <= 7) {
            reasons.push(`배당율 제공 중 (${hasOdds.upcomingCount}경기)`);
            if (recentGames.count > 0) {
              reasons.push(`최근 30일 ${recentGames.count}경기 완료`);
            }
            return {
              status: 'active',
              reason: reasons.join(', ')
            };
          } else {
            return {
              status: 'offseason',
              reason: `시즌 시작 예정 (${daysUntilNext}일 후), 배당율 조기 제공 중`
            };
          }
        } else {
          // 다음 경기 날짜를 알 수 없는 경우 - 기존 로직 유지
          reasons.push(`배당율 제공 중 (${hasOdds.upcomingCount}경기)`);
          if (recentGames.count > 0) {
            reasons.push(`최근 30일 ${recentGames.count}경기 완료`);
          }
          return {
            status: 'active',
            reason: reasons.join(', ')
          };
        }
      }
      
      // 1-2. 향후 경기는 없지만 최근 경기가 있는 경우
      // (당일 경기만 제공하는 리그나 경기 종료 직후 상황 대응)
      if (recentGames.count > 0) {
        const lastGameDate = new Date(recentGames.lastGameDate);
        const now = new Date();
        const daysSinceLastGame = Math.ceil((now - lastGameDate) / (1000 * 60 * 60 * 24));
        
        // 최근 3일 이내 경기가 있고 배당율도 제공 중이면 여전히 시즌 진행 중
        if (daysSinceLastGame <= 3) {
          return {
            status: 'active',
            reason: `배당율 제공 중 (${hasOdds.totalCount}경기), 최근 ${daysSinceLastGame}일 전 경기 완료`
          };
        }
        
        // 최근 경기가 3일 이상 전이지만 배당율은 제공 중인 경우
        // 시즌 시작이 임박한 상황일 가능성
        const nextGameDate = hasOdds.nextGameDate || upcomingGames.nextGameDate;
        if (nextGameDate) {
          const gameDate = new Date(nextGameDate);
          const daysUntilNext = Math.ceil((gameDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysUntilNext <= 7) {
            return {
              status: 'active',
              reason: `배당율 제공 중, 시즌 시작 임박 (${daysUntilNext}일 후)`
            };
          } else {
            return {
              status: 'offseason',
              reason: `시즌 시작 예정 (${daysUntilNext}일 후), 배당율 조기 제공 중`
            };
          }
        }
        
        // 다음 경기 날짜를 알 수 없는 경우
        return {
          status: 'active',
          reason: `배당율 제공 중 (${hasOdds.totalCount}경기), 시즌 진행 중 추정`
        };
      }
      
      // 1-2-1. 최근 경기 데이터가 없지만 오늘 경기가 있는 경우 체크
      // (당일 경기만 제공하는 리그 특별 처리)
      if (hasOdds.games && hasOdds.games.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        const todayGames = hasOdds.games.filter(game => {
          const gameTime = new Date(game.commence_time + 'Z');
          return gameTime >= today && gameTime < tomorrow;
        });
        
        if (todayGames.length > 0) {
          return {
            status: 'active',
            reason: `배당율 제공 중 (${hasOdds.totalCount}경기), 오늘 경기 진행 중`
          };
        }
      }
      
      // 1-3. 배당율은 있지만 최근 경기도 향후 경기도 없는 경우
      // 시즌 시작 전 조기 배당율 제공 상황
      const nextGameDate = hasOdds.nextGameDate || upcomingGames.nextGameDate;
      if (nextGameDate) {
        const gameDate = new Date(nextGameDate);
        const daysUntilNext = Math.ceil((gameDate - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilNext <= 7) {
          return {
            status: 'active',
            reason: `배당율 제공 중 (${hasOdds.totalCount}경기), 시즌 시작 임박 (${daysUntilNext}일 후)`
          };
        } else {
          return {
            status: 'offseason',
            reason: `시즌 시작 예정 (${daysUntilNext}일 후), 배당율 조기 제공 중`
          };
        }
      }
      
      // 다음 경기 날짜를 모르는 경우 (fallback)
      return {
        status: 'offseason',
        reason: `배당율 제공 중 (${hasOdds.totalCount}경기), 시즌 시작일 미확정`
      };
    }

    // 2. 배당율은 없지만 최근 경기가 있는 경우
    if (recentGames.count > 0 && !hasOdds.hasOdds) {
      if (upcomingGames.count > 0) {
        reasons.push(`최근 ${recentGames.count}경기, 예정 ${upcomingGames.count}경기`);
        return {
          status: 'break',
          reason: '시즌 중 휴식기: ' + reasons.join(', ')
        };
      } else {
        reasons.push(`최근 ${recentGames.count}경기 완료, 예정 경기 없음`);
        return {
          status: 'offseason',
          reason: '시즌 종료: ' + reasons.join(', ')
        };
      }
    }

    // 3. 향후 경기만 있는 경우 (시즌 시작 전)
    if (upcomingGames.count > 0 && recentGames.count === 0) {
      const nextGameDate = new Date(upcomingGames.nextGameDate);
      const daysUntilNext = Math.ceil((nextGameDate - new Date()) / (1000 * 60 * 60 * 24));
      
      // 7일 이내면 active, 그 이상이면 offseason
      if (daysUntilNext <= 7) {
        return {
          status: 'active',
          reason: `시즌 시작 임박 (${daysUntilNext}일 후 ${upcomingGames.nextGameDate})`
        };
      } else {
        return {
          status: 'offseason',
          reason: `시즌 시작 예정 (${daysUntilNext}일 후 ${upcomingGames.nextGameDate})`
        };
      }
    }

    // 4. 아무 경기도 없는 경우
    return {
      status: 'offseason',
      reason: '최근 경기 없음, 예정 경기 없음, 배당율 미제공'
    };
  }

  /**
   * 시즌 상태에 따른 배당율 제공 권장사항 생성
   */
  getOddsProvisionRecommendation(result) {
    const { league, sportKey, newStatus, reason } = result;
    
    switch (newStatus) {
      case 'offseason':
        // 시즌오프인 경우 배당율 제공 중단/최소화 권장
        if (reason.includes('배당율 조기 제공')) {
          return {
            league,
            sportKey,
            action: 'reduce',
            recommendation: '배당율 제공 최소화 (주요 경기만)',
            reason: '시즌 시작까지 시간이 많이 남음 (API 비용 절약)'
          };
        } else {
          return {
            league,
            sportKey,
            action: 'stop',
            recommendation: '배당율 제공 중단',
            reason: '시즌 종료 또는 시작 예정 없음'
          };
        }
        
      case 'break':
        return {
          league,
          sportKey,
          action: 'reduce',
          recommendation: '배당율 제공 감소 (주요 경기만)',
          reason: '시즌 중 휴식기'
        };
        
      case 'active':
        return {
          league,
          sportKey,
          action: 'continue',
          recommendation: '정상 배당율 제공 유지',
          reason: '시즌 진행 중 또는 임박'
        };
        
      default:
        return null;
    }
  }
}

export default SeasonStatusChecker; 