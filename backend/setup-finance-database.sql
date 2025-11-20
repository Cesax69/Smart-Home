-- ========================================
-- FINANCE SERVICE DATABASE SCHEMA
-- ========================================

-- Tabla de gastos (expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    category_id VARCHAR(50) NOT NULL,
    member_id VARCHAR(50),
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de ingresos (income)
CREATE TABLE IF NOT EXISTS income (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    source VARCHAR(100) NOT NULL,
    member_id VARCHAR(50),
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_member ON expenses(member_id);
CREATE INDEX IF NOT EXISTS idx_expenses_currency ON expenses(currency);

CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
CREATE INDEX IF NOT EXISTS idx_income_source ON income(source);
CREATE INDEX IF NOT EXISTS idx_income_member ON income(member_id);
CREATE INDEX IF NOT EXISTS idx_income_currency ON income(currency);

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Finance Service Database Schema created successfully!';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - expenses (gastos domésticos)';
    RAISE NOTICE '  - income (ingresos familiares)';
    RAISE NOTICE 'No sample data loaded - database is empty.';
END $$;
