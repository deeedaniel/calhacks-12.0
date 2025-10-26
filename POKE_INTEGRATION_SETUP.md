# Poke Integration Setup Guide

## ✅ Implementation Complete!

The Poke integration has been successfully added to your Fusion project. Users can now send chat conversations to their phone via SMS using natural language commands.

---

## 📋 Changes Made

### 1. **Backend - New Files**

- **`backend/lib/poke-tools.js`** - New tool class for Poke API integration
  - Handles sending messages to Poke API
  - Automatically fetches conversation history from database
  - Formats messages for SMS (with length limits)
  - Auto-injects conversationId from current session

### 2. **Backend - Modified Files**

- **`backend/server.js`**
  - Added `PokeTools` import
  - Initialized `pokeTools` variable and initialization block
  - Added Poke tools to both `/api/chat` and `/api/chat/stream` endpoints
  - Added Poke to `/api/tools` endpoint
  - Auto-injects conversationId when tool is called
- **`backend/env.example`**
  - Added `POKE_API_KEY` configuration variable

### 3. **Frontend - Modified Files**

- **`frontend/src/lib/tool-metadata.ts`**
  - Added `sendChatToPoke` tool metadata
  - Icon: 📱
  - Label: "Send to Phone"
  - Description updates based on parameters

---

## 🔑 Required API Key Setup

### Get Your Poke API Key

1. **Visit**: https://poke.com/settings/advanced
2. **Create an API key** for your account
3. **Copy the API key** (it will look like: `poke_xxxxxxxxxxxxx`)

### Add to Your Environment Variables

1. **Navigate to**: `/backend` directory
2. **Copy or edit your `.env` file**:
   ```bash
   # Poke API Configuration (for sending SMS notifications)
   POKE_API_KEY=your_poke_api_key_here
   ```
3. **Replace** `your_poke_api_key_here` with your actual Poke API key
4. **Restart your backend server** for changes to take effect

---

## 🚀 How to Use

### Natural Language Commands

Users can now say things like:

- **"Send this conversation to my phone"**
- **"Poke me with our chat"**
- **"Text me the last 3 messages"**
- **"Send a message to my phone saying: Remember to deploy tonight"**

### What Happens Behind the Scenes

1. User sends a message with Poke intent
2. Gemini recognizes the intent and calls `sendChatToPoke` tool
3. Tool automatically gets the `conversationId` from current session
4. Tool fetches messages from Supabase database
5. Tool formats and sends via Poke API
6. User receives SMS on their phone! 📱

### Example Flow

```
User: "Send the last 5 messages to my phone"
    ↓
AI calls: sendChatToPoke({ includeLastN: 5 })
    ↓
Tool fetches conversation from database
    ↓
Formats: "📱 Your Chat\n\nYou: ...\nAI: ...\n\n- Sent from Fusion"
    ↓
POST to Poke API
    ↓
📱 SMS delivered to user's phone
```

---

## 🔧 Technical Details

### Auto-Injection of ConversationId

The implementation uses a **wrapper function** to automatically inject the `conversationId`:

```javascript
availableFunctions: {
  sendChatToPoke: async (args) => {
    return await pokeTools.getAvailableFunctions().sendChatToPoke({
      conversationId: conversation.id,  // ← Auto-injected!
      ...args,
    });
  },
}
```

This means:

- ✅ Gemini doesn't need to know the conversationId
- ✅ User doesn't need to provide it
- ✅ Always uses the current active conversation
- ✅ Follows single-source-of-truth principle

### Message Formatting

- **Default**: Last 5 messages from conversation
- **Customizable**: Can specify `includeLastN` (max 10)
- **SMS Length Limit**: Capped at 1600 characters
- **Format**: "You: ..." vs "AI: ..." for clarity
- **Truncation**: Long messages are shortened with "..."

### Database Flow

```
conversationId → db.getConversation() → Supabase Query
    ↓
Returns conversation with all messages
    ↓
Extract last N messages
    ↓
Format for SMS
    ↓
Send to Poke API
```

---

## 🧪 Testing

### After Adding API Key:

1. **Restart backend**:

   ```bash
   cd backend
   npm start
   ```

2. **Check initialization logs** - You should see:

   ```
   ✅ Poke tools initialized
   ```

3. **Test in the frontend**:
   - Start a conversation
   - Say: "Send this to my phone"
   - Watch for the 📱 "Send to Phone" indicator
   - Check your phone for the SMS!

### Verify Tool is Available:

```bash
curl http://localhost:3001/api/tools
```

Look for `sendChatToPoke` in the response.

---

## ⚠️ Important Notes

1. **Poke Account Required**: You must have a Poke account and phone number registered
2. **API Key Scoping**: The API key sends messages to YOUR phone (the account owner)
3. **No User Auth Yet**: Since your app doesn't use userId authentication, messages always go to the Poke account owner
4. **Rate Limits**: Be aware of Poke's rate limits (check their documentation)
5. **Message Length**: SMS has character limits - long conversations are automatically truncated

---

## 🐛 Troubleshooting

### "POKE_API_KEY not found" Warning

- Check your `.env` file in the backend directory
- Make sure the key is named exactly `POKE_API_KEY`
- Restart the backend server after adding it

### No SMS Received

- Verify your Poke API key is valid
- Check backend console for error messages
- Ensure your Poke account has a phone number registered
- Check Poke API status at poke.com

### Tool Not Being Called

- Make sure you're using natural language that indicates phone/SMS intent
- Check that the tool appears in `/api/tools` endpoint
- Verify backend logs show "✅ Poke tools initialized"

---

## 📞 Support

If you encounter issues:

- Backend logs: Check console for Poke-related errors
- Poke Support: hi@interaction.co or Twitter
- API Documentation: https://poke.com/api/docs

---

## 🎉 You're All Set!

Once you add your `POKE_API_KEY` to the `.env` file and restart the backend, users can start sending conversations to their phones with simple natural language commands!

**Example to try**:

> "Hey, send the last 3 messages from this chat to my phone"

Enjoy your new Poke integration! 📱✨
