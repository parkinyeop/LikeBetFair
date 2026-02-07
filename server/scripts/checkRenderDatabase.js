import dotenv from 'dotenv';
import createScriptSequelize from '../config/scriptDatabase.js';

dotenv.config();

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();

async function checkRenderDatabase() {
  try {
    console.log('🔍 Render 데이터베이스 연결 중...');
    console.log('환경:', process.env.NODE_ENV || 'development');
    
    await sequelize.authenticate();
    console.log('✅ Render 데이터베이스 연결 성공!');
    
    // 환경 변수 확인 (비밀번호는 마스킹)
    console.log('\n📋 Render 환경 변수 확인:');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');
    
    // 모든 테이블 목록 조회 (정확한 테이블명 확인)
    console.log('\n📊 Render 데이터베이스 테이블 목록:');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    if (tables.length === 0) {
      console.log('❌ 테이블이 없습니다.');
    } else {
      tables.forEach((table, index) => {
        console.log(`${index + 1}. "${table.table_name}"`);
      });
    }
    
    // 각 테이블의 컬럼 정보도 확인
    console.log('\n🔍 테이블별 컬럼 정보:');
    for (const tableRow of tables) {
      const tableName = tableRow.table_name;
      try {
        const tableDescription = await sequelize.getQueryInterface().describeTable(tableName);
        console.log(`\n📋 "${tableName}" 테이블:`);
        Object.keys(tableDescription).forEach(column => {
          const colInfo = tableDescription[column];
          console.log(`  - ${column}: ${colInfo.type} ${colInfo.allowNull ? '(NULL)' : '(NOT NULL)'}`);
        });
      } catch (error) {
        console.log(`⚠️ "${tableName}" 테이블 정보 조회 실패: ${error.message}`);
      }
    }
    
    // 외래키 제약조건 확인
    console.log('\n🔗 외래키 제약조건 확인:');
    try {
      const [results] = await sequelize.query(`
        SELECT 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, kcu.column_name;
      `);
      
      if (results.length === 0) {
        console.log('❌ 외래키 제약조건이 없습니다.');
      } else {
        results.forEach((fk, index) => {
          console.log(`${index + 1}. "${fk.table_name}"."${fk.column_name}" -> "${fk.foreign_table_name}"."${fk.foreign_column_name}" (${fk.constraint_name})`);
        });
      }
    } catch (error) {
      console.log(`⚠️ 외래키 정보 조회 실패: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Render 데이터베이스 확인 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

checkRenderDatabase(); 