import axios from 'axios';
import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';

const THESPORTSDB_API_KEY = '123'; // 테스트 키
const LEAGUE_ID = '4331'; // 독일 분데스리가

// 분데스리가 팀명 매핑 (2024-25 시즌 18개 팀)
const BUNDESLIGA_TEAMS = {
  'Bayern Munich': 'Bayern Munich',
  'Borussia Dortmund': 'Borussia Dortmund',
  'Bayer Leverkusen': 'Bayer Leverkusen',
  'RB Leipzig': 'RB Leipzig',
  'Eintracht Frankfurt': 'Eintracht Frankfurt',
  'VfB Stuttgart': 'VfB Stuttgart',
  'Borussia Mönchengladbach': 'Borussia Mönchengladbach',
  'Werder Bremen': 'Werder Bremen',
  'Freiburg': 'Freiburg',
  'Union Berlin': 'Union Berlin',
  'VfL Wolfsburg': 'VfL Wolfsburg',
  'FC Augsburg': 'FC Augsburg',
  'Mainz': 'Mainz',
  'Hoffenheim': 'Hoffenheim',
  'FC Heidenheim': 'FC Heidenheim',
  'St Pauli': 'St Pauli',
  'VfL Bochum': 'VfL Bochum',
  'Holstein Kiel': 'Holstein Kiel'
};

async function collectSeasonData(season) {
  console.log(`\n${season} 시즌 데이터 수집 중...`);
  
  const seasonUrl = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_API_KEY}/eventsseason.php?id=${LEAGUE_ID}&s=${season}`;
  console.log(`API 호출: ${seasonUrl}`);
  
  const response = await axios.get(seasonUrl);
  
  if (!response.data || !response.data.events) {
    console.log(`${season} 시즌 데이터가 없습니다.`);
    return { saved: 0, skipped: 0 };
  }
  
  const events = response.data.events;
  console.log(`${season} 시즌: 총 ${events.length}개 경기 발견`);
  
  let savedCount = 0;
  let skippedCount = 0;
  
  for (const event of events) {
    try {
      // 필수 필드 확인
      if (!event.strHomeTeam || !event.strAwayTeam || !event.dateEvent) {
        console.log(`필수 필드 누락으로 스킵: ${JSON.stringify(event)}`);
        skippedCount++;
        continue;
      }
      
      // 팀명 정규화
      const homeTeam = normalizeTeamName(event.strHomeTeam);
      const awayTeam = normalizeTeamName(event.strAwayTeam);
      
      // 경기 시간 설정
      let commenceTime;
      if (event.strTime && event.strTime !== '00:00:00') {
        commenceTime = new Date(`${event.dateEvent}T${event.strTime}`);
      } else {
        commenceTime = new Date(`${event.dateEvent}T15:30:00`); // 분데스리가 기본 시간
      }
      
      // 상태 결정
      let status = 'scheduled';
      if (event.strStatus === 'Match Finished' || event.intHomeScore !== null) {
        status = 'finished';
      } else if (event.strStatus === 'Not Started') {
        status = 'scheduled';
      }
      
      // 스코어 형식 통일
      let score = null;
      if (event.intHomeScore !== null && event.intAwayScore !== null) {
        score = JSON.stringify([
          {"name": homeTeam, "score": event.intHomeScore.toString()},
          {"name": awayTeam, "score": event.intAwayScore.toString()}
        ]);
      }
      
      // 결과 결정
      let result = null;
      if (status === 'finished' && event.intHomeScore !== null && event.intAwayScore !== null) {
        if (event.intHomeScore > event.intAwayScore) {
          result = 'home_win';
        } else if (event.intAwayScore > event.intHomeScore) {
          result = 'away_win';
        } else {
          result = 'draw';
        }
      }
      
      // 데이터베이스에 저장
      await GameResult.upsert({
        mainCategory: 'soccer',
        subCategory: 'BUNDESLIGA',
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        commenceTime: commenceTime,
        status: status,
        score: score,
        result: result,
        eventId: event.idEvent,
        lastUpdated: new Date()
      });
      
      savedCount++;
      
      if (savedCount % 50 === 0) {
        console.log(`${savedCount}개 경기 저장 완료...`);
      }
      
    } catch (error) {
      console.error(`경기 저장 중 오류: ${event.strHomeTeam} vs ${event.strAwayTeam}`, error.message);
      skippedCount++;
    }
  }
  
  console.log(`${season} 시즌 완료: 저장 ${savedCount}개, 스킵 ${skippedCount}개`);
  return { saved: savedCount, skipped: skippedCount };
}

async function collectBundesligaData() {
  try {
    console.log('독일 분데스리가 데이터 수집 시작...');
    
    // 여러 시즌 데이터 수집
    const seasons = ['2023-2024', '2024-2025'];
    let totalSaved = 0;
    let totalSkipped = 0;
    
    for (const season of seasons) {
      const result = await collectSeasonData(season);
      totalSaved += result.saved;
      totalSkipped += result.skipped;
    }
    
    console.log(`\n=== 독일 분데스리가 데이터 수집 완료 ===`);
    console.log(`총 저장된 경기: ${totalSaved}`);
    console.log(`총 스킵된 경기: ${totalSkipped}`);
    
    // 데이터 확인
    const totalGames = await GameResult.count({
      where: { subCategory: 'BUNDESLIGA' }
    });
    console.log(`데이터베이스 내 분데스리가 경기 총 개수: ${totalGames}`);
    
  } catch (error) {
    console.error('분데스리가 데이터 수집 중 오류:', error);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  collectBundesligaData().then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  }).catch(error => {
    console.error('스크립트 실행 중 오류:', error);
    process.exit(1);
  });
}

export default collectBundesligaData; 