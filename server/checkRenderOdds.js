import OddsCache from './models/oddsCacheModel.js';
import { Op } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

async function checkRenderOdds() {
  console.log('=== 랜더 서버 배당율 데이터 상태 확인 ===\n');
  
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    
    // 1. 전체 데이터 수
    const totalCount = await OddsCache.count();
    console.log(`1. 전체 OddsCache 데이터 수: ${totalCount}개`);
    
    // 2. 최근 24시간 내 업데이트된 데이터
    const recentCount = await OddsCache.count({
      where: {
        lastUpdated: { [Op.gte]: oneDayAgo }
      }
    });
    console.log(`2. 최근 24시간 내 업데이트된 데이터: ${recentCount}개`);
    
    // 3. 최근 48시간 내 업데이트된 데이터
    const recentTwoDaysCount = await OddsCache.count({
      where: {
        lastUpdated: { [Op.gte]: twoDaysAgo }
      }
    });
    console.log(`3. 최근 48시간 내 업데이트된 데이터: ${recentTwoDaysCount}개`);
    
    // 4. 스포츠별 최근 업데이트 데이터
    const sportDistribution = await OddsCache.findAll({
      attributes: [
        'sportKey',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
        [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN "lastUpdated" >= '${oneDayAgo.toISOString()}' THEN 1 END`)), 'recentCount']
      ],
      group: ['sportKey'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });
    
    console.log('\n4. 스포츠별 데이터 분포 (전체 / 최근 24시간):');
    sportDistribution.forEach(item => {
      console.log(`   ${item.sportKey}: ${item.dataValues.totalCount}개 / ${item.dataValues.recentCount}개`);
    });
    
    // 5. 최신 업데이트된 데이터 10개
    const latestData = await OddsCache.findAll({
      order: [['lastUpdated', 'DESC']],
      limit: 10
    });
    
    console.log('\n5. 최신 업데이트된 데이터 10개:');
    latestData.forEach((data, index) => {
      console.log(`   ${index + 1}. ${data.sportKey} - ${data.homeTeam} vs ${data.awayTeam}`);
      console.log(`      경기시간: ${data.commenceTime}`);
      console.log(`      업데이트: ${data.lastUpdated}`);
      console.log(`      북메이커 수: ${data.bookmakers?.length || 0}개`);
      console.log('');
    });
    
    // 6. 미래 경기 데이터 (현재 시간 이후)
    const futureCount = await OddsCache.count({
      where: {
        commenceTime: { [Op.gt]: now }
      }
    });
    console.log(`6. 미래 경기 데이터: ${futureCount}개`);
    
    // 7. 미래 경기 중 최근 업데이트된 것들
    const futureRecentData = await OddsCache.findAll({
      where: {
        commenceTime: { [Op.gt]: now },
        lastUpdated: { [Op.gte]: oneDayAgo }
      },
      order: [['commenceTime', 'ASC']],
      limit: 5
    });
    
    console.log('\n7. 미래 경기 중 최근 업데이트된 데이터 5개:');
    futureRecentData.forEach((data, index) => {
      console.log(`   ${index + 1}. ${data.sportKey} - ${data.homeTeam} vs ${data.awayTeam}`);
      console.log(`      경기시간: ${data.commenceTime}`);
      console.log(`      업데이트: ${data.lastUpdated}`);
      console.log('');
    });
    
    // 8. 7월 31일 데이터 확인
    const july31Start = new Date('2025-07-31T00:00:00Z');
    const july31End = new Date('2025-07-31T23:59:59Z');
    
    const july31Count = await OddsCache.count({
      where: {
        lastUpdated: {
          [Op.between]: [july31Start, july31End]
        }
      }
    });
    console.log(`\n8. 7월 31일 업데이트된 데이터: ${july31Count}개`);
    
    // 9. 7월 31일 5시 이후 데이터 확인
    const july31FiveAM = new Date('2025-07-31T05:00:00Z');
    const july31AfterFiveCount = await OddsCache.count({
      where: {
        lastUpdated: { [Op.gte]: july31FiveAM }
      }
    });
    console.log(`9. 7월 31일 5시 이후 업데이트된 데이터: ${july31AfterFiveCount}개`);
    
    console.log('\n=== 확인 완료 ===');
    
  } catch (error) {
    console.error('❌ 데이터 확인 중 오류:', error.message);
  }
  
  process.exit(0);
}

checkRenderOdds(); 