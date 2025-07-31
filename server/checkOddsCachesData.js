import OddsCache from './models/oddsCacheModel.js';
import { Op } from 'sequelize';

async function checkOddsCachesData() {
  console.log('=== OddsCaches 데이터 상태 확인 ===\n');
  
  try {
    // 1. 전체 KBO 데이터 수 확인
    const totalKboCount = await OddsCache.count({
      where: { sportKey: 'baseball_kbo' }
    });
    console.log(`1. 전체 KBO 데이터 수: ${totalKboCount}개`);
    
    // 2. 최근 24시간 내 업데이트된 KBO 데이터
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentKboCount = await OddsCache.count({
      where: {
        sportKey: 'baseball_kbo',
        lastUpdated: { [Op.gte]: oneDayAgo }
      }
    });
    console.log(`2. 최근 24시간 내 업데이트된 KBO 데이터: ${recentKboCount}개`);
    
    // 3. 미래 경기 (현재 시간 이후) KBO 데이터
    const now = new Date();
    const futureKboCount = await OddsCache.count({
      where: {
        sportKey: 'baseball_kbo',
        commenceTime: { [Op.gt]: now }
      }
    });
    console.log(`3. 미래 경기 KBO 데이터: ${futureKboCount}개`);
    
    // 4. 최근 7일 + 미래 30일 범위의 KBO 데이터 (API 필터링 조건)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const apiFilteredCount = await OddsCache.count({
      where: {
        sportKey: 'baseball_kbo',
        commenceTime: {
          [Op.gte]: sevenDaysAgo,
          [Op.lt]: thirtyDaysLater
        }
      }
    });
    console.log(`4. API 필터링 조건 (7일 전~30일 후) KBO 데이터: ${apiFilteredCount}개`);
    
    // 5. 최신 KBO 데이터 5개 조회
    const latestKboData = await OddsCache.findAll({
      where: { sportKey: 'baseball_kbo' },
      order: [['lastUpdated', 'DESC']],
      limit: 5
    });
    
    console.log('\n5. 최신 KBO 데이터 5개:');
    latestKboData.forEach((data, index) => {
      console.log(`   ${index + 1}. ${data.homeTeam} vs ${data.awayTeam}`);
      console.log(`      경기시간: ${data.commenceTime}`);
      console.log(`      업데이트: ${data.lastUpdated}`);
      console.log(`      북메이커 수: ${data.bookmakers?.length || 0}개`);
      console.log('');
    });
    
    // 6. 미래 KBO 경기 5개 조회
    const futureKboData = await OddsCache.findAll({
      where: {
        sportKey: 'baseball_kbo',
        commenceTime: { [Op.gt]: now }
      },
      order: [['commenceTime', 'ASC']],
      limit: 5
    });
    
    console.log('6. 미래 KBO 경기 5개:');
    futureKboData.forEach((data, index) => {
      console.log(`   ${index + 1}. ${data.homeTeam} vs ${data.awayTeam}`);
      console.log(`      경기시간: ${data.commenceTime}`);
      console.log(`      업데이트: ${data.lastUpdated}`);
      console.log('');
    });
    
    // 7. API 필터링 조건에 맞는 KBO 데이터 5개 조회
    const apiFilteredData = await OddsCache.findAll({
      where: {
        sportKey: 'baseball_kbo',
        commenceTime: {
          [Op.gte]: sevenDaysAgo,
          [Op.lt]: thirtyDaysLater
        }
      },
      order: [['commenceTime', 'ASC']],
      limit: 5
    });
    
    console.log('7. API 필터링 조건에 맞는 KBO 데이터 5개:');
    apiFilteredData.forEach((data, index) => {
      console.log(`   ${index + 1}. ${data.homeTeam} vs ${data.awayTeam}`);
      console.log(`      경기시간: ${data.commenceTime}`);
      console.log(`      업데이트: ${data.lastUpdated}`);
      console.log('');
    });
    
    console.log('=== 확인 완료 ===');
    
  } catch (error) {
    console.error('❌ 데이터 확인 중 오류:', error.message);
  }
  
  process.exit(0);
}

checkOddsCachesData(); 