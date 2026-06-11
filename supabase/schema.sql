-- ====================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR FOOTSTREAM MALAGASY PREMIUM APP
-- Paste this script directly inside the Supabase SQL Editor to bootstrap!
-- ====================================================================

-- 1. PROFILES TABLE
-- Mirroring metadata and tracking lifetime Premium memberships
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles are publicly viewable" ON public.profiles 
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);


-- 2. MATCHES TABLE
-- Stores live streams and upcoming world / Malagasy cup matches
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_flag TEXT,
  away_flag TEXT,
  competition TEXT NOT NULL,
  status TEXT DEFAULT 'upcoming'::text NOT NULL CHECK (status IN ('upcoming', 'live', 'finished')),
  video_url TEXT NOT NULL
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Matches Policies
CREATE POLICY "Matches are viewable by anyone" ON public.matches 
  FOR SELECT USING (true);

CREATE POLICY "Matches can only be managed by administrators" ON public.matches 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.email = 'admin@exemple.com'
    )
  );


-- 3. PAYMENTS TABLE
-- Tracking checkout and gateway references (Mvola, Om, Airtel, Bred)
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount NUMERIC DEFAULT 10000 NOT NULL,
  status TEXT DEFAULT 'pending'::text NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  papi_reference TEXT,
  provider TEXT DEFAULT 'MVOLA'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments Policies
CREATE POLICY "Users can view their own payment histories" ON public.payments 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can record their own checkout records" ON public.payments 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service Role and internal systems handle administrative updates" ON public.payments 
  FOR ALL USING (true);


-- 4. CUSTOM TEAMS TABLE
-- For administrator's custom match setups
CREATE TABLE IF NOT EXISTS public.custom_teams (
  name TEXT PRIMARY KEY,
  flag TEXT DEFAULT '🏳️'::text NOT NULL
);

ALTER TABLE public.custom_teams ENABLE ROW LEVEL SECURITY;

-- Custom Teams Policies
CREATE POLICY "Teams are viewable by everyone" ON public.custom_teams 
  FOR SELECT USING (true);

CREATE POLICY "Anyone can submit country listings" ON public.custom_teams 
  FOR INSERT WITH CHECK (true);
