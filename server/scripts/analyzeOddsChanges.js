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

// 표 출력을 위한 유틸리티 함수
function createTable(headers, rows) {
  // 각 컬럼의 최대 길이 계산
  const columnWidths = headers.map((header, index) => {
    const maxLength = Math.max(
      header.length,
      ...rows.map(row => String(row[index] || '').length)
    );
    return Math.min(maxLength, 30); // 최대 30자로 제한
  });

  // 헤더 라인 생성
  const headerLine = headers.map((header, index) => 
    header.padEnd(columnWidths[index])
  ).join(' | ');
  
  // 구분선 생성
  const separator = columnWidths.map(width => '-'.repeat(width)).join('-+-');
  
  // 데이터 라인 생성
  const dataLines = rows.map(row => 
    row.map((cell, index) => 
      String(cell || '').padEnd(columnWidths[index])
    ).join(' | ')
  );

  return [headerLine, separator, ...dataLines].join('\n');
}

async function analyzeOddsChanges() {
  try {
    console.log('📊 배당률 변화 분석 시작...');
    
    // 데이터베이스 연결
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공\n');
    
    // 1. 최근 경기별 배당률 변화
    console.log('🏟️  최근 경기별 배당률 변화 (최근 5경기)');
    const recentGames = await sequelize.query(`
      SELECT DISTINCT 
        "homeTeam",
        "awayTeam",
        "commenceTime",
        COUNT(*) as odds_count,
        MIN("snapshotTime") as first_update,
        MAX("snapshotTime") as last_update
      FROM "OddsHistories"
      GROUP BY "homeTeam", "awayTeam", "commenceTime"
      ORDER BY "commenceTime" DESC
      LIMIT 5
    `, { type: Sequelize.QueryTypes.SELECT });

    const gameTable = createTable(
      ['홈팀', '원정팀', '경기시간', '배당수', '첫업데이트', '마지막업데이트'],
      recentGames.map(game => [
        game.homeTeam,
        game.awayTeam,
        new Date(game.commenceTime).toLocaleString('ko-KR'),
        game.odds_count,
        new Date(game.first_update).toLocaleString('ko-KR'),
        new Date(game.last_update).toLocaleString('ko-KR')
      ])
    );
    console.log(gameTable);
    console.log();

    // 2. 특정 경기의 상세 배당률 변화
    if (recentGames.length > 0) {
      const targetGame = recentGames[0];
      console.log(`📈 ${targetGame.homeTeam} vs ${targetGame.awayTeam} 상세 배당률 변화`);
      
      const detailedOdds = await sequelize.query(`
        SELECT 
          "marketType",
          "outcomeName",
          "oddsValue",
          "bookmakerName",
          "snapshotTime"
        FROM "OddsHistories"
        WHERE "homeTeam" = :homeTeam 
          AND "awayTeam" = :awayTeam 
          AND "commenceTime" = :commenceTime
        ORDER BY "snapshotTime" DESC, "marketType", "outcomeName"
        LIMIT 20
      `, { 
        type: Sequelize.QueryTypes.SELECT,
        replacements: {
          homeTeam: targetGame.homeTeam,
          awayTeam: targetGame.awayTeam,
          commenceTime: targetGame.commenceTime
        }
      });

      const oddsTable = createTable(
        ['마켓', '선택', '배당률', '북메이커', '시간'],
        detailedOdds.map(odds => [
          odds.marketType,
          odds.outcomeName,
          odds.oddsValue,
          odds.bookmakerName,
          new Date(odds.snapshotTime).toLocaleTimeString('ko-KR')
        ])
      );
      console.log(oddsTable);
      console.log();
    }

    // 3. 시간대별 배당률 변화 추이
    console.log('⏰ 시간대별 배당률 변화 추이 (최근 24시간)');
    const hourlyChanges = await sequelize.query(`
      SELECT 
        EXTRACT(HOUR FROM "snapshotTime") as hour,
        COUNT(*) as total_odds,
        ROUND(AVG("oddsValue"), 3) as avg_odds,
        ROUND(MIN("oddsValue"), 3) as min_odds,
        ROUND(MAX("oddsValue"), 3) as max_odds,
        COUNT(DISTINCT "bookmakerName") as bookmakers
      FROM "OddsHistories"
      WHERE "snapshotTime" >= NOW() - INTERVAL '24 hours'
      GROUP BY EXTRACT(HOUR FROM "snapshotTime")
      ORDER BY hour
    `, { type: Sequelize.QueryTypes.SELECT });

    const hourlyTable = createTable(
      ['시간', '총배당수', '평균배당', '최소배당', '최대배당', '북메이커수'],
      hourlyChanges.map(hour => [
        `${hour.hour}시`,
        hour.total_odds,
        hour.avg_odds,
        hour.min_odds,
        hour.max_odds,
        hour.bookmakers
      ])
    );
    console.log(hourlyTable);
    console.log();

    // 4. 마켓 타입별 배당률 통계
    console.log('🎯 마켓 타입별 배당률 통계');
    const marketStats = await sequelize.query(`
      SELECT 
        "marketType",
        COUNT(*) as total_count,
        ROUND(AVG("oddsValue"), 3) as avg_odds,
        ROUND(MIN("oddsValue"), 3) as min_odds,
        ROUND(MAX("oddsValue"), 3) as max_odds,
        ROUND(STDDEV("oddsValue"), 3) as std_dev
      FROM "OddsHistories"
      GROUP BY "marketType"
      ORDER BY avg_odds
    `, { type: Sequelize.QueryTypes.SELECT });

    const marketTable = createTable(
      ['마켓타입', '총수', '평균', '최소', '최대', '표준편차'],
      marketStats.map(market => [
        market.marketType,
        market.total_count,
        market.avg_odds,
        market.min_odds,
        market.max_odds,
        market.std_dev
      ])
    );
    console.log(marketTable);
    console.log();

    // 5. 북메이커별 배당률 비교
    console.log('🏪 북메이커별 배당률 비교 (상위 8개)');
    const bookmakerStats = await sequelize.query(`
      SELECT 
        "bookmakerName",
        COUNT(*) as total_count,
        ROUND(AVG("oddsValue"), 3) as avg_odds,
        ROUND(MIN("oddsValue"), 3) as min_odds,
        ROUND(MAX("oddsValue"), 3) as max_odds
      FROM "OddsHistories"
      GROUP BY "bookmakerName"
      HAVING COUNT(*) >= 50
      ORDER BY avg_odds DESC
      LIMIT 8
    `, { type: Sequelize.QueryTypes.SELECT });

    const bookmakerTable = createTable(
      ['북메이커', '총수', '평균배당', '최소배당', '최대배당'],
      bookmakerStats.map(bm => [
        bm.bookmakerName,
        bm.total_count,
        bm.avg_odds,
        bm.min_odds,
        bm.max_odds
      ])
    );
    console.log(bookmakerTable);
    console.log();

    // 6. 배당률 변화 패턴 분석
    console.log('📊 배당률 변화 패턴 분석');
    const oddsPatterns = await sequelize.query(`
      SELECT 
        odds_level,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "OddsHistories"), 2) as percentage
      FROM (
        SELECT 
          CASE 
            WHEN "oddsValue" < 1.5 THEN '매우 낮음 (<1.5)'
            WHEN "oddsValue" < 2.0 THEN '낮음 (1.5-2.0)'
            WHEN "oddsValue" < 3.0 THEN '보통 (2.0-3.0)'
            WHEN "oddsValue" < 5.0 THEN '높음 (3.0-5.0)'
            ELSE '매우 높음 (>5.0)'
          END as odds_level
        FROM "OddsHistories"
      ) odds_levels
      GROUP BY odds_level
      ORDER BY 
        CASE odds_level
          WHEN '매우 낮음 (<1.5)' THEN 1
          WHEN '낮음 (1.5-2.0)' THEN 2
          WHEN '보통 (2.0-3.0)' THEN 3
          WHEN '높음 (3.0-5.0)' THEN 4
          ELSE 5
        END
    `, { type: Sequelize.QueryTypes.SELECT });

    const patternTable = createTable(
      ['배당수준', '개수', '비율(%)'],
      oddsPatterns.map(pattern => [
        pattern.odds_level,
        pattern.count,
        pattern.percentage
      ])
    );
    console.log(patternTable);
    console.log();

    // 7. 최근 업데이트된 배당률들
    console.log('🔄 최근 업데이트된 배당률 (최근 10개)');
    const recentUpdates = await sequelize.query(`
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
      LIMIT 10
    `, { type: Sequelize.QueryTypes.SELECT });

    const updatesTable = createTable(
      ['홈팀', '원정팀', '마켓', '선택', '배당률', '북메이커', '시간'],
      recentUpdates.map(update => [
        update.homeTeam,
        update.awayTeam,
        update.marketType,
        update.outcomeName,
        update.oddsValue,
        update.bookmakerName,
        new Date(update.snapshotTime).toLocaleString('ko-KR')
      ])
    );
    console.log(updatesTable);
    
    console.log('\n🎉 배당률 변화 분석 완료!');

  } catch (error) {
    console.error('❌ 분석 중 오류 발생:', error);
  } finally {
    await sequelize.close();
  }
}

analyzeOddsChanges(); 