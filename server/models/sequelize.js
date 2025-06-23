import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

console.log('[공통 DB 연결] process.env.DB_NAME:', process.env.DB_NAME);

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
});

export default sequelize; 