-- FIX: Add UPDATE policy for profiles
-- Run this in Supabase SQL Editor

-- Drop existing update policies if any
DROP POLICY IF EXISTS "allow_update_own" ON profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create UPDATE policy
CREATE POLICY "allow_update_own" ON profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify all policies exist
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';
