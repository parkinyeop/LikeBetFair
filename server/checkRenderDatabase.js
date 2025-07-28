import { Sequelize } from 'sequelize';
import config from './config/database.js';

// Render 서버 환경에서 실행
const env = process.env.NODE_ENV || 'production';
const dbConfig = config[env];

console.log('🔍 Render 서버 데이터베이스 연결 정보:');
console.log(`- Host: ${dbConfig.host}`);
console.log(`- Database: ${dbConfig.database}`);
console.log(`- User: ${dbConfig.username}`);
console.log(`- Environment: ${env}`);

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect,
  logging: false
});

async function checkRenderDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Render 데이터베이스 연결 성공');
    
    // 1. 정확한 ID로 검색
    console.log('\n1️⃣ 정확한 ID 검색: a83d4b9e-c949-4cba-a4f9-136676c02c86');
    const [exactIdResult] = await sequelize.query(`
      SELECT * FROM "OddsCaches" 
      WHERE id = 'a83d4b9e-c949-4cba-a4f9-136676c02c86'
    `);
    
    if (exactIdResult.length > 0) {
      const game = exactIdResult[0];
      console.log(`✅ 찾음: ${game.homeTeam} vs ${game.awayTeam} - ${game.commenceTime}`);
      console.log(`   sportKey: ${game.sportKey}, mainCategory: ${game.mainCategory}, subCategory: ${game.subCategory}`);
    } else {
      console.log('❌ 해당 ID의 경기를 찾을 수 없습니다.');
    }
    
    // 2. 팀명으로 검색
    console.log('\n2️⃣ 팀명 검색: Oakland Athletics vs Seattle Mariners');
    const [teamResult] = await sequelize.query(`
      SELECT * FROM "OddsCaches" 
      WHERE ("homeTeam" ILIKE '%Oakland Athletics%' AND "awayTeam" ILIKE '%Seattle Mariners%')
         OR ("homeTeam" ILIKE '%Seattle Mariners%' AND "awayTeam" ILIKE '%Oakland Athletics%')
      ORDER BY "commenceTime" DESC
    `);
    
    console.log(`팀명 검색 결과: ${teamResult.length}개`);
    teamResult.forEach((game, i) => {
      console.log(`${i+1}. ${game.homeTeam} vs ${game.awayTeam} - ${game.commenceTime} (ID: ${game.id})`);
    });
    
    // 3. 2025-07-29 날짜로 검색
    console.log('\n3️⃣ 2025-07-29 날짜 검색');
    const [dateResult] = await sequelize.query(`
      SELECT * FROM "OddsCaches" 
      WHERE "commenceTime"::date = '2025-07-29'
      ORDER BY "commenceTime" ASC
    `);
    
    console.log(`2025-07-29 날짜 검색 결과: ${dateResult.length}개`);
    dateResult.forEach((game, i) => {
      console.log(`${i+1}. ${game.homeTeam} vs ${game.awayTeam} - ${game.commenceTime} (ID: ${game.id})`);
    });
    
    // 4. MLB 경기 중 2025-07-29 근처 검색
    console.log('\n4️⃣ MLB 2025-07-28~30 검색');
    const [mlbResult] = await sequelize.query(`
      SELECT * FROM "OddsCaches" 
      WHERE "subCategory" = 'MLB' 
         AND "commenceTime" >= '2025-07-28' 
         AND "commenceTime" <= '2025-07-30'
      ORDER BY "commenceTime" ASC
    `);
    
    console.log(`MLB 2025-07-28~30 검색 결과: ${mlbResult.length}개`);
    mlbResult.forEach((game, i) => {
      console.log(`${i+1}. ${game.homeTeam} vs ${game.awayTeam} - ${game.commenceTime} (ID: ${game.id})`);
    });
    
    // 5. 전체 MLB 경기 수 확인
    console.log('\n5️⃣ 전체 MLB 경기 수');
    const [mlbCountResult] = await sequelize.query(`
      SELECT COUNT(*) as count FROM "OddsCaches" 
      WHERE "subCategory" = 'MLB'
    `);
    
    console.log(`전체 MLB 경기 수: ${mlbCountResult[0].count}개`);
    
    // 6. 최근 MLB 경기 5개
    console.log('\n6️⃣ 최근 MLB 경기 5개');
    const [recentMlbResult] = await sequelize.query(`
      SELECT * FROM "OddsCaches" 
      WHERE "subCategory" = 'MLB'
      ORDER BY "commenceTime" DESC
      LIMIT 5
    `);
    
    recentMlbResult.forEach((game, i) => {
      console.log(`${i+1}. ${game.homeTeam} vs ${game.awayTeam} - ${game.commenceTime} (ID: ${game.id})`);
    });
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await sequelize.close();
  }
}

checkRenderDatabase(); 