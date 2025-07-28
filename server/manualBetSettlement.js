import betResultService from './services/betResultService.js';

async function manualBetSettlement() {
  console.log('=== 수동 베팅 정산 시작 ===');
  
  try {
    // 베팅 정산 실행
    console.log('베팅 정산 서비스 호출 중...');
    const result = await betResultService.updateBetResults();
    
    console.log('\n=== 베팅 정산 완료 ===');
    console.log(`✅ 업데이트된 베팅: ${result.updatedCount}개`);
    console.log(`❌ 오류 발생: ${result.errorCount}개`);
    
    // 정산 후 상태 확인
    const Bet = (await import('./models/betModel.js')).default;
    const pendingCount = await Bet.count({ where: { status: 'pending' } });
    const wonCount = await Bet.count({ where: { status: 'won' } });
    const lostCount = await Bet.count({ where: { status: 'lost' } });
    const cancelledCount = await Bet.count({ where: { status: 'cancelled' } });
    
    console.log('\n=== 현재 베팅 상태 ===');
    console.log(`⏳ Pending: ${pendingCount}개`);
    console.log(`✅ Won: ${wonCount}개`);
    console.log(`❌ Lost: ${lostCount}개`);
    console.log(`🚫 Cancelled: ${cancelledCount}개`);
    
  } catch (error) {
    console.error('베팅 정산 중 오류 발생:', error);
  }
  
  process.exit(0);
}

// 스크립트 실행
manualBetSettlement(); 