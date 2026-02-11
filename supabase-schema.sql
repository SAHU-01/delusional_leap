-- =============================================
-- DELUSIONAL LEAP - SUPABASE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  dream_category TEXT CHECK (dream_category IN ('solo_trip', 'salary', 'side_hustle', 'self_growth')),
  blocker TEXT,
  pace TEXT CHECK (pace IN ('delusional', 'steady', 'flow')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  streak_count INT DEFAULT 0,
  total_moves INT DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE
);

-- Moves table
CREATE TABLE moves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  move_type TEXT CHECK (move_type IN ('quick', 'power', 'boss')),
  title TEXT,
  description TEXT,
  proof_text TEXT,
  proof_photo_url TEXT,
  ai_verified BOOLEAN DEFAULT FALSE,
  ai_feedback TEXT,
  points INT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsored Challenges (Gabby creates these)
CREATE TABLE sponsored_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  sponsor_name TEXT,
  sponsor_logo_url TEXT,
  category TEXT,
  move_type TEXT CHECK (move_type IN ('quick', 'power', 'boss')),
  points_bonus INT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Tasks (Gabby creates tier-based tasks per category)
CREATE TABLE daily_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  move_type TEXT CHECK (move_type IN ('quick', 'power', 'boss')),
  title TEXT NOT NULL,
  description TEXT,
  tier INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics events
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_type TEXT,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsored_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Public read for challenges and tasks
CREATE POLICY "Public read challenges" ON sponsored_challenges FOR SELECT USING (true);
CREATE POLICY "Public read tasks" ON daily_tasks FOR SELECT USING (true);

-- Users can read/write own data
CREATE POLICY "Users read own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users read own moves" ON moves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own moves" ON moves FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Dashboard admin policies (allow full access for service role / dashboard)
CREATE POLICY "Admin full access users" ON users FOR ALL USING (true);
CREATE POLICY "Admin full access moves" ON moves FOR ALL USING (true);
CREATE POLICY "Admin full access challenges" ON sponsored_challenges FOR ALL USING (true);
CREATE POLICY "Admin full access tasks" ON daily_tasks FOR ALL USING (true);
CREATE POLICY "Admin full access analytics" ON analytics_events FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_moves_user_id ON moves(user_id);
CREATE INDEX idx_moves_completed_at ON moves(completed_at);
CREATE INDEX idx_users_dream_category ON users(dream_category);
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_daily_tasks_category ON daily_tasks(category);
