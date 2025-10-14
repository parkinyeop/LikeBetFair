import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

console.log('[공통 DB 연결] process.env.DB_NAME:', process.env.DB_NAME);

const sequelize = process.env.DB_CONNECTION_STRING
  ? new Sequelize(process.env.DB_CONNECTION_STRING)
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false,
        pool: {
          max: 10,
          min: 0,
          acquire: 60000,
          idle: 30000,
          evict: 1000
        }
      }
    );

export default sequelize; 