-- GestureHeal Database Schema - CLEAN START VERSION
-- Run this in Supabase SQL Editor
-- This version handles existing objects gracefully

-- ============================================================
-- STEP 1: Create types (skip if exists)
-- ============================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('patient', 'doctor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE call_status AS ENUM ('waiting', 'active', 'ended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'gesture', 'quick_response');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE video_category AS ENUM ('question', 'instruction');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- STEP 2: Create tables (if not exists)
-- ============================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'patient',
  full_name TEXT NOT NULL,
  email TEXT,
  specialization TEXT,
  is_online BOOLEAN DEFAULT false,
  latitude FLOAT,
  longitude FLOAT,
  license_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status appointment_status DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency calls table  
CREATE TABLE IF NOT EXISTS emergency_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  patient_lat FLOAT,
  patient_lng FLOAT,
  status call_status DEFAULT 'waiting',
  room_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES emergency_calls(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_type message_type DEFAULT 'text',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sign videos table
CREATE TABLE IF NOT EXISTS sign_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase TEXT NOT NULL,
  video_url TEXT NOT NULL,
  category video_category NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 3: Create indexes (if not exists)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_status ON emergency_calls(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_call ON chat_messages(call_id);

-- ============================================================
-- STEP 4: Create trigger function for new users
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STEP 5: Enable RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sign_videos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 6: Create RLS policies (drop first to avoid conflicts)
-- ============================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Appointments
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Patients can create appointments" ON appointments;
CREATE POLICY "Patients can create appointments" ON appointments
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Doctors can update appointment status" ON appointments;
CREATE POLICY "Doctors can update appointment status" ON appointments
  FOR UPDATE USING (auth.uid() = doctor_id);

-- Emergency calls
DROP POLICY IF EXISTS "View emergency calls" ON emergency_calls;
CREATE POLICY "View emergency calls" ON emergency_calls
  FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id OR (status = 'waiting' AND doctor_id IS NULL));

DROP POLICY IF EXISTS "Patients can create emergency calls" ON emergency_calls;
CREATE POLICY "Patients can create emergency calls" ON emergency_calls
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Doctors can accept emergency calls" ON emergency_calls;
CREATE POLICY "Doctors can accept emergency calls" ON emergency_calls
  FOR UPDATE USING (auth.uid() = doctor_id OR (status = 'waiting' AND doctor_id IS NULL));

-- Chat messages
DROP POLICY IF EXISTS "View call messages" ON chat_messages;
CREATE POLICY "View call messages" ON chat_messages
  FOR SELECT USING (EXISTS (SELECT 1 FROM emergency_calls ec WHERE ec.id = call_id AND (ec.patient_id = auth.uid() OR ec.doctor_id = auth.uid())));

DROP POLICY IF EXISTS "Send messages in own calls" ON chat_messages;
CREATE POLICY "Send messages in own calls" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM emergency_calls ec WHERE ec.id = call_id AND (ec.patient_id = auth.uid() OR ec.doctor_id = auth.uid())));

-- Sign videos
DROP POLICY IF EXISTS "Anyone can view sign videos" ON sign_videos;
CREATE POLICY "Anyone can view sign videos" ON sign_videos FOR SELECT USING (true);

-- ============================================================
-- STEP 7: Sample data (only if table is empty)
-- ============================================================
INSERT INTO sign_videos (phrase, video_url, category)
SELECT * FROM (VALUES
  ('Where is the pain?', '/videos/where_is_pain.mp4', 'question'::video_category),
  ('Can you breathe?', '/videos/can_you_breathe.mp4', 'question'::video_category),
  ('Are you bleeding?', '/videos/are_you_bleeding.mp4', 'question'::video_category),
  ('Help is coming', '/videos/help_coming.mp4', 'instruction'::video_category),
  ('Stay calm', '/videos/stay_calm.mp4', 'instruction'::video_category),
  ('Take deep breaths', '/videos/deep_breaths.mp4', 'instruction'::video_category)
) AS t(phrase, video_url, category)
WHERE NOT EXISTS (SELECT 1 FROM sign_videos LIMIT 1);

-- ============================================================
-- STEP 8: Enable realtime
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE emergency_calls;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
