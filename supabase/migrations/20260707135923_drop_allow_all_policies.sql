-- Drop default Supabase "Allow all operations" policies that bypass RLS
DROP POLICY IF EXISTS "Allow all operations" ON parties;
DROP POLICY IF EXISTS "Allow all operations" ON cash_collections;
DROP POLICY IF EXISTS "Allow all operations" ON withdrawals;
