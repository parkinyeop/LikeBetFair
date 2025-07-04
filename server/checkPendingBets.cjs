const { Sequelize } = require('sequelize');
require('dotenv').config();

// Sequelize 연결
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
  }
);

// 모델 정의
const Bet = sequelize.define('Bet', {
  id: {
    type: Sequelize.DataTypes.UUID,
    defaultValue: Sequelize.DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: Sequelize.DataTypes.UUID,
    allowNull: false
  },
  selections: {
    type: Sequelize.DataTypes.JSONB,
    allowNull: false
  },
  stake: {
    type: Sequelize.DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalOdds: {
    type: Sequelize.DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  potentialWinnings: {
    type: Sequelize.DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: Sequelize.DataTypes.ENUM('pending', 'won', 'lost', 'cancelled'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'Bets',
  timestamps: true
});

const GameResult = sequelize.define('GameResult', {
  id: {
    type: Sequelize.DataTypes.UUID,
    defaultValue: Sequelize.DataTypes.UUIDV4,
    primaryKey: true
  },
  gameId: {
    type: Sequelize.DataTypes.STRING,
    allowNull: false
  },
  homeTeam: {
    type: Sequelize.DataTypes.STRING,
    allowNull: false
  },
  awayTeam: {
    type: Sequelize.DataTypes.STRING,
    allowNull: false
  },
  score: {
    type: Sequelize.DataTypes.JSONB,
    allowNull: true
  },
  status: {
    type: Sequelize.DataTypes.ENUM('scheduled', 'live', 'finished', 'postponed', 'cancelled'),
    defaultValue: 'scheduled'
  },
  result: {
    type: Sequelize.DataTypes.ENUM('pending', 'home_win', 'away_win', 'draw', 'postponed', 'cancelled'),
    defaultValue: 'pending'
  },
  commenceTime: {
    type: Sequelize.DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'GameResults',
  timestamps: true
});

async function checkPendingBets() {
  try {
    console.log('=== 미정산 배팅 확인 ===');
    
    // 미정산 배팅 조회
    const pendingBets = await Bet.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`총 ${pendingBets.length}개의 미정산 배팅 발견`);
    
    if (pendingBets.length > 0) {
      pendingBets.forEach((bet, index) => {
        console.log(`\n--- 배팅 ${index + 1} ---`);
        console.log(`배팅 ID: ${bet.id}`);
        console.log(`배팅 금액: ${bet.stake}원`);
        console.log(`예상 수익: ${bet.potentialWinnings}원`);
        console.log(`배팅 시간: ${bet.createdAt}`);
        console.log(`선택 항목:`, JSON.stringify(bet.selections, null, 2));
      });
    }
    
    // 정산예정일이 지났는데도 pending인 배팅 찾기
    console.log('\n=== 정산예정일이 지났는데도 pending인 배팅 ===');
    const now = new Date();
    const avgGameDurationBySport = {
      soccer: 120,
      baseball: 180,
      basketball: 150,
      // 필요시 추가
    };
    let overdueBets = [];
    for (const bet of pendingBets) {
      if (!Array.isArray(bet.selections)) continue;
      // 각 selection의 정산예정일 계산
      let maxExpectedEnd = null;
      for (const sel of bet.selections) {
        if (!sel.commence_time) continue;
        const commence = new Date(sel.commence_time);
        // 스포츠 종류 추출(예: soccer_epl → soccer)
        const sportType = sel.sport_key ? sel.sport_key.split('_')[0] : 'soccer';
        const duration = avgGameDurationBySport[sportType] || 120;
        const expectedEnd = new Date(commence.getTime() + duration * 60000);
        if (!maxExpectedEnd || expectedEnd > maxExpectedEnd) maxExpectedEnd = expectedEnd;
      }
      if (maxExpectedEnd && maxExpectedEnd < now) {
        overdueBets.push({ bet, maxExpectedEnd });
      }
    }
    console.log(`정산예정일이 지난 pending 배팅: ${overdueBets.length}개`);
    overdueBets.forEach(({ bet, maxExpectedEnd }, idx) => {
      console.log(`\n--- Overdue 배팅 ${idx + 1} ---`);
      console.log(`배팅 ID: ${bet.id}`);
      console.log(`정산예정일: ${maxExpectedEnd}`);
      console.log(`배팅 시간: ${bet.createdAt}`);
      console.log(`선택 항목:`, JSON.stringify(bet.selections, null, 2));
    });
    
    // 최근 경기 결과 확인
    console.log('\n=== 최근 경기 결과 확인 ===');
    const recentGameResults = await GameResult.findAll({
      where: {
        result: { [Sequelize.Op.ne]: 'pending' }
      },
      order: [['commenceTime', 'DESC']],
      limit: 10
    });
    
    console.log(`최근 완료된 경기: ${recentGameResults.length}개`);
    recentGameResults.forEach((game, index) => {
      console.log(`\n--- 경기 ${index + 1} ---`);
      console.log(`경기 ID: ${game.id}`);
      console.log(`팀: ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`결과: ${game.result}`);
      console.log(`스코어: ${JSON.stringify(game.score)}`);
      console.log(`경기 시간: ${game.commenceTime}`);
    });
    
    // 미정산 경기 확인
    console.log('\n=== 미정산 경기 확인 ===');
    const pendingGames = await GameResult.findAll({
      where: {
        result: 'pending',
        commenceTime: { [Sequelize.Op.lt]: new Date() }
      },
      order: [['commenceTime', 'DESC']],
      limit: 10
    });
    
    console.log(`미정산 경기: ${pendingGames.length}개`);
    pendingGames.forEach((game, index) => {
      console.log(`\n--- 미정산 경기 ${index + 1} ---`);
      console.log(`경기 ID: ${game.id}`);
      console.log(`팀: ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`상태: ${game.status}`);
      console.log(`스코어: ${JSON.stringify(game.score)}`);
      console.log(`경기 시간: ${game.commenceTime}`);
    });
    
  } catch (error) {
    console.error('에러:', error);
  } finally {
    await sequelize.close();
  }
}

checkPendingBets(); 