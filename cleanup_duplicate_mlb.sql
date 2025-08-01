-- MLB 중복 데이터 정리 쿼리
-- 2025-08-01에 삽입된 중복 MLB 데이터 정리

BEGIN;

-- 1. 중복 데이터 확인
SELECT 
  "homeTeam", 
  "awayTeam", 
  "commenceTime",
  COUNT(*) as duplicate_count
FROM "OddsCaches" 
WHERE "sportKey" = 'baseball_mlb' 
  AND "lastUpdated" = '2025-08-01 04:55:45.819+00'
GROUP BY "homeTeam", "awayTeam", "commenceTime"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2. 중복 데이터 삭제 (최신 ID만 유지)
DELETE FROM "OddsCaches" 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY "homeTeam", "awayTeam", "commenceTime" 
             ORDER BY "createdAt" DESC
           ) as rn
    FROM "OddsCaches"
    WHERE "sportKey" = 'baseball_mlb' 
      AND "lastUpdated" = '2025-08-01 04:55:45.819+00'
  ) t
  WHERE rn > 1
);

-- 3. 정리 후 결과 확인
SELECT 
  "sportKey",
  COUNT(*) as total_games
FROM "OddsCaches" 
WHERE "sportKey" = 'baseball_mlb' 
  AND "lastUpdated" = '2025-08-01 04:55:45.819+00'
GROUP BY "sportKey";

COMMIT; 