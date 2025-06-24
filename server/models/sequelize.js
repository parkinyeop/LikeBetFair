import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

console.log('[공통 DB 연결] process.env.DB_NAME:', process.env.DB_NAME);

let sequelize;
if (process.env.DB_CONNECTION_STRING) {
  sequelize = new Sequelize(process.env.DB_CONNECTION_STRING);
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres', // 실제 사용하는 DB에 맞게!
      logging: false,
    }
  );
}

export default sequelize; 