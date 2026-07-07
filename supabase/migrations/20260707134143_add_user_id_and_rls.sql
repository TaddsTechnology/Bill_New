-- Add user_id column to all data tables
ALTER TABLE parties ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE cash_collections ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a trigger function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they already exist (idempotent)
DROP TRIGGER IF EXISTS trg_set_user_id_parties ON parties;
DROP TRIGGER IF EXISTS trg_set_user_id_cash_collections ON cash_collections;
DROP TRIGGER IF EXISTS trg_set_user_id_withdrawals ON withdrawals;

-- Create triggers on each table
CREATE TRIGGER trg_set_user_id_parties
  BEFORE INSERT ON parties
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

CREATE TRIGGER trg_set_user_id_cash_collections
  BEFORE INSERT ON cash_collections
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

CREATE TRIGGER trg_set_user_id_withdrawals
  BEFORE INSERT ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Enable Row Level Security
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "users can manage own parties" ON parties;
DROP POLICY IF EXISTS "users can manage own collections" ON cash_collections;
DROP POLICY IF EXISTS "users can manage own withdrawals" ON withdrawals;

-- Create RLS policies: users can only see/manage their own data
CREATE POLICY "users can manage own parties"
  ON parties
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own collections"
  ON cash_collections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own withdrawals"
  ON withdrawals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
