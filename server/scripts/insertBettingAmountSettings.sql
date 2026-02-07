-- 베팅 금액 설정 데이터 삽입 스크립트
-- 스포츠북과 익스체인지의 최대/최소 베팅 금액을 다르게 설정

-- 기존 설정이 있다면 삭제 (중복 방지)
DELETE FROM "Settings" WHERE "key" IN (
  'sportsbook_min_bet_amount',
  'sportsbook_max_bet_amount', 
  'exchange_min_bet_amount',
  'exchange_max_bet_amount'
);

-- 스포츠북 베팅 금액 설정
INSERT INTO "Settings" ("key", "value", "description", "category") VALUES
('sportsbook_min_bet_amount', '1000', '스포츠북 최소 베팅 금액 (원)', 'betting_limits'),
('sportsbook_max_bet_amount', '1000000', '스포츠북 최대 베팅 금액 (원)', 'betting_limits'),
('exchange_min_bet_amount', '5000', '익스체인지 최소 베팅 금액 (원)', 'betting_limits'),
('exchange_max_bet_amount', '5000000', '익스체인지 최대 베팅 금액 (원)', 'betting_limits');

-- 설정 확인
SELECT "key", "value", "description", "category" 
FROM "Settings" 
WHERE "category" = 'betting_limits'
ORDER BY "key";
