-- 在既有 availability 表加上週次欄位（ISO 週年 + ISO 週序）
ALTER TABLE availability
  ADD COLUMN IF NOT EXISTS week_year INTEGER,
  ADD COLUMN IF NOT EXISTS week_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_availability_week ON availability (week_year, week_number);
