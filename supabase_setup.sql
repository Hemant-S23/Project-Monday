-- =========================================================================
-- PROJECT MONDAY — Supabase Database Setup Script
-- =========================================================================
-- Agar aap Supabase mein user profiles aur trades cloud par save karna chahte hain,
-- toh Supabase dashboard -> SQL Editor mein jaakar yeh script run (Run button) karein:

-- 1. Create Profiles Table (Synced with Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  paper_balance NUMERIC DEFAULT 2000.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view & update their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 2. Create Paper Trades Table
CREATE TABLE IF NOT EXISTS public.paper_trades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  market TEXT DEFAULT 'Crypto',
  asset TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  stop_loss NUMERIC NOT NULL,
  target_price NUMERIC NOT NULL,
  position_size NUMERIC,
  risk_usd NUMERIC,
  reward_usd NUMERIC,
  rr_ratio NUMERIC,
  status TEXT DEFAULT 'OPEN',
  result TEXT,
  pnl_usd NUMERIC DEFAULT 0,
  r_multiple NUMERIC DEFAULT 0,
  exit_price NUMERIC,
  timeframe TEXT,
  strategy TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for trades
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trades" 
  ON public.paper_trades FOR ALL 
  USING (auth.uid()::text = user_id OR user_id LIKE 'guest_%');
