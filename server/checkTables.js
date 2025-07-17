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

async function checkTables() {
  try {
    await sequelize.authenticate();
    
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('데이터베이스 테이블 목록:');
    tables.forEach(table => {
      console.log('- ' + table.table_name);
    });
    
    await sequelize.close();
  } catch (error) {
    console.error('오류:', error);
  }
}

checkTables(); 