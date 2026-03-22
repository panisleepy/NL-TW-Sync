-- TimeBridge NL-TW — run once in Supabase SQL Editor
-- (若表已存在 publication，重跑 ALTER PUBLICATION 可能報錯，可略過已加入的表)

-- 1. 朋友可用時間（UTC 儲存；夏令時間由 IANA 時區換算）
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL,
  utc_time_slot TIMESTAMPTZ NOT NULL,
  is_admin_blocked BOOLEAN DEFAULT false,
  week_year INTEGER,
  week_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_name, utc_time_slot)
);

CREATE INDEX IF NOT EXISTS idx_availability_slot ON availability (utc_time_slot);
CREATE INDEX IF NOT EXISTS idx_availability_blocked ON availability (is_admin_blocked);

-- 2. 拍立得日記
CREATE TABLE IF NOT EXISTS diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT,
  image_url TEXT,
  event_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE availability;
ALTER PUBLICATION supabase_realtime ADD TABLE diaries;

-- RLS（示範：公開讀寫；正式環境請改為登入使用者政策）
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_select" ON availability FOR SELECT USING (true);
CREATE POLICY "availability_insert" ON availability FOR INSERT WITH CHECK (true);
CREATE POLICY "availability_update" ON availability FOR UPDATE USING (true);
CREATE POLICY "availability_delete" ON availability FOR DELETE USING (true);

CREATE POLICY "diaries_select" ON diaries FOR SELECT USING (true);
CREATE POLICY "diaries_insert" ON diaries FOR INSERT WITH CHECK (true);
CREATE POLICY "diaries_update" ON diaries FOR UPDATE USING (true);
CREATE POLICY "diaries_delete" ON diaries FOR DELETE USING (true);
