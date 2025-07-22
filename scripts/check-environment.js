#!/usr/bin/env node

/**
 * 환경 설정 확인 스크립트
 * 로컬과 Render 환경의 차이를 확인할 수 있습니다.
 */

const fs = require('fs');
const path = require('path');

// 색상 출력을 위한 유틸리티
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'bright');
  console.log('='.repeat(50));
}

function logSubSection(title) {
  console.log('\n' + '-'.repeat(30));
  log(title, 'cyan');
  console.log('-'.repeat(30));
}

// 환경변수 확인
function checkEnvironmentVariables() {
  logSubSection('환경변수 확인');
  
  const requiredVars = [
    'NODE_ENV',
    'DATABASE_URL',
    'ODDS_API_KEY',
    'SPORTSDB_API_KEY',
    'NEXT_PUBLIC_API_URL'
  ];
  
  const optionalVars = [
    'PORT',
    'JWT_SECRET',
    'RENDER_EXTERNAL_URL'
  ];
  
  log('필수 환경변수:', 'yellow');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      // 민감한 정보는 마스킹
      const maskedValue = varName.includes('KEY') || varName.includes('SECRET') || varName.includes('URL')
        ? value.substring(0, 10) + '...'
        : value;
      log(`  ✅ ${varName}: ${maskedValue}`, 'green');
    } else {
      log(`  ❌ ${varName}: 설정되지 않음`, 'red');
    }
  });
  
  log('\n선택적 환경변수:', 'yellow');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      log(`  ✅ ${varName}: ${value}`, 'green');
    } else {
      log(`  ⚠️  ${varName}: 설정되지 않음 (선택사항)`, 'yellow');
    }
  });
}

// 파일 구조 확인
function checkFileStructure() {
  logSubSection('파일 구조 확인');
  
  const requiredFiles = [
    'package.json',
    'next.config.cjs',
    'tailwind.config.cjs',
    'tsconfig.json',
    'server/app.js',
    'server/config/database.js',
    'config/apiConfig.ts',
    'config/sportsMapping.ts'
  ];
  
  requiredFiles.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      log(`  ✅ ${filePath}`, 'green');
    } else {
      log(`  ❌ ${filePath}`, 'red');
    }
  });
}

// API 엔드포인트 확인
async function checkApiEndpoints() {
  logSubSection('API 엔드포인트 확인');
  
  const endpoints = [
    '/api/odds/kbo',
    '/api/odds/nba',
    '/api/odds/soccer_korea_kleague1',
    '/api/bet/history',
    '/api/auth/login'
  ];
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://likebetfair.onrender.com';
  
  log(`API 기본 URL: ${baseUrl}`, 'blue');
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      if (response.ok) {
        log(`  ✅ ${endpoint} (${response.status})`, 'green');
      } else {
        log(`  ⚠️  ${endpoint} (${response.status})`, 'yellow');
      }
    } catch (error) {
      log(`  ❌ ${endpoint} (연결 실패: ${error.message})`, 'red');
    }
  }
}

// 데이터베이스 연결 확인
async function checkDatabaseConnection() {
  logSubSection('데이터베이스 연결 확인');
  
  const { Pool } = require('pg');
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    
    log(`  ✅ 데이터베이스 연결 성공`, 'green');
    log(`  📅 현재 시간: ${result.rows[0].current_time}`, 'blue');
    log(`  🗄️  DB 버전: ${result.rows[0].db_version.split(' ')[0]}`, 'blue');
    
    client.release();
    await pool.end();
  } catch (error) {
    log(`  ❌ 데이터베이스 연결 실패: ${error.message}`, 'red');
  }
}

// 메인 실행 함수
async function main() {
  logSection('🔍 환경 설정 진단 도구');
  
  log(`실행 시간: ${new Date().toLocaleString('ko-KR')}`, 'blue');
  log(`현재 디렉토리: ${process.cwd()}`, 'blue');
  
  checkEnvironmentVariables();
  checkFileStructure();
  
  if (process.argv.includes('--api')) {
    await checkApiEndpoints();
  }
  
  if (process.argv.includes('--db')) {
    await checkDatabaseConnection();
  }
  
  logSection('📋 권장사항');
  
  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL이 설정되지 않았습니다.', 'red');
    log('   Render 대시보드에서 환경변수를 설정해주세요.', 'yellow');
  }
  
  if (!process.env.ODDS_API_KEY) {
    log('❌ ODDS_API_KEY가 설정되지 않았습니다.', 'red');
    log('   The Odds API 키를 설정해주세요.', 'yellow');
  }
  
  if (!process.env.SPORTSDB_API_KEY) {
    log('❌ SPORTSDB_API_KEY가 설정되지 않았습니다.', 'red');
    log('   TheSportsDB API 키를 설정해주세요.', 'yellow');
  }
  
  log('\n✅ 환경 진단 완료!', 'green');
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkEnvironmentVariables,
  checkFileStructure,
  checkApiEndpoints,
  checkDatabaseConnection
}; 