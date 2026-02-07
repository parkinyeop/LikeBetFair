import axios from 'axios';
import oddsApiService from '../services/oddsApiService.js';

// 환경 변수 검증
const apiKey = process.env.ODDS_API_KEY;
if (!apiKey) {
  console.error('❌ ODDS_API_KEY 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const baseUrl = 'https://api.the-odds-api.com/v4/sports';

const clientSportKeyMap = {
  'K리그': 'soccer_korea_kleague1',
  'J리그': 'soccer_japan_j_league',
  '세리에 A': 'soccer_italy_serie_a',
  '브라질 세리에 A': 'soccer_brazil_campeonato',
  'MLS': 'soccer_usa_mls',
  '아르헨티나 프리메라': 'soccer_argentina_primera_division',
  '중국 슈퍼리그': 'soccer_china_superleague',
  '스페인 2부': 'soccer_spain_segunda_division',
  '스웨덴 알스벤스칸': 'soccer_sweden_allsvenskan',
  'NBA': 'basketball_nba',
  'MLB': 'baseball_mlb',
  'KBO': 'baseball_kbo',
  'NHL': 'icehockey_nhl'
};

async function fetchAllSportsFromOddsApi() {
  try {
    const res = await axios.get(`${baseUrl}?apiKey=${apiKey}`);
    const sports = res.data;
    console.log('=== oddsAPI에서 제공하는 전체 스포츠/리그 목록 ===');
    sports.forEach(s => {
      console.log(`- key: ${s.key}, group: ${s.group}, title: ${s.title}, active: ${s.active}`);
    });
    console.log('====================================');
  } catch (e) {
    console.error('oddsAPI 전체 스포츠 목록 조회 에러:', e.message);
  }
}

async function fetchTodayOddsFromApi() {
  // 1. oddsAPI에서 지원하는 전체 리그 목록 출력
  const categories = await oddsApiService.getCategories();
  console.log('=== oddsAPI에서 지원하는 전체 리그 목록 ===');
  categories.forEach(cat => {
    console.log(`- ${cat.clientCategory} (sportKey: ${cat.sportKey}, main: ${cat.mainCategory}, sub: ${cat.subCategory})`);
  });
  console.log('====================================');

  // 2. 오늘 경기 odds 조회
  for (const [cat, sportKey] of Object.entries(clientSportKeyMap)) {
    try {
      const oddsList = await oddsApiService.getCachedOdds(sportKey);
      
      // UTC 기준 현재 시간부터 미래 경기들 필터링
      const nowUTC = new Date();
      
      const futureOdds = oddsList.filter(o => {
        // Date 생성자는 Date 객체와 문자열 모두 자동 처리
        const dt = new Date(o.commence_time);
        return dt >= nowUTC; // 현재 시간 이후의 모든 경기
      });
      
      console.log(`✅ [${cat}] (${sportKey}) 미래 경기수: ${futureOdds.length}`);
      futureOdds.forEach((o, index) => {
        const gameTime = new Date(o.commence_time);
        const timeStr = gameTime.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        console.log(`  ${index + 1}. ${o.home_team} vs ${o.away_team}`);
        console.log(`     시간: ${timeStr} ${gameTime.toISOString().split('T')[1].split('.')[0]}Z`);
      });
    } catch (e) {
      console.error(`❌ [${cat}] (${sportKey}) 에러:`, e.message);
      console.error(`   상세 오류:`, e.stack);
      if (e.response) {
        console.error(`   HTTP 상태: ${e.response.status}`);
        console.error(`   응답 데이터:`, e.response.data);
      }
      // API 키 문제인 경우 스크립트 종료
      if (e.response && e.response.status === 401) {
        console.error('🚨 API 키가 유효하지 않습니다. 스크립트를 종료합니다.');
        process.exit(1);
      }
    }
  }
}

// 메인 실행 함수
async function main() {
  try {
    console.log('🚀 배당율 수집 스크립트 시작');
    console.log(`📅 실행 시간: ${new Date().toISOString()} (UTC)`);
    
    // 순차 실행으로 로그 순서 보장
    await fetchAllSportsFromOddsApi();
    await fetchTodayOddsFromApi();
    
    console.log('✅ 배당율 수집 스크립트 완료');
    
    // 데이터베이스 연결 종료
    try {
      const { sequelize } = await import('../models/index.js');
      await sequelize.close();
      console.log('📊 데이터베이스 연결 종료');
    } catch (dbError) {
      console.warn('⚠️ 데이터베이스 연결 종료 중 오류:', dbError.message);
    }
    
    process.exit(0); // 명시적 종료
  } catch (error) {
    console.error('💥 스크립트 실행 중 치명적 오류:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main(); 