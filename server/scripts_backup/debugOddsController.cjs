const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database.cjs').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

async function debugOddsController() {
  try {
    console.log('=== oddsController 디버깅 ===\n');

    const sport = 'soccer_argentina_primera_division';
    
    // sportKey 매핑 (oddsController와 동일)
    const sportKeyMapping = {
      'soccer_argentina_primera_division': ['soccer_argentina_primera_division', '아르헨티나 프리메라', 'ARGENTINA_PRIMERA'],
      '아르헨티나 프리메라': ['아르헨티나 프리메라', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division'],
      'ARGENTINA_PRIMERA': ['ARGENTINA_PRIMERA', '아르헨티나 프리메라', 'soccer_argentina_primera_division']
    };
    
    const possibleKeys = sportKeyMapping[sport] || [sport];
    console.log('sport:', sport);
    console.log('possibleKeys:', possibleKeys);

    // 7일 전~7일 후까지 범위 계산 (UTC 기준)
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekAgo = new Date(today);
    weekAgo.setUTCDate(today.getUTCDate() - 7);
    const weekLater = new Date(today);
    weekLater.setUTCDate(today.getUTCDate() + 7);

    console.log('\n필터링 조건:');
    console.log('weekAgo:', weekAgo.toISOString());
    console.log('weekLater:', weekLater.toISOString());

    // DB에서 모든 데이터를 먼저 조회 (필터링 전)
    const allData = await sequelize.query(`
      SELECT "id", "sportKey", "subCategory", "sportTitle", "homeTeam", "awayTeam", "commenceTime"
      FROM "OddsCaches"
      WHERE "sportKey" IN (${possibleKeys.map(() => '?').join(',')})
      ORDER BY "commenceTime" ASC
    `, {
      replacements: possibleKeys,
      type: Sequelize.QueryTypes.SELECT
    });

    console.log(`\n필터링 전 전체 데이터 수: ${allData.length}`);
    
    if (allData.length > 0) {
      console.log('\n첫 번째 레코드:');
      console.log(JSON.stringify(allData[0], null, 2));
      
      console.log('\n마지막 레코드:');
      console.log(JSON.stringify(allData[allData.length - 1], null, 2));
    }

    // 필터링 적용
    const cachedData = allData.filter(game => {
      const gameTime = new Date(game.commenceTime);
      const isValid = gameTime >= weekAgo && gameTime < weekLater;
      return isValid;
    });

    console.log(`\n필터링 후 데이터 수: ${cachedData.length}`);

    if (cachedData.length > 0) {
      console.log('\n필터링 후 첫 번째 레코드:');
      console.log(JSON.stringify(cachedData[0], null, 2));
    }

    // 동일 경기 중복 제거 (최신 odds만)
    const uniqueGames = [];
    const seen = new Set();
    for (const game of cachedData) {
      const date = new Date(game.commenceTime);
      const key = `${game.sportKey}_${game.homeTeam}_${game.awayTeam}_${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}T${String(date.getUTCHours()).padStart(2,'0')}:${String(date.getUTCMinutes()).padStart(2,'0')}`;
      if (!seen.has(key)) {
        uniqueGames.push(game);
        seen.add(key);
      }
    }

    console.log(`\n중복 제거 후 데이터 수: ${uniqueGames.length}`);

    if (uniqueGames.length > 0) {
      console.log('\n최종 첫 번째 레코드:');
      const game = uniqueGames[0];
      const sportTitle = game.sportTitle || game.subCategory || sport;
      console.log('game.sportTitle:', game.sportTitle);
      console.log('game.subCategory:', game.subCategory);
      console.log('최종 sportTitle:', sportTitle);
      
      const formattedGame = {
        id: game.id,
        sport_key: sport,
        sport_title: sportTitle,
        home_team: game.homeTeam,
        away_team: game.awayTeam,
        commence_time: game.commenceTime
      };
      
      console.log('\n최종 API 응답 형태:');
      console.log(JSON.stringify(formattedGame, null, 2));
    }

  } catch (error) {
    console.error('디버깅 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

// 실행
debugOddsController(); 