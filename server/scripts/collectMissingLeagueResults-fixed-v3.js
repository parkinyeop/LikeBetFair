const axios = require('axios');
const { Sequelize, DataTypes } = require('sequelize');

// 데이터베이스 연결 설정
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bettingDB',
  logging: false
});

// GameResult 모델 정의 (실제 DB 스키마와 일치)
const GameResult = sequelize.define('GameResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  eventId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  sportKey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sportTitle: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mainCategory: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subCategory: {
    type: DataTypes.STRING,
    allowNull: false
  },
  homeTeam: {
    type: DataTypes.STRING,
    allowNull: false
  },
  awayTeam: {
    type: DataTypes.STRING,
    allowNull: false
  },
  commenceTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'live', 'finished', 'cancelled', 'postponed'),
    defaultValue: 'scheduled'
  },
  score: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },
  result: {
    type: DataTypes.ENUM('home_win', 'away_win', 'draw', 'cancelled', 'pending', 'postponed'),
    defaultValue: 'pending'
  },
  lastUpdated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  tableName: 'GameResults'
});

const API_KEY = '116108'; // SportsDB API 키
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

// 누락된 리그들의 SportsDB 리그 ID 매핑
const missingLeagueMap = {
  'SERIE_A': { 
    id: '4332', 
    name: 'Italian Serie A', 
    mainCategory: 'soccer',
    sportKey: 'soccer',
    sportTitle: 'Soccer'
  },
  'BRASILEIRAO': { 
    id: '4351', 
    name: 'Brazilian Serie A', 
    mainCategory: 'soccer',
    sportKey: 'soccer',
    sportTitle: 'Soccer'
  },
  'ARGENTINA_PRIMERA': { 
    id: '4406', 
    name: 'Argentinian Primera Division', 
    mainCategory: 'soccer',
    sportKey: 'soccer',
    sportTitle: 'Soccer'
  },
  'CSL': { 
    id: '4688', 
    name: 'Chinese Super League', 
    mainCategory: 'soccer',
    sportKey: 'soccer',
    sportTitle: 'Soccer'
  },
  'SEGUNDA_DIVISION': { 
    id: '4396', 
    name: 'Spanish Segunda Division', 
    mainCategory: 'soccer',
    sportKey: 'soccer',
    sportTitle: 'Soccer'
  },
  'BUNDESLIGA': { 
    id: '4331', 
    name: 'German Bundesliga', 
    mainCategory: 'soccer',
    sportKey: 'soccer',
    sportTitle: 'Soccer'
  },
  'NHL': { 
    id: '4380', 
    name: 'NHL', 
    mainCategory: 'icehockey',
    sportKey: 'icehockey',
    sportTitle: 'Ice Hockey'
  }
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
  
  // 데이터베이스 연결 확인
  try {
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    return;
  }
  
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
        console.log(`  API 호출: ${dateStr}`);
        
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
            
            // 경기 시간 파싱 (strTimestamp 우선 사용)
            let commenceTime;
            if (event.strTimestamp) {
              commenceTime = new Date(event.strTimestamp); // UTC 시간 사용
            } else if (event.dateEvent && event.strTime) {
              const timeStr = event.strTime || '00:00:00';
              commenceTime = new Date(`${event.dateEvent}T${timeStr}`); // fallback
            } else {
              console.log(`    ⚠️ 시간 정보 없음: ${event.strHomeTeam} vs ${event.strAwayTeam}`);
              continue;
            }
            
            // GameResult에 upsert
            try {
              await GameResult.upsert({
                eventId: event.idEvent,
                sportKey: leagueInfo.sportKey,
                sportTitle: leagueInfo.sportTitle,
                mainCategory: leagueInfo.mainCategory,
                subCategory: subCategory,
                homeTeam: event.strHomeTeam,
                awayTeam: event.strAwayTeam,
                commenceTime: commenceTime,
                status: status,
                score: (homeScore != null && awayScore != null) ? [
                  { name: event.strHomeTeam, score: homeScore.toString() },
                  { name: event.strAwayTeam, score: awayScore.toString() }
                ] : null,
                result: result,
                lastUpdated: new Date()
              });
              
              leagueUpserts++;
              totalUpserts++;
              
              console.log(`    [저장 성공] ${event.strHomeTeam} vs ${event.strAwayTeam} | ${homeScore}-${awayScore} | ${status}`);
            } catch (dbError) {
              console.error(`    [DB 오류] ${event.strHomeTeam} vs ${event.strAwayTeam}:`, dbError.message);
            }
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
    try {
      const count = await GameResult.count({ 
        where: { subCategory: subCategory } 
      });
      console.log(`${subCategory}: ${count}경기`);
    } catch (error) {
      console.error(`${subCategory} 카운트 오류:`, error.message);
    }
  }
}

// 스크립트 실행
collectMissingLeagueResults()
  .then(async () => {
    console.log('스크립트 실행 완료');
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('스크립트 실행 중 에러:', error);
    await sequelize.close();
    process.exit(1);
  });
