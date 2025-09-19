import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';
import sequelize from '../models/sequelize.js';

// K리그 1 팀명 매핑 테이블 (TheSportsDB 팀명 → 정규화된 팀명)
const KLEAGUE_TEAM_MAPPING = {
  'Anyang': 'Anyang',
  'Daegu FC': 'Daegu FC', 
  'Daejeon Hana Citizen': 'Daejeon Hana Citizen',
  'FC Seoul': 'FC Seoul',
  'Gangwon FC': 'Gangwon FC',
  'Gwangju FC': 'Gwangju FC',
  'Jeju SK': 'Jeju SK',
  'Jeonbuk Hyundai Motors': 'Jeonbuk Hyundai Motors',
  'Pohang Steelers': 'Pohang Steelers',
  'Sangju Sangmu': 'Sangju Sangmu',
  'Suwon FC': 'Suwon FC',
  'Ulsan HD': 'Ulsan HD'
};

async function collectKLeagueData() {
  console.log('=== K리그 1 데이터 수집 시작 ===\n');
  
  try {
    const API_KEY = process.env.THESPORTSDB_API_KEY || '116108'; // 프리미엄 키
    const LEAGUE_ID = '4689'; // K리그 1 리그 ID
    
    // 최근 30일간의 데이터 수집
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    console.log(`수집 기간: ${startDate.toISOString().slice(0,10)} ~ ${endDate.toISOString().slice(0,10)}\n`);
    
    // TheSportsDB API에서 K리그 데이터 가져오기 (V1 API 사용)
    const url = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsseason.php?id=${LEAGUE_ID}&s=2025`;
    console.log(`API 요청: ${url}\n`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`API 응답 받음: ${data.events?.length || 0}개 경기 발견\n`);
    
    if (!data.events || data.events.length === 0) {
      console.log('❌ 수집할 K리그 데이터가 없습니다.');
      return;
    }
    
    let successCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    
    // 각 경기 처리
    for (const event of data.events) {
      try {
        // 기본 정보 추출
        const homeTeam = normalizeTeamName(event.strHomeTeam, 'KLEAGUE1');
        const awayTeam = normalizeTeamName(event.strAwayTeam, 'KLEAGUE1');
        // strTimestamp가 UTC 시간이므로 이를 사용
        let commenceTime;
        if (event.strTimestamp) {
          commenceTime = new Date(event.strTimestamp);
        } else if (event.dateEvent && event.strTime) {
          commenceTime = new Date(event.dateEvent + 'T' + (event.strTime || '00:00:00'));
        } else {
          console.log(`⚠️ 시간 정보 없음: ${event.strHomeTeam} vs ${event.strAwayTeam}`);
          continue;
        }
        
        // 경기 상태 결정
        let status = 'scheduled';
        let result = 'pending';
        let score = null;
        
        // 1. 연기/취소 상태 우선 확인
        if (event.strStatus === 'Postponed' || event.strStatus === 'Cancelled') {
          status = event.strStatus.toLowerCase();
          result = event.strStatus.toLowerCase();
        }
        // 2. 스코어가 있는 경우 - 명시적으로 finished
        else if (event.intHomeScore !== null && event.intAwayScore !== null) {
          status = 'finished';
          const homeScore = parseInt(event.intHomeScore);
          const awayScore = parseInt(event.intAwayScore);
          
          score = JSON.stringify([
            { name: homeTeam, score: homeScore.toString() },
            { name: awayTeam, score: awayScore.toString() }
          ]);
          
          if (homeScore > awayScore) {
            result = 'home_win';
          } else if (awayScore > homeScore) {
            result = 'away_win';
          } else {
            result = 'draw';
          }
        }
        // 3. Match Finished 상태이지만 스코어가 없는 경우
        else if (event.strStatus === 'Match Finished' || event.strStatus === 'FT') {
          status = 'finished';
          // 스코어가 없는 완료 경기는 무승부로 처리
          result = 'draw';
          score = JSON.stringify([
            { name: homeTeam, score: '0' },
            { name: awayTeam, score: '0' }
          ]);
        }
        // 4. 스코어가 있지만 status가 finished가 아닌 경우 - 보수적 시간 기반 처리
        else if (event.intHomeScore !== null && event.intAwayScore !== null) {
          const gameTime = new Date(commenceTime);
          const now = new Date();
          const hoursSinceGame = (now - gameTime) / (1000 * 60 * 60);
          
          // 48시간 이상 지났고 스코어가 있으면 완료로 처리
          if (hoursSinceGame > 48) {
            status = 'finished';
            const homeScore = parseInt(event.intHomeScore);
            const awayScore = parseInt(event.intAwayScore);
            
            score = JSON.stringify([
              { name: homeTeam, score: homeScore.toString() },
              { name: awayTeam, score: awayScore.toString() }
            ]);
            
            if (homeScore > awayScore) {
              result = 'home_win';
            } else if (awayScore > homeScore) {
              result = 'away_win';
            } else {
              result = 'draw';
            }
          }
        }
        // 5. 연기/취소 키워드 감지
        else if (event.strStatus) {
          const statusText = event.strStatus.toLowerCase();
          const postponedKeywords = ['postponed', 'delayed', 'suspended', '연기'];
          const cancelledKeywords = ['cancelled', 'abandoned', '취소', '중단'];
          
          if (postponedKeywords.some(keyword => statusText.includes(keyword))) {
            status = 'postponed';
            result = 'postponed';
          } else if (cancelledKeywords.some(keyword => statusText.includes(keyword))) {
            status = 'cancelled';
            result = 'cancelled';
          }
        }
        
        console.log(`처리 중: ${homeTeam} vs ${awayTeam} (${commenceTime.toISOString().slice(0,10)})`);
        
        // DB에 저장 (단순 create 방식)
        const gameResult = await GameResult.create({
          mainCategory: 'soccer',
          subCategory: 'KLEAGUE1',
          sportKey: 'soccer_kleague1',
          sportTitle: 'K리그 1',
          homeTeam,
          awayTeam,
          commenceTime,
          status,
          score,
          result,
          eventId: event.idEvent || null,
          lastUpdated: new Date()
        });
        
        successCount++;
        console.log(`✅ 새로 저장: ${gameResult.id}`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ 경기 처리 실패: ${event.strHomeTeam} vs ${event.strAwayTeam}`);
        console.error('상세 오류:', error.message);
        if (error.errors) {
          error.errors.forEach(err => console.error('  -', err.message));
        }
      }
    }
    
    console.log('\n=== K리그 1 데이터 수집 완료 ===');
    console.log(`✅ 새로 저장: ${successCount}개`);
    console.log(`🔄 업데이트: ${updateCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);
    console.log(`📊 총 처리: ${successCount + updateCount + errorCount}개`);
    
    // 최종 K리그 데이터 수 확인
    const totalKLeague = await GameResult.count({
      where: {
        mainCategory: 'soccer',
        subCategory: 'KLEAGUE1'
      }
    });
    
    console.log(`\n📈 총 K리그 경기 수: ${totalKLeague}개`);
    
  } catch (error) {

    console.error('❌ K리그 데이터 수집 실패:', error.message);
  
  } finally {
    // 데이터베이스 연결 종료
    console.log('🔌 데이터베이스 연결 종료 중...');
    await sequelize.close();
    console.log('✅ 데이터베이스 연결 종료 완료');
    process.exit(1);
  }
}

collectKLeagueData(); 