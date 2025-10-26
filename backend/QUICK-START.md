# Quick Start: Database Integration

Your chat history database is now ready! Here's what you need to do:

## 🚀 Setup (5 minutes)

### 1. Run the SQL Script in Supabase

```bash
# Open Supabase Dashboard → SQL Editor
# Copy contents from: database-setup.sql
# Click Run
```

This creates the `conversations` and `messages` tables.

### 2. Add Environment Variables

Add these to your `.env` file (get from Supabase Settings → API):

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJ...your_key
```

### 3. Test Everything Works

```bash
node test-database.js
```

Should see: `🎉 All tests passed successfully!`

### 4. Start Your Server

```bash
npm run dev
```

## 🎯 How to Use in Your Frontend

### Start a new chat:

```javascript
const response = await fetch("http://localhost:3001/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "your-user-id", // Get from /api/users
    message: "Hello!",
  }),
});

const data = await response.json();
// Save data.data.conversationId for next message!
```

### Continue the conversation:

```javascript
const response = await fetch("http://localhost:3001/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "your-user-id",
    conversationId: "saved-conversation-id", // From previous response
    message: "Tell me more!",
  }),
});
```

### Get user's conversations:

```javascript
const response = await fetch(
  `http://localhost:3001/api/users/${userId}/conversations`
);
const conversations = await response.json();
// conversations.data contains array of conversations
```

### Load specific conversation:

```javascript
const response = await fetch(
  `http://localhost:3001/api/conversations/${conversationId}`
);
const conversation = await response.json();
// conversation.data.messages contains all messages
```

## 📋 Key Endpoints

| Endpoint                       | Method | Purpose                             |
| ------------------------------ | ------ | ----------------------------------- |
| `/api/users`                   | GET    | Get all users                       |
| `/api/chat`                    | POST   | Send message, get AI response       |
| `/api/users/:id/conversations` | GET    | Get user's chats                    |
| `/api/conversations/:id`       | GET    | Get specific chat with all messages |
| `/api/conversations/:id`       | DELETE | Delete a conversation               |

## 💡 What Changed

**Before**: Chat had no memory, conversations weren't saved

**Now**:

- ✅ Every message is saved to database
- ✅ Chat history persists across sessions
- ✅ AI has full conversation context
- ✅ Users can have multiple conversations
- ✅ Can load and continue old conversations

## 🔍 Check It's Working

1. Get your user ID:

```bash
curl http://localhost:3001/api/users
```

2. Send a test message:

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID","message":"Hello!"}'
```

3. Check in Supabase:

- Go to Table Editor → conversations (should have 1 row)
- Go to Table Editor → messages (should have 2 rows)

## 📚 Full Documentation

See `DATABASE-SETUP-GUIDE.md` for complete documentation.

## ⚠️ Important Notes

- **Always send `userId`** with chat requests
- **Save `conversationId`** from first response to continue conversation
- Each conversation is **independent** - messages don't mix
- Messages are stored **individually** in database (not as JSON)
- **Test endpoint** `/api/health` to verify server is running

## 🎨 Frontend Integration Tips

1. **On app load**: Get user ID from `/api/users`
2. **New chat button**: Don't send `conversationId`
3. **Continuing chat**: Send saved `conversationId`
4. **Sidebar**: Show conversations from `/api/users/:id/conversations`
5. **Click conversation**: Load from `/api/conversations/:id`

That's it! Your database is ready for CalHacks! 🎉
