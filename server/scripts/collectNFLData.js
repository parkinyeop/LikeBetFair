import axios from 'axios';
import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';

const API_KEY = '116108'; // TheSportsDB 프리미엄 키
const NFL_LEAGUE_ID = '4391'; // NFL 리그 ID

// NFL 팀명 세트 (정규화된 공식 팀명으로 검증)
const NFL_TEAMS = new Set([
  // NFC East
  'Philadelphia Eagles', 'Dallas Cowboys', 'New York Giants', 'Washington Commanders',
  // NFC North  
  'Detroit Lions', 'Green Bay Packers', 'Chicago Bears', 'Minnesota Vikings',
  // NFC South
  'Atlanta Falcons', 'New Orleans Saints', 'Tampa Bay Buccaneers', 'Carolina Panthers',
  // NFC West
  'San Francisco 49ers', 'Seattle Seahawks', 'Los Angeles Rams', 'Arizona Cardinals',
  // AFC East
  'Buffalo Bills', 'Miami Dolphins', 'New England Patriots', 'New York Jets',
  // AFC North
  'Baltimore Ravens', 'Pittsburgh Steelers', 'Cleveland Browns', 'Cincinnati Bengals',
  // AFC South
  'Houston Texans', 'Indianapolis Colts', 'Tennessee Titans', 'Jacksonville Jaguars',
  // AFC West
  'Kansas City Chiefs', 'Las Vegas Raiders', 'Los Angeles Chargers', 'Denver Broncos'
]);

// 팀명이 NFL 팀인지 확인하는 함수
function isNFLTeam(teamName) {
  const normalizedTeam = normalizeTeamName(teamName);
  return NFL_TEAMS.has(normalizedTeam);
}

// 경기 상태 매핑 (NFL 전용)
function mapStatus(status) {
  if (!status) return 'scheduled';
  const s = status.toLowerCase();
  if (s === 'match finished' || s === 'ft' || s === 'finished' || s === 'final') return 'finished';
  if (s === 'not started' || s === 'ns') return 'scheduled';
  if (s === 'in progress' || s === 'live' || s.includes('quarter') || s.includes('q')) return 'live';
  if (s === 'postponed' || s === 'pst') return 'cancelled';
  if (s === 'cancelled' || s === 'canc') return 'cancelled';
  return 'scheduled'; // 기본값
}

// 경기 존재 여부 확인 (eventId 우선, 없으면 팀명+날짜)
async function gameExists(eventId, homeTeam, awayTeam, date) {
  // eventId로 먼저 확인
  if (eventId) {
    const existingGame = await GameResult.findOne({ where: { eventId } });
    if (existingGame) return true;
  }
  
  // 팀명과 날짜로 확인
  const existingGame = await GameResult.findOne({
    where: {
      homeTeam,
      awayTeam,
      commenceTime: new Date(date)
    }
  });
  return !!existingGame;
}

// 단일 시즌 데이터 수집
async function collectSeasonData(season) {
  console.log(`\n=== ${season} NFL 시즌 데이터 수집 시작 ===`);
  
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsseason.php?id=${NFL_LEAGUE_ID}&s=${season}`;
    console.log(`API 호출: ${url}`);
    
    const response = await axios.get(url, { timeout: 30000 });
    const events = response.data?.events;
    
    if (!events || events.length === 0) {
      console.log(`${season} 시즌: 경기 데이터가 없습니다.`);
      return { total: 0, added: 0, existing: 0, errors: 0 };
    }

    console.log(`${season} 시즌: ${events.length}개 경기 발견`);
    
    let added = 0, existing = 0, errors = 0;
    
    for (const event of events) {
      try {
        // 기본 정보 추출
        const homeTeam = normalizeTeamName(event.strHomeTeam);
        const awayTeam = normalizeTeamName(event.strAwayTeam);
        const eventId = event.idEvent;
        const date = event.dateEvent;
        
        // NFL 팀 검증
        if (!isNFLTeam(homeTeam) || !isNFLTeam(awayTeam)) {
          console.log(`NFL 팀이 아님: ${homeTeam} vs ${awayTeam}`);
          continue;
        }
        
        // 중복 확인
        if (await gameExists(eventId, homeTeam, awayTeam, date)) {
          existing++;
          continue;
        }
        
        // 스코어 처리
        let score = null;
        if (event.intHomeScore !== null && event.intAwayScore !== null) {
          score = JSON.stringify([
            { name: homeTeam, score: event.intHomeScore.toString() },
            { name: awayTeam, score: event.intAwayScore.toString() }
          ]);
        }
        
        // 상태 매핑
        const status = mapStatus(event.strStatus);
        
        // DB에 저장
        await GameResult.create({
          eventId: eventId,
          homeTeam: homeTeam,
          awayTeam: awayTeam,
          commenceTime: new Date(date),
          status: status,
          score: score,
          mainCategory: 'american_football',
          subCategory: 'NFL',
          lastUpdated: new Date()
        });
        
        added++;
        
        if (added % 50 === 0) {
          console.log(`진행상황: ${added}개 경기 추가됨...`);
        }
        
      } catch (error) {
        console.error(`경기 처리 중 오류 (${event.strHomeTeam} vs ${event.strAwayTeam}):`, error.message);
        errors++;
      }
    }
    
    console.log(`${season} 시즌 완료: 총 ${events.length}개, 추가 ${added}개, 기존 ${existing}개, 오류 ${errors}개`);
    return { total: events.length, added, existing, errors };
    
  } catch (error) {
    console.error(`${season} 시즌 데이터 수집 실패:`, error.message);
    return { total: 0, added: 0, existing: 0, errors: 1 };
  }
}

// 메인 실행 함수
async function collectNFLData() {
  console.log('🏈 NFL 데이터 수집을 시작합니다...');
  console.log(`리그 ID: ${NFL_LEAGUE_ID}`);
  console.log(`API 키: ${API_KEY}`);
  
  // 현재 시즌만 수집 (2025)
  const seasons = ['2025']; // 현재 시즌만
  
  let totalStats = { total: 0, added: 0, existing: 0, errors: 0 };
  
  for (const season of seasons) {
    const stats = await collectSeasonData(season);
    totalStats.total += stats.total;
    totalStats.added += stats.added;
    totalStats.existing += stats.existing;
    totalStats.errors += stats.errors;
    
    // 시즌 간 잠시 대기
    if (seasons.indexOf(season) < seasons.length - 1) {
      console.log('다음 시즌 전 2초 대기...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n🎉 NFL 데이터 수집 완료!');
  console.log('='.repeat(50));
  console.log(`📊 최종 통계:`);
  console.log(`   총 경기 수: ${totalStats.total}`);
  console.log(`   새로 추가: ${totalStats.added}`);
  console.log(`   기존 경기: ${totalStats.existing}`);
  console.log(`   오류 발생: ${totalStats.errors}`);
  console.log('='.repeat(50));
  
  if (totalStats.errors === 0) {
    console.log('✅ 모든 데이터가 성공적으로 수집되었습니다!');
  } else {
    console.log(`⚠️  ${totalStats.errors}개의 오류가 발생했습니다.`);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  collectNFLData()
    .then(() => {
      console.log('NFL 데이터 수집 스크립트 종료');
      process.exit(0);
    })
    .catch(error => {
      console.error('NFL 데이터 수집 중 치명적 오류:', error);
      process.exit(1);
    });
}

export default collectNFLData; 