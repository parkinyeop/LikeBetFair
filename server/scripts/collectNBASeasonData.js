import axios from 'axios';
import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';
import createScriptSequelize from '../config/scriptDatabase.js';
const sequelize = createScriptSequelize();

const THESPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || '116108'; // 프리미엄 키
const NBA_LEAGUE_ID = '4387'; // NBA 리그 ID

// NBA 팀명 세트 (정규화된 공식 팀명으로 검증)
const NBA_TEAMS = new Set([
  'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets', 'Chicago Bulls',
  'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets', 'Detroit Pistons', 'Golden State Warriors',
  'Houston Rockets', 'Indiana Pacers', 'Los Angeles Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies',
  'Miami Heat', 'Milwaukee Bucks', 'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks',
  'Oklahoma City Thunder', 'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns', 'Portland Trail Blazers',
  'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors', 'Utah Jazz', 'Washington Wizards'
]);

// 팀명이 NBA 팀인지 확인하는 함수
function isNBATeam(teamName) {
  const normalizedTeam = normalizeTeamName(teamName);
  return NBA_TEAMS.has(normalizedTeam);
}

// 경기 상태 매핑
function mapStatus(status) {
  if (!status) return 'scheduled';
  const s = status.toLowerCase();
  if (s === 'match finished' || s === 'ft' || s === 'finished') return 'finished';
  if (s === 'ns' || s === 'not started') return 'scheduled';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'postponed' || s === 'post') return 'cancelled';
  if (s === 'in progress' || s === 'playing' || s === 'live') return 'live';
  return 'scheduled';
}

// 경기 결과 결정
function getResult(homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return 'pending';
  if (homeScore > awayScore) return 'home_win';
  if (awayScore > homeScore) return 'away_win';
  return 'draw';
}

// 기존 경기 존재 여부 확인
async function gameExists(eventId) {
  if (!eventId) return false;
  const game = await GameResult.findOne({
    where: { eventId }
  });
  return !!game;
}

async function collectNBASeasonData() {
  console.log('=== NBA 시즌별 데이터 수집 시작 ===\n');
  
  try {
    const seasons = ['2024-2025']; // 현재 시즌만
    let totalCollected = 0;
    let totalAdded = 0;
    let totalExists = 0;
    let totalErrors = 0;
    
    for (const season of seasons) {
      console.log(`📅 ${season} 시즌 데이터 수집 중...`);
      
      try {
        const url = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_API_KEY}/eventsseason.php?id=${NBA_LEAGUE_ID}&s=${season}`;
        console.log(`API 호출: ${url}`);
        
        const response = await axios.get(url);
        
        if (!response.data || !response.data.events) {
          console.log(`${season} 시즌 데이터가 없습니다.`);
          continue;
        }
        
        const events = response.data.events;
        console.log(`${season} 시즌: 총 ${events.length}개 경기 발견`);
        
        for (const event of events) {
          totalCollected++;
          
          try {
            // NBA 경기인지 확인
            if (!event.strSport || event.strSport !== 'Basketball') continue;
            if (!event.strLeague || !event.strLeague.includes('NBA')) continue;
            if (!isNBATeam(event.strHomeTeam) || !isNBATeam(event.strAwayTeam)) continue;
            
            // 기존 경기 존재 여부 확인
            if (await gameExists(event.idEvent)) {
              totalExists++;
              continue;
            }
            
            // 팀명 정규화
            const homeTeam = normalizeTeamName(event.strHomeTeam);
            const awayTeam = normalizeTeamName(event.strAwayTeam);
            
            // 경기 시간 설정
            let commenceTime;
            if (event.strTime && event.strTime !== '00:00:00') {
              // strTimestamp가 UTC 시간이므로 이를 사용
        if (event.strTimestamp) {
          commenceTime = new Date(event.strTimestamp);
        } else if (event.dateEvent && event.strTime) {
          commenceTime = new Date(`${event.dateEvent}T${event.strTime}`);
        } else {
          console.log(`⚠️ 시간 정보 없음: ${event.strHomeTeam} vs ${event.strAwayTeam}`);
          continue;
        }
            } else {
              commenceTime = new Date(`${event.dateEvent}T01:00:00`); // NBA 기본 시간
            }
            
            // 상태 결정
            const status = mapStatus(event.strStatus);
            
            // 스코어 형식 통일
            let score = null;
            let result = 'pending';
            
            if (event.intHomeScore !== null && event.intAwayScore !== null) {
              score = JSON.stringify([
                {"name": homeTeam, "score": event.intHomeScore.toString()},
                {"name": awayTeam, "score": event.intAwayScore.toString()}
              ]);
              result = getResult(event.intHomeScore, event.intAwayScore);
            }
            
            // 데이터베이스에 저장
            await GameResult.create({
              mainCategory: 'basketball',
              subCategory: 'NBA',
              homeTeam: homeTeam,
              awayTeam: awayTeam,
              commenceTime: commenceTime,
              status: status,
              score: score,
              // result 필드 제거 - status로 대체
              eventId: event.idEvent,
              lastUpdated: new Date()
            });
            
            totalAdded++;
            
            if (totalAdded % 50 === 0) {
              console.log(`${totalAdded}개 경기 저장 완료...`);
            }
            
          } catch (error) {
            console.error(`경기 저장 중 오류: ${event.strHomeTeam} vs ${event.strAwayTeam}`, error.message);
            totalErrors++;
          }
        }
        
        console.log(`${season} 시즌 완료: 저장 ${totalAdded}개, 기존 ${totalExists}개, 에러 ${totalErrors}개\n`);
        
      } catch (error) {
        console.error(`${season} 시즌 데이터 수집 실패:`, error.message);
        totalErrors++;
      }
    }
    
    console.log(`\n=== NBA 시즌 데이터 수집 완료 ===`);
    console.log(`📊 총 처리된 경기: ${totalCollected}개`);
    console.log(`✅ 새로 추가: ${totalAdded}개`);
    console.log(`🔄 이미 존재: ${totalExists}개`);
    console.log(`❌ 에러: ${totalErrors}개`);
    
    // 데이터 확인
    const totalGames = await GameResult.count({
      where: { subCategory: 'NBA' }
    });
    console.log(`데이터베이스 내 NBA 경기 총 개수: ${totalGames}`);
    
  } catch (error) {
    console.error('NBA 시즌 데이터 수집 중 오류:', error);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  collectNBASeasonData().then(async () => {

    console.log('스크립트 실행 완료');
    process.exit(0);
  
      // 데이터베이스 연결 종료
      console.log('🔌 데이터베이스 연결 종료 중...');
      await sequelize.close();
      console.log('✅ 데이터베이스 연결 종료 완료');
    }).catch(async (error) => {

    console.error('스크립트 실행 중 오류:', error);
    process.exit(1);
  
      // 데이터베이스 연결 종료
      console.log('🔌 데이터베이스 연결 종료 중...');
      await sequelize.close();
      console.log('✅ 데이터베이스 연결 종료 완료');
    });
}

export default collectNBASeasonData; 