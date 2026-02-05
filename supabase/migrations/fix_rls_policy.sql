-- FIX: Allow authenticated users to insert their own profile
-- Run this in Supabase SQL Editor

-- Drop and recreate the INSERT policy with proper permissions
DROP POLICY IF EXISTS "allow_insert_own" ON profiles;
DROP POLICY IF EXISTS "Enable insert for own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a more permissive insert policy
-- This allows any authenticated user to insert a row where id matches their auth.uid()
CREATE POLICY "allow_insert_own" ON profiles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also allow anon users during signup (before email verification)
DROP POLICY IF EXISTS "allow_anon_insert" ON profiles;
CREATE POLICY "allow_anon_insert" ON profiles 
  FOR INSERT 
  TO anon
  WITH CHECK (true);
