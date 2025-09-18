const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bettingDB',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,       // 최대 연결 수 증가 (5 → 10)
      min: 0,        // 최소 연결 수
      acquire: 60000, // 연결 획득 타임아웃 증가 (30초 → 60초)
      idle: 30000,   // 유휴 연결 타임아웃 증가 (10초 → 30초)
      evict: 1000    // 연결 제거 간격 (1초)
    }
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bettingDB',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bettingDB',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,       // 최대 연결 수 증가 (5 → 10)
      min: 0,        // 최소 연결 수
      acquire: 60000, // 연결 획득 타임아웃 증가 (30초 → 60초)
      idle: 30000,   // 유휴 연결 타임아웃 증가 (10초 → 30초)
      evict: 1000    // 연결 제거 간격 (1초)
    }
  }
}; 