-- 중복 데이터 및 비정규 데이터 정리 쿼리
-- 2025-08-01

BEGIN;

-- 1. MLB 중복 데이터 정리 (2025-08-01 04:55:45.819+00)
-- 최신 ID만 유지하고 나머지 삭제
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

-- 2. 전체 중복 데이터 정리 (모든 스포츠, 최근 24시간)
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

-- 3. 비정규 데이터 삭제 (null 값이나 빈 값)
DELETE FROM "OddsCaches" 
WHERE "homeTeam" IS NULL 
   OR "awayTeam" IS NULL 
   OR "commenceTime" IS NULL
   OR "homeTeam" = ''
   OR "awayTeam" = '';

-- 4. 특정 시간대 강제 삽입된 의심스러운 데이터 정리
-- (정확한 시간대와 패턴을 확인 후 실행)
DELETE FROM "OddsCaches" 
WHERE "lastUpdated" IN (
  '2025-08-01 04:55:45.819+00',
  '2025-08-01 05:00:00.000+00',
  '2025-08-01 06:00:00.000+00'
)
AND "sportKey" NOT IN ('baseball_mlb', 'basketball_nba', 'american_football_nfl', 'soccer_kbo');

-- 5. 정리 후 결과 확인
SELECT 
  "sportKey",
  COUNT(*) as remaining_games,
  COUNT(DISTINCT "homeTeam") as unique_home_teams,
  COUNT(DISTINCT "awayTeam") as unique_away_teams
FROM "OddsCaches" 
WHERE "lastUpdated" >= '2025-08-01 00:00:00+00'
GROUP BY "sportKey"
ORDER BY remaining_games DESC;

COMMIT; 