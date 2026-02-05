-- Create emergency_calls table
-- Run this in Supabase SQL Editor

-- Create emergency_calls table
CREATE TABLE IF NOT EXISTS emergency_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_lat FLOAT,
  patient_lng FLOAT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
  doctor_id UUID REFERENCES auth.users(id),
  room_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Anyone can view pending emergency calls" ON emergency_calls;
CREATE POLICY "Anyone can view pending emergency calls" ON emergency_calls 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Patients can create emergency calls" ON emergency_calls;
CREATE POLICY "Patients can create emergency calls" ON emergency_calls 
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Doctors can update emergency calls" ON emergency_calls;
CREATE POLICY "Doctors can update emergency calls" ON emergency_calls 
  FOR UPDATE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_calls;

-- Verify
SELECT * FROM emergency_calls;
