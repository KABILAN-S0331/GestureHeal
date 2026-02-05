-- Fix emergency_calls table columns
-- Run this in Supabase SQL Editor

-- Add missing columns to emergency_calls
ALTER TABLE emergency_calls ADD COLUMN IF NOT EXISTS patient_lat FLOAT;
ALTER TABLE emergency_calls ADD COLUMN IF NOT EXISTS patient_lng FLOAT;
ALTER TABLE emergency_calls ADD COLUMN IF NOT EXISTS patient_name TEXT;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'emergency_calls';
