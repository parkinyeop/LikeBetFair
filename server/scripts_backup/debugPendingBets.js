import betResultService from '../services/betResultService.js';
import Bet from '../models/betModel.js';

async function debugPendingBets() {
  try {
    console.log('=== 베팅 결과 업데이트 디버깅 시작 ===');
    
    // 베팅 결과 업데이트 실행
    const result = await betResultService.updateBetResults();
    
    console.log('=== 업데이트 결과 ===');
    console.log('업데이트된 베팅 수:', result.updatedCount);
    console.log('에러 수:', result.errorCount);
    
    // 업데이트 후 pending 베팅 확인
    const pendingBets = await Bet.findAll({
      where: { status: 'pending' }
    });
    
    console.log('=== 업데이트 후 pending 베팅 현황 ===');
    console.log('총 pending 베팅 수:', pendingBets.length);
    
    for (const bet of pendingBets) {
      console.log(`베팅 ID: ${bet.id}`);
      console.log(`스테이크: ${bet.stake}`);
      console.log(`총 배당률: ${bet.totalOdds}`);
      console.log(`생성일: ${bet.createdAt}`);
      console.log('---');
    }
    
  } catch (error) {
    console.error('디버깅 중 에러 발생:', error);
  }
}

debugPendingBets(); 