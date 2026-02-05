-- FORCE RESET STUCK CALL
-- Run this in Supabase SQL Editor

-- 1. Check current state (Optional, for debugging)
SELECT id, status, doctor_id, patient_name 
FROM emergency_calls 
WHERE id::text LIKE 'e028%';

-- 2. Reset the call to 'waiting' and remove doctor assignment
-- This makes it appear in the "Nearby" list again
UPDATE emergency_calls 
SET status = 'waiting', doctor_id = NULL 
WHERE id::text LIKE 'e028%';

-- 3. Verify the fix
SELECT id, status, doctor_id, patient_name 
FROM emergency_calls 
WHERE id::text LIKE 'e028%';
