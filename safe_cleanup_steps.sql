-- 안전한 단계별 데이터 정리 쿼리
-- 2025-08-01

-- STEP 1: 백업 확인 (실행 전)
-- 현재 상태를 확인하고 백업 데이터 생성
SELECT 
  'BACKUP_CHECK' as step,
  COUNT(*) as total_records,
  COUNT(DISTINCT "sportKey") as unique_sports
FROM "OddsCaches" 
WHERE "lastUpdated" >= '2025-08-01 00:00:00+00';

-- STEP 2: 중복 데이터 확인 (실행 전)
SELECT 
  'DUPLICATE_CHECK' as step,
  "sportKey",
  COUNT(*) as duplicate_groups,
  SUM(duplicate_count) as total_duplicates
FROM (
  SELECT 
    "sportKey",
    "homeTeam", 
    "awayTeam", 
    "commenceTime",
    COUNT(*) as duplicate_count
  FROM "OddsCaches" 
  WHERE "lastUpdated" >= '2025-08-01 00:00:00+00'
  GROUP BY "sportKey", "homeTeam", "awayTeam", "commenceTime"
  HAVING COUNT(*) > 1
) duplicates
GROUP BY "sportKey"
ORDER BY total_duplicates DESC;

-- STEP 3: 비정규 데이터 확인 (실행 전)
SELECT 
  'INVALID_DATA_CHECK' as step,
  "sportKey",
  COUNT(*) as invalid_records
FROM "OddsCaches" 
WHERE "homeTeam" IS NULL 
   OR "awayTeam" IS NULL 
   OR "commenceTime" IS NULL
   OR "homeTeam" = ''
   OR "awayTeam" = '';

-- STEP 4: MLB 중복 데이터만 정리 (안전한 첫 단계)
BEGIN;

DELETE FROM "OddsCaches" 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY "homeTeam", "awayTeam", "commenceTime" 
             ORDER BY "createdAt" DESC, id::text
           ) as rn
    FROM "OddsCaches"
    WHERE "sportKey" = 'baseball_mlb' 
      AND "lastUpdated" = '2025-08-01 04:55:45.819+00'
  ) t
  WHERE rn > 1
);

-- STEP 4 결과 확인
SELECT 
  'STEP4_RESULT' as step,
  "sportKey",
  COUNT(*) as remaining_games
FROM "OddsCaches" 
WHERE "sportKey" = 'baseball_mlb' 
  AND "lastUpdated" = '2025-08-01 04:55:45.819+00'
GROUP BY "sportKey";

COMMIT;

-- STEP 5: 비정규 데이터 정리 (안전한 두 번째 단계)
BEGIN;

DELETE FROM "OddsCaches" 
WHERE "homeTeam" IS NULL 
   OR "awayTeam" IS NULL 
   OR "commenceTime" IS NULL
   OR "homeTeam" = ''
   OR "awayTeam" = '';

-- STEP 5 결과 확인
SELECT 
  'STEP5_RESULT' as step,
  COUNT(*) as total_remaining_records
FROM "OddsCaches" 
WHERE "lastUpdated" >= '2025-08-01 00:00:00+00';

COMMIT;

-- STEP 6: 전체 중복 데이터 정리 (마지막 단계)
BEGIN;

DELETE FROM "OddsCaches" 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY "sportKey", "homeTeam", "awayTeam", "commenceTime" 
             ORDER BY "createdAt" DESC, id::text
           ) as rn
    FROM "OddsCaches"
    WHERE "lastUpdated" >= '2025-08-01 00:00:00+00'
  ) t
  WHERE rn > 1
);

-- STEP 6 결과 확인
SELECT 
  'STEP6_RESULT' as step,
  "sportKey",
  COUNT(*) as final_games,
  COUNT(DISTINCT "homeTeam") as unique_home_teams,
  COUNT(DISTINCT "awayTeam") as unique_away_teams
FROM "OddsCaches" 
WHERE "lastUpdated" >= '2025-08-01 00:00:00+00'
GROUP BY "sportKey"
ORDER BY final_games DESC;

COMMIT; 