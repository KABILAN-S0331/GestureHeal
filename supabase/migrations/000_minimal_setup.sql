-- STEP 1: First, disable the problematic trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- STEP 2: Create the role type
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('patient', 'doctor');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- STEP 3: Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'patient',
  full_name TEXT NOT NULL DEFAULT 'User',
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

-- STEP 4: Enable RLS and create policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_select" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own" ON profiles;
DROP POLICY IF EXISTS "allow_update_own" ON profiles;

CREATE POLICY "allow_all_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "allow_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "allow_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- SUCCESS! Now try creating an account again.
