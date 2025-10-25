import GameResult from '../models/gameResultModel.js';
import axios from 'axios';
import createScriptSequelize from '../config/scriptDatabase.js';
import { normalizeTeamName } from '../normalizeUtils.js';
const sequelize = createScriptSequelize();

const API_KEY = process.env.THESPORTSDB_API_KEY || '116108'; // SportsDB API 키
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

// 누락된 리그들의 SportsDB 리그 ID 매핑
const missingLeagueMap = {
  'SERIE_A': { id: '4332', name: 'Italian Serie A', mainCategory: 'soccer', sportKey: 'soccer_italy_serie_a', sportTitle: 'Serie A' },
  'BRASILEIRAO': { id: '4351', name: 'Brazilian Serie A', mainCategory: 'soccer', sportKey: 'soccer_brazil_campeonato', sportTitle: 'Brasileirao' },
  'ARGENTINA_PRIMERA': { id: '4406', name: 'Argentinian Primera Division', mainCategory: 'soccer', sportKey: 'soccer_argentina_primera_division', sportTitle: 'Argentina Primera' },
  'CSL': { id: '4688', name: 'Chinese Super League', mainCategory: 'soccer', sportKey: 'soccer_china_superleague', sportTitle: 'Chinese Super League' },
  'SEGUNDA_DIVISION': { id: '4396', name: 'Spanish Segunda Division', mainCategory: 'soccer', sportKey: 'soccer_spain_segunda_division', sportTitle: 'Segunda Division' },
  'BUNDESLIGA': { id: '4331', name: 'German Bundesliga', mainCategory: 'soccer', sportKey: 'soccer_germany_bundesliga', sportTitle: 'Bundesliga' },
  'NHL': { id: '4380', name: 'NHL', mainCategory: 'icehockey', sportKey: 'icehockey_nhl', sportTitle: 'NHL' }
};

// 상태 매핑
function mapStatus(status) {
  if (!status) return 'scheduled';
  const s = status.toLowerCase();
  if (s === 'ft' || s === 'match finished' || s.includes('finished')) return 'finished';
  if (s === 'ns' || s === 'not started') return 'scheduled';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'postponed') return 'postponed';
  if (s === 'in progress' || s === 'playing' || s === 'live') return 'live';
  return 'scheduled';
}

// 결과 판정
function getResult(homeScore, awayScore) {
  if (homeScore == null || awayScore == null) return 'pending';
  const home = Number(homeScore);
  const away = Number(awayScore);
  if (isNaN(home) || isNaN(away)) return 'pending';
  if (home > away) return 'home_win';
  if (home < away) return 'away_win';
  return 'draw';
}

// 최근 30일간의 경기 결과 수집
async function collectMissingLeagueResults() {
  console.log('누락된 리그들의 경기 결과 수집을 시작합니다...');
  
  let totalUpserts = 0;
  
  for (const [subCategory, leagueInfo] of Object.entries(missingLeagueMap)) {
    console.log(`\n=== ${subCategory} (${leagueInfo.name}) 수집 중... ===`);
    
    // 최근 30일간 데이터 수집
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    let currentDate = new Date(startDate);
    let leagueUpserts = 0;
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10); // YYYY-MM-DD
      
      try {
        // SportsDB API 호출
        const url = `${BASE_URL}/${API_KEY}/eventsday.php?d=${dateStr}&id=${leagueInfo.id}`;
        const response = await axios.get(url, { timeout: 10000 });
        
        const events = response.data?.events || [];
        
        if (events.length > 0) {
          console.log(`  ${dateStr}: ${events.length}경기 발견`);
          
          for (const event of events) {
            if (!event.strHomeTeam || !event.strAwayTeam) continue;
            
            const homeScore = event.intHomeScore != null ? Number(event.intHomeScore) : null;
            const awayScore = event.intAwayScore != null ? Number(event.intAwayScore) : null;
            const status = mapStatus(event.strStatus);
            const result = getResult(homeScore, awayScore);
            
            // ✅ 규칙: FT(Full Time) 또는 AOT(After Over Time)만 저장
            const isFinished = event.strStatus === 'Match Finished' || event.strStatus === 'FT' || event.intHomeScore !== null;
            if (!isFinished) {
              console.log(`    [스킵] ${event.strHomeTeam} vs ${event.strAwayTeam} - FT/AOT 아님 (${event.strStatus})`);
              continue;
            }
            
            // 경기 시간 파싱 (기본값: 00:00:00, UTC 기준)
            const timeStr = event.strTime || '00:00:00';
            const commenceTime = new Date(`${event.dateEvent}T${timeStr}Z`);
            
            // ✅ 팀명 정규화 (ExchangeOrder와 동일한 형식으로 저장)
            const normalizedHomeTeam = normalizeTeamName(event.strHomeTeam);
            const normalizedAwayTeam = normalizeTeamName(event.strAwayTeam);
            
            // GameResult에 upsert
            await GameResult.upsert({
              eventId: event.idEvent,
              mainCategory: leagueInfo.mainCategory,
              subCategory: subCategory,
              sportKey: leagueInfo.sportKey,
              sportTitle: leagueInfo.sportTitle,
              homeTeam: normalizedHomeTeam,
              awayTeam: normalizedAwayTeam,
              commenceTime: commenceTime,
              status: 'finished',
              score: (homeScore != null && awayScore != null) ? [
                { name: normalizedHomeTeam, score: homeScore.toString() },
                { name: normalizedAwayTeam, score: awayScore.toString() }
              ] : null,
              lastUpdated: new Date()
            }, {
              conflictFields: ['homeTeam', 'awayTeam', 'commenceTime']
            });
            
            leagueUpserts++;
            totalUpserts++;
            
            console.log(`    [저장] ${event.strHomeTeam} vs ${event.strAwayTeam} | ${homeScore}-${awayScore} | ${status} | ${result}`);
          }
        }
        
        // API 호출 간격 (Rate limiting 방지)
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`  ${dateStr} API 호출 에러:`, error.message);
      }
      
      // 다음 날로 이동
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`${subCategory} 완료: ${leagueUpserts}경기 저장`);
  }
  
  console.log(`\n=== 수집 완료 ===`);
  console.log(`총 ${totalUpserts}경기의 결과를 DB에 저장했습니다.`);
  
  // 결과 요약
  console.log('\n=== 저장 후 리그별 현황 ===');
  for (const subCategory of Object.keys(missingLeagueMap)) {
    const count = await GameResult.count({ 
      where: { subCategory: subCategory } 
    });
    console.log(`${subCategory}: ${count}경기`);
  }
}

// 스크립트 실행
collectMissingLeagueResults()
  .then(async () => {

    console.log('스크립트 실행 완료');
    process.exit(0);
  
      // 데이터베이스 연결 종료
      console.log('🔌 데이터베이스 연결 종료 중...');
      await sequelize.close();
      console.log('✅ 데이터베이스 연결 종료 완료');
    })
  .catch(async (error) => {

    console.error('스크립트 실행 중 에러:', error);
    process.exit(1);
  
      // 데이터베이스 연결 종료
      console.log('🔌 데이터베이스 연결 종료 중...');
      await sequelize.close();
      console.log('✅ 데이터베이스 연결 종료 완료');
    }); 