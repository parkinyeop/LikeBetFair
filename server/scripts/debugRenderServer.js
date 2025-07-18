import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import OddsCache from '../models/oddsCacheModel.js';
import oddsApiService from '../services/oddsApiService.js';

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

async function debugRenderServer() {
  try {
    console.log('🔍 Render 서버 진단 시작...');
    console.log('환경:', process.env.NODE_ENV || 'development');
    
    // 1. 데이터베이스 연결 확인
    console.log('\n1️⃣ 데이터베이스 연결 확인...');
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공!');
    
    // 2. 환경 변수 확인
    console.log('\n2️⃣ 환경 변수 확인:');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');
    console.log('ODDS_API_KEY:', process.env.ODDS_API_KEY ? '***' : 'undefined');
    console.log('THESPORTSDB_API_KEY:', process.env.THESPORTSDB_API_KEY ? '***' : 'undefined');
    
    // 3. 테이블 존재 확인
    console.log('\n3️⃣ 테이블 존재 확인...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📊 테이블 목록:');
    if (tables.length === 0) {
      console.log('❌ 테이블이 없습니다!');
      return;
    } else {
      tables.forEach((table, index) => {
        console.log(`${index + 1}. "${table.table_name}"`);
      });
    }
    
    // 4. OddsCaches 테이블 데이터 확인
    console.log('\n4️⃣ OddsCaches 테이블 데이터 확인...');
    const oddsCount = await OddsCache.count();
    console.log(`📊 OddsCaches 테이블 레코드 수: ${oddsCount}`);
    
    if (oddsCount > 0) {
      const recentOdds = await OddsCache.findAll({
        order: [['lastUpdated', 'DESC']],
        limit: 5
      });
      
      console.log('📊 최근 배당율 데이터:');
      recentOdds.forEach((odds, index) => {
        console.log(`${index + 1}. ${odds.homeTeam} vs ${odds.awayTeam} (${odds.sportKey}) - ${odds.lastUpdated}`);
      });
    } else {
      console.log('❌ OddsCaches 테이블에 데이터가 없습니다!');
    }
    
    // 5. API 키 유효성 확인
    console.log('\n5️⃣ API 키 유효성 확인...');
    const oddsApiKey = process.env.ODDS_API_KEY || process.env.THE_ODDS_API_KEY;
    if (oddsApiKey) {
      try {
        const response = await fetch('https://api.the-odds-api.com/v4/sports', {
          headers: {
            'x-api-key': oddsApiKey
          }
        });
        
        if (response.ok) {
          const sports = await response.json();
          console.log(`✅ Odds API 연결 성공! 사용 가능한 스포츠: ${sports.length}개`);
        } else {
          console.log(`❌ Odds API 연결 실패: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`❌ Odds API 연결 오류: ${error.message}`);
      }
    } else {
      console.log('❌ ODDS_API_KEY가 설정되지 않았습니다!');
    }
    
    // 6. 스케줄러 상태 확인
    console.log('\n6️⃣ 스케줄러 상태 확인...');
    const schedulerLogs = await sequelize.query(`
      SELECT * FROM "OddsHistories" 
      ORDER BY "snapshotTime" DESC 
      LIMIT 5;
    `);
    
    if (schedulerLogs[0].length > 0) {
      console.log('✅ 스케줄러가 실행되고 있습니다.');
      console.log('📊 최근 스케줄러 로그:');
      schedulerLogs[0].forEach((log, index) => {
        console.log(`${index + 1}. ${log.snapshotTime} - ${log.bookmakerName}`);
      });
    } else {
      console.log('❌ 스케줄러가 실행되지 않고 있습니다!');
    }
    
    console.log('\n✅ Render 서버 진단 완료!');
    
  } catch (error) {
    console.error('❌ Render 서버 진단 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  } finally {
    await sequelize.close();
  }
}

debugRenderServer(); 