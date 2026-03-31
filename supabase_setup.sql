-- SUPABASE DATABASE SETUP MIGRATIONS
-- Execute these commands in your Supabase SQL Editor.

-- 1. ADD USER_ID AND IS_PUBLIC TO workout_logs
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add helpful index for filtering by user
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);

-- 2. CREATE PROFILES TABLE FOR SOCIAL FEATURES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bodyweight NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2.1 SYNC USERNAME TRIGGER
-- This function automatically creates a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. ENABLE ROW LEVEL SECURITY (RLS) FOR PRIVACY
-- Note: Make sure to enable RLS in your Supabase UI for both tables.
-- These policies ensure that users can only read/edit their own data by default.

-- Workout Logs Policy
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own workout logs" ON public.workout_logs;
CREATE POLICY "Users can manage their own workout logs" 
  ON public.workout_logs 
  FOR ALL
  USING (auth.uid() = user_id);

-- Profiles Policy
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);
