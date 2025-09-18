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
      pool: {
        max: 10,       // 최대 연결 수 증가 (5 → 10)
        min: 0,        // 최소 연결 수
        acquire: 60000, // 연결 획득 타임아웃 증가 (30초 → 60초)
        idle: 30000,   // 유휴 연결 타임아웃 증가 (10초 → 30초)
        evict: 1000    // 연결 제거 간격 (1초)
      }
    }
  );
}

export default sequelize; 