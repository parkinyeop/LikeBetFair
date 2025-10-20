'use strict';

/**
 * 마이그레이션: ExchangeOrderMatch에 backStake, layStake 필드 추가
 *
 * 목적: potAmount 계산 근거를 명확히 추적
 * - backStake: Back 주문 담보금
 * - layStake: Lay 주문 담보금
 * - potAmount = backStake + layStake
 *
 * 이전 방식: settlementResult JSONB에 저장 (쿼리 성능 저하, 제약 조건 불가)
 * 개선 방식: 별도 컬럼으로 저장 (쿼리 성능 향상, DB 제약 조건 가능)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. backStake 컬럼 추가
    await queryInterface.addColumn('ExchangeOrderMatches', 'backStake', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Back 주문 담보금'
    });

    // 2. layStake 컬럼 추가
    await queryInterface.addColumn('ExchangeOrderMatches', 'layStake', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Lay 주문 담보금'
    });

    // 3. 기존 데이터 보정 (Backfill)
    // settlementResult에서 데이터 추출 또는 역계산
    await queryInterface.sequelize.query(`
      UPDATE "ExchangeOrderMatches"
      SET
        "backStake" = CASE
          WHEN "settlementResult" IS NOT NULL
            AND "settlementResult"->>'backStake' IS NOT NULL
          THEN ("settlementResult"->>'backStake')::DECIMAL
          ELSE CASE
            WHEN "originalSide" = 'back' THEN "matchedAmount"
            ELSE FLOOR("matchedAmount" * ("matchedPrice" - 1))
          END
        END,
        "layStake" = CASE
          WHEN "settlementResult" IS NOT NULL
            AND "settlementResult"->>'layStake' IS NOT NULL
          THEN ("settlementResult"->>'layStake')::DECIMAL
          ELSE CASE
            WHEN "originalSide" = 'lay' THEN "matchedAmount"
            ELSE FLOOR("matchedAmount" * ("matchedPrice" - 1))
          END
        END
      WHERE "backStake" = 0 OR "layStake" = 0;
    `);

    // 4. potAmount 검증 (backStake + layStake = potAmount)
    const [violations] = await queryInterface.sequelize.query(`
      SELECT id, "backStake", "layStake", "potAmount"
      FROM "ExchangeOrderMatches"
      WHERE ABS(("backStake" + "layStake") - "potAmount") > 0.01
      LIMIT 5
    `);

    if (violations.length > 0) {
      console.warn('⚠️ potAmount 불일치 발견:', violations.length, '건');
      violations.forEach(v => {
        console.warn(`  Match #${v.id}: ${v.backStake} + ${v.layStake} = ${Number(v.backStake) + Number(v.layStake)} ≠ ${v.potAmount}`);
      });
    }

    console.log('✅ ExchangeOrderMatches에 backStake, layStake 필드 추가 완료');
    console.log(`✅ 기존 데이터 보정 완료`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ExchangeOrderMatches', 'backStake');
    await queryInterface.removeColumn('ExchangeOrderMatches', 'layStake');
    console.log('✅ ExchangeOrderMatches에서 backStake, layStake 필드 제거 완료');
  }
};
