import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';

// Sequelize 인스턴스 생성
const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
});

// Bet 모델 정의
const Bet = sequelize.define('Bet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  selections: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  stake: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  potentialWinnings: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'won', 'lost', 'cancelled'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'Bets',
  timestamps: true
});

// GameResult 모델 정의
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
    type: DataTypes.ENUM('scheduled', 'live', 'finished', 'cancelled'),
    defaultValue: 'scheduled'
  },
  score: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },
  result: {
    type: DataTypes.ENUM('home_win', 'away_win', 'draw', 'cancelled', 'pending'),
    defaultValue: 'pending'
  },
  lastUpdated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'GameResults',
  timestamps: true
});

// 스포츠 카테고리 매핑
const sportCategoryMap = {
  'Samsung Lions': 'KBO',
  'KT Wiz': 'KBO',
  'NC Dinos': 'KBO',
  'Kia Tigers': 'KBO',
  'SSG Landers': 'KBO',
  'Lotte Giants': 'KBO',
  'Doosan Bears': 'KBO',
  'Kiwoom Heroes': 'KBO',
  'Hanwha Eagles': 'KBO',
  'LG Twins': 'KBO',
  'Chicago Cubs': 'MLB',
  'Pittsburgh Pirates': 'MLB'
};

// 팀명에서 스포츠 카테고리 추정
function estimateSportCategory(homeTeam, awayTeam) {
  const allTeams = [homeTeam, awayTeam];
  
  for (const team of allTeams) {
    for (const [teamName, category] of Object.entries(sportCategoryMap)) {
      if (team.includes(teamName) || teamName.includes(team)) {
        return category;
      }
    }
  }
  
  // 기본값
  return 'Unknown';
}

// 경기 설명에서 홈팀과 원정팀 추출
function extractTeams(desc) {
  if (!desc || !desc.includes(' vs ')) {
    return { homeTeam: null, awayTeam: null };
  }
  
  const parts = desc.split(' vs ');
  if (parts.length !== 2) {
    return { homeTeam: null, awayTeam: null };
  }
  
  return {
    homeTeam: parts[0].trim(),
    awayTeam: parts[1].trim()
  };
}

