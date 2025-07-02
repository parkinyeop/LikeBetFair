/**
 * Add 'postponed' to status/result enum in GameResults table (PostgreSQL)
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // status enum에 postponed 추가
    await queryInterface.sequelize.query(`ALTER TYPE "enum_GameResults_status" ADD VALUE IF NOT EXISTS 'postponed';`);
    // result enum에 postponed 추가  
    await queryInterface.sequelize.query(`ALTER TYPE "enum_GameResults_result" ADD VALUE IF NOT EXISTS 'postponed';`);
  },

  down: async (queryInterface, Sequelize) => {
    // PostgreSQL의 ENUM 타입은 값 삭제가 공식적으로 지원되지 않으므로, 다운 마이그레이션은 no-op 처리
    console.warn('enum 값 삭제는 지원되지 않습니다.');
  }
}; 