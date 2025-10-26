const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ========== USER OPERATIONS ==========

// Get all users
async function getAllUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

// Get user by ID
async function getUserById(id) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// Get user by email
async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error && error.code !== "PGRST116") throw error; // Ignore "not found" error
  return data;
}

// Get user by GitHub username
async function getUserByGithub(githubUsername) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("github_username", githubUsername)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// Create a new user
async function createUser({ name, email, github_username, github_url }) {
  const { data, error } = await supabase
    .from("users")
    .insert({ name, email, github_username, github_url })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update user
async function updateUser(id, updates) {
  const { data, error } = await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ========== CONVERSATION OPERATIONS ==========

// Create a new conversation
async function createConversation(userId, title = null) {
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId || null,
      title: title || "New Chat",
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get conversation by ID with all messages
async function getConversation(conversationId) {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      *,
      user:users(*),
      messages(*)
    `
    )
    .eq("id", conversationId)
    .single();

  if (error) throw error;

  // Sort messages by created_at
  if (data && data.messages) {
    data.messages.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  }

  return data;
}

// Get all conversations for a user
async function getUserConversations(userId, limit = 50) {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      *,
      messages(id, content, role, created_at)
    `
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Get the first message for each conversation as preview
  return data.map((conv) => ({
    ...conv,
    lastMessage:
      conv.messages && conv.messages.length > 0
        ? conv.messages[conv.messages.length - 1]
        : null,
    messageCount: conv.messages ? conv.messages.length : 0,
  }));
}

// Get all conversations (no user filter)
async function getAllConversations(limit = 50) {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      *,
      messages(id, content, role, created_at)
    `
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data.map((conv) => ({
    ...conv,
    lastMessage:
      conv.messages && conv.messages.length > 0
        ? conv.messages[conv.messages.length - 1]
        : null,
    messageCount: conv.messages ? conv.messages.length : 0,
  }));
}

// Update conversation (mainly for updating title or updated_at)
async function updateConversation(conversationId, updates) {
  const { data, error } = await supabase
    .from("conversations")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete conversation (messages will be deleted automatically via CASCADE)
async function deleteConversation(conversationId) {
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  if (error) throw error;
  return { success: true };
}

// ========== MESSAGE OPERATIONS ==========

// Create a new message
async function createMessage(
  conversationId,
  userId,
  role,
  content,
  functionCalls = null,
  functionResults = null
) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      user_id: userId || null,
      role,
      content,
      function_calls: functionCalls,
      function_results: functionResults,
    })
    .select()
    .single();

  if (error) throw error;

  // Update conversation's updated_at timestamp
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data;
}

// Get all messages for a conversation
async function getConversationMessages(conversationId, limit = 100) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Get conversation history in Gemini format
async function getConversationHistory(conversationId) {
  const messages = await getConversationMessages(conversationId);

  // Convert to Gemini format
  return messages.map((msg) => {
    const parts = [{ text: msg.content }];

    // Surface tool results (e.g., real links) as hidden context for the model
    // without changing what the user sees in the UI. This helps follow-ups reuse
    // created GitHub/Notion links when sending Slack messages.
    if (
      msg.role === "assistant" &&
      Array.isArray(msg.function_results) &&
      msg.function_results.length > 0
    ) {
      try {
        const lines = [];
        for (const r of msg.function_results) {
          if (!r || r.success === false) continue;
          const name = String(r.name || "function");
          const data = r.result && r.result.data ? r.result.data : r.result;

          // Try to extract common URLs/identifiers
          let ghUrl = data?.html_url || data?.url || null;
          let ghNum = data?.number || data?.key || null;

          // Notion page objects often have a top-level url
          if (!ghUrl && typeof data === "object" && data && data.url) {
            ghUrl = data.url;
          }

          // Build compact summaries for the model
          if (
            name.includes("createGithubIssue") ||
            name.includes("pullRequest")
          ) {
            const label = ghNum ? `#${ghNum}` : "GitHub";
            if (ghUrl) lines.push(`Created GitHub item ${label}: ${ghUrl}`);
          } else if (
            name.includes("addNotionTask") ||
            name.includes("notion")
          ) {
            if (ghUrl) lines.push(`Created Notion task: ${ghUrl}`);
          } else if (ghUrl) {
            lines.push(`${name} result: ${ghUrl}`);
          }
        }

        if (lines.length > 0) {
          parts.push({
            text: [
              "Context: Tool results to reuse in follow-ups:",
              ...lines.map((l) => `- ${l}`),
            ].join("\n"),
          });
        }
      } catch (_err) {
        // Be resilient; if summarization fails, just omit tool context
      }
    }

    return {
      role: msg.role === "assistant" ? "model" : msg.role,
      parts,
    };
  });
}

// Delete a specific message
async function deleteMessage(messageId) {
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId);

  if (error) throw error;
  return { success: true };
}

// ========== STATISTICS ==========

// Get user statistics
async function getUserStats(userId) {
  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId);

  if (convError) throw convError;

  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("id")
    .eq("user_id", userId);

  if (msgError) throw msgError;

  return {
    totalConversations: conversations.length,
    totalMessages: messages.length,
  };
}

module.exports = {
  supabase,

  // User operations
  getAllUsers,
  getUserById,
  getUserByEmail,
  getUserByGithub,
  createUser,
  updateUser,

  // Conversation operations
  createConversation,
  getConversation,
  getUserConversations,
  getAllConversations,
  updateConversation,
  deleteConversation,

  // Message operations
  createMessage,
  getConversationMessages,
  getConversationHistory,
  deleteMessage,

  // Statistics
  getUserStats,
};
