-- ==========================================================
-- CashFlow Pro - Database Schema
-- ==========================================================

-- 1. CASH COLLECTIONS TABLE
CREATE TABLE cash_collections (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  account_no VARCHAR(3) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  collector VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cash_collections_date ON cash_collections(date);
CREATE INDEX idx_cash_collections_account_no ON cash_collections(account_no);
CREATE INDEX idx_cash_collections_collector ON cash_collections(collector);

-- 2. PARTIES TABLE
CREATE TABLE parties (
  id SERIAL PRIMARY KEY,
  account_no VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_parties_account_no ON parties(account_no);

-- 3. WITHDRAWALS TABLE (expenses & payments from collected cash)
CREATE TABLE withdrawals (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(500) NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_withdrawals_date ON withdrawals(date);
CREATE INDEX idx_withdrawals_category ON withdrawals(category);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================================

ALTER TABLE cash_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- ⚠️ SECURITY WARNING: The policies below allow ALL operations
-- for any authenticated user. This is fine for a single-user
-- internal dashboard, but should be locked down for multi-user:
--
-- OPTION A (Recommended for single-user):
-- -------------------------------------
-- CREATE POLICY "Full access for single user" ON cash_collections
--   FOR ALL USING (auth.role() = 'authenticated');
-- (Repeat for parties and withdrawals)
--
-- OPTION B (Multi-user with ownership):
-- -------------------------------------
-- Add a user_id column to each table, then:
-- ALTER TABLE cash_collections ADD COLUMN user_id UUID REFERENCES auth.users(id);
-- CREATE POLICY "User owns their data" ON cash_collections
--   FOR ALL USING (auth.uid() = user_id);
--
-- For now, the open policies are:

CREATE POLICY "Allow all operations" ON cash_collections FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON parties FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON withdrawals FOR ALL USING (true);

-- ==========================================================
-- PERMISSIONS
-- ==========================================================

GRANT ALL ON TABLE cash_collections TO authenticated;
GRANT ALL ON SEQUENCE cash_collections_id_seq TO authenticated;
GRANT ALL ON TABLE parties TO authenticated;
GRANT ALL ON SEQUENCE parties_id_seq TO authenticated;
GRANT ALL ON TABLE withdrawals TO authenticated;
GRANT ALL ON SEQUENCE withdrawals_id_seq TO authenticated;
