import dotenv from 'dotenv';
dotenv.config();
import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
});

const GameResult = sequelize.define('GameResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  homeTeam: DataTypes.STRING,
  awayTeam: DataTypes.STRING,
  commenceTime: DataTypes.DATE,
  status: DataTypes.STRING,
  score: DataTypes.JSONB,
  result: DataTypes.STRING
}, {
  tableName: 'GameResults',
  timestamps: true
});

async function fixPendingGameResults() {
  await sequelize.authenticate();
  const games = await GameResult.findAll({
    where: {
      result: 'pending',
      score: { [Sequelize.Op.ne]: null }
    }
  });

  let updated = 0;
  for (const game of games) {
    let homeScore = null, awayScore = null;
    if (Array.isArray(game.score)) {
      // [{team: 'A', score: 1}, {team: 'B', score: 2}] 또는 ['1', '2'] 등 다양한 형태 지원
      if (typeof game.score[0] === 'object' && game.score[0] !== null) {
        homeScore = parseInt(game.score[0].score);
        awayScore = parseInt(game.score[1].score);
      } else if (typeof game.score[0] === 'string' || typeof game.score[0] === 'number') {
        homeScore = parseInt(game.score[0]);
        awayScore = parseInt(game.score[1]);
      }
    }
    if (homeScore === null || awayScore === null || isNaN(homeScore) || isNaN(awayScore)) {
      console.log(`[SKIP] Invalid score for ${game.homeTeam} vs ${game.awayTeam}:`, game.score);
      continue;
    }
    let result = 'pending';
    if (homeScore > awayScore) result = 'home_win';
    else if (homeScore < awayScore) result = 'away_win';
    else if (homeScore === awayScore) result = 'draw';
    if (result !== 'pending') {
      await game.update({ result });
      updated++;
      console.log(`[UPDATE] ${game.homeTeam} vs ${game.awayTeam} (${game.commenceTime.toISOString()}): ${homeScore}-${awayScore} → ${result}`);
    }
  }
  console.log(`총 ${updated}건의 GameResults.result가 업데이트되었습니다.`);
  await sequelize.close();
}

fixPendingGameResults().catch(e => { console.error(e); process.exit(1); }); 