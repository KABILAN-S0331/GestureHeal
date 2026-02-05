-- Add missing columns to profiles table
-- Run this in Supabase SQL Editor

-- Add latitude and longitude columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude FLOAT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialization TEXT;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
