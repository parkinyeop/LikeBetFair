import axios from 'axios';
import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';

const API_KEY = '116108'; // TheSportsDB 프리미엄 키
const KBL_LEAGUE_ID = '5124'; // KBL 리그 ID

// KBL 팀명 세트 (정규화된 공식 팀명으로 검증)
const KBL_TEAMS = new Set([
  'Seoul SK Knights', 'Changwon LG Sakers', 'Ulsan Hyundai Mobis Phoebus', 
  'Suwon KT Sonicboom', 'Seoul Samsung Thunders', 'Jeonju KCC Egis',
  'Wonju DB Promy', 'Daegu KOGAS Pegasus', 'Anyang JungKwanJang', 'Goyang Sono'
]);

// 팀명이 KBL 팀인지 확인하는 함수
function isKBLTeam(teamName) {
  const normalizedTeam = normalizeTeamName(teamName);
  return KBL_TEAMS.has(normalizedTeam);
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

async function collectKBLSeasonData() {
  console.log('=== KBL 시즌별 데이터 수집 시작 ===\n');
  
  try {
    const seasons = ['2024-2025']; // 현재 시즌만
    let totalCollected = 0;
    let totalAdded = 0;
    let totalExists = 0;
    let totalErrors = 0;
    
    for (const season of seasons) {
      console.log(`🏀 ${season} 시즌 데이터 수집 중...`);
      
      try {
        const url = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsseason.php?id=${KBL_LEAGUE_ID}&s=${season}`;
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
            // KBL 경기인지 확인
            if (!event.strSport || event.strSport !== 'Basketball') continue;
            if (!event.strLeague || !event.strLeague.includes('Korean Basketball League')) continue;
            if (!isKBLTeam(event.strHomeTeam) || !isKBLTeam(event.strAwayTeam)) continue;
            
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
              commenceTime = new Date(`${event.dateEvent}T10:00:00`); // KBL 기본 시간 (KST 19:00)
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
              subCategory: 'KBL',
              homeTeam: homeTeam,
              awayTeam: awayTeam,
              commenceTime: commenceTime,
              status: status,
              score: score,
              result: result,
              eventId: event.idEvent,
              lastUpdated: new Date()
            });
            
            totalAdded++;
            
            if (totalAdded % 10 === 0) {
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
    
    console.log(`\n=== KBL 시즌 데이터 수집 완료 ===`);
    console.log(`📊 총 처리된 경기: ${totalCollected}개`);
    console.log(`✅ 새로 추가: ${totalAdded}개`);
    console.log(`🔄 이미 존재: ${totalExists}개`);
    console.log(`❌ 에러: ${totalErrors}개`);
    
    // 데이터 확인
    const totalGames = await GameResult.count({
      where: { subCategory: 'KBL' }
    });
    console.log(`데이터베이스 내 KBL 경기 총 개수: ${totalGames}`);
    
  } catch (error) {
    console.error('KBL 시즌 데이터 수집 중 오류:', error);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  collectKBLSeasonData().then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  }).catch(error => {
    console.error('스크립트 실행 중 오류:', error);
    process.exit(1);
  });
}

export default collectKBLSeasonData; 