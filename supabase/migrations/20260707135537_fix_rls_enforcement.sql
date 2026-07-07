-- Re-enable Row Level Security on all tables
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Drop and re-create policies (idempotent)
DROP POLICY IF EXISTS "users can manage own parties" ON parties;
DROP POLICY IF EXISTS "users can manage own collections" ON cash_collections;
DROP POLICY IF EXISTS "users can manage own withdrawals" ON withdrawals;

CREATE POLICY "users can manage own parties"
  ON parties FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own collections"
  ON cash_collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own withdrawals"
  ON withdrawals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
