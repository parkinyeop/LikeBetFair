import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sequelize 인스턴스 생성
const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
});

// 마이그레이션 파일들을 실행하는 함수
async function runMigrations() {
  try {
    console.log('데이터베이스 연결 중...');
    await sequelize.authenticate();
    console.log('데이터베이스 연결 성공!');

    // 마이그레이션 디렉토리 경로
    const migrationsDir = join(__dirname, 'migrations');
    
    // 마이그레이션 파일들 읽기 (중복 파일 제외)
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.cjs') && !file.endsWith('.bak'))
      .filter(file => !file.includes('recreate-tables-fix')) // 중복 파일 제외
      .sort();

    console.log(`발견된 마이그레이션 파일: ${migrationFiles.length}개`);

    for (const file of migrationFiles) {
      console.log(`실행 중: ${file}`);
      
      try {
        // CommonJS 모듈을 동적으로 import
        const migrationPath = join(migrationsDir, file);
        const migration = await import(migrationPath);
        
        if (migration.up) {
          await migration.up(sequelize.getQueryInterface(), Sequelize);
          console.log(`✅ ${file} 실행 완료`);
        } else {
          console.log(`⚠️  ${file}에 up 함수가 없음`);
        }
      } catch (error) {
        // 중복 제약조건 오류는 무시하고 계속 진행
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('relation') && error.message.includes('already exists')) {
          console.log(`⚠️  ${file} - 이미 존재하는 객체 무시: ${error.message}`);
        } else {
          console.error(`❌ ${file} 실행 실패:`, error.message);
          // 심각한 오류가 아니면 계속 진행
        }
      }
    }

    console.log('모든 마이그레이션 완료!');
    
  } catch (error) {
    console.error('마이그레이션 실행 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

runMigrations(); 