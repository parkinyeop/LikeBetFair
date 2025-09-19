import axios from 'axios';
import { Op } from 'sequelize';
import GameResult from '../models/gameResultModel.js';
import sequelize from '../models/sequelize.js';
import { normalizeTeamName, normalizeCategoryPair } from '../normalizeUtils.js';

const API_KEY = process.env.THESPORTSDB_API_KEY || '116108'; // TheSportsDB 프리미엄 키
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
const MLB_LEAGUE_ID = '4424'; // MLB 리그 ID

// MLB 팀명 정규화 매핑 (공식 팀명으로 통일)
const mlbTeamNameMap = {
  // 애리조나
  'Arizona Diamondbacks': 'Arizona Diamondbacks',
  'Arizona': 'Arizona Diamondbacks',
  
  // 애틀랜타
  'Atlanta Braves': 'Atlanta Braves',
  'Atlanta': 'Atlanta Braves',
  
  // 볼티모어
  'Baltimore Orioles': 'Baltimore Orioles',
  'Baltimore': 'Baltimore Orioles',
  
  // 보스턴
  'Boston Red Sox': 'Boston Red Sox',
  'Boston': 'Boston Red Sox',
  
  // 시카고 컵스
  'Chicago Cubs': 'Chicago Cubs',
  'Chi Cubs': 'Chicago Cubs',
  
  // 시카고 화이트삭스
  'Chicago White Sox': 'Chicago White Sox',
  'Chi White Sox': 'Chicago White Sox',
  'Chicago': 'Chicago White Sox', // 기본적으로 화이트삭스로 매핑
  
  // 신시내티
  'Cincinnati Reds': 'Cincinnati Reds',
  'Cincinnati': 'Cincinnati Reds',
  
  // 클리블랜드
  'Cleveland Guardians': 'Cleveland Guardians',
  'Cleveland': 'Cleveland Guardians',
  
  // 콜로라도
  'Colorado Rockies': 'Colorado Rockies',
  'Colorado': 'Colorado Rockies',
  
  // 디트로이트
  'Detroit Tigers': 'Detroit Tigers',
  'Detroit': 'Detroit Tigers',
  
  // 휴스턴
  'Houston Astros': 'Houston Astros',
  'Houston': 'Houston Astros',
  'Houston A': 'Houston Astros',
  
  // 캔자스시티
  'Kansas City Royals': 'Kansas City Royals',
  'Kansas City': 'Kansas City Royals',
  'KC Royals': 'Kansas City Royals',
  
  // LA 에인절스
  'Los Angeles Angels': 'Los Angeles Angels',
  'LA Angels': 'Los Angeles Angels',
  'Angels': 'Los Angeles Angels',
  
  // LA 다저스
  'Los Angeles Dodgers': 'Los Angeles Dodgers',
  'LA Dodgers': 'Los Angeles Dodgers',
  'Dodgers': 'Los Angeles Dodgers',
  
  // 마이애미
  'Miami Marlins': 'Miami Marlins',
  'Miami': 'Miami Marlins',
  
  // 밀워키
  'Milwaukee Brewers': 'Milwaukee Brewers',
  'Milwaukee': 'Milwaukee Brewers',
  
  // 미네소타
  'Minnesota Twins': 'Minnesota Twins',
  'Minnesota': 'Minnesota Twins',
  
  // 뉴욕 메츠
  'New York Mets': 'New York Mets',
  'NY Mets': 'New York Mets',
  'Mets': 'New York Mets',
  
  // 뉴욕 양키스
  'New York Yankees': 'New York Yankees',
  'NY Yankees': 'New York Yankees',
  'Yankees': 'New York Yankees',
  
  // 오클랜드
  'Oakland Athletics': 'Oakland Athletics',
  'Athletics': 'Oakland Athletics',
  'Oakland': 'Oakland Athletics',
  
  // 필라델피아
  'Philadelphia Phillies': 'Philadelphia Phillies',
  'Philadelphia': 'Philadelphia Phillies',
  'Phillies': 'Philadelphia Phillies',
  
  // 피츠버그
  'Pittsburgh Pirates': 'Pittsburgh Pirates',
  'Pittsburgh': 'Pittsburgh Pirates',
  'Pirates': 'Pittsburgh Pirates',
  
  // 샌디에고
  'San Diego Padres': 'San Diego Padres',
  'San Diego': 'San Diego Padres',
  'Padres': 'San Diego Padres',
  
  // 샌프란시스코
  'San Francisco Giants': 'San Francisco Giants',
  'SF Giants': 'San Francisco Giants',
  'Giants': 'San Francisco Giants',
  
  // 시애틀
  'Seattle Mariners': 'Seattle Mariners',
  'Seattle': 'Seattle Mariners',
  'Mariners': 'Seattle Mariners',
  
  // 세인트루이스
  'St. Louis Cardinals': 'St. Louis Cardinals',
  'St. Louis': 'St. Louis Cardinals',
  'Cardinals': 'St. Louis Cardinals',
  
  // 탬파베이
  'Tampa Bay Rays': 'Tampa Bay Rays',
  'Tampa Bay': 'Tampa Bay Rays',
  'Rays': 'Tampa Bay Rays',
  
  // 텍사스
  'Texas Rangers': 'Texas Rangers',
  'Texas': 'Texas Rangers',
  'Rangers': 'Texas Rangers',
  
  // 토론토
  'Toronto Blue Jays': 'Toronto Blue Jays',
  'Toronto': 'Toronto Blue Jays',
  'Blue Jays': 'Toronto Blue Jays',
  
  // 워싱턴
  'Washington Nationals': 'Washington Nationals',
  'Washington': 'Washington Nationals',
  'Nationals': 'Washington Nationals'
};

// 팀명 정규화 함수
function normalizeMLBTeamName(teamName) {
  if (!teamName) return teamName;
  return mlbTeamNameMap[teamName] || teamName;
}

async function collectMLBData() {
  console.log('=== MLB 데이터 수집 시작 ===\n');
  
  try {
    // 1. TheSportsDB API에서 MLB 데이터 수집 (최근 30일간)
    console.log('📡 TheSportsDB API에서 MLB 데이터 수집 중...');
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);
    
    let allGames = [];
    
    // 날짜별로 데이터 수집
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      console.log(`📅 ${dateStr} MLB 경기 수집 중...`);
      
      try {
        const url = `${BASE_URL}/${API_KEY}/eventsday.php?d=${dateStr}&id=${MLB_LEAGUE_ID}`;
        const response = await axios.get(url);
        
        if (response.data && response.data.events) {
          const dayGames = response.data.events.filter(event => 
            event.strSport === 'Baseball' && 
            event.strLeague && event.strLeague.includes('MLB')
          );
          allGames = allGames.concat(dayGames);
          console.log(`  ✅ ${dayGames.length}개 경기 발견`);
        }
        
        // API 호출 간격 (TheSportsDB 제한 고려)
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`  ⚠️ ${dateStr} 데이터 수집 실패: ${error.message}`);
        continue;
      }
    }
    
    console.log(`\n총 발견된 MLB 경기: ${allGames.length}개`);
    
    if (allGames.length === 0) {
      console.log('❌ MLB 경기 데이터를 찾을 수 없습니다.');
      return;
    }
    
    // 2. 각 경기 데이터 처리 및 저장
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const event of allGames) {
      try {
        const homeTeam = normalizeMLBTeamName(event.strHomeTeam);
        const awayTeam = normalizeMLBTeamName(event.strAwayTeam);
        
        // strTimestamp가 UTC 시간이므로 이를 사용
        let commenceTime;
        if (event.strTimestamp) {
          commenceTime = new Date(event.strTimestamp);
        } else if (event.dateEvent && event.strTime) {
          // strTimestamp가 없는 경우 fallback으로 dateEvent + strTime 사용
          commenceTime = new Date(`${event.dateEvent}T${event.strTime}`);
        } else {
          console.log(`⚠️ 시간 정보 없음: ${event.strHomeTeam} vs ${event.strAwayTeam}`);
          continue;
        }
        
        // 미래 경기는 제외
        if (commenceTime > new Date()) {
          continue;
        }
        
        // 게임 상태 및 결과 결정
        let status = 'scheduled';
        let result = 'pending';
        let score = null;
        
        // 1. 연기/취소 상태 우선 확인
        if (event.strStatus === 'Postponed' || event.strStatus === 'Cancelled') {
          status = event.strStatus.toLowerCase();
          result = event.strStatus.toLowerCase();
        }
        // 2. TheSportsDB 상태 매핑 - 명시적으로 finished인 경우
        else if (event.strStatus === 'FT' || event.strStatus === 'Match Finished' || event.intHomeScore !== null) {
          status = 'finished';
          
          if (event.intHomeScore && event.intAwayScore) {
            score = JSON.stringify([
              { name: event.strHomeTeam, score: event.intHomeScore.toString() },
              { name: event.strAwayTeam, score: event.intAwayScore.toString() }
            ]);
            
            const homeScore = parseInt(event.intHomeScore);
            const awayScore = parseInt(event.intAwayScore);
            
            if (homeScore > awayScore) {
              result = 'home_win';
            } else if (awayScore > homeScore) {
              result = 'away_win';
            } else {
              result = 'draw'; // 야구에서는 드물지만 가능
            }
          }
        }
        // 3. 스코어가 있지만 status가 finished가 아닌 경우 - 보수적 시간 기반 처리
        else if (event.intHomeScore && event.intAwayScore) {
          const gameTime = new Date(commenceTime);
          const now = new Date();
          const hoursSinceGame = (now - gameTime) / (1000 * 60 * 60);
          
          // 48시간 이상 지났고 스코어가 있으면 완료로 처리
          if (hoursSinceGame > 48) {
            status = 'finished';
            score = JSON.stringify([
              { name: event.strHomeTeam, score: event.intHomeScore.toString() },
              { name: event.strAwayTeam, score: event.intAwayScore.toString() }
            ]);
            
            const homeScore = parseInt(event.intHomeScore);
            const awayScore = parseInt(event.intAwayScore);
            
            if (homeScore > awayScore) {
              result = 'home_win';
            } else if (awayScore > homeScore) {
              result = 'away_win';
            } else {
              result = 'draw';
            }
          }
        }
        // 4. 연기/취소 키워드 감지
        else if (event.strStatus) {
          const statusText = event.strStatus.toLowerCase();
          const postponedKeywords = ['postponed', 'delayed', 'suspended'];
          const cancelledKeywords = ['cancelled', 'abandoned'];
          
          if (postponedKeywords.some(keyword => statusText.includes(keyword))) {
            status = 'postponed';
            result = 'postponed';
          } else if (cancelledKeywords.some(keyword => statusText.includes(keyword))) {
            status = 'cancelled';
            result = 'cancelled';
          }
        }
        
        // 중복 체크 (eventId 또는 팀명+날짜로)
        const existingGame = await GameResult.findOne({
          where: {
            [Op.or]: [
              { eventId: event.idEvent },
              {
                mainCategory: 'baseball',
                subCategory: 'MLB',
                homeTeam,
                awayTeam,
                commenceTime: {
                  [Op.between]: [
                    new Date(commenceTime.getTime() - 24 * 60 * 60 * 1000), // 24시간 전
                    new Date(commenceTime.getTime() + 24 * 60 * 60 * 1000)  // 24시간 후
                  ]
                }
              }
            ]
          }
        });
        
        if (existingGame) {
          // 기존 경기 업데이트
          await existingGame.update({
            status,
            score,
            result,
            lastUpdated: new Date()
          });
          updatedCount++;
          console.log(`🔄 경기 업데이트: ${homeTeam} vs ${awayTeam} (${commenceTime.toISOString().slice(0,10)}) - ${result}`);
        } else {
          // 새 경기 저장
          await GameResult.create({
            mainCategory: 'baseball',
            subCategory: 'MLB',
            homeTeam,
            awayTeam,
            commenceTime,
            status,
            score,
            result,
            eventId: event.idEvent || null,
            lastUpdated: new Date()
          });
          savedCount++;
          console.log(`✅ 새 경기 저장: ${homeTeam} vs ${awayTeam} (${commenceTime.toISOString().slice(0,10)}) - ${result}`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ 경기 처리 실패: ${event.strHomeTeam} vs ${event.strAwayTeam}`);
        console.error('상세 오류:', error.message);
        if (error.errors) {
          error.errors.forEach(err => console.error('  -', err.message));
        }
      }
    }
    
    console.log('\n=== MLB 데이터 수집 완료 ===');
    console.log(`✅ 새로 저장: ${savedCount}개`);
    console.log(`🔄 업데이트: ${updatedCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);
    
    // 3. 최종 상태 확인
    const totalMLBGames = await GameResult.count({
      where: {
        mainCategory: 'baseball',
        subCategory: 'MLB'
      }
    });
    
    console.log(`\n📊 총 MLB 경기 수: ${totalMLBGames}개`);
    
  } catch (error) {
    console.error('❌ MLB 데이터 수집 중 오류 발생:', error.message);
  } finally {
    // 데이터베이스 연결 종료
    console.log('🔌 데이터베이스 연결 종료 중...');
    await sequelize.close();
    console.log('✅ 데이터베이스 연결 종료 완료');
    process.exit(0);
  }
}

collectMLBData(); 