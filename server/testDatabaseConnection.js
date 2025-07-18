import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import User from './models/userModel.js';

dotenv.config();

async function testDatabaseConnection() {
  console.log('🔍 데이터베이스 연결 및 스키마 테스트 시작...');
  
  // 환경 변수 확인
  console.log('📋 환경 변수 확인:');
  console.log('- DB_HOST:', process.env.DB_HOST);
  console.log('- DB_PORT:', process.env.DB_PORT);
  console.log('- DB_NAME:', process.env.DB_NAME);
  console.log('- DB_USER:', process.env.DB_USER);
  console.log('- DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');
  
  let sequelize;
  try {
    // Sequelize 인스턴스 생성
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
          dialect: 'postgres',
          logging: console.log
        }
      );
    }
    
    // 데이터베이스 연결 테스트
    console.log('🔗 데이터베이스 연결 중...');
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공!');
    
    // Users 테이블 스키마 확인
    console.log('📊 Users 테이블 스키마 확인...');
    const tableDescription = await sequelize.getQueryInterface().describeTable('Users');
    console.log('Users 테이블 컬럼:', Object.keys(tableDescription));
    
    // 각 컬럼의 타입 확인
    for (const [columnName, columnInfo] of Object.entries(tableDescription)) {
      console.log(`- ${columnName}: ${columnInfo.type} (nullable: ${columnInfo.allowNull})`);
    }
    
    // User 모델과 실제 테이블 비교
    console.log('🔍 User 모델과 실제 테이블 비교...');
    
    // 테스트 사용자 생성 시도
    console.log('🧪 테스트 사용자 생성 시도...');
    try {
      const testUser = await User.create({
        username: 'test_' + Date.now(),
        email: 'test_' + Date.now() + '@example.com',
        password: 'testpassword123',
        balance: 0.00,
        isAdmin: false,
        adminLevel: 0,
        isActive: true
      });
      
      console.log('✅ 테스트 사용자 생성 성공:', {
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        balance: testUser.balance,
        isAdmin: testUser.isAdmin,
        adminLevel: testUser.adminLevel,
        isActive: testUser.isActive
      });
      
      // 테스트 사용자 삭제
      await testUser.destroy();
      console.log('✅ 테스트 사용자 삭제 완료');
      
    } catch (error) {
      console.error('❌ 테스트 사용자 생성 실패:', error);
      console.error('오류 타입:', error.name);
      console.error('오류 메시지:', error.message);
      
      if (error.errors) {
        console.error('상세 오류:', error.errors);
      }
    }
    
  } catch (error) {
    console.error('❌ 데이터베이스 테스트 실패:', error);
    console.error('오류 타입:', error.name);
    console.error('오류 메시지:', error.message);
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log('🔌 데이터베이스 연결 종료');
    }
  }
}

testDatabaseConnection(); 