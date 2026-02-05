-- FORCE ENABLE REALTIME AND FIX POLICIES FOR CHAT_MESSAGES

-- 1. Enable Realtime for the table explicitly (Commented out as it might already be enabled)
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 2. Enable RLS (or ensure it is on)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can select chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON chat_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON chat_messages;

-- 4. Create permissive policies suitable for this emergency app
-- Allow ANY authenticated user to INSERT (Patient sending gesture)
CREATE POLICY "Enable insert for authenticated users"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow ANY authenticated user to SELECT (Doctor receiving gesture)
CREATE POLICY "Enable read access for authenticated users"
ON chat_messages FOR SELECT
TO authenticated
USING (true);

-- 5. Verify grants
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON chat_messages TO service_role;

-- 6. Insert a test message to verify it works (optional, debug only)
-- INSERT INTO chat_messages (call_id, sender_id, content, message_type) VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'SYSTEM_TEST', 'system');
