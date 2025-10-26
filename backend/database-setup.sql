-- CalHacks 12.0 Database Schema
-- Run this in Supabase SQL Editor to create the conversations and messages tables

-- ========================================
-- CONVERSATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- ========================================
-- MESSAGES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  function_calls JSONB,
  function_results JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- ========================================
-- HELPFUL QUERIES (commented out)
-- ========================================

-- Get all conversations for a user with message counts:
-- SELECT 
--   c.*,
--   COUNT(m.id) as message_count
-- FROM conversations c
-- LEFT JOIN messages m ON c.id = m.conversation_id
-- WHERE c.user_id = 'YOUR_USER_ID'
-- GROUP BY c.id
-- ORDER BY c.updated_at DESC;

-- Get conversation with all messages:
-- SELECT 
--   c.*,
--   json_agg(
--     json_build_object(
--       'id', m.id,
--       'role', m.role,
--       'content', m.content,
--       'created_at', m.created_at
--     ) ORDER BY m.created_at
--   ) as messages
-- FROM conversations c
-- LEFT JOIN messages m ON c.id = m.conversation_id
-- WHERE c.id = 'YOUR_CONVERSATION_ID'
-- GROUP BY c.id;

-- Count total messages per user:
-- SELECT 
--   u.name,
--   COUNT(m.id) as total_messages
-- FROM users u
-- LEFT JOIN messages m ON u.id = m.user_id
-- GROUP BY u.id, u.name
-- ORDER BY total_messages DESC;

