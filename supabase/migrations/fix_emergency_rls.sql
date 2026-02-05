-- Fix RLS policies for emergency_calls table
-- Doctors need to be able to READ all emergency calls to see waiting patients
-- Run this in Supabase SQL Editor

-- First, check if RLS is even enabled
-- If not, this might not be the issue

-- Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Anyone can view pending emergency calls" ON emergency_calls;
DROP POLICY IF EXISTS "Patients can create emergency calls" ON emergency_calls;
DROP POLICY IF EXISTS "Doctors can update emergency calls" ON emergency_calls;
DROP POLICY IF EXISTS "Users can view their own calls" ON emergency_calls;
DROP POLICY IF EXISTS "view_emergency_calls" ON emergency_calls;
DROP POLICY IF EXISTS "create_emergency_calls" ON emergency_calls;
DROP POLICY IF EXISTS "update_emergency_calls" ON emergency_calls;

-- Enable RLS (in case it was disabled)
ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can view all emergency calls
-- This is needed for doctors to see waiting patients
CREATE POLICY "authenticated_users_can_view_emergency_calls" 
ON emergency_calls FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Authenticated users can insert emergency calls
CREATE POLICY "authenticated_users_can_create_emergency_calls" 
ON emergency_calls FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy: Authenticated users can update emergency calls
CREATE POLICY "authenticated_users_can_update_emergency_calls" 
ON emergency_calls FOR UPDATE 
TO authenticated 
USING (true);

-- Verify policies
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'emergency_calls';
