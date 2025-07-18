import oddsApiService from './services/oddsApiService.js';
import fs from 'fs';
import path from 'path';

async function checkOddsScheduler() {
  try {
    console.log('🔍 Render 서버 배당율 스케줄러 상태 확인...');
    
    // 1. API 키 확인
    console.log('🔑 API 키 상태:', process.env.ODDS_API_KEY ? '설정됨' : '미설정');
    
    // 2. API 사용량 확인
    const apiStats = oddsApiService.apiCallTracker;
    console.log('\n📊 API 사용량:');
    console.log(`  일일 호출: ${apiStats.dailyCalls}/${apiStats.dailyLimit}`);
    console.log(`  월간 호출: ${apiStats.monthlyCalls}/${apiStats.monthlyLimit}`);
    console.log(`  시간당 호출: ${apiStats.currentHourCalls}/${apiStats.hourlyLimit}`);
    
    // 3. 동적 우선순위 확인
    const dynamicPriority = oddsApiService.getDynamicPriorityLevel();
    console.log(`\n🎯 동적 우선순위: ${dynamicPriority}`);
    
    // 4. API 호출 가능 여부 확인
    const canCall = oddsApiService.canMakeApiCall();
    console.log(`\n📡 API 호출 가능: ${canCall ? '✅ 가능' : '❌ 불가능'}`);
    
    // 5. 최근 로그 파일 확인
    const logsDir = path.join(process.cwd(), 'logs');
    if (fs.existsSync(logsDir)) {
      const logFiles = fs.readdirSync(logsDir)
        .filter(file => file.startsWith('scheduler_'))
        .sort()
        .reverse()
        .slice(0, 3);
      
      console.log('\n📋 최근 스케줄러 로그 파일:');
      logFiles.forEach(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`  ${file} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
      });
      
      // 가장 최근 로그 파일 내용 확인
      if (logFiles.length > 0) {
        const latestLog = path.join(logsDir, logFiles[0]);
        const logContent = fs.readFileSync(latestLog, 'utf8');
        const lines = logContent.trim().split('\n').slice(-10); // 마지막 10줄
        
        console.log('\n📝 최근 로그 내용 (마지막 10줄):');
        lines.forEach(line => {
          try {
            const logEntry = JSON.parse(line);
            const emoji = logEntry.status === 'success' ? '✅' : logEntry.status === 'error' ? '❌' : '🚀';
            console.log(`  ${emoji} [${logEntry.timestamp}] ${logEntry.type.toUpperCase()} ${logEntry.status.toUpperCase()}: ${logEntry.message || ''}`);
          } catch (e) {
            console.log(`  📄 ${line}`);
          }
        });
      }
    } else {
      console.log('\n📋 로그 디렉토리가 없습니다');
    }
    
    // 6. 배당율 통계 확인
    console.log('\n📊 배당율 통계:');
    try {
      const oddsStats = await oddsApiService.getOddsStats();
      console.log('카테고리별 배당율 수:');
      oddsStats.forEach(stat => {
        console.log(`  ${stat.mainCategory}/${stat.subCategory}: ${stat.count}개`);
      });
    } catch (error) {
      console.log('배당율 통계 조회 실패:', error.message);
    }
    
    // 7. API 비용 추정
    console.log('\n💰 API 비용 추정:');
    try {
      const costEstimate = await oddsApiService.getApiCostEstimate();
      console.log(`  월간 예상 호출: ${costEstimate.estimatedApiCalls.monthly}회`);
      console.log(`  월간 예상 비용: ${costEstimate.estimatedApiCalls.costEstimate}`);
      console.log(`  목표 달성: ${costEstimate.estimatedApiCalls.targetAchieved}`);
    } catch (error) {
      console.log('API 비용 추정 실패:', error.message);
    }
    
    console.log('\n✅ Render 서버 배당율 스케줄러 상태 확인 완료');
    
  } catch (error) {
    console.error('❌ 스케줄러 상태 확인 중 오류:', error);
  }
  
  process.exit(0);
}

checkOddsScheduler(); 