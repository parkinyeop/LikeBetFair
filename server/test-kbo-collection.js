// KBO 자동 수집 시스템 테스트
import GameResult from './models/gameResultModel.js';
import gameResultService from './services/gameResultService.js';
import { Op } from 'sequelize';

(async () => {
  try {
    console.log('🧪 KBO 자동 수집 시스템 테스트 시작\n');
    
    // 1. 현재 DB에 있는 KBO 경기 수집 상태 확인
    const currentKboGames = await GameResult.findAll({
      where: {
        subCategory: 'KBO'
      },
      order: [['commenceTime', 'DESC']],
      limit: 10
    });
    
    console.log(`📊 현재 DB의 KBO 경기: ${currentKboGames.length}개`);
    if (currentKboGames.length > 0) {
      console.log('📋 최근 KBO 경기 상태:');
      currentKboGames.forEach(game => {
        console.log(`   • ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`     상태: ${game.status} | 결과: ${game.result}`);
        console.log(`     스코어: ${JSON.stringify(game.score)}`);
        console.log(`     시간: ${game.commenceTime} | 업데이트: ${game.lastUpdated}`);
        console.log('');
      });
    }
    
    // 2. 실제 자동 수집 함수 테스트 (KBO만)
    console.log('🔄 KBO 자동 수집 함수 테스트...\n');
    
    const collectionResult = await gameResultService.fetchAndUpdateResultsForCategories(['KBO']);
    
    console.log('📈 수집 결과:');
    console.log(`   새로운 경기: ${collectionResult.newCount}개`);
    console.log(`   업데이트된 경기: ${collectionResult.updatedCount}개`);
    console.log(`   기존 경기 업데이트: ${collectionResult.updatedExistingCount}개`);
    console.log(`   건너뛴 경기: ${collectionResult.skippedCount}개`);
    
    // 3. 수집 후 DB 상태 재확인
    console.log('\n🔍 수집 후 DB 상태 재확인...');
    
    const updatedKboGames = await GameResult.findAll({
      where: {
        subCategory: 'KBO'
      },
      order: [['lastUpdated', 'DESC']],
      limit: 10
    });
    
    console.log(`📊 업데이트 후 KBO 경기: ${updatedKboGames.length}개`);
    
    // 4. 최근 업데이트된 KBO 경기들만 표시
    const recentlyUpdated = updatedKboGames.filter(game => {
      const now = new Date();
      const updatedTime = new Date(game.lastUpdated);
      const timeDiff = now - updatedTime;
      return timeDiff < 5 * 60 * 1000; // 5분 이내 업데이트
    });
    
    console.log(`\n🆕 최근 5분 내 업데이트된 KBO 경기: ${recentlyUpdated.length}개`);
    
    if (recentlyUpdated.length > 0) {
      console.log('📋 최근 업데이트된 KBO 경기:');
      recentlyUpdated.forEach(game => {
        console.log(`   • ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`     상태: ${game.status} | 결과: ${game.result}`);
        console.log(`     스코어: ${JSON.stringify(game.score)}`);
        console.log(`     경기시간: ${game.commenceTime}`);
        console.log(`     마지막 업데이트: ${game.lastUpdated}`);
        console.log('');
      });
    }
    
    // 5. 점검 결론
    console.log('\n📋 점검 결론:');
    if (collectionResult.updatedCount > 0 || collectionResult.newCount > 0) {
      console.log('✅ KBO 자동 수집 시스템이 정상 동작하고 있습니다.');
      console.log(`   - 총 ${collectionResult.updatedCount}개 경기가 업데이트되었습니다.`);
    } else if (collectionResult.skippedCount > 0) {
      console.log('⚠️  KBO 자동 수집은 동작하지만 새로운 업데이트가 없습니다.');
      console.log('   - 모든 경기가 이미 최신 상태이거나 업데이트할 데이터가 없습니다.');
    } else {
      console.log('❌ KBO 자동 수집에 문제가 있을 수 있습니다.');
      console.log('   - API 호출은 성공했지만 DB 업데이트가 이루어지지 않았습니다.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ KBO 수집 테스트 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();