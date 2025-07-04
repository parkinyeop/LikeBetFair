import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
});

async function analyzeOddsHistory() {
  try {
    console.log('📊 OddsHistories 테이블 분석 시작...');
    
    // 데이터베이스 연결
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');
    
    // 1. 전체 레코드 수
    const totalCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM "OddsHistories"',
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(`\n📈 전체 레코드 수: ${totalCount[0].count.toLocaleString()}개`);
    
    // 2. 날짜별 분포
    const dailyDistribution = await sequelize.query(`
      SELECT 
        DATE("snapshotTime") as date,
        COUNT(*) as count
      FROM "OddsHistories"
      GROUP BY DATE("snapshotTime")
      ORDER BY date DESC
      LIMIT 10
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('\n📅 최근 10일간 날짜별 분포:');
    dailyDistribution.forEach(row => {
      console.log(`  ${row.date}: ${row.count.toLocaleString()}개`);
    });
    
    // 3. 마켓 타입별 분포
    const marketDistribution = await sequelize.query(`
      SELECT 
        "marketType",
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "OddsHistories"), 2) as percentage
      FROM "OddsHistories"
      GROUP BY "marketType"
      ORDER BY count DESC
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('\n🎯 마켓 타입별 분포:');
    marketDistribution.forEach(row => {
      console.log(`  ${row.marketType}: ${row.count.toLocaleString()}개 (${row.percentage}%)`);
    });
    
    // 4. 북메이커별 분포
    const bookmakerDistribution = await sequelize.query(`
      SELECT 
        "bookmakerName",
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "OddsHistories"), 2) as percentage
      FROM "OddsHistories"
      GROUP BY "bookmakerName"
      ORDER BY count DESC
      LIMIT 10
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('\n🏪 상위 10개 북메이커별 분포:');
    bookmakerDistribution.forEach(row => {
      console.log(`  ${row.bookmakerName}: ${row.count.toLocaleString()}개 (${row.percentage}%)`);
    });
    
    // 5. 배당률 범위별 분포
    const oddsRangeDistribution = await sequelize.query(`
      SELECT 
        odds_range,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "OddsHistories"), 2) as percentage
      FROM (
        SELECT 
          CASE 
            WHEN "oddsValue" < 1.5 THEN '1.5 미만'
            WHEN "oddsValue" < 2.0 THEN '1.5-2.0'
            WHEN "oddsValue" < 3.0 THEN '2.0-3.0'
            WHEN "oddsValue" < 5.0 THEN '3.0-5.0'
            WHEN "oddsValue" < 10.0 THEN '5.0-10.0'
            ELSE '10.0 이상'
          END as odds_range
        FROM "OddsHistories"
      ) odds_ranges
      GROUP BY odds_range
      ORDER BY 
        CASE odds_range
          WHEN '1.5 미만' THEN 1
          WHEN '1.5-2.0' THEN 2
          WHEN '2.0-3.0' THEN 3
          WHEN '3.0-5.0' THEN 4
          WHEN '5.0-10.0' THEN 5
          ELSE 6
        END
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('\n💰 배당률 범위별 분포:');
    oddsRangeDistribution.forEach(row => {
      console.log(`  ${row.odds_range}: ${row.count.toLocaleString()}개 (${row.percentage}%)`);
    });
    
    // 6. 최근 데이터 샘플
    const recentSamples = await sequelize.query(`
      SELECT 
        "homeTeam",
        "awayTeam",
        "marketType",
        "outcomeName",
        "oddsValue",
        "bookmakerName",
        "snapshotTime"
      FROM "OddsHistories"
      ORDER BY "snapshotTime" DESC
      LIMIT 5
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('\n🔍 최근 5개 데이터 샘플:');
    recentSamples.forEach((sample, index) => {
      console.log(`  ${index + 1}. ${sample.homeTeam} vs ${sample.awayTeam}`);
      console.log(`     ${sample.marketType} - ${sample.outcomeName}: ${sample.oddsValue} (${sample.bookmakerName})`);
      console.log(`     시간: ${sample.snapshotTime}`);
    });
    
    // 7. 시간대별 분포 (최근 24시간)
    const hourlyDistribution = await sequelize.query(`
      SELECT 
        EXTRACT(HOUR FROM "snapshotTime") as hour,
        COUNT(*) as count
      FROM "OddsHistories"
      WHERE "snapshotTime" >= NOW() - INTERVAL '24 hours'
      GROUP BY EXTRACT(HOUR FROM "snapshotTime")
      ORDER BY hour
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('\n⏰ 최근 24시간 시간대별 분포:');
    hourlyDistribution.forEach(row => {
      console.log(`  ${row.hour}시: ${row.count.toLocaleString()}개`);
    });
    
    // 8. 팀별 인기도 (상위 10개)
    const teamPopularity = await sequelize.query(`
      SELECT 
        team_name,
        COUNT(*) as count
      FROM (
        SELECT "homeTeam" as team_name FROM "OddsHistories"
        UNION ALL
        SELECT "awayTeam" as team_name FROM "OddsHistories"
      ) all_teams
      GROUP BY team_name
      ORDER BY count DESC
      LIMIT 10
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('\n🏆 상위 10개 인기 팀:');
    teamPopularity.forEach((team, index) => {
      console.log(`  ${index + 1}. ${team.team_name}: ${team.count.toLocaleString()}회`);
    });
    
    // 9. 데이터 품질 체크
    const dataQuality = await sequelize.query(`
      SELECT 
        'NULL oddsValue' as issue,
        COUNT(*) as count
      FROM "OddsHistories"
      WHERE "oddsValue" IS NULL
      UNION ALL
      SELECT 
        'Invalid oddsValue (<= 1)' as issue,
        COUNT(*) as count
      FROM "OddsHistories"
      WHERE "oddsValue" <= 1
      UNION ALL
      SELECT 
        'Missing bookmakerName' as issue,
        COUNT(*) as count
      FROM "OddsHistories"
      WHERE "bookmakerName" IS NULL OR "bookmakerName" = ''
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('\n🔍 데이터 품질 체크:');
    dataQuality.forEach(row => {
      if (row.count > 0) {
        console.log(`  ⚠️  ${row.issue}: ${row.count.toLocaleString()}개`);
      } else {
        console.log(`  ✅ ${row.issue}: 문제없음`);
      }
    });
    
    // 10. 테이블 크기 정보
    const tableSize = await sequelize.query(`
      SELECT 
        pg_size_pretty(pg_total_relation_size('"OddsHistories"')) as table_size,
        pg_size_pretty(pg_relation_size('"OddsHistories"')) as data_size,
        pg_size_pretty(pg_total_relation_size('"OddsHistories"') - pg_relation_size('"OddsHistories"')) as index_size
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('\n💾 테이블 크기 정보:');
    console.log(`  전체 크기: ${tableSize[0].table_size}`);
    console.log(`  데이터 크기: ${tableSize[0].data_size}`);
    console.log(`  인덱스 크기: ${tableSize[0].index_size}`);
    
    console.log('\n🎉 OddsHistories 테이블 분석 완료!');
    
  } catch (error) {
    console.error('❌ 분석 중 오류 발생:', error);
  } finally {
    await sequelize.close();
  }
}

analyzeOddsHistory(); 