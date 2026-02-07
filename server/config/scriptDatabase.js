import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// 스크립트 전용 Sequelize 인스턴스
const createScriptSequelize = () => {
  return new Sequelize({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'bettingDB',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,      // 스크립트용이므로 연결 수 제한
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
};

export default createScriptSequelize;
