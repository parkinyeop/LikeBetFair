-- 익스체인지 배당율 가중치 설정 (단순화 버전)
DELETE FROM "Settings" WHERE key LIKE 'exchange_odds_weight_percentage' OR key LIKE 'exchange_odds_weight_enabled';

INSERT INTO "Settings" ("key", "value", "description", "category", "createdAt", "updatedAt") VALUES
('exchange_odds_weight_percentage', '0.1', '익스체인지 배당율 가중치 퍼센트 (0.1 = 10%)', 'exchange_odds', NOW(), NOW()),
('exchange_odds_weight_enabled', 'true', '익스체인지 배당율 가중치 적용 활성화 여부', 'exchange_odds', NOW(), NOW());