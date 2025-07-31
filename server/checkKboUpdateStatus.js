import OddsCache from './models/oddsCacheModel.js';
import { Op } from 'sequelize';

async function checkKboUpdateStatus() {
  try {
    console.log('🔍 KBO 배당율 업데이트 상태 확인...\n');
    
    // 1. 전체 KBO 데이터 개수 확인
    const totalKboCount = await OddsCache.count({
      where: {
        sportKey: 'baseball_kbo'
      }
    });
    
    console.log(`📊 전체 KBO 데이터: ${totalKboCount}개`);
    
    // 2. 최근 업데이트된 데이터 확인 (24시간 이내)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentKboCount = await OddsCache.count({
      where: {
        sportKey: 'baseball_kbo',
        lastUpdated: {
          [Op.gte]: oneDayAgo
        }
      }
    });
    
    console.log(`📅 24시간 이내 업데이트: ${recentKboCount}개`);
    
    // 3. 미래 경기 데이터 확인
    const now = new Date();
    const futureKboCount = await OddsCache.count({
      where: {
        sportKey: 'baseball_kbo',
        commenceTime: {
          [Op.gt]: now
        }
      }
    });
    
    console.log(`🔮 미래 경기: ${futureKboCount}개`);
    
    // 4. 최근 7일간의 경기 데이터 확인
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const recentGamesCount = await OddsCache.count({
      where: {
        sportKey: 'baseball_kbo',
        commenceTime: {
          [Op.gte]: now,
          [Op.lt]: sevenDaysLater
        }
      }
    });
    
    console.log(`📅 최근 7일간 경기: ${recentGamesCount}개`);
    
    // 5. 가장 최근 업데이트 시간 확인
    const latestUpdate = await OddsCache.findOne({
      where: {
        sportKey: 'baseball_kbo'
      },
      order: [['lastUpdated', 'DESC']],
      attributes: ['lastUpdated', 'homeTeam', 'awayTeam', 'commenceTime']
    });
    
    if (latestUpdate) {
      console.log(`🕐 가장 최근 업데이트: ${latestUpdate.lastUpdated.toLocaleString('ko-KR')}`);
      console.log(`   경기: ${latestUpdate.homeTeam} vs ${latestUpdate.awayTeam}`);
      console.log(`   경기시간: ${latestUpdate.commenceTime.toLocaleString('ko-KR')}`);
    }
    
    // 6. 최근 10개 경기 상세 정보
    console.log('\n=== 최근 10개 KBO 경기 ===');
    const recentGames = await OddsCache.findAll({
      where: {
        sportKey: 'baseball_kbo'
      },
      order: [['commenceTime', 'DESC']],
      limit: 10,
      attributes: ['homeTeam', 'awayTeam', 'commenceTime', 'lastUpdated']
    });
    
    recentGames.forEach((game, index) => {
      const gameTime = new Date(game.commenceTime);
      const isFuture = gameTime > now;
      const isRecent = game.lastUpdated > oneDayAgo;
      
      console.log(`${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`   경기시간: ${gameTime.toLocaleString('ko-KR')} ${isFuture ? '🔮' : '📅'}`);
      console.log(`   업데이트: ${game.lastUpdated.toLocaleString('ko-KR')} ${isRecent ? '✅' : '⚠️'}`);
      console.log('');
    });
    
    // 7. 문제 진단
    console.log('=== 문제 진단 ===');
    
    if (recentKboCount === 0) {
      console.log('❌ 문제: 24시간 이내 업데이트된 KBO 데이터가 없습니다.');
      console.log('   → 스케줄러가 실행되지 않거나 API 호출에 실패했을 수 있습니다.');
    } else {
      console.log('✅ 24시간 이내 업데이트된 데이터가 있습니다.');
    }
    
    if (futureKboCount === 0) {
      console.log('❌ 문제: 미래 KBO 경기 데이터가 없습니다.');
      console.log('   → API에서 미래 경기 데이터를 가져오지 못했을 수 있습니다.');
    } else {
      console.log('✅ 미래 KBO 경기 데이터가 있습니다.');
    }
    
    if (recentGamesCount === 0) {
      console.log('❌ 문제: 최근 7일간의 KBO 경기 데이터가 없습니다.');
      console.log('   → API 필터링 로직에 문제가 있을 수 있습니다.');
    } else {
      console.log('✅ 최근 7일간의 KBO 경기 데이터가 있습니다.');
    }
    
    // 8. 스케줄러 로그 확인 제안
    console.log('\n💡 다음 단계:');
    console.log('1. 스케줄러 로그 확인: /api/game-results/scheduler-logs');
    console.log('2. 수동 KBO 데이터 수집 실행');
    console.log('3. API 키 및 네트워크 연결 상태 확인');
    
  } catch (error) {
    console.error('❌ KBO 상태 확인 중 오류:', error.message);
  }
}

checkKboUpdateStatus(); 