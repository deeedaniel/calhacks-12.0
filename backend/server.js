const express = require("express");
require("dotenv").config();
const cors = require("cors");
const GeminiClient = require("./lib/gemini-client");
const NotionTools = require("./lib/notion-tools");
const GithubTools = require("./lib/github-tools");
const db = require("./lib/database");
const TeamTools = require("./lib/team-tools");
const SlackTools = require("./lib/slack-tools");
const axios = require("axios");
const FormData = require("form-data");

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize AI and tools
let geminiClient;
let notionTools;
let githubTools;
let slackTools;
let teamTools;

try {
  // Initialize Gemini client
  if (!process.env.GEMINI_API_KEY) {
    console.warn("Warning: GEMINI_API_KEY not found in environment variables");
  } else {
    geminiClient = new GeminiClient(process.env.GEMINI_API_KEY);
    console.log("✅ Gemini client initialized");
  }

  // Initialize Notion tools
  if (!process.env.NOTION_API_KEY) {
    console.warn("Warning: NOTION_API_KEY not found in environment variables");
  } else {
    notionTools = new NotionTools(
      process.env.NOTION_API_KEY,
      process.env.NOTION_VERSION
    );
    console.log("✅ Notion tools initialized");
  }

  // Initialize GitHub tools
  if (!process.env.GITHUB_ACCESS_TOKEN) {
    console.warn(
      "Warning: GITHUB_ACCESS_TOKEN not found in environment variables"
    );
  } else {
    githubTools = new GithubTools(process.env.GITHUB_ACCESS_TOKEN);
    console.log("✅ GitHub tools initialized (repo: deeedaniel/calhacks-12.0)");
  }

  // Initialize Slack tools
  if (!process.env.SLACK_USER_TOKEN) {
    console.warn(
      "Warning: SLACK_USER_TOKEN not found in environment variables"
    );
  } else {
    slackTools = new SlackTools(process.env.SLACK_USER_TOKEN);
    console.log("✅ Slack tools initialized");
  }

  // Initialize Team tools (Supabase-backed)
  teamTools = new TeamTools();
  console.log("✅ Team tools initialized (Supabase users)");
} catch (error) {
  console.error("❌ Error initializing services:", error.message);
}

// CORS middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== USER ENDPOINTS ==========

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await db.getAllUsers();

    return res.json({
      success: true,
      message: "Users retrieved successfully",
      timestamp: new Date().toISOString(),
      data: users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// Get specific user by ID
app.get("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await db.getUserById(userId);

    return res.json({
      success: true,
      message: "User retrieved successfully",
      timestamp: new Date().toISOString(),
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(404).json({
      success: false,
      message: "User not found",
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// Get user by email
app.get("/api/users/email/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await db.getUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    return res.json({
      success: true,
      message: "User retrieved successfully",
      timestamp: new Date().toISOString(),
      data: user,
    });
  } catch (error) {
    console.error("Get user by email error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// Get user statistics
app.get("/api/users/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await db.getUserStats(userId);

    return res.json({
      success: true,
      message: "User statistics retrieved successfully",
      timestamp: new Date().toISOString(),
      data: stats,
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// ========== CONVERSATION ENDPOINTS ==========

// Get all conversations for a user
app.get("/api/users/:userId/conversations", async (req, res) => {
  try {
    const { userId } = req.params;
    const conversations = await db.getUserConversations(userId);

    return res.json({
      success: true,
      message: "Conversations retrieved successfully",
      timestamp: new Date().toISOString(),
      data: conversations,
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// Get all conversations (no auth; returns everything)
app.get("/api/conversations", async (req, res) => {
  try {
    const conversations = await db.getAllConversations();

    return res.json({
      success: true,
      message: "All conversations retrieved successfully",
      timestamp: new Date().toISOString(),
      data: conversations,
    });
  } catch (error) {
    console.error("Get all conversations error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// Get specific conversation with all messages
app.get("/api/conversations/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await db.getConversation(conversationId);

    return res.json({
      success: true,
      message: "Conversation retrieved successfully",
      timestamp: new Date().toISOString(),
      data: conversation,
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return res.status(404).json({
      success: false,
      message: "Conversation not found",
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// Create a new conversation
app.post("/api/conversations", async (req, res) => {
  try {
    const { userId, title } = req.body;

    // if (!userId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "userId is required",
    //     timestamp: new Date().toISOString(),
    //     data: null,
    //   });
    // }

    const conversation = await db.createConversation(userId || null, title);

    return res.json({
      success: true,
      message: "Conversation created successfully",
      timestamp: new Date().toISOString(),
      data: conversation,
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// Update conversation (e.g., change title)
app.put("/api/conversations/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;

    const conversation = await db.updateConversation(conversationId, { title });

    return res.json({
      success: true,
      message: "Conversation updated successfully",
      timestamp: new Date().toISOString(),
      data: conversation,
    });
  } catch (error) {
    console.error("Update conversation error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// Delete conversation
app.delete("/api/conversations/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    await db.deleteConversation(conversationId);

    return res.json({
      success: true,
      message: "Conversation deleted successfully",
      timestamp: new Date().toISOString(),
      data: null,
    });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// Routes
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running!",
    timestamp: new Date().toISOString(),
    data: null,
  });
});

app.get("/api/hello", (req, res) => {
  res.json({
    success: true,
    message: "Hello from the backend!",
    timestamp: new Date().toISOString(),
    data: {
      greeting: "Welcome to the API",
      version: "1.0.0",
    },
  });
});

// Send Slack message as user (requires SLACK_USER_TOKEN)
app.post("/api/slack/user-message", async (req, res) => {
  try {
    const slackUserToken = process.env.SLACK_USER_TOKEN;
    if (!slackUserToken) {
      return res.status(503).json({
        success: false,
        message: "Slack user token not configured. Set SLACK_USER_TOKEN.",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    const { channel, text } = req.body || {};
    if (!channel || !text) {
      return res.status(400).json({
        success: false,
        message: "channel and text are required",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    const result = await axios.post(
      "https://slack.com/api/chat.postMessage",
      { channel, text },
      { headers: { Authorization: `Bearer ${slackUserToken}` } }
    );

    return res.json({
      success: !!result.data?.ok,
      message: result.data?.ok
        ? "Message posted"
        : result.data?.error || "slack_error",
      timestamp: new Date().toISOString(),
      data: result.data,
    });
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message;
    return res.status(500).json({
      success: false,
      message: `Slack post error: ${errorMsg}`,
      timestamp: new Date().toISOString(),
      data: err.response?.data || null,
    });
  }
});

// Lookup Slack user by email (requires SLACK_USER_TOKEN)
app.get("/api/slack/user-by-email", async (req, res) => {
  try {
    const slackUserToken = process.env.SLACK_USER_TOKEN;
    if (!slackUserToken) {
      return res.status(503).json({
        success: false,
        message: "Slack user token not configured. Set SLACK_USER_TOKEN.",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    const email = req.query.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "email is required as a query param",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    const result = await axios.get(
      "https://slack.com/api/users.lookupByEmail",
      {
        params: { email },
        headers: { Authorization: `Bearer ${slackUserToken}` },
      }
    );

    return res.status(result.data?.ok ? 200 : 400).json({
      success: !!result.data?.ok,
      message: result.data?.ok
        ? "User found"
        : result.data?.error || "slack_error",
      timestamp: new Date().toISOString(),
      data: result.data,
    });
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message;
    return res.status(500).json({
      success: false,
      message: `Slack lookup error: ${errorMsg}`,
      timestamp: new Date().toISOString(),
      data: err.response?.data || null,
    });
  }
});

// Send a DM to a Slack user by userId or email (requires SLACK_USER_TOKEN)
app.post("/api/slack/dm-user", async (req, res) => {
  try {
    const slackUserToken = process.env.SLACK_USER_TOKEN;
    if (!slackUserToken) {
      return res.status(503).json({
        success: false,
        message: "Slack user token not configured. Set SLACK_USER_TOKEN.",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    let { userId, email, text } = req.body || {};
    if (!text || (!userId && !email)) {
      return res.status(400).json({
        success: false,
        message: "text and (userId or email) are required",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    // If email provided, resolve to userId
    if (!userId && email) {
      const lookup = await axios.get(
        "https://slack.com/api/users.lookupByEmail",
        {
          params: { email },
          headers: { Authorization: `Bearer ${slackUserToken}` },
        }
      );
      if (!lookup.data?.ok) {
        return res.status(404).json({
          success: false,
          message: lookup.data?.error || "user_not_found",
          timestamp: new Date().toISOString(),
          data: lookup.data,
        });
      }
      userId = lookup.data?.user?.id;
    }

    // First try posting directly to the user ID (works for user tokens in many workspaces)
    let postResp = await axios.post(
      "https://slack.com/api/chat.postMessage",
      { channel: userId, text },
      {
        headers: {
          Authorization: `Bearer ${slackUserToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );

    // If Slack rejects with channel_not_found, try opening a DM first
    if (
      !postResp.data?.ok &&
      ["channel_not_found", "not_in_channel"].includes(postResp.data?.error)
    ) {
      const openResp = await axios.post(
        "https://slack.com/api/conversations.open",
        { users: userId },
        { headers: { Authorization: `Bearer ${slackUserToken}` } }
      );
      if (!openResp.data?.ok) {
        return res.status(400).json({
          success: false,
          message: openResp.data?.error || "failed_to_open_dm",
          timestamp: new Date().toISOString(),
          data: openResp.data,
        });
      }
      const dmChannelId = openResp.data?.channel?.id;
      postResp = await axios.post(
        "https://slack.com/api/chat.postMessage",
        { channel: dmChannelId, text },
        { headers: { Authorization: `Bearer ${slackUserToken}` } }
      );
    }

    return res.status(postResp.data?.ok ? 200 : 400).json({
      success: !!postResp.data?.ok,
      message: postResp.data?.ok
        ? "DM sent"
        : postResp.data?.error || "slack_error",
      timestamp: new Date().toISOString(),
      data: postResp.data,
    });
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message;
    return res.status(500).json({
      success: false,
      message: `Slack DM error: ${errorMsg}`,
      timestamp: new Date().toISOString(),
      data: err.response?.data || null,
    });
  }
});

// Upload a file to Slack by URL (requires SLACK_USER_TOKEN)
app.post("/api/slack/file-upload", async (req, res) => {
  try {
    const slackUserToken = process.env.SLACK_USER_TOKEN;
    if (!slackUserToken) {
      return res.status(503).json({
        success: false,
        message: "Slack user token not configured. Set SLACK_USER_TOKEN.",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    const { fileUrl, channels, threadTs, filename, title, initialComment } =
      req.body || {};
    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: "fileUrl is required",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    // Fetch the file as a stream
    const fileResp = await axios.get(fileUrl, { responseType: "stream" });
    const derivedName =
      filename || new URL(fileUrl).pathname.split("/").pop() || "upload";

    const form = new FormData();
    form.append("file", fileResp.data, { filename: derivedName });

    // Slack expects comma-separated channel IDs when multiple
    if (channels && Array.isArray(channels) && channels.length > 0) {
      form.append("channels", channels.join(","));
    } else if (typeof channels === "string" && channels.trim()) {
      form.append("channels", channels.trim());
    }

    if (threadTs) form.append("thread_ts", threadTs);
    if (title) form.append("title", title);
    if (initialComment) form.append("initial_comment", initialComment);

    const headers = {
      ...form.getHeaders(),
      Authorization: `Bearer ${slackUserToken}`,
    };

    const uploadResp = await axios.post(
      "https://slack.com/api/files.upload",
      form,
      { headers }
    );

    return res.status(uploadResp.data?.ok ? 200 : 400).json({
      success: !!uploadResp.data?.ok,
      message: uploadResp.data?.ok
        ? "File uploaded"
        : uploadResp.data?.error || "slack_error",
      timestamp: new Date().toISOString(),
      data: uploadResp.data,
    });
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message;
    return res.status(500).json({
      success: false,
      message: `Slack file upload error: ${errorMsg}`,
      timestamp: new Date().toISOString(),
      data: err.response?.data || null,
    });
  }
});

// Helper function to determine if a message requires tool usage
function requiresTools(message, lastAssistantText = "") {
  const lowerMessage = String(message || "")
    .toLowerCase()
    .trim();
  const lowerAssistant = String(lastAssistantText || "").toLowerCase();

  // Keywords that indicate tool usage is needed
  const actionKeywords = [
    "create",
    "add",
    "make",
    "build",
    "setup",
    "configure",
    "send",
    "post",
    "upload",
    "share",
    "message",
    "notion",
    "slack",
    "github",
    "task",
    "issue",
    "project",
    "split",
    "organize",
    "manage",
    "update",
    "delete",
    "get",
    "fetch",
    "retrieve",
    "find",
    "search",
    "list",
    "commit",
    "push",
    "pull",
    "merge",
    "review",
  ];

  // Check if message contains action keywords
  const hasActionKeywords = actionKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );

  // Check for question patterns that might need tools
  const hasToolQuestions =
    /\b(what|how|when|where|which|who)\b.*\b(notion|slack|github|project|task|issue|commit)\b/.test(
      lowerMessage
    );

  // Simple greetings and casual conversation
  const casualPatterns = [
    /^(hi|hello|hey|sup|yo)$/,
    /^(how are you|what's up|how's it going)$/,
    /^(thanks|thank you|thx)$/,
    /^(bye|goodbye|see you|later)$/,
    /^(ok|okay|cool|nice|great|awesome)$/,
    /^(yes|yep|yeah|sure|alright|please do|go ahead|sounds good)$/,
  ];

  const isCasual = casualPatterns.some((pattern) => pattern.test(lowerMessage));

  // Special case: short approvals after assistant prompts to take action (e.g., Slack DM)
  const assistantWasPromptingAction =
    /should i (send|dm|notify)|\bslack\b|dm slack|message on slack/.test(
      lowerAssistant
    );

  if (isCasual && assistantWasPromptingAction) {
    return true; // treat as approval to proceed with tools
  }

  if (isCasual) {
    return false;
  }

  return hasActionKeywords || hasToolQuestions;
}

// (duplicate requiresTools removed)

// Chat endpoint with database persistence and MCP tool calling
app.post("/api/chat", async (req, res) => {
  try {
    const { message, userId, conversationId } = req.body;

    // Validate required fields
    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    // if (!userId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "userId is required",
    //     timestamp: new Date().toISOString(),
    //     data: null,
    //   });
    // }

    if (!geminiClient) {
      return res.status(503).json({
        success: false,
        message:
          "Gemini AI service not available. Please check GEMINI_API_KEY configuration.",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    // Get or create conversation (no ownership checks; userId optional)
    let conversation;
    if (conversationId) {
      conversation = await db.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
          timestamp: new Date().toISOString(),
          data: null,
        });
      }
    } else {
      conversation = await db.createConversation(userId || null, "New Chat");
      console.log(`📝 Created new conversation: ${conversation.id}`);
    }

    // Save user message to database
    await db.createMessage(conversation.id, userId || null, "user", message);
    console.log(`💬 User message saved to conversation ${conversation.id}`);

    // Get conversation history (prefer client-provided copy when available)
    const dbHistory = await db.getConversationHistory(conversation.id);
    const conversationHistory =
      Array.isArray(req.body?.conversationHistory) &&
      req.body.conversationHistory.length
        ? req.body.conversationHistory
        : dbHistory;

    // Check if the message requires tool usage (context-aware approvals)
    const lastAssistantText =
      [...(conversationHistory || [])]
        .reverse()
        .find((m) => m.role === "model")
        ?.parts?.map((p) => p.text)
        .join(" ") || "";
    const needsTools = requiresTools(message, lastAssistantText);

    let loopResult;

    if (needsTools) {
      // Get available tools
      const tools = [
        ...(notionTools ? notionTools.getFunctionDeclarations() : []),
        ...(githubTools ? githubTools.getFunctionDeclarations() : []),
        ...(slackTools ? slackTools.getFunctionDeclarations() : []),
        ...(teamTools ? teamTools.getFunctionDeclarations() : []),
      ];

      const availableFunctions = {
        ...(notionTools ? notionTools.getAvailableFunctions() : {}),
        ...(githubTools ? githubTools.getAvailableFunctions() : {}),
        ...(slackTools ? slackTools.getAvailableFunctions() : {}),
        ...(teamTools ? teamTools.getAvailableFunctions() : {}),
      };

      // Use iterative tool loop so the model can chain calls (e.g., getProjectContext -> addNotionTask*)
      loopResult = await geminiClient.runToolLoop(
        message,
        tools,
        availableFunctions,
        conversationHistory
      );
    } else {
      // For casual conversation, use simple generation without tools
      loopResult = await geminiClient.generateSimpleResponse(
        message,
        conversationHistory
      );
    }

    // Light logs for debugging
    if (loopResult.functionCalls?.length) {
      console.log(
        "🔧 Function calls executed:",
        loopResult.functionCalls.map((fc) => fc.name)
      );
    }

    // Save AI response to database
    await db.createMessage(
      conversation.id,
      userId || null,
      "assistant",
      loopResult.content,
      loopResult.functionCalls || null,
      loopResult.functionResults || null
    );
    console.log(`🤖 AI response saved to conversation ${conversation.id}`);

    return res.json({
      success: true,
      message: "Chat response generated successfully",
      timestamp: new Date().toISOString(),
      data: {
        conversationId: conversation.id,
        response: loopResult.content,
        functionCalls: loopResult.functionCalls || [],
        functionResults: loopResult.functionResults || [],
        usage: loopResult.usage,
      },
    });
  } catch (error) {
    console.error("Chat endpoint error:", error);
    return res.status(500).json({
      success: false,
      message: `Chat error: ${error.message}`,
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// Notion API test endpoint
app.get("/api/notion/test", async (req, res) => {
  try {
    if (!notionTools) {
      return res.status(503).json({
        success: false,
        message:
          "Notion service not available. Please check NOTION_API_KEY configuration.",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    const testResult = await notionTools.testConnection();

    return res.json({
      success: testResult.success,
      message: testResult.message,
      timestamp: new Date().toISOString(),
      data: testResult.data || testResult.error,
    });
  } catch (error) {
    console.error("Notion test error:", error);
    return res.status(500).json({
      success: false,
      message: `Notion test error: ${error.message}`,
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// Get available tools endpoint
app.get("/api/tools", (req, res) => {
  try {
    const tools = [
      ...(notionTools ? notionTools.getFunctionDeclarations() : []),
      ...(githubTools ? githubTools.getFunctionDeclarations() : []),
      ...(slackTools ? slackTools.getFunctionDeclarations() : []),
      ...(teamTools ? teamTools.getFunctionDeclarations() : []),
    ];

    return res.json({
      success: true,
      message: "Available tools retrieved successfully",
      timestamp: new Date().toISOString(),
      data: {
        tools: tools,
        count: tools.length,
        services: {
          gemini: !!geminiClient,
          notion: !!notionTools,
          github: !!githubTools,
          slack: !!slackTools,
          team: !!teamTools,
        },
      },
    });
  } catch (error) {
    console.error("Tools endpoint error:", error);
    return res.status(500).json({
      success: false,
      message: `Tools error: ${error.message}`,
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
});

// 404 handler - must come before error handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    timestamp: new Date().toISOString(),
    data: null,
  });
});

// Error handling middleware - must be last
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    timestamp: new Date().toISOString(),
    data: null,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
