-- 데이터베이스 subCategory 한글 → 영문 업데이트 쿼리
-- GameResults 테이블 업데이트

-- 중국 슈퍼리그 → CSL
UPDATE "GameResults" 
SET "subCategory" = 'CSL' 
WHERE "subCategory" = '중국 슈퍼리그';

-- 라리가 → LALIGA
UPDATE "GameResults" 
SET "subCategory" = 'LALIGA' 
WHERE "subCategory" = '라리가';

-- 분데스리가 → BUNDESLIGA
UPDATE "GameResults" 
SET "subCategory" = 'BUNDESLIGA' 
WHERE "subCategory" = '분데스리가';

-- 프리미어리그 → EPL
UPDATE "GameResults" 
SET "subCategory" = 'EPL' 
WHERE "subCategory" = '프리미어리그';

-- K리그 → KLEAGUE
UPDATE "GameResults" 
SET "subCategory" = 'KLEAGUE' 
WHERE "subCategory" = 'K리그';

-- J리그 → JLEAGUE
UPDATE "GameResults" 
SET "subCategory" = 'JLEAGUE' 
WHERE "subCategory" = 'J리그';

-- 세리에A → SERIEA
UPDATE "GameResults" 
SET "subCategory" = 'SERIEA' 
WHERE "subCategory" = '세리에A';

-- 브라질리라오 → BRASILEIRAO
UPDATE "GameResults" 
SET "subCategory" = 'BRASILEIRAO' 
WHERE "subCategory" = '브라질리라오';

-- 브라질 세리에 A → BRASILEIRAO
UPDATE "GameResults" 
SET "subCategory" = 'BRASILEIRAO' 
WHERE "subCategory" = '브라질 세리에 A';

-- 아르헨티나프리메라 → ARGENTINA_PRIMERA
UPDATE "GameResults" 
SET "subCategory" = 'ARGENTINA_PRIMERA' 
WHERE "subCategory" = '아르헨티나프리메라';

-- 아르헨티나 프리메라 → ARGENTINA_PRIMERA
UPDATE "GameResults" 
SET "subCategory" = 'ARGENTINA_PRIMERA' 
WHERE "subCategory" = '아르헨티나 프리메라';

-- OddsCaches 테이블 업데이트

-- 중국 슈퍼리그 → CSL
UPDATE "OddsCaches" 
SET "subCategory" = 'CSL' 
WHERE "subCategory" = '중국 슈퍼리그';

-- 라리가 → LALIGA
UPDATE "OddsCaches" 
SET "subCategory" = 'LALIGA' 
WHERE "subCategory" = '라리가';

-- 분데스리가 → BUNDESLIGA
UPDATE "OddsCaches" 
SET "subCategory" = 'BUNDESLIGA' 
WHERE "subCategory" = '분데스리가';

-- 프리미어리그 → EPL
UPDATE "OddsCaches" 
SET "subCategory" = 'EPL' 
WHERE "subCategory" = '프리미어리그';

-- K리그 → KLEAGUE
UPDATE "OddsCaches" 
SET "subCategory" = 'KLEAGUE' 
WHERE "subCategory" = 'K리그';

-- J리그 → JLEAGUE
UPDATE "OddsCaches" 
SET "subCategory" = 'JLEAGUE' 
WHERE "subCategory" = 'J리그';

-- 세리에A → SERIEA
UPDATE "OddsCaches" 
SET "subCategory" = 'SERIEA' 
WHERE "subCategory" = '세리에A';

-- 브라질리라오 → BRASILEIRAO
UPDATE "OddsCaches" 
SET "subCategory" = 'BRASILEIRAO' 
WHERE "subCategory" = '브라질리라오';

-- 브라질 세리에 A → BRASILEIRAO
UPDATE "OddsCaches" 
SET "subCategory" = 'BRASILEIRAO' 
WHERE "subCategory" = '브라질 세리에 A';

-- 아르헨티나프리메라 → ARGENTINA_PRIMERA
UPDATE "OddsCaches" 
SET "subCategory" = 'ARGENTINA_PRIMERA' 
WHERE "subCategory" = '아르헨티나프리메라';

-- 아르헨티나 프리메라 → ARGENTINA_PRIMERA
UPDATE "OddsCaches" 
SET "subCategory" = 'ARGENTINA_PRIMERA' 
WHERE "subCategory" = '아르헨티나 프리메라';

-- 업데이트 후 결과 확인 쿼리
-- GameResults 테이블 subCategory 분포 확인
SELECT "subCategory", COUNT(*) as count 
FROM "GameResults" 
GROUP BY "subCategory" 
ORDER BY count DESC;

-- OddsCaches 테이블 subCategory 분포 확인
SELECT "subCategory", COUNT(*) as count 
FROM "OddsCaches" 
GROUP BY "subCategory" 
ORDER BY count DESC; 