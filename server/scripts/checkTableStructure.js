import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Render 데이터베이스 연결을 위한 Sequelize 인스턴스 생성
const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTableStructure() {
  try {
    console.log('🔍 테이블 구조 확인 시작...');
    
    // 1. 데이터베이스 연결 확인
    console.log('\n1️⃣ 데이터베이스 연결 확인...');
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공!');
    
    // 2. Bets 테이블 컬럼 구조 확인
    console.log('\n2️⃣ Bets 테이블 컬럼 구조:');
    const [betsColumns] = await sequelize.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'Bets'
      ORDER BY ordinal_position;
    `);
    
    console.log('Bets 테이블 컬럼:');
    betsColumns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // 3. GameResults 테이블 컬럼 구조 확인
    console.log('\n3️⃣ GameResults 테이블 컬럼 구조:');
    const [gameResultsColumns] = await sequelize.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'GameResults'
      ORDER BY ordinal_position;
    `);
    
    console.log('GameResults 테이블 컬럼:');
    gameResultsColumns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // 4. Users 테이블 컬럼 구조 확인
    console.log('\n4️⃣ Users 테이블 컬럼 구조:');
    const [usersColumns] = await sequelize.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'Users'
      ORDER BY ordinal_position;
    `);
    
    console.log('Users 테이블 컬럼:');
    usersColumns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // 5. 샘플 데이터 확인
    console.log('\n5️⃣ Bets 테이블 샘플 데이터:');
    const [sampleBets] = await sequelize.query(`
      SELECT * FROM "Bets" LIMIT 3;
    `);
    
    if (sampleBets.length > 0) {
      console.log('샘플 배팅 데이터:');
      sampleBets.forEach((bet, index) => {
        console.log(`\n배팅 ${index + 1}:`);
        Object.entries(bet).forEach(([key, value]) => {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        });
      });
    } else {
      console.log('Bets 테이블에 데이터가 없습니다.');
    }
    
    console.log('\n✅ 테이블 구조 확인 완료!');
    
  } catch (error) {
    console.error('❌ 테이블 구조 확인 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// 스크립트 실행
checkTableStructure(); 