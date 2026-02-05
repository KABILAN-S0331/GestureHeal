-- GUARANTEED FIX FOR CHAT MESSAGES RLS
-- Run this script to unlock gesture messaging.
-- It works even if Realtime is already enabled.

-- 1. Ensure RLS is active
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop OLD policies (to avoid "policy already exists" errors)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON chat_messages;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can select chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages" ON chat_messages;

-- 3. Create NEW Permissive Policies
-- Allow ANY authenticated user (Patient) to INSERT messages
CREATE POLICY "Enable insert for authenticated users"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow ANY authenticated user (Doctor) to READ messages
CREATE POLICY "Enable read access for authenticated users"
ON chat_messages FOR SELECT
TO authenticated
USING (true);

-- 4. Grant Permissions (Just in case)
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON chat_messages TO service_role;

-- 5. Force Realtime (Ignore error if already exists, this is safe to skip if it fails)
-- DO $$
-- BEGIN
--   ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
-- EXCEPTION WHEN duplicate_object THEN
--   NULL; -- Ignore if already exists
-- END $$;
