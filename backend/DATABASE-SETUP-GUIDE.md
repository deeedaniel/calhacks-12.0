# Database Setup Guide

This guide will help you set up the Supabase database for chat history persistence.

## Prerequisites

- Supabase account (free tier is fine)
- Node.js and npm installed
- Your backend `.env` file configured

## Step 1: Create Supabase Tables

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New query**
4. Copy and paste the entire contents of `database-setup.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)

You should see: ✅ Success. No rows returned

### Verify Tables

Go to **Table Editor** to verify these tables were created:

- ✅ `users` (should already exist with your team data)
- ✅ `conversations`
- ✅ `messages`

## Step 2: Configure Environment Variables

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:

   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ...` (long string)

3. Create/update your `.env` file:

```bash
# Add these to your .env file
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: Test Database Connection

Run the test script to verify everything is working:

```bash
node test-database.js
```

You should see:

```
🎉 All tests passed successfully!
```

If you see errors:

- Check that tables were created in Supabase
- Verify your `.env` has correct SUPABASE_URL and SUPABASE_ANON_KEY
- Make sure the `users` table has data

## Step 4: Start Your Server

```bash
npm run dev
```

You should see:

```
✅ Gemini client initialized
✅ Notion tools initialized
✅ GitHub tools initialized
Server is running on port 3001
```

## API Endpoints

### User Endpoints

- `GET /api/users` - Get all users
- `GET /api/users/:userId` - Get specific user
- `GET /api/users/email/:email` - Get user by email
- `GET /api/users/:userId/stats` - Get user statistics

### Conversation Endpoints

- `GET /api/users/:userId/conversations` - Get all conversations for a user
- `GET /api/conversations/:conversationId` - Get specific conversation with messages
- `POST /api/conversations` - Create new conversation
  ```json
  { "userId": "uuid", "title": "Optional Title" }
  ```
- `PUT /api/conversations/:conversationId` - Update conversation title
  ```json
  { "title": "New Title" }
  ```
- `DELETE /api/conversations/:conversationId` - Delete conversation

### Chat Endpoint

- `POST /api/chat` - Send message and get AI response
  ```json
  {
    "userId": "user-uuid-here",
    "conversationId": "optional-conversation-uuid",
    "message": "Your message here"
  }
  ```

**Response includes:**

- `conversationId` - Use this for follow-up messages
- `response` - AI's response
- `functionCalls` - Any tool calls made
- `functionResults` - Results from tool calls

## Database Schema

### users table

```sql
id              UUID PRIMARY KEY
name            TEXT
email           TEXT UNIQUE
github_username TEXT
github_url      TEXT
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### conversations table

```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users(id)
title       TEXT
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

### messages table

```sql
id                UUID PRIMARY KEY
conversation_id   UUID REFERENCES conversations(id)
user_id          UUID REFERENCES users(id)
role             TEXT ('user' or 'assistant')
content          TEXT
function_calls   JSONB (optional)
function_results JSONB (optional)
created_at       TIMESTAMP
```

## How Chat History Works

1. **First message**: User sends message without `conversationId`

   - Creates new conversation
   - Saves user message
   - Gets AI response
   - Saves AI response
   - Returns `conversationId`

2. **Follow-up messages**: User sends message with `conversationId`

   - Loads conversation history from database
   - Saves new user message
   - Sends full history to AI for context
   - Gets AI response
   - Saves AI response
   - Returns response

3. **Each message is stored separately** (not as JSON array)
   - Efficient querying
   - Easy to search and paginate
   - Industry standard approach

## Testing with curl

### Get all users

```bash
curl http://localhost:3001/api/users
```

### Start a chat (creates new conversation)

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID_HERE",
    "message": "Hello! Can you help me?"
  }'
```

Response includes `conversationId` - save it for next message!

### Continue chat (use conversationId from previous response)

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID_HERE",
    "conversationId": "CONVERSATION_ID_FROM_PREVIOUS_RESPONSE",
    "message": "Thanks! Can you tell me more?"
  }'
```

### Get conversation history

```bash
curl http://localhost:3001/api/conversations/CONVERSATION_ID
```

### Get all user's conversations

```bash
curl http://localhost:3001/api/users/USER_ID/conversations
```

## Troubleshooting

### "User not found" error

- Make sure you created users in the `users` table
- Get user IDs from: `curl http://localhost:3001/api/users`

### "Conversation not found" error

- Check that conversationId is valid
- Verify user owns the conversation

### "Supabase error" / Connection issues

- Verify SUPABASE_URL and SUPABASE_ANON_KEY in `.env`
- Check Supabase project is active (not paused)
- Verify tables exist in Supabase

### Messages not saving

- Check database-setup.sql was run successfully
- Verify foreign key constraints are set up
- Check Supabase logs in dashboard

## Next Steps

1. Update your frontend to:

   - Get user ID on app load
   - Send `userId` with every chat message
   - Store and send `conversationId` for conversation continuity
   - Display conversation history from API

2. Add features:

   - Conversation list in sidebar
   - Search conversations
   - Delete conversations
   - Share conversations

3. Production considerations:
   - Add authentication (Supabase Auth)
   - Implement rate limiting
   - Add message pagination for long conversations
   - Set up row-level security in Supabase

## Support

If you run into issues:

1. Check Supabase logs in dashboard
2. Run `node test-database.js` to diagnose
3. Verify all environment variables are set
4. Check that tables and indexes were created

Happy coding! 🚀
