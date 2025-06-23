'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

// DB 연결 직접 생성
const sequelize = new Sequelize(
  process.env.DB_NAME || 'bettingDB',
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const t = await sequelize.transaction();
    try {
      console.log('Starting category mapping fixes...');
      const mappingFixes = [
        { from: { main: 'KBO', sub: 'KBO' }, to: { main: 'baseball', sub: 'kbo' } },
        { from: { main: 'MLB', sub: 'MLB' }, to: { main: 'baseball', sub: 'mlb' } },
        { from: { main: 'baseball', sub: 'kbo' }, to: { main: 'baseball', sub: 'kbo' } },
        { from: { main: 'baseball', sub: 'mlb' }, to: { main: 'baseball', sub: 'mlb' } },
        { from: { main: 'EPL', sub: 'English Premier League' }, to: { main: 'soccer', sub: 'epl' } },
        { from: { main: '분데스리가', sub: 'German Bundesliga' }, to: { main: 'soccer', sub: 'bundesliga' } },
        { from: { main: '리그 1', sub: 'French Ligue 1' }, to: { main: 'soccer', sub: 'ligue1' } },
        { from: { main: 'la-liga', sub: 'Spanish La Liga' }, to: { main: 'soccer', sub: 'laliga' } },
        { from: { main: 'k-league', sub: 'South Korean K League 1' }, to: { main: 'soccer', sub: 'kleague1' } },
        { from: { main: 'mls', sub: 'American Major League Soccer' }, to: { main: 'soccer', sub: 'mls' } },
        { from: { main: 'j-league', sub: 'Danish Superliga' }, to: { main: 'soccer', sub: 'j_league' } },
        { from: { main: 'serie-a', sub: 'Italian Serie A' }, to: { main: 'soccer', sub: 'serie_a' } },
        { from: { main: 'nba', sub: 'NBA' }, to: { main: 'basketball', sub: 'nba' } },
        { from: { main: 'basketball', sub: 'nba' }, to: { main: 'basketball', sub: 'nba' } },
        { from: { main: 'nfl', sub: 'NFL' }, to: { main: 'football', sub: 'nfl' } },
        { from: { main: 'americanfootball', sub: 'nfl' }, to: { main: 'football', sub: 'nfl' } },
        { from: { main: 'nhl', sub: 'NHL' }, to: { main: 'hockey', sub: 'nhl' } }
      ];
      for (const fix of mappingFixes) {
        const { from, to } = fix;
        await sequelize.query(
          `UPDATE "GameResults" SET "mainCategory" = :toMain, "subCategory" = :toSub WHERE "mainCategory" = :fromMain AND "subCategory" = :fromSub`,
          {
            replacements: {
              toMain: to.main,
              toSub: to.sub,
              fromMain: from.main,
              fromSub: from.sub
            },
            transaction: t
          }
        );
        console.log(`Updated records: ${from.main}/${from.sub} -> ${to.main}/${to.sub}`);
      }
      // 잘못된 매핑 삭제
      await sequelize.query(
        `DELETE FROM "GameResults" WHERE "mainCategory" = 'kbo' AND "subCategory" = 'Indoor Football League'`,
        { transaction: t }
      );
      console.log('Committing transaction...');
      await t.commit();
      console.log('Category mapping fixes completed successfully');
    } catch (error) {
      console.error('Error fixing category mappings:', error);
      await t.rollback();
      throw error;
    }
  },
  down: async () => {
    // 되돌리기 불가 (noop)
    return Promise.resolve();
  }
}; 