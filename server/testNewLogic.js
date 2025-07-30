const { Sequelize } = require('sequelize');
const config = require('./config/database.js').production;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

async function testNewLogic() {
  try {
    console.log('=== 새로운 로직 테스트 시작 ===\n');
    
    // 1. 현재 pending 상태인 경기들 확인
    const pendingGames = await sequelize.query(`
      SELECT 
        id,
        "homeTeam",
        "awayTeam",
        score,
        result,
        status,
        "commenceTime",
        "updatedAt"
      FROM "GameResults"
      WHERE result = 'pending'
      ORDER BY "commenceTime" DESC
      LIMIT 10
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`현재 pending 경기 수: ${pendingGames.length}개`);
    
    if (pendingGames.length > 0) {
      console.log('\nPending 경기들 상세:');
      pendingGames.forEach((game, index) => {
        console.log(`${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`   스코어: ${game.score}`);
        console.log(`   상태: ${game.status}`);
        console.log(`   경기시간: ${game.commenceTime}`);
        console.log(`   업데이트: ${game.updatedAt}`);
        
        // 새로운 로직으로 결과 예측
        if (game.score && game.commenceTime) {
          try {
            const score = JSON.parse(game.score);
            const gameTime = new Date(game.commenceTime);
            const now = new Date();
            const hoursSinceGame = (now - gameTime) / (1000 * 60 * 60);
            
            console.log(`   경기 후 시간: ${hoursSinceGame.toFixed(1)}시간`);
            
            if (Array.isArray(score) && score.length === 2 && hoursSinceGame > 48) {
              const homeScoreData = score.find(s => s.name === game.homeTeam);
              const awayScoreData = score.find(s => s.name === game.awayTeam);
              
              if (homeScoreData && awayScoreData) {
                const homeScore = parseInt(homeScoreData.score);
                const awayScore = parseInt(awayScoreData.score);
                
                if (!isNaN(homeScore) && !isNaN(awayScore)) {
                  let expectedResult = 'pending';
                  if (homeScore > awayScore) expectedResult = 'home_win';
                  else if (awayScore > homeScore) expectedResult = 'away_win';
                  else expectedResult = 'draw';
                  
                  console.log(`   예상 결과: ${expectedResult} (48시간 초과)`);
                }
              }
            } else {
              console.log(`   예상 결과: pending (48시간 미만 또는 스코어 없음)`);
            }
          } catch (error) {
            console.log(`   스코어 파싱 오류: ${error.message}`);
          }
        }
        console.log('   ---');
      });
    }
    
    // 2. 최근 업데이트된 경기들 확인
    const recentUpdates = await sequelize.query(`
      SELECT 
        "homeTeam",
        "awayTeam",
        score,
        result,
        status,
        "commenceTime",
        "updatedAt"
      FROM "GameResults"
      WHERE "updatedAt" >= NOW() - INTERVAL '2 hours'
      ORDER BY "updatedAt" DESC
      LIMIT 5
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`\n최근 2시간 내 업데이트된 경기들: ${recentUpdates.length}개`);
    recentUpdates.forEach((game, index) => {
      console.log(`${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`   스코어: ${game.score}`);
      console.log(`   결과: ${game.result}`);
      console.log(`   상태: ${game.status}`);
      console.log(`   업데이트: ${game.updatedAt}`);
      console.log(`   ---`);
    });
    
    // 3. 새로운 로직 테스트 - 가상 데이터로 테스트
    console.log('\n=== 새로운 로직 테스트 (가상 데이터) ===');
    
    // 테스트 케이스 1: API finished + 스코어 있음
    const testCase1 = {
      status: 'finished',
      scores: [
        { name: 'Team A', score: '2' },
        { name: 'Team B', score: '1' }
      ],
      home_team: 'Team A',
      away_team: 'Team B',
      commence_time: new Date()
    };
    
    // 테스트 케이스 2: 스코어 있지만 48시간 미만
    const testCase2 = {
      status: 'scheduled',
      scores: [
        { name: 'Team C', score: '0' },
        { name: 'Team D', score: '0' }
      ],
      home_team: 'Team C',
      away_team: 'Team D',
      commence_time: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24시간 전
    };
    
    // 테스트 케이스 3: 연기된 경기
    const testCase3 = {
      status: 'postponed',
      scores: null,
      home_team: 'Team E',
      away_team: 'Team F',
      commence_time: new Date()
    };
    
    console.log('테스트 케이스 1 (API finished + 스코어):', testCase1.status, '->', determineGameResult(testCase1));
    console.log('테스트 케이스 2 (48시간 미만):', testCase2.status, '->', determineGameResult(testCase2));
    console.log('테스트 케이스 3 (연기):', testCase3.status, '->', determineGameResult(testCase3));
    
    await sequelize.close();
  } catch (error) {
    console.error('오류:', error);
    await sequelize.close();
  }
}

// 새로운 로직 함수 (GameResultService에서 복사)
function determineGameResult(game) {
  // 1. 연기/취소 상태 우선 확인
  if (game.status === 'postponed' || game.status === 'cancelled') {
    return game.status;
  }
  
  // 2. API에서 명시적으로 finished 상태이고 스코어가 있는 경우
  if (game.status === 'finished' && game.scores && Array.isArray(game.scores) && game.scores.length === 2) {
    const homeScoreData = game.scores.find(score => score.name === game.home_team);
    const awayScoreData = game.scores.find(score => score.name === game.away_team);
    
    if (!homeScoreData || !awayScoreData) {
      return 'pending';
    }
    
    const homeScore = parseInt(homeScoreData.score);
    const awayScore = parseInt(awayScoreData.score);
    
    if (isNaN(homeScore) || isNaN(awayScore)) {
      return 'pending';
    }
    
    if (homeScore > awayScore) {
      return 'home_win';
    } else if (awayScore > homeScore) {
      return 'away_win';
    } else {
      return 'draw';
    }
  }
  
  // 3. 스코어가 있지만 status가 finished가 아닌 경우 - 보수적 시간 기반 처리
  if (game.scores && Array.isArray(game.scores) && game.scores.length === 2) {
    const gameTime = new Date(game.commence_time);
    const now = new Date();
    const hoursSinceGame = (now - gameTime) / (1000 * 60 * 60);
    
    // 48시간 이상 지났고 스코어가 있으면 완료로 처리 (보수적 접근)
    if (hoursSinceGame > 48) {
      const homeScoreData = game.scores.find(score => score.name === game.home_team);
      const awayScoreData = game.scores.find(score => score.name === game.away_team);
      
      if (homeScoreData && awayScoreData) {
        const homeScore = parseInt(homeScoreData.score);
        const awayScore = parseInt(awayScoreData.score);
        
        if (!isNaN(homeScore) && !isNaN(awayScore)) {
          if (homeScore > awayScore) {
            return 'home_win';
          } else if (awayScore > homeScore) {
            return 'away_win';
          } else {
            return 'draw';
          }
        }
      }
    }
  }
  
  // 4. 연기/취소 키워드 감지
  if (game.description || game.strStatus) {
    const text = (game.description || game.strStatus || '').toLowerCase();
    const postponedKeywords = ['postponed', 'delayed', 'suspended', '연기', '지연'];
    const cancelledKeywords = ['cancelled', 'abandoned', '취소', '중단'];
    
    if (postponedKeywords.some(keyword => text.includes(keyword))) {
      return 'postponed';
    }
    
    if (cancelledKeywords.some(keyword => text.includes(keyword))) {
      return 'cancelled';
    }
  }
  
  // 5. 기본값: pending
  return 'pending';
}

testNewLogic(); 