const { DataTypes } = require('sequelize');
const sequelize = require('../models/sequelize');
const GameResult = require('../models/gameResultModel');

async function fixCategoryMappings() {
  const t = await sequelize.transaction();

  try {
    console.log('Starting category mapping fixes...');

    // 잘못된 매핑 수정
    const mappingFixes = [
      // 야구
      { from: { main: 'KBO', sub: 'KBO' }, to: { main: 'baseball', sub: 'kbo' } },
      { from: { main: 'MLB', sub: 'MLB' }, to: { main: 'baseball', sub: 'mlb' } },
      { from: { main: 'baseball', sub: 'kbo' }, to: { main: 'baseball', sub: 'kbo' } },
      { from: { main: 'baseball', sub: 'mlb' }, to: { main: 'baseball', sub: 'mlb' } },
      
      // 축구
      { from: { main: 'EPL', sub: 'English Premier League' }, to: { main: 'soccer', sub: 'epl' } },
      { from: { main: '분데스리가', sub: 'German Bundesliga' }, to: { main: 'soccer', sub: 'bundesliga' } },
      { from: { main: '리그 1', sub: 'French Ligue 1' }, to: { main: 'soccer', sub: 'ligue1' } },
      { from: { main: 'la-liga', sub: 'Spanish La Liga' }, to: { main: 'soccer', sub: 'laliga' } },
      { from: { main: 'k-league', sub: 'South Korean K League 1' }, to: { main: 'soccer', sub: 'kleague1' } },
      { from: { main: 'mls', sub: 'American Major League Soccer' }, to: { main: 'soccer', sub: 'mls' } },
      { from: { main: 'j-league', sub: 'Danish Superliga' }, to: { main: 'soccer', sub: 'j_league' } },
      { from: { main: 'serie-a', sub: 'Italian Serie A' }, to: { main: 'soccer', sub: 'serie_a' } },
      
      // 농구
      { from: { main: 'nba', sub: 'NBA' }, to: { main: 'basketball', sub: 'nba' } },
      { from: { main: 'basketball', sub: 'nba' }, to: { main: 'basketball', sub: 'nba' } },
      
      // 미식축구
      { from: { main: 'nfl', sub: 'NFL' }, to: { main: 'football', sub: 'nfl' } },
      { from: { main: 'americanfootball', sub: 'nfl' }, to: { main: 'football', sub: 'nfl' } },
      
      // 아이스하키
      { from: { main: 'nhl', sub: 'NHL' }, to: { main: 'hockey', sub: 'nhl' } }
    ];

    for (const fix of mappingFixes) {
      const { from, to } = fix;
      
      // 해당하는 레코드 업데이트
      await GameResult.update(
        {
          mainCategory: to.main,
          subCategory: to.sub
        },
        {
          where: {
            mainCategory: from.main,
            subCategory: from.sub
          },
          transaction: t
        }
      );
      
      console.log(`Updated records: ${from.main}/${from.sub} -> ${to.main}/${to.sub}`);
    }

    // 잘못된 매핑 (예: kbo/Indoor Football League) 삭제
    await GameResult.destroy({
      where: {
        mainCategory: 'kbo',
        subCategory: 'Indoor Football League'
      },
      transaction: t
    });

    console.log('Committing transaction...');
    await t.commit();
    console.log('Category mapping fixes completed successfully');
  } catch (error) {
    console.error('Error fixing category mappings:', error);
    await t.rollback();
    throw error;
  }
}

// 마이그레이션 실행
fixCategoryMappings()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 