import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
});

async function checkJuly17Results() {
  try {
    await sequelize.authenticate();
    
    const results = await sequelize.query(`
      SELECT 
        id,
        "homeTeam",
        "awayTeam",
        "commenceTime",
        status,
        result,
        score,
        "updatedAt"
      FROM "GameResults" 
      WHERE DATE("commenceTime") = '2025-07-17'
      ORDER BY "commenceTime"
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('7월 17일 경기 결과 현황:');
    console.log('총 경기 수:', results.length);
    
    if (results.length > 0) {
      results.forEach((game, index) => {
        console.log(`${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`   시간: ${new Date(game.commenceTime).toLocaleString('ko-KR')}`);
        console.log(`   상태: ${game.status}, 결과: ${game.result}`);
        console.log(`   스코어: ${JSON.stringify(game.score)}`);
        console.log(`   업데이트: ${new Date(game.updatedAt).toLocaleString('ko-KR')}`);
        console.log('');
      });
    } else {
      console.log('7월 17일 경기가 없습니다.');
    }
    
    // 베팅 결과도 확인
    const bets = await sequelize.query(`
      SELECT 
        b.id,
        b.amount,
        b.selection,
        b.status,
        b.won,
        b.lost,
        b.cancelled,
        b.pending,
        b."createdAt",
        b."updatedAt"
      FROM "Bets" b
      JOIN "GameResults" gr ON b."gameId" = gr.id
      WHERE DATE(gr."commenceTime") = '2025-07-17'
      ORDER BY b."createdAt"
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('7월 17일 관련 베팅 현황:');
    console.log('총 베팅 수:', bets.length);
    
    if (bets.length > 0) {
      bets.forEach((bet, index) => {
        console.log(`${index + 1}. 베팅 ID: ${bet.id}`);
        console.log(`   금액: ${bet.amount}원`);
        console.log(`   상태: ${bet.status}`);
        console.log(`   결과: won=${bet.won}, lost=${bet.lost}, cancelled=${bet.cancelled}, pending=${bet.pending}`);
        console.log(`   생성: ${new Date(bet.createdAt).toLocaleString('ko-KR')}`);
        console.log(`   업데이트: ${new Date(bet.updatedAt).toLocaleString('ko-KR')}`);
        console.log('');
      });
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('오류:', error);
  }
}

checkJuly17Results(); 