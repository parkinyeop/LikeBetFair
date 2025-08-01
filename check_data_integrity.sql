-- 데이터 무결성 확인 및 중복/비정규 데이터 검사 쿼리
-- 2025-08-01

-- 1. MLB 중복 데이터 확인 (2025-08-01 04:55:45.819+00)
SELECT 
  "homeTeam", 
  "awayTeam", 
  "commenceTime",
  COUNT(*) as duplicate_count,
  MIN(id::text) as min_id,
  MAX(id::text) as max_id
FROM "OddsCaches" 
WHERE "sportKey" = 'baseball_mlb' 
  AND "lastUpdated" = '2025-08-01 04:55:45.819+00'
GROUP BY "homeTeam", "awayTeam", "commenceTime"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2. 전체 중복 데이터 확인 (모든 스포츠)
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
ORDER BY "sportKey", duplicate_count DESC;

-- 3. 비정규 데이터 확인 (null 값이나 빈 값)
SELECT 
  "sportKey",
  COUNT(*) as null_data_count
FROM "OddsCaches" 
WHERE "homeTeam" IS NULL 
   OR "awayTeam" IS NULL 
   OR "commenceTime" IS NULL
   OR "homeTeam" = ''
   OR "awayTeam" = ''
GROUP BY "sportKey";

-- 4. 최근 24시간 데이터 통계
SELECT 
  "sportKey",
  COUNT(*) as total_games,
  COUNT(DISTINCT "homeTeam") as unique_home_teams,
  COUNT(DISTINCT "awayTeam") as unique_away_teams,
  MIN("commenceTime") as earliest_game,
  MAX("commenceTime") as latest_game
FROM "OddsCaches" 
WHERE "lastUpdated" >= NOW() - INTERVAL '24 hours'
GROUP BY "sportKey"
ORDER BY total_games DESC;

-- 5. 특정 시간대 강제 삽입 데이터 확인
SELECT 
  "sportKey",
  "homeTeam",
  "awayTeam", 
  "commenceTime",
  "lastUpdated",
  id
FROM "OddsCaches" 
WHERE "lastUpdated" IN (
  '2025-08-01 04:55:45.819+00',
  '2025-08-01 05:00:00.000+00',
  '2025-08-01 06:00:00.000+00'
)
ORDER BY "lastUpdated", "sportKey", "commenceTime"; 