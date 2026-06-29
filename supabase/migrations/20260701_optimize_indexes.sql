-- Optimize database indexes for 90K+ entries/year scale
-- 250 entries/day × 30 days × 12 months = 90,000 per year

-- 1. Drop unused index (zero scans)
DROP INDEX IF EXISTS idx_cash_collections_collector;

-- 2. Composite index for main pagination query:
--    SELECT * FROM cash_collections WHERE date >= X AND date <= Y ORDER BY date DESC, id DESC LIMIT 20
--    Covers both date filter AND sort order in one index — avoids separate Sort step
CREATE INDEX IF NOT EXISTS idx_cash_collections_date_id
  ON cash_collections (date DESC, id DESC);

-- 3. Composite index for date + account_no filter queries
--    Used when user filters by both date range AND account number
CREATE INDEX IF NOT EXISTS idx_cash_collections_date_account
  ON cash_collections (date DESC, account_no);

-- 4. Same composite index for withdrawals table
CREATE INDEX IF NOT EXISTS idx_withdrawals_date_account
  ON withdrawals (date DESC, account_no);

-- 5. Ensure table statistics are up to date for query planner
ANALYZE cash_collections;
ANALYZE withdrawals;
