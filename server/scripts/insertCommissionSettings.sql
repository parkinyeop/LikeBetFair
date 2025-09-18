-- 수수료율 설정 분리 (스포츠북/익스체인지)
-- 기존 commission_rate를 두 개로 분리

DELETE FROM "Settings" WHERE key = 'commission_rate';

INSERT INTO "Settings" ("key", "value", "description", "category", "createdAt", "updatedAt") VALUES
('sportsbook_commission_rate', '0.05', '스포츠북 수수료율 (5%)', 'commission_settings', NOW(), NOW()),
('exchange_commission_rate', '0.03', '익스체인지 수수료율 (3%)', 'commission_settings', NOW(), NOW());

-- 기존 설정이 있다면 업데이트, 없다면 생성
INSERT INTO "Settings" ("key", "value", "description", "category", "createdAt", "updatedAt") 
VALUES 
('sportsbook_commission_rate', '0.05', '스포츠북 수수료율 (5%)', 'commission_settings', NOW(), NOW()),
('exchange_commission_rate', '0.03', '익스체인지 수수료율 (3%)', 'commission_settings', NOW(), NOW())
ON CONFLICT ("key") 
DO UPDATE SET 
  "value" = EXCLUDED."value",
  "description" = EXCLUDED."description",
  "updatedAt" = NOW();
