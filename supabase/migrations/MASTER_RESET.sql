-- MASTER FIX: RESET EVERYTHING & FIX PERMISSIONS
-- Run this in Supabase SQL Editor to clear all issues

-- 1. DELETE all old data to prevent "multiple calls" confusion
DELETE FROM chat_messages;
DELETE FROM emergency_calls;

-- 2. Ensure RLS is enabled
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;

-- 3. FIX CHAT POLICIES (Allow signs to be sent/read)
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'chat_messages' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON chat_messages', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "select_all_chat_messages" ON chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_chat_messages" ON chat_messages FOR INSERT TO authenticated WITH CHECK (true);

-- 4. FIX CALL POLICIES (Allow calls to be created/updated)
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'emergency_calls' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON emergency_calls', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "select_all_emergency_calls" ON emergency_calls FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_emergency_calls" ON emergency_calls FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_emergency_calls" ON emergency_calls FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_emergency_calls" ON emergency_calls FOR DELETE TO authenticated USING (true);

-- 5. VERIFY
SELECT 'System Cleaned & Policies Fixed. Please Refresh App.' as status;
