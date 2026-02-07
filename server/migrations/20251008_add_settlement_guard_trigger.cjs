/**
 * 정산 방어 트리거 마이그레이션
 * 
 * 목적: 경기 결과가 finished 상태가 아닌 경우 정산을 차단
 * 제미나이 제안 반영
 */

exports.up = async function(knex) {
  // 1. 트리거 함수 생성
  await knex.raw(`
    CREATE OR REPLACE FUNCTION check_game_result_before_settle()
    RETURNS TRIGGER AS $$
    DECLARE
      game_status TEXT;
      game_score JSONB;
      game_count INTEGER;
    BEGIN
      -- NEW는 UPDATE될 행의 새로운 데이터를 의미합니다.
      -- 정산 상태로 변경되는 경우에만 체크
      IF NEW.status = 'settled' AND (OLD.status IS NULL OR OLD.status != 'settled') THEN
        
        -- 멀티베팅이 아닌 경우: 단일 경기 결과 확인
        IF NEW."isMultibet" = false OR NEW."isMultibet" IS NULL THEN
          
          -- 해당 경기의 GameResult 조회 (시간 범위 ±1시간)
          SELECT status, score, COUNT(*) INTO game_status, game_score, game_count
          FROM "GameResults"
          WHERE "homeTeam" = NEW."homeTeam"
            AND "awayTeam" = NEW."awayTeam"
            AND ABS(EXTRACT(EPOCH FROM ("commenceTime" - NEW."commenceTime"))) < 3600
          GROUP BY status, score
          LIMIT 1;
          
          -- 경기 결과가 없는 경우
          IF game_count IS NULL OR game_count = 0 THEN
            RAISE EXCEPTION '정산 실패: 주문 % - 연결된 경기 결과를 찾을 수 없습니다. (%, %)', 
              NEW.id, NEW."homeTeam", NEW."awayTeam";
          END IF;
          
          -- 경기 상태가 finished가 아닌 경우
          IF game_status IS NULL OR game_status != 'finished' THEN
            RAISE EXCEPTION '정산 실패: 주문 % - 경기가 완료되지 않았습니다. (상태: %, 경기: % vs %)', 
              NEW.id, game_status, NEW."homeTeam", NEW."awayTeam";
          END IF;
          
          -- 스코어가 없는 경우
          IF game_score IS NULL THEN
            RAISE EXCEPTION '정산 실패: 주문 % - 경기 스코어가 없습니다. (경기: % vs %)', 
              NEW.id, NEW."homeTeam", NEW."awayTeam";
          END IF;
          
        ELSE
          -- 🎯 멀티베팅인 경우: 간소화된 검증 (제미나이 제안)
          -- 
          -- 멀티베팅은 여러 경기를 포함하므로 각 selection의 경기 결과를 
          -- 개별적으로 검증하는 것은 트리거에서 복잡도가 너무 높습니다.
          -- 
          -- 따라서 여기서는 최소한의 안전장치만 적용:
          -- 1. selectionDetails가 존재하는지 확인
          -- 2. 최소 1개 이상의 selection이 있는지 확인
          --
          -- 각 selection의 경기 결과 검증은 애플리케이션 레벨에서 수행됩니다.
          -- (server/services/exchangeSettlementService.js의 settleMultibetOrder 함수)
          
          IF NEW."selectionDetails" IS NULL THEN
            RAISE EXCEPTION '정산 실패: 멀티베팅 주문 % - selectionDetails가 없습니다.', NEW.id;
          END IF;
          
          -- selectionDetails에 최소 1개의 selection이 있는지 확인
          IF jsonb_array_length(NEW."selectionDetails"->'selections') = 0 THEN
            RAISE EXCEPTION '정산 실패: 멀티베팅 주문 % - 선택사항이 없습니다.', NEW.id;
          END IF;
          
          RAISE NOTICE '✅ 멀티베팅 정산 검증 통과: 주문 % (%개 선택사항)', 
            NEW.id, jsonb_array_length(NEW."selectionDetails"->'selections');
          
        END IF;
          
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 2. 트리거를 ExchangeOrders 테이블에 연결
  await knex.raw(`
    DROP TRIGGER IF EXISTS before_settle_exchange_order ON "ExchangeOrders";
    
    CREATE TRIGGER before_settle_exchange_order
    BEFORE UPDATE ON "ExchangeOrders"
    FOR EACH ROW
    EXECUTE FUNCTION check_game_result_before_settle();
  `);

  console.log('✅ 정산 방어 트리거 생성 완료');
};

exports.down = async function(knex) {
  // 트리거 제거
  await knex.raw(`
    DROP TRIGGER IF EXISTS before_settle_exchange_order ON "ExchangeOrders";
  `);

  // 함수 제거
  await knex.raw(`
    DROP FUNCTION IF EXISTS check_game_result_before_settle();
  `);

  console.log('✅ 정산 방어 트리거 제거 완료');
};
