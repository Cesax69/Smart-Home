-- Inicialización de la base de datos de finanzas
CREATE TABLE IF NOT EXISTS finance_expenses (
  id SERIAL PRIMARY KEY,
  family_id VARCHAR(64) NOT NULL,
  member_id VARCHAR(64),
  category VARCHAR(64) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_expenses_family_date ON finance_expenses (family_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_fin_expenses_category ON finance_expenses (category);

CREATE TABLE IF NOT EXISTS finance_income (
  id SERIAL PRIMARY KEY,
  family_id VARCHAR(64) NOT NULL,
  member_id VARCHAR(64),
  source VARCHAR(64) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_income_family_date ON finance_income (family_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_fin_income_source ON finance_income (source);