// 메인 함수
async function updateGameResultsFromBets() {
  try {
    console.log('배팅DB에서 경기 정보를 가져와서 GameResults에 저장을 시작합니다...');
    
    // 모든 배팅 데이터 가져오기
    const bets = await Bet.findAll();
    console.log(`총 ${bets.length}개의 배팅 데이터를 찾았습니다.`);
    
    const uniqueGames = new Map();
    let processedCount = 0;
    let savedCount = 0;
    
    // 각 배팅의 selections에서 고유한 경기 정보 추출
    for (const bet of bets) {
      if (!bet.selections || !Array.isArray(bet.selections)) {
        continue;
      }
      
      for (const selection of bet.selections) {
        if (!selection.desc) {
          continue;
        }
        
        const { homeTeam, awayTeam } = extractTeams(selection.desc);
        if (!homeTeam || !awayTeam) {
          console.log(`[건너뜀] 팀명 추출 실패: ${selection.desc}`);
          continue;
        }
        
        // commence_time이 있으면 사용하고, 없으면 오늘 날짜로 설정
        const commenceTime = selection.commence_time 
          ? new Date(selection.commence_time)
          : new Date(); // 오늘 날짜로 설정
        
        // 고유한 경기 식별자 생성 (홈팀 + 원정팀 + 시작시간)
        const gameKey = `${homeTeam}_${awayTeam}_${commenceTime.toISOString().split('T')[0]}`;
        
        if (!uniqueGames.has(gameKey)) {
          uniqueGames.set(gameKey, {
            homeTeam,
            awayTeam,
            commenceTime,
            desc: selection.desc
          });
        }
      }
    }
    
    console.log(`고유한 경기 ${uniqueGames.size}개를 찾았습니다.`);
    
    // 각 고유한 경기에 대해 GameResults에 저장
    for (const [gameKey, gameInfo] of uniqueGames) {
      try {
        // 이미 존재하는지 확인
        const existingGame = await GameResult.findOne({
          where: {
            homeTeam: gameInfo.homeTeam,
            awayTeam: gameInfo.awayTeam,
            commenceTime: gameInfo.commenceTime
          }
        });
        
        if (existingGame) {
          console.log(`[이미 존재] ${gameInfo.homeTeam} vs ${gameInfo.awayTeam} (${gameInfo.commenceTime.toISOString().split('T')[0]})`);
          continue;
        }
        
        // 스포츠 카테고리 추정
        const mainCategory = estimateSportCategory(gameInfo.homeTeam, gameInfo.awayTeam);
        
        // GameResults에 저장
        // 자동 판정 로직 추가
        let result = 'pending';
        let score = null;
        if (gameInfo.score && Array.isArray(gameInfo.score) && gameInfo.score.length === 2) {
          const homeScore = parseInt(gameInfo.score[0].score);
          const awayScore = parseInt(gameInfo.score[1].score);
          score = gameInfo.score;
          if (!isNaN(homeScore) && !isNaN(awayScore)) {
            if (homeScore > awayScore) result = 'home_win';
            else if (homeScore < awayScore) result = 'away_win';
            else result = 'draw';
          }
        }
        await GameResult.create({
          mainCategory,
          subCategory: mainCategory, // 기본값으로 mainCategory 사용
          homeTeam: gameInfo.homeTeam,
          awayTeam: gameInfo.awayTeam,
          commenceTime: gameInfo.commenceTime,
          status: 'scheduled',
          score: score,
          result: result,
          lastUpdated: new Date()
        });
        
        console.log(`[저장 성공] ${gameInfo.homeTeam} vs ${gameInfo.awayTeam} (${gameInfo.commenceTime.toISOString().split('T')[0]}) - ${mainCategory}`);
        savedCount++;
        
      } catch (error) {
        console.error(`[저장 실패] ${gameInfo.homeTeam} vs ${gameInfo.awayTeam}:`, error.message);
      }
      
      processedCount++;
    }
    
    console.log(`\n=== 처리 완료 ===`);
    console.log(`처리된 경기: ${processedCount}개`);
    console.log(`새로 저장된 경기: ${savedCount}개`);
    console.log(`총 GameResults: ${await GameResult.count()}개`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await sequelize.close();
  }
}

// allResults.json을 DB에 반영하는 함수
async function updateGameResultsFromCrawledData() {
  const allResults = JSON.parse(fs.readFileSync('allResults.json', 'utf-8'));
  let total = 0, upserted = 0;
  for (const [league, games] of Object.entries(allResults)) {
    for (const game of games) {
      total++;
      const { date, home, away, score } = game;
      // 날짜+팀명으로 고유 경기 식별
      const commenceTime = new Date(date);
      // 스코어 파싱
      let parsedScore = null;
      let result = 'pending';
      if (score && score.includes('-')) {
        const [homeScore, awayScore] = score.split('-').map(s => s.trim());
        // 올바른 객체 배열 형태로 저장
        parsedScore = [
          {"name": home, "score": homeScore},
          {"name": away, "score": awayScore}
        ];
        if (!isNaN(homeScore) && !isNaN(awayScore)) {
          if (Number(homeScore) > Number(awayScore)) result = 'home_win';
          else if (Number(homeScore) < Number(awayScore)) result = 'away_win';
          else result = 'draw';
        }
      }
      // upsert
      await GameResult.upsert({
        mainCategory: league,
        subCategory: league,
        homeTeam: home,
        awayTeam: away,
        commenceTime,
        status: 'finished',
        score: parsedScore,
        result,
        lastUpdated: new Date()
      });
      upserted++;
    }
  }
  console.log(`총 ${total}개 중 ${upserted}개 경기 결과를 DB에 upsert 완료.`);
  await sequelize.close();
}

// 실행 entrypoint (ESM)
if (process.argv[1] && process.argv[1].endsWith('updateGameResultsFromBets.js')) {
  updateGameResultsFromCrawledData();
}

// 스크립트 실행
updateGameResultsFromBets(); 