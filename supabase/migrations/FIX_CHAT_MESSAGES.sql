-- COMPLETE FIX FOR CHAT MESSAGES (Corrected)
-- Run this ENTIRE script in Supabase SQL Editor

-- 1. Drop existing policies
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'chat_messages' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON chat_messages', pol.policyname);
    END LOOP;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. Create permissive policies for gestures and chat
CREATE POLICY "select_all_chat_messages" ON chat_messages 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "insert_chat_messages" ON chat_messages 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- 4. Publication check (OPTIONAL - Run only if needed)
-- The error "already member" means this is already done, so we can skip it.
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

SELECT 'Chat policies updated successfully' as result;
