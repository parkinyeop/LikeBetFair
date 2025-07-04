import axios from 'axios';

const API_KEY = '116108'; // TheSportsDB 프리미엄 키
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

// MLS 리그 ID
const MLS_LEAGUE_ID = '4346';

// 조회할 경기 정보
const TARGET_GAME = {
  homeTeam: 'New York City FC',
  awayTeam: 'Toronto FC',
  date: '2025-07-03', // 경기 날짜
  time: '23:30:00'    // 경기 시간 (UTC)
};

async function checkSpecificGameResult() {
  try {
    console.log('=== TheSportsDB API에서 특정 경기 결과 조회 ===');
    console.log(`경기: ${TARGET_GAME.homeTeam} vs ${TARGET_GAME.awayTeam}`);
    console.log(`날짜: ${TARGET_GAME.date} ${TARGET_GAME.time} UTC`);
    console.log('');

    // 1. MLS 리그의 최근 경기들 조회
    console.log('1. MLS 리그 최근 경기 조회 중...');
    const eventsUrl = `${BASE_URL}/${API_KEY}/eventsnextleague.php?id=${MLS_LEAGUE_ID}`;
    const pastEventsUrl = `${BASE_URL}/${API_KEY}/eventspastleague.php?id=${MLS_LEAGUE_ID}`;
    
    try {
      const [eventsResponse, pastEventsResponse] = await Promise.all([
        axios.get(eventsUrl),
        axios.get(pastEventsUrl)
      ]);

      const allEvents = [
        ...(eventsResponse.data.events || []),
        ...(pastEventsResponse.data.events || [])
      ];

      console.log(`총 ${allEvents.length}개의 MLS 경기 발견`);

      // 2. 특정 경기 찾기
      console.log('\n2. 대상 경기 검색 중...');
      const targetGame = allEvents.find(event => {
        const eventDate = event.dateEvent;
        const eventTime = event.strTime;
        const homeTeam = event.strHomeTeam;
        const awayTeam = event.strAwayTeam;
        
        console.log(`검사: ${homeTeam} vs ${awayTeam} (${eventDate} ${eventTime})`);
        
        return (
          homeTeam === TARGET_GAME.homeTeam && 
          awayTeam === TARGET_GAME.awayTeam &&
          eventDate === TARGET_GAME.date
        );
      });

      if (targetGame) {
        console.log('\n✅ 대상 경기 발견!');
        console.log('=== 경기 상세 정보 ===');
        console.log(`경기 ID: ${targetGame.idEvent}`);
        console.log(`홈팀: ${targetGame.strHomeTeam}`);
        console.log(`원정팀: ${targetGame.strAwayTeam}`);
        console.log(`날짜: ${targetGame.dateEvent}`);
        console.log(`시간: ${targetGame.strTime}`);
        console.log(`상태: ${targetGame.strStatus}`);
        console.log(`홈팀 스코어: ${targetGame.intHomeScore}`);
        console.log(`원정팀 스코어: ${targetGame.intAwayScore}`);
        console.log(`리그: ${targetGame.strLeague}`);
        console.log(`시즌: ${targetGame.strSeason}`);
        
        // 3. 경기 결과 판정
        console.log('\n=== 경기 결과 판정 ===');
        if (targetGame.strStatus === 'Match Finished' && 
            targetGame.intHomeScore !== null && 
            targetGame.intAwayScore !== null) {
          
          const homeScore = parseInt(targetGame.intHomeScore);
          const awayScore = parseInt(targetGame.intAwayScore);
          
          console.log(`최종 스코어: ${homeScore} - ${awayScore}`);
          
          if (homeScore > awayScore) {
            console.log('결과: 홈팀 승리 (home_win)');
          } else if (awayScore > homeScore) {
            console.log('결과: 원정팀 승리 (away_win)');
          } else {
            console.log('결과: 무승부 (draw)');
          }
          
          // 4. DB 저장용 데이터 형식
          console.log('\n=== DB 저장용 데이터 ===');
          const dbData = {
            mainCategory: 'soccer',
            subCategory: 'MLS',
            homeTeam: targetGame.strHomeTeam,
            awayTeam: targetGame.strAwayTeam,
            commenceTime: new Date(`${targetGame.dateEvent} ${targetGame.strTime}`),
            status: 'finished',
            score: [
              {"name": targetGame.strHomeTeam, "score": targetGame.intHomeScore.toString()},
              {"name": targetGame.strAwayTeam, "score": targetGame.intAwayScore.toString()}
            ],
            result: homeScore > awayScore ? 'home_win' : awayScore > homeScore ? 'away_win' : 'draw',
            eventId: targetGame.idEvent,
            lastUpdated: new Date()
          };
          
          console.log('DB 저장 데이터:', JSON.stringify(dbData, null, 2));
          
        } else if (targetGame.strStatus === 'Not Started') {
          console.log('결과: 경기 시작 전 (scheduled)');
        } else if (targetGame.strStatus === 'Cancelled' || targetGame.strStatus === 'Postponed') {
          console.log(`결과: 경기 ${targetGame.strStatus.toLowerCase()} (cancelled/postponed)`);
        } else {
          console.log(`결과: 기타 상태 (${targetGame.strStatus})`);
        }
        
      } else {
        console.log('\n❌ 대상 경기를 찾을 수 없습니다.');
        console.log('\n=== 최근 MLS 경기 목록 ===');
        const recentEvents = allEvents
          .filter(event => event.dateEvent >= '2025-07-01')
          .slice(0, 10);
        
        recentEvents.forEach(event => {
          console.log(`${event.dateEvent} ${event.strTime}: ${event.strHomeTeam} vs ${event.strAwayTeam} (${event.strStatus})`);
        });
      }

    } catch (error) {
      console.error('API 호출 실패:', error.message);
      if (error.response) {
        console.error('응답 상태:', error.response.status);
        console.error('응답 데이터:', error.response.data);
      }
    }

  } catch (error) {
    console.error('스크립트 실행 오류:', error);
  }
}

// 스크립트 실행
checkSpecificGameResult(); 