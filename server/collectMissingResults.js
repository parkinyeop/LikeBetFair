const GameResultService = require('./services/gameResultService');

async function collectMissingResults() {
  try {
    console.log('=== 누락된 경기 결과 수집 시작 ===\n');
    
    const service = new GameResultService();
    const result = await service.collectMissingGameResults();
    
    console.log('\n=== 수집 결과 ===');
    console.log(`총 누락된 경기 수: ${result.totalMissing}개`);
    console.log(`수집 성공: ${result.collectedCount}개`);
    console.log(`수집 실패: ${result.errorCount}개`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

collectMissingResults(); 