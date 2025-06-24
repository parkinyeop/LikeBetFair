/**
 * Add 'postponed' to status/result enum in GameResults table (PostgreSQL)
 */

exports.up = async function(knex) {
  // status
  await knex.raw(`ALTER TYPE "enum_GameResults_status" ADD VALUE IF NOT EXISTS 'postponed';`);
  // result
  await knex.raw(`ALTER TYPE "enum_GameResults_result" ADD VALUE IF NOT EXISTS 'postponed';`);
};

exports.down = async function(knex) {
  // PostgreSQL의 ENUM 타입은 값 삭제가 공식적으로 지원되지 않으므로, 다운 마이그레이션은 no-op 처리
  // (실제 롤백 필요시 새 타입 생성 후 교체 필요)
  console.warn('enum 값 삭제는 지원되지 않습니다.');
}; 