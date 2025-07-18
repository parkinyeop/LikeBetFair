import OddsCache from './models/oddsCacheModel.js';
import { Op } from 'sequelize';

async function checkRenderOdds() {
  try {
    console.log('🔍 Render 서버 배당율 데이터 확인 시작...');
    
    // 1. 전체 레코드 수 확인
    const totalCount = await OddsCache.count();
    console.log(`📊 전체 배당율 레코드 수: ${totalCount}`);
    
    // 2. 최근 5개 레코드 확인
    const recentOdds = await OddsCache.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'homeTeam', 'awayTeam', 'commenceTime', 'mainCategory', 'subCategory', 'createdAt', 'lastUpdated']
    });
    
    console.log('\n📅 최근 5개 배당율 데이터:');
    recentOdds.forEach((odds, index) => {
      console.log(`${index + 1}. ${odds.homeTeam} vs ${odds.awayTeam}`);
      console.log(`   카테고리: ${odds.mainCategory}/${odds.subCategory}`);
      console.log(`   경기시간: ${odds.commenceTime}`);
      console.log(`   생성시간: ${odds.createdAt}`);
      console.log(`   업데이트: ${odds.lastUpdated}`);
      console.log('');
    });
    
    // 3. 북메이커 데이터 확인
    if (recentOdds.length > 0) {
      const latestOdds = await OddsCache.findByPk(recentOdds[0].id);
      console.log('🔍 최신 배당율 상세 정보:');
      console.log('북메이커 수:', latestOdds.bookmakers?.length || 0);
      
      if (latestOdds.bookmakers && latestOdds.bookmakers.length > 0) {
        const bookmaker = latestOdds.bookmakers[0];
        console.log('첫 번째 북메이커:', bookmaker.title);
        console.log('마켓 수:', bookmaker.markets?.length || 0);
        
        if (bookmaker.markets && bookmaker.markets.length > 0) {
          const market = bookmaker.markets[0];
          console.log('첫 번째 마켓:', market.key);
          console.log('아웃컴 수:', market.outcomes?.length || 0);
          
          if (market.outcomes && market.outcomes.length > 0) {
            const outcome = market.outcomes[0];
            console.log('첫 번째 아웃컴:', outcome.name);
            console.log('배당율:', outcome.price);
          }
        }
      }
      
      // 4. 공식 배당율 확인
      console.log('\n📈 공식 배당율 정보:');
      if (latestOdds.officialOdds) {
        console.log('공식 배당율 있음:', Object.keys(latestOdds.officialOdds));
        for (const [marketKey, marketData] of Object.entries(latestOdds.officialOdds)) {
          console.log(`  ${marketKey}:`, Object.keys(marketData));
        }
      } else {
        console.log('공식 배당율 없음');
      }
    }
    
    // 5. 카테고리별 통계
    console.log('\n📊 카테고리별 통계:');
    const categoryStats = await OddsCache.findAll({
      attributes: [
        'mainCategory',
        'subCategory',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['mainCategory', 'subCategory'],
      order: [['count', 'DESC']],
      raw: true
    });
    
    categoryStats.forEach(stat => {
      console.log(`${stat.mainCategory}/${stat.subCategory}: ${stat.count}개`);
    });
    
    // 6. 오늘 생성된 데이터 확인
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await OddsCache.count({
      where: {
        createdAt: {
          [Op.gte]: today
        }
      }
    });
    
    console.log(`\n📅 오늘 생성된 배당율 데이터: ${todayCount}개`);
    
    console.log('\n✅ Render 서버 배당율 데이터 확인 완료');
    
  } catch (error) {
    console.error('❌ 배당율 데이터 확인 중 오류:', error);
  }
  
  process.exit(0);
}

checkRenderOdds(); 