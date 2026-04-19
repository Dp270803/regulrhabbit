-- Regulrhabbit — Supabase Schema
-- Run this in the Supabase SQL editor: supabase.com → your project → SQL Editor
-- All tables use Row Level Security so users can only read/write their own rows.

-- ─── Enable UUID extension ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- One row per user. Extends auth.users (managed by Supabase Auth).
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT,
  persona         TEXT DEFAULT 'guided' CHECK (persona IN ('guided','self_directed')),
  level           INTEGER DEFAULT 1,
  total_xp        INTEGER DEFAULT 0,
  -- Phase 2: fitness state + diet baseline
  fitness_state   JSONB,                -- { phase, fatigue_level, adherence, strength_trend, weight_trend }
  diet            JSONB,                -- { baseline_calories, current_calories, last_adjustment_reason }
  diet_profile    JSONB,                -- { age, height_cm, sex, activity_level, weight_kg, goal }
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Plans ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id          TEXT PRIMARY KEY,               -- matches localStorage plan.id ("plan_1234567890")
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  config      JSONB NOT NULL,                 -- entire plan object as JSON
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own plans"   ON public.plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON public.plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON public.plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.plans FOR DELETE USING (auth.uid() = user_id);

-- ─── Check-ins (session completions) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.check_ins (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id             TEXT REFERENCES public.plans(id) ON DELETE SET NULL,
  date                DATE NOT NULL,
  session_id          TEXT,
  xp_earned           INTEGER DEFAULT 0,
  bonus_xp            INTEGER DEFAULT 0,
  -- Session calorie tracking (Phase 1)
  base_calories       INTEGER,
  adjusted_calories   INTEGER,
  final_calories      INTEGER,
  calorie_reasoning   TEXT,
  duration_minutes    INTEGER,
  body_weight_kg      NUMERIC(5,2),
  completed_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own check_ins"   ON public.check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own check_ins" ON public.check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Streaks ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.streaks (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current              INTEGER DEFAULT 0,
  best                 INTEGER DEFAULT 0,
  last_check_in_date   DATE,
  last_scheduled_date  DATE,
  consecutive_misses   INTEGER DEFAULT 0,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own streaks"   ON public.streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON public.streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON public.streaks FOR UPDATE USING (auth.uid() = user_id);

-- ─── Badges ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badges (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id  TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own badges"   ON public.badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON public.badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Tips seen ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tips_seen (
  user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tip_id   TEXT NOT NULL,
  seen_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, tip_id)
);

ALTER TABLE public.tips_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own tips_seen"   ON public.tips_seen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tips_seen" ON public.tips_seen FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Settings ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme                  TEXT DEFAULT 'dark',
  notifications_enabled  BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own settings"   ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.settings FOR UPDATE USING (auth.uid() = user_id);

-- ─── Performance log (Optimizer persona — exercise weight/rep tracking) ───────
CREATE TABLE IF NOT EXISTS public.performance_log (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id     TEXT NOT NULL,
  date           DATE NOT NULL,
  exercise_name  TEXT NOT NULL,
  sets           INTEGER,
  reps           TEXT,       -- stored as text to allow ranges like "8-12"
  weight_kg      NUMERIC(6,2),
  rpe            INTEGER CHECK (rpe BETWEEN 1 AND 10),
  notes          TEXT,
  logged_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.performance_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own performance_log"   ON public.performance_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own performance_log" ON public.performance_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own performance_log" ON public.performance_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own performance_log" ON public.performance_log FOR DELETE USING (auth.uid() = user_id);

-- Index for fast trend queries
CREATE INDEX IF NOT EXISTS perf_log_user_exercise ON public.performance_log (user_id, exercise_name, date DESC);

-- ─── Migration: add new columns to existing tables ────────────────────────────
-- Run these ALTER statements if you already have the schema applied:
--
-- ALTER TABLE public.check_ins
--   ADD COLUMN IF NOT EXISTS base_calories      INTEGER,
--   ADD COLUMN IF NOT EXISTS adjusted_calories  INTEGER,
--   ADD COLUMN IF NOT EXISTS final_calories      INTEGER,
--   ADD COLUMN IF NOT EXISTS calorie_reasoning   TEXT,
--   ADD COLUMN IF NOT EXISTS duration_minutes    INTEGER,
--   ADD COLUMN IF NOT EXISTS body_weight_kg      NUMERIC(5,2);
--
-- ALTER TABLE public.profiles
--   ADD COLUMN IF NOT EXISTS fitness_state  JSONB,
--   ADD COLUMN IF NOT EXISTS diet           JSONB,
--   ADD COLUMN IF NOT EXISTS diet_profile   JSONB;
