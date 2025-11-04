-- Create the cash_collections table
CREATE TABLE cash_collections (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  account_no VARCHAR(3) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  collector VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create the parties table
CREATE TABLE parties (
  id SERIAL PRIMARY KEY,
  account_no VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_cash_collections_date ON cash_collections(date);
CREATE INDEX idx_cash_collections_account_no ON cash_collections(account_no);
CREATE INDEX idx_cash_collections_collector ON cash_collections(collector);
CREATE INDEX idx_parties_account_no ON parties(account_no);

-- Enable Row Level Security (RLS) for the tables
ALTER TABLE cash_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (you may want to restrict this in production)
CREATE POLICY "Allow all operations" ON cash_collections
FOR ALL USING (true);

CREATE POLICY "Allow all operations" ON parties
FOR ALL USING (true);

-- Grant permissions to authenticated users
GRANT ALL ON TABLE cash_collections TO authenticated;
GRANT ALL ON SEQUENCE cash_collections_id_seq TO authenticated;
GRANT ALL ON TABLE parties TO authenticated;
GRANT ALL ON SEQUENCE parties_id_seq TO authenticated;