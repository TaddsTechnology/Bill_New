-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)

-- 1. Fix amount precision (500 → 499.99 rounding fix)
ALTER TABLE cash_collections ALTER COLUMN amount TYPE DECIMAL(12,2);

-- 2. Add account_no to withdrawals table
ALTER TABLE withdrawals ADD COLUMN account_no TEXT NOT NULL DEFAULT '';

-- 3. Remove old columns from withdrawals
ALTER TABLE withdrawals DROP COLUMN category;
ALTER TABLE withdrawals DROP COLUMN description;

-- 4. Add index on withdrawals.account_no for faster lookups
CREATE INDEX IF NOT EXISTS idx_withdrawals_account_no ON withdrawals(account_no);
