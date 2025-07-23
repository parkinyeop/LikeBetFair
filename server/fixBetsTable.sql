-- Bets 테이블 potentialWinnings 컬럼 타입 수정
-- PostgreSQL에서 실행할 SQL 쿼리

-- 1. 현재 Bets 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'Bets'
ORDER BY ordinal_position;

-- 2. potentialWinnings 컬럼을 DECIMAL(10,2)로 변경
ALTER TABLE "Bets" 
ALTER COLUMN "potentialWinnings" TYPE DECIMAL(10, 2);

-- 3. totalOdds 컬럼도 DECIMAL(8,3)으로 변경 (정밀도 문제 방지)
ALTER TABLE "Bets" 
ALTER COLUMN "totalOdds" TYPE DECIMAL(8, 3);

-- 4. stake 컬럼도 DECIMAL(10,2)로 변경
ALTER TABLE "Bets" 
ALTER COLUMN "stake" TYPE DECIMAL(10, 2);

-- 5. 수정 후 구조 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'Bets'
ORDER BY ordinal_position; 