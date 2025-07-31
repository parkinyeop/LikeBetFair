import fs from 'fs';
import path from 'path';

async function checkRenderLogs() {
  try {
    console.log('🔍 Render 서버 스케줄러 로그 확인 시작...');
    
    const logsDir = path.join(process.cwd(), 'logs');
    const today = new Date().toISOString().slice(0, 10);
    const logFile = path.join(logsDir, `scheduler_${today}.log`);
    
    console.log(`📁 로그 파일 경로: ${logFile}`);
    
    if (!fs.existsSync(logFile)) {
      console.log('❌ 오늘 로그 파일이 존재하지 않습니다.');
      return;
    }
    
    // 로그 파일 읽기
    const logContent = fs.readFileSync(logFile, 'utf8');
    const logs = logContent.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(log => log !== null);
    
    console.log(`📊 총 로그 개수: ${logs.length}`);
    
    // 최근 10개 로그 출력
    console.log('\n📅 최근 10개 로그:');
    logs.slice(-10).forEach((log, index) => {
      console.log(`${index + 1}. [${log.timestamp}] ${log.type} - ${log.status}`);
      console.log(`   메시지: ${log.message}`);
      if (log.categories) {
        console.log(`   카테고리: ${log.categories.length}개`);
      }
      console.log('');
    });
    
    // 타입별 통계
    const typeStats = {};
    logs.forEach(log => {
      typeStats[log.type] = (typeStats[log.type] || 0) + 1;
    });
    
    console.log('📈 타입별 통계:');
    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}개`);
    });
    
    // 상태별 통계
    const statusStats = {};
    logs.forEach(log => {
      statusStats[log.status] = (statusStats[log.status] || 0) + 1;
    });
    
    console.log('\n📊 상태별 통계:');
    Object.entries(statusStats).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}개`);
    });
    
    // 에러 확인
    const errors = logs.filter(log => log.status === 'error');
    if (errors.length > 0) {
      console.log('\n❌ 에러 로그:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.timestamp}] ${error.type}`);
        console.log(`   메시지: ${error.message}`);
        if (error.error) {
          console.log(`   에러: ${error.error}`);
        }
        console.log('');
      });
    } else {
      console.log('\n✅ 에러 없음');
    }
    
  } catch (error) {
    console.error('❌ 로그 확인 중 오류 발생:', error);
  }
}

checkRenderLogs(); 