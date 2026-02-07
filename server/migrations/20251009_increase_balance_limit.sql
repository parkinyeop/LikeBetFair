-- 사용자 잔액 최대 한도 증가: 1억원 → 10억원
-- NUMERIC(10, 2) → NUMERIC(12, 2)
-- 실행일: 2025-10-09

-- Users 테이블 balance 컬럼 타입 변경
ALTER TABLE "Users" 
ALTER COLUMN balance TYPE NUMERIC(12, 2);

COMMENT ON COLUMN "Users".balance IS '사용자 잔액 (최대 10억원)';

-- PaymentHistories 테이블 amount 컬럼 타입 변경
ALTER TABLE "PaymentHistories" 
ALTER COLUMN amount TYPE NUMERIC(12, 2);

COMMENT ON COLUMN "PaymentHistories".amount IS '거래 금액';

-- PaymentHistories 테이블 balanceAfter 컬럼 타입 변경
ALTER TABLE "PaymentHistories" 
ALTER COLUMN "balanceAfter" TYPE NUMERIC(12, 2);

COMMENT ON COLUMN "PaymentHistories"."balanceAfter" IS '거래 후 잔액';

-- 변경 사항 확인
SELECT 
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('Users', 'PaymentHistories')
AND column_name IN ('balance', 'amount', 'balanceAfter')
ORDER BY table_name, column_name;

