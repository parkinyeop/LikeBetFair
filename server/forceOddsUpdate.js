import oddsApiService from './services/oddsApiService.js';
import fs from 'fs';
import path from 'path';

// 로그 디렉토리 생성
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function saveUpdateLog(type, status, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    status,
    ...data
  };
  
  const logFile = path.join(logsDir, `force_odds_update_${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  
  console.log(`[${timestamp}] ${type.toUpperCase()} ${status.toUpperCase()}:`, data.message || '');
}

async function forceOddsUpdate() {
  console.log('=== 강제 배당율 업데이트 시작 ===\n');
  
  try {
    // 고우선순위 리그들
    const highPriorityCategories = ['NBA', 'MLB', 'KBO', 'NFL', '프리미어리그'];
    
    console.log('🎯 업데이트 대상 리그:', highPriorityCategories);
    saveUpdateLog('force', 'start', { 
      message: '강제 배당율 업데이트 시작',
      categories: highPriorityCategories
    });
    
    // 배당율 업데이트 실행
    const oddsUpdateResult = await oddsApiService.fetchAndCacheOddsForCategories(highPriorityCategories, 'high');
    
    // 결과 분석
    const oddsSummary = {
      totalUpdated: oddsUpdateResult?.updatedCount || 0,
      newOdds: oddsUpdateResult?.newCount || 0,
      existingOddsUpdated: oddsUpdateResult?.updatedExistingCount || 0,
      skippedOdds: oddsUpdateResult?.skippedCount || 0,
      apiCalls: oddsUpdateResult?.apiCalls || 0,
      categoriesProcessed: oddsUpdateResult?.categories?.length || 0
    };
    
    console.log('\n📊 업데이트 결과:');
    console.log('  - 총 업데이트:', oddsSummary.totalUpdated);
    console.log('  - 새로운 배당율:', oddsSummary.newOdds);
    console.log('  - 기존 배당율 업데이트:', oddsSummary.existingOddsUpdated);
    console.log('  - 건너뛴 배당율:', oddsSummary.skippedOdds);
    console.log('  - API 호출 수:', oddsSummary.apiCalls);
    console.log('  - 처리된 카테고리:', oddsSummary.categoriesProcessed);
    
    saveUpdateLog('force', 'success', { 
      message: '강제 배당율 업데이트 완료',
      oddsUpdated: oddsSummary.totalUpdated,
      oddsDetail: oddsSummary,
      categories: highPriorityCategories
    });
    
    console.log('\n✅ 강제 배당율 업데이트 완료!');
    
  } catch (error) {
    console.error('❌ 강제 배당율 업데이트 실패:', error.message);
    saveUpdateLog('force', 'error', { 
      message: '강제 배당율 업데이트 실패',
      error: error.message
    });
  }
  
  process.exit(0);
}

forceOddsUpdate(); 