import GameResult from '../models/gameResultModel.js';
import Bet from '../models/betModel.js';
import { Op } from 'sequelize';
import createScriptSequelize from '../config/scriptDatabase.js';
import betResultService from './betResultService.js';
import OddsCache from '../models/oddsCacheModel.js';
import oddsApiService from './oddsApiService.js';
import { normalizeTeamName, normalizeCategory, normalizeCommenceTime, normalizeCategoryPair } from '../normalizeUtils.js';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();

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
  'Brasileirao': 'soccer_brazil_campeonato'
};

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
  'soccer_spain_la_liga': { main: 'soccer', sub: 'LALIGA' },
  'soccer_germany_bundesliga': { main: 'soccer', sub: 'BUNDESLIGA' },
  'soccer_england_premier_league': { main: 'soccer', sub: 'EPL' },
  'soccer_epl': { main: 'soccer', sub: 'EPL' },
  
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
const allowedCategories = ['baseball', 'soccer', 'basketball', 'american_football'];

// 스포츠키로부터 표준화된 카테고리 얻기
function getStandardizedCategory(sportKey) {
  const category = standardizedCategoryMap[sportKey];
  if (category) {
    return { main: category.main, sub: category.sub };
  }
  const parts = sportKey ? sportKey.split('_') : [];
  const main = parts[0] || '';
  const sub = parts.slice(1).join('_') || '';
  return normalizeCategoryPair(main, sub);
}

/**
 * ✨ The Odds API 전용 경기 결과 서비스
 * TheSportsDB 의존성 완전 제거
 */
class GameResultService {
  constructor() {
    console.log('[GameResultService] ✅ The Odds API 전용 서비스 초기화');
  }

  /**
   * The Odds API Scores 엔드포인트로 경기 결과 가져오기
   * @param {string} sportKey - 스포츠 키 (예: soccer_epl, basketball_nba)
   * @param {number} daysFrom - 과거 며칠간의 결과 조회 (기본값: 7일)
   * @returns {Promise<Array>} 경기 결과 배열
   */
  async fetchResults(sportKey, daysFrom = 7) {
    try {
      console.log(`[GameResult] 📊 ${sportKey} 경기 결과 조회 시작 (${daysFrom}일)`);

      // oddsApiService의 fetchScores 사용
      const scoresData = await oddsApiService.fetchScores(sportKey, daysFrom);

      if (!scoresData || scoresData.length === 0) {
        console.log(`[GameResult] ⚠️ ${sportKey}: 결과 데이터 없음`);
        return [];
      }

      // The Odds API 형식을 GameResult 모델 형식으로 변환
      const convertedData = scoresData.map(event => {
        return {
          id: event.id,
          eventId: event.id,  // The Odds API ID 저장
          home_team: event.home_team,
          away_team: event.away_team,
          commence_time: event.commence_time,
          completed: event.completed,
          scores: event.scores,
          sport_key: event.sport_key || sportKey,
          sport_title: event.sport_title,
          last_update: event.last_update
        };
      });

      console.log(`[GameResult] ✅ ${sportKey}: ${convertedData.length}개 경기 변환 완료`);
      console.log(`[GameResult]   - 완료된 경기: ${convertedData.filter(g => g.completed).length}개`);
      console.log(`[GameResult]   - 진행 중/예정: ${convertedData.filter(g => !g.completed).length}개`);

      return convertedData;

    } catch (error) {
      console.error(`[GameResult] ❌ ${sportKey} 결과 조회 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 경기 결과를 데이터베이스에 저장
   * @param {string} sportKey - 스포츠 키
   * @param {number} daysFrom - 과거 며칠간의 결과 조회
   */
  async saveResults(sportKey, daysFrom = 7) {
    try {
      console.log(`[GameResult] 💾 ${sportKey} 결과 저장 시작`);

      const results = await this.fetchResults(sportKey, daysFrom);

      if (!results || results.length === 0) {
        console.log(`[GameResult] ⚠️ ${sportKey}: 저장할 데이터 없음`);
        return { saved: 0, updated: 0, skipped: 0 };
      }

    let savedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      const { main, sub } = getStandardizedCategory(sportKey);

      for (const result of results) {
        try {
          // 완료된 경기만 저장
          if (!result.completed || !result.scores) {
            skippedCount++;
          continue;
        }

          const homeTeam = normalizeTeamName(result.home_team);
          const awayTeam = normalizeTeamName(result.away_team);
          const commenceTime = new Date(result.commence_time);

          // 기존 레코드 확인 (eventId 또는 팀명+시간으로)
          let existingResult = await GameResult.findOne({
                  where: {
                    [Op.or]: [
                { eventId: result.eventId },
                {
                  homeTeam: homeTeam,
                  awayTeam: awayTeam,
                  commenceTime: commenceTime,
                  sportKey: sportKey
                }
              ]
            }
          });

                const gameData = {
            eventId: result.eventId,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            commenceTime: commenceTime,
            status: result.completed ? 'finished' : 'scheduled',
            score: result.scores,
                  sportKey: sportKey,
            sportTitle: result.sport_title || sportKey,
            mainCategory: main,
            subCategory: sub,
            lastUpdated: result.last_update ? new Date(result.last_update) : new Date()
          };

          if (existingResult) {
            // 업데이트
            await existingResult.update(gameData);
            updatedCount++;
            console.log(`[GameResult] 🔄 업데이트: ${homeTeam} vs ${awayTeam}`);
                } else {
            // 새로 생성
                  await GameResult.create(gameData);
            savedCount++;
            console.log(`[GameResult] ✅ 저장: ${homeTeam} vs ${awayTeam}`);
          }

        } catch (error) {
          console.error(`[GameResult] ❌ 저장 실패 (${result.home_team} vs ${result.away_team}):`, error.message);
          skippedCount++;
        }
      }

      console.log(`[GameResult] 💾 ${sportKey} 저장 완료: 신규 ${savedCount}, 업데이트 ${updatedCount}, 건너뜀 ${skippedCount}`);

      return { saved: savedCount, updated: updatedCount, skipped: skippedCount };
      
    } catch (error) {
      console.error(`[GameResult] ❌ ${sportKey} 저장 프로세스 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 배당률 데이터(OddsCache)와 경기 결과 매칭
   * @param {string} sportKey - 스포츠 키
   */
  async matchOddsWithResults(sportKey) {
    try {
      console.log(`[GameResult] 🔗 ${sportKey} 배당률-결과 매칭 시작`);

      // 완료된 경기 결과 가져오기
      const completedResults = await GameResult.findAll({
                where: {
          sportKey: sportKey,
          status: 'finished',
          score: { [Op.ne]: null }
        }
      });

      if (completedResults.length === 0) {
        console.log(`[GameResult] ⚠️ ${sportKey}: 완료된 경기 없음`);
        return 0;
      }

      console.log(`[GameResult] 📊 ${sportKey}: ${completedResults.length}개 완료된 경기 발견`);

      let matchedCount = 0;

      for (const result of completedResults) {
        // 정규화된 팀명으로 OddsCache 찾기
        const oddsRecords = await OddsCache.findAll({
          where: {
            sportKey: sportKey,
            [Op.or]: [
              {
                [Op.and]: [
                  { homeTeam: result.homeTeam },
                  { awayTeam: result.awayTeam }
                ]
              },
              // 팀명 순서가 바뀐 경우도 체크
              {
                [Op.and]: [
                  { homeTeam: result.awayTeam },
                  { awayTeam: result.homeTeam }
                ]
              }
            ]
          }
        });

        if (oddsRecords.length > 0) {
          console.log(`[GameResult] ✅ 매칭: ${result.homeTeam} vs ${result.awayTeam} (${oddsRecords.length}개 배당률)`);
          matchedCount++;

          // TODO: 여기서 배팅 정산 로직 호출 가능
          // await this.settleBetsForGame(result, oddsRecords);
        }
      }

      console.log(`[GameResult] 🔗 ${sportKey} 매칭 완료: ${matchedCount}/${completedResults.length}개`);

      return matchedCount;

    } catch (error) {
      console.error(`[GameResult] ❌ ${sportKey} 매칭 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 모든 활성 스포츠의 경기 결과 업데이트
   * @param {Array<string>} sportKeys - 스포츠 키 배열 (선택사항)
   * @param {number} daysFrom - 과거 며칠간의 결과 조회
   */
  async updateAllResults(sportKeys = null, daysFrom = 7) {
    try {
      console.log('[GameResult] 🔄 전체 경기 결과 업데이트 시작');

      // sportKeys가 없으면 기본 스포츠 목록 사용
      const keys = sportKeys || Object.values(clientSportKeyMap).filter((value, index, self) => self.indexOf(value) === index);

      console.log(`[GameResult] 📋 ${keys.length}개 스포츠 업데이트 예정`);

      const results = [];

      for (const sportKey of keys) {
        try {
          const result = await this.saveResults(sportKey, daysFrom);
          results.push({
            sportKey,
            success: true,
            ...result
          });

          // API Rate Limiting 방지
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`[GameResult] ❌ ${sportKey} 업데이트 실패:`, error.message);
          results.push({
            sportKey,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalSaved = results.reduce((sum, r) => sum + (r.saved || 0), 0);
      const totalUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);

      console.log('[GameResult] 🎉 전체 업데이트 완료');
      console.log(`[GameResult]   - 성공: ${successCount}/${keys.length}개 스포츠`);
      console.log(`[GameResult]   - 신규 저장: ${totalSaved}개`);
      console.log(`[GameResult]   - 업데이트: ${totalUpdated}개`);

      return results;

    } catch (error) {
      console.error('[GameResult] ❌ 전체 업데이트 실패:', error.message);
      throw error;
    }
  }

  /**
   * 특정 경기의 결과 조회
   * @param {string} homeTeam - 홈팀명
   * @param {string} awayTeam - 어웨이팀명
   * @param {string} sportKey - 스포츠 키
   * @returns {Promise<Object|null>} 경기 결과 또는 null
   */
  async getGameResult(homeTeam, awayTeam, sportKey) {
    try {
      const normalizedHome = normalizeTeamName(homeTeam);
      const normalizedAway = normalizeTeamName(awayTeam);

      const result = await GameResult.findOne({
        where: {
          homeTeam: normalizedHome,
          awayTeam: normalizedAway,
          sportKey: sportKey,
          status: 'finished'
        },
        order: [['commenceTime', 'DESC']]
      });

      if (result) {
        console.log(`[GameResult] ✅ 경기 결과 발견: ${homeTeam} vs ${awayTeam}`);
        return result;
      } else {
        console.log(`[GameResult] ⚠️ 경기 결과 없음: ${homeTeam} vs ${awayTeam}`);
        return null;
      }

    } catch (error) {
      console.error(`[GameResult] ❌ 경기 결과 조회 실패:`, error.message);
      return null;
    }
  }

  /**
   * 대기 중인 배팅 정산
   * (기존 betResultService와 통합)
   */
  async settlePendingBets() {
    try {
      console.log('[GameResult] ⚖️ 대기 중인 배팅 정산 시작');

      const pendingBets = await Bet.findAll({
        where: {
          status: 'pending',
          commence_time: {
            [Op.lt]: new Date() // 경기 시작 시간이 지난 배팅
          }
        }
      });

      if (pendingBets.length === 0) {
        console.log('[GameResult] ℹ️ 정산할 배팅 없음');
        return { settled: 0, pending: 0 };
      }

      console.log(`[GameResult] 📊 ${pendingBets.length}개 배팅 정산 대기 중`);

      let settledCount = 0;
      let stillPendingCount = 0;

      for (const bet of pendingBets) {
        try {
          // betResultService 호출
          const settled = await betResultService.settleBet(bet);
          
          if (settled) {
            settledCount++;
          } else {
            stillPendingCount++;
          }

    } catch (error) {
          console.error(`[GameResult] ❌ 배팅 #${bet.id} 정산 실패:`, error.message);
          stillPendingCount++;
        }
      }

      console.log(`[GameResult] ⚖️ 정산 완료: ${settledCount}개, 대기: ${stillPendingCount}개`);

      return { settled: settledCount, pending: stillPendingCount };

    } catch (error) {
      console.error('[GameResult] ❌ 배팅 정산 실패:', error.message);
      throw error;
    }
  }
}

const gameResultService = new GameResultService();
export default gameResultService;
