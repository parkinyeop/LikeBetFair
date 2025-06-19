const GameResult = require('./models/gameResultModel');
const { Op } = require('sequelize');

async function checkGameResultsData() {
  try {
    console.log('=== 경기 결과 데이터 조회 ===\n');

    // 전체 데이터 수 조회
    const totalCount = await GameResult.count();
    console.log(`📊 전체 경기 결과 데이터 수: ${totalCount}개\n`);

    if (totalCount === 0) {
      console.log('❌ 경기 결과 데이터가 없습니다.');
      return;
    }

    // 스포츠 카테고리별 데이터 수 조회
    console.log('🏈 스포츠 카테고리별 데이터 수:');
    const categoryStats = await GameResult.findAll({
      attributes: [
        'mainCategory',
        'subCategory',
        [GameResult.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['mainCategory', 'subCategory'],
      order: [['mainCategory', 'ASC'], ['subCategory', 'ASC']]
    });

    categoryStats.forEach(stat => {
      console.log(`  ${stat.mainCategory} > ${stat.subCategory}: ${stat.dataValues.count}개`);
    });
    console.log('');

    // 날짜별 데이터 수 조회 (최근 30일)
    console.log('📅 날짜별 데이터 수 (최근 30일):');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dateStats = await GameResult.findAll({
      attributes: [
        [GameResult.sequelize.fn('DATE', GameResult.sequelize.col('commenceTime')), 'date'],
        [GameResult.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: {
        commenceTime: {
          [Op.gte]: thirtyDaysAgo
        }
      },
      group: [GameResult.sequelize.fn('DATE', GameResult.sequelize.col('commenceTime'))],
      order: [[GameResult.sequelize.fn('DATE', GameResult.sequelize.col('commenceTime')), 'DESC']]
    });

    dateStats.forEach(stat => {
      console.log(`  ${stat.dataValues.date}: ${stat.dataValues.count}개`);
    });
    console.log('');

    // 상태별 데이터 수 조회
    console.log('🎯 경기 상태별 데이터 수:');
    const statusStats = await GameResult.findAll({
      attributes: [
        'status',
        [GameResult.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      order: [['status', 'ASC']]
    });

    statusStats.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.dataValues.count}개`);
    });
    console.log('');

    // 결과별 데이터 수 조회
    console.log('🏆 경기 결과별 데이터 수:');
    const resultStats = await GameResult.findAll({
      attributes: [
        'result',
        [GameResult.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['result'],
      order: [['result', 'ASC']]
    });

    resultStats.forEach(stat => {
      console.log(`  ${stat.result}: ${stat.dataValues.count}개`);
    });
    console.log('');

    // 최근 10개 경기 결과 샘플
    console.log('📋 최근 10개 경기 결과 샘플:');
    const recentGames = await GameResult.findAll({
      order: [['commenceTime', 'DESC']],
      limit: 10
    });

    recentGames.forEach((game, index) => {
      console.log(`  ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`     카테고리: ${game.mainCategory} > ${game.subCategory}`);
      console.log(`     시작시간: ${game.commenceTime.toLocaleString()}`);
      console.log(`     상태: ${game.status}, 결과: ${game.result}`);
      if (game.score) {
        console.log(`     스코어: ${JSON.stringify(game.score)}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ 데이터 조회 중 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

checkGameResultsData(); 