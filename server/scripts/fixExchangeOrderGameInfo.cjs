const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bettingDB',
  user: 'postgres',
  password: '1234'
});

async function fixExchangeOrderGameInfo() {
  try {
    console.log('ExchangeOrders 테이블의 게임 정보 업데이트 시작...');
    
    // 먼저 현재 상태 확인
    const checkResult = await pool.query(`
      SELECT 
        eo.id,
        eo."gameId",
        eo."homeTeam",
        eo."awayTeam", 
        eo."commenceTime",
        gr.home_team,
        gr.away_team,
        gr.commence_time
      FROM "ExchangeOrders" eo
      LEFT JOIN "GameResults" gr ON eo."gameId"::uuid = gr.id
      ORDER BY eo.id
    `);
    
    console.log('현재 상태:');
    checkResult.rows.forEach(row => {
      console.log(`ID ${row.id}: gameId=${row.gameId}, homeTeam=${row.homeTeam}, awayTeam=${row.awayTeam}, commenceTime=${row.commence_time}`);
    });
    
    // 업데이트 실행
    const updateResult = await pool.query(`
      UPDATE "ExchangeOrders" eo
      SET 
        "homeTeam" = gr.home_team,
        "awayTeam" = gr.away_team,
        "commenceTime" = gr.commence_time
      FROM "GameResults" gr
      WHERE eo."gameId"::uuid = gr.id
        AND (eo."homeTeam" IS NULL OR eo."awayTeam" IS NULL OR eo."commenceTime" IS NULL)
    `);
    
    console.log(`업데이트된 행 수: ${updateResult.rowCount}`);
    
    // 업데이트 후 상태 확인
    const afterResult = await pool.query(`
      SELECT 
        eo.id,
        eo."gameId",
        eo."homeTeam",
        eo."awayTeam", 
        eo."commenceTime"
      FROM "ExchangeOrders" eo
      ORDER BY eo.id
    `);
    
    console.log('\n업데이트 후 상태:');
    afterResult.rows.forEach(row => {
      console.log(`ID ${row.id}: gameId=${row.gameId}, homeTeam=${row.homeTeam}, awayTeam=${row.awayTeam}, commenceTime=${row.commence_time}`);
    });
    
    await pool.end();
    console.log('업데이트 완료!');
    
  } catch (error) {
    console.error('오류:', error);
    await pool.end();
  }
}

fixExchangeOrderGameInfo(); 