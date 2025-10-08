// server/jobs/settlementScheduler.js
import schedule from 'node-schedule';
import gameResultService from '../services/gameResultService.js';
import betResultService from '../services/betResultService.js';
import multibetSettlementService from '../services/multibetSettlementService.js';
import exchangeSettlementService from '../services/exchangeSettlementService.js';

console.log('⏰ [Scheduler] 정산 스케줄러가 활성화되었습니다.');

// 매 30분마다 경기 결과 수집
schedule.scheduleJob('*/30 * * * *', async () => {
  console.log('⚙️ [Scheduler] 경기 결과 수집 작업을 시작합니다...');
  try {
    const result = await gameResultService.fetchAndSaveAllResults();
    console.log(`✅ [Scheduler] 경기 결과 수집 완료: 신규 ${result.newCount}개, 업데이트 ${result.updatedCount}개`);
  } catch (error) {
    console.error('❌ [Scheduler] 경기 결과 수집 중 오류 발생:', error);
  }
});

// 매 15분마다 베팅 정산
schedule.scheduleJob('*/15 * * * *', async () => {
  console.log('⚙️ [Scheduler] 베팅 정산 작업을 시작합니다...');
  try {
    // 1. 스포츠북 정산
    const betResult = await betResultService.updateBetResults();
    console.log(`✅ [Scheduler] 스포츠북 정산: ${betResult.updatedCount}개 완료`);

    // 2. 익스체인지 일반 주문 정산
    const exchangeService = new exchangeSettlementService();
    const exchangeResult = await exchangeService.settleAllConnectedOrders();
    console.log(`✅ [Scheduler] 익스체인지 일반 주문 정산: ${exchangeResult?.totalSettled || 0}개 완료`);

    // 3. 익스체인지 멀티베팅 정산
    const multibetResult = await multibetSettlementService.settleAllMultibetOrders();
    console.log(`✅ [Scheduler] 익스체인지 멀티베팅 정산: ${multibetResult?.settledCount || 0}개 완료`);
  } catch (error) {
    console.error('❌ [Scheduler] 베팅 정산 중 오류 발생:', error);
  }
});

// 매 5분마다 고아 주문 정산 (제미나이 제안)
schedule.scheduleJob('*/5 * * * *', async () => {
  console.log('⚙️ [Scheduler] 고아 주문 정산 작업을 시작합니다...');
  try {
    const exchangeService = new exchangeSettlementService();
    const result = await exchangeService.settleOrphanedOrders();
    console.log(`✅ [Scheduler] 고아 주문 정산: ${result.settledCount}개 완료`);
  } catch (error) {
    console.error('❌ [Scheduler] 고아 주문 정산 중 오류 발생:', error);
  }
});

console.log('📅 [Scheduler] 스케줄 등록 완료:');
console.log('   - 경기 결과 수집: 매 30분마다 실행');
console.log('   - 베팅 정산: 매 15분마다 실행');
console.log('   - 고아 주문 정산: 매 5분마다 실행');



