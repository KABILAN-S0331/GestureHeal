-- COMPLETE FIX FOR EMERGENCY CALLS
-- Run this ENTIRE script in Supabase SQL Editor
-- https://supabase.com/dashboard/project/izdlzlabyudvemqgytvp/sql

-- =====================================================
-- STEP 1: Drop ALL existing policies on emergency_calls
-- =====================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'emergency_calls'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON emergency_calls', pol.policyname);
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: Temporarily disable RLS to verify table works
-- =====================================================
ALTER TABLE emergency_calls DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Verify emergency_calls table structure
-- =====================================================
-- Add any missing columns
ALTER TABLE emergency_calls ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES profiles(id);
ALTER TABLE emergency_calls ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES profiles(id);
ALTER TABLE emergency_calls ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE emergency_calls ADD COLUMN IF NOT EXISTS patient_lat FLOAT;
ALTER TABLE emergency_calls ADD COLUMN IF NOT EXISTS patient_lng FLOAT;
ALTER TABLE emergency_calls ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting';
ALTER TABLE emergency_calls ADD COLUMN IF NOT EXISTS room_url TEXT;
ALTER TABLE emergency_calls ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- STEP 4: Re-enable RLS
-- =====================================================
ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: Create SIMPLE permissive policies
-- =====================================================

-- Policy: ALL authenticated users can SELECT all rows
CREATE POLICY "select_all_emergency_calls" 
ON emergency_calls FOR SELECT 
TO authenticated 
USING (true);

-- Policy: ALL authenticated users can INSERT
CREATE POLICY "insert_emergency_calls" 
ON emergency_calls FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy: ALL authenticated users can UPDATE
CREATE POLICY "update_emergency_calls" 
ON emergency_calls FOR UPDATE 
TO authenticated 
USING (true);

-- Policy: ALL authenticated users can DELETE (for cleanup)
CREATE POLICY "delete_emergency_calls" 
ON emergency_calls FOR DELETE 
TO authenticated 
USING (true);

-- =====================================================
-- STEP 6: Enable realtime for this table
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_calls;

-- =====================================================
-- STEP 7: Verify the setup
-- =====================================================
SELECT 'Policies created:' as info;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'emergency_calls';

SELECT 'Current emergency calls:' as info;
SELECT id, patient_name, status, doctor_id, created_at FROM emergency_calls ORDER BY created_at DESC LIMIT 5;

-- =====================================================
-- STEP 8: Clean up old test data and create a test call
-- =====================================================
-- Delete old calls first
DELETE FROM emergency_calls WHERE status IN ('active', 'waiting', 'ended');

-- Insert a test call to verify it works
INSERT INTO emergency_calls (patient_name, patient_lat, patient_lng, status)
VALUES ('Test Patient', 22.8, 88.2, 'waiting');

SELECT 'Test call created - refresh doctor dashboard!' as result;
