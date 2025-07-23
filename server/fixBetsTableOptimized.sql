-- Bets 테이블 컬럼 타입 최적화
-- 베팅 시스템에 맞는 적절한 타입으로 수정

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

-- 2. stake 컬럼: 베팅금 (최대 1억원까지)
ALTER TABLE "Bets" 
ALTER COLUMN "stake" TYPE DECIMAL(10, 2);

-- 3. totalOdds 컬럼: 배당률 (소수점 3자리까지)
ALTER TABLE "Bets" 
ALTER COLUMN "totalOdds" TYPE DECIMAL(8, 3);

-- 4. potentialWinnings 컬럼: 당첨금 (최대 10억원까지)
ALTER TABLE "Bets" 
ALTER COLUMN "potentialWinnings" TYPE DECIMAL(12, 2);

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

-- 6. 각 컬럼의 최대값 테스트
SELECT 
    'stake' as column_name,
    '최대값: 99,999,999.99' as max_value,
    '예시: 50,000.00' as example
UNION ALL
SELECT 
    'totalOdds' as column_name,
    '최대값: 99,999.999' as max_value,
    '예시: 3.465' as example
UNION ALL
SELECT 
    'potentialWinnings' as column_name,
    '최대값: 9,999,999,999.99' as max_value,
    '예시: 173,290.95' as example; 