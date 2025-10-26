const express = require("express");
require("dotenv").config();
const cors = require("cors");
const GeminiClient = require("./lib/gemini-client");
const NotionTools = require("./lib/notion-tools");
const GithubTools = require("./lib/github-tools");
const JiraTools = require("./lib/jira-tools");
const db = require("./lib/database");
const TeamTools = require("./lib/team-tools");
const SlackTools = require("./lib/slack-tools");
const axios = require("axios");
const FormData = require("form-data");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize AI and tools
let geminiClient;
let notionTools;
let githubTools;
let slackTools;
let teamTools;
let jiraTools;
// Helper: fetch all issues for a project (paginated)
// async function readAllIssues({
//   projectKey = process.env.JIRA_PROJECT_KEY || "KAN",
//   limit = 300,
//   startAt = 0,
// } = {}) {
//   const baseUrl = (process.env.JIRA_BASE_URL || "").replace(/\/$/, "");
//   const url = `${baseUrl}/rest/api/3/search/jql`;
//   console.log("FINALURL", url);
//   const email = process.env.JIRA_EMAIL;
//   const apiToken = process.env.JIRA_API_TOKEN;

//   const pageSize = 100; // Jira max
//   const issues = [];
//   let cursor = startAt;
//   let total = 0;

//   do {
//     const maxResults = Math.min(pageSize, limit - issues.length);
//     if (maxResults <= 0) break;

//     const resp = await axios.post(
//       url,
//       {
//         jql: `project = "${projectKey}" ORDER BY updated DESC`,
//         startAt: cursor,
//         maxResults,
//         fields: ["key", "summary", "status", "description", "updated"],
//       },
//       {
//         auth: { username: email, password: apiToken },
//         headers: {
//           Accept: "application/json",
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const fetched = Array.isArray(resp.data?.issues) ? resp.data.issues : [];
//     total = Number.isFinite(resp.data?.total)
//       ? resp.data.total
//       : fetched.length;
//     issues.push(...fetched);
//     cursor += fetched.length;
//   } while (
//     issues.length < Math.min(limit, total) &&
//     issues.length % pageSize === 0
//   );

//   return issues;
// }

async function fetchJiraIssues({
  projectKey = "KAN",
  maxResults = 50,
  fields = ["key", "summary", "status"],
}) {
  const jql = `project = ${projectKey}`;
  const fieldsParam = fields.join(",");

  const url = `https://fusioncalhacks.atlassian.net/rest/api/3/search/jql`;

  try {
    const response = await axios.get(url, {
      params: {
        jql: jql,
        maxResults: maxResults,
        fields: fieldsParam,
      },
      auth: {
        username: process.env.JIRA_EMAIL,
        password: process.env.JIRA_API_TOKEN,
      },
      headers: {
        Accept: "application/json",
      },
    });

    return response.data.issues;
  } catch (error) {
    const errorMsg = error.response?.data?.errorMessages || error.message;
    throw new Error(`Failed to fetch Jira issues: ${errorMsg}`);
  }
}

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

  // Initialize Jira tools
  if (
    !process.env.JIRA_BASE_URL ||
    !process.env.JIRA_EMAIL ||
    !process.env.JIRA_API_TOKEN
  ) {
    console.warn(
      "Warning: JIRA_BASE_URL, JIRA_EMAIL, or JIRA_API_TOKEN not found in environment variables"
    );
  } else {
    jiraTools = new JiraTools(
      process.env.JIRA_BASE_URL,
      process.env.JIRA_EMAIL,
      process.env.JIRA_API_TOKEN
    );
    console.log("✅ Jira tools initialized");
  }
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

// GET /api/jira/read-all-issues?projectKey=KAN&limit=300&startAt=0
app.post("/api/jira/read-all-issues", async (req, res) => {
  try {
    const projectKey =
      req.body.projectKey || process.env.JIRA_PROJECT_KEY || "KAN";
    const limit = Math.min(Number(req.body.limit) || 300, 300);

    // Use the new helper; Jira caps maxResults at 100 per call
    const maxResults = Math.min(limit, 100);
    const issues = await fetchJiraIssues({
      projectKey,
      maxResults,
      fields: ["key", "summary", "status", "updated"],
    });

    // compact payload for ranking
    const compact = (issues || []).map((it) => ({
      key: it.key,
      summary: it.fields?.summary || "",
      status: it.fields?.status?.name || "",
      updated: it.fields?.updated || "",
    }));

    res.json({
      success: true,
      message: "Issues fetched",
      timestamp: new Date().toISOString(),
      data: {
        projectKey,
        count: compact.length,
        total: compact.length,
        issues: compact,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Jira read-all-issues error: ${
        err.response?.data?.errorMessages || err.message
      }`,
      timestamp: new Date().toISOString(),
      data: err.response?.data || null,
    });
  }
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

// Update Jira issue fields (summary, description ADF, labels, plus raw fields)
app.post("/api/jira/update-issue", async (req, res) => {
  try {
    const baseUrl = process.env.JIRA_BASE_URL;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    if (!baseUrl || !email || !apiToken) {
      return res.status(503).json({
        success: false,
        message:
          "Jira not configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN.",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    const { issueKey, summary, description, labels, fields } = req.body || {};
    if (!issueKey) {
      return res.status(400).json({
        success: false,
        message: "issueKey is required",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    // Build fields payload
    const fieldsPayload = { ...(fields || {}) };

    if (typeof summary === "string") {
      fieldsPayload.summary = summary;
    }

    // Accept plain text or ADF for description
    if (description !== undefined) {
      if (
        description &&
        typeof description === "object" &&
        description.type === "doc"
      ) {
        fieldsPayload.description = description;
      } else if (typeof description === "string") {
        fieldsPayload.description = {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: description
                ? [
                    {
                      type: "text",
                      text: description,
                    },
                  ]
                : [],
            },
          ],
        };
      } else if (description === null) {
        // Clear description
        fieldsPayload.description = null;
      }
    }

    if (Array.isArray(labels)) {
      fieldsPayload.labels = labels;
    }

    const url = `${baseUrl.replace(
      /\/$/,
      ""
    )}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;
    await axios.put(
      url,
      { fields: fieldsPayload },
      {
        auth: { username: email, password: apiToken },
        headers: { "Content-Type": "application/json" },
      }
    );

    return res.json({
      success: true,
      message: `Issue ${issueKey} updated`,
      timestamp: new Date().toISOString(),
      data: { issueKey, updated: Object.keys(fieldsPayload) },
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const errorMsg = err.response?.data || err.message;
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      message: `Jira update issue error: ${
        typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg)
      }`,
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

app.post("/api/jira/create-task", async (req, res) => {
  const { summary, description } = req.body;
  const response = await axios.post(
    "https://your-domain.atlassian.net/rest/api/3/issue",
    {
      fields: {
        project: { key: "PROJ" },
        summary,
        description,
        issuetype: { name: "Task" },
      },
    },
    {
      headers: {
        Authorization: `Basic ${process.env.JIRA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  res.json(response.data);
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

app.post("/api/jira/transition-issue", async (req, res) => {
  try {
    const baseUrl = process.env.JIRA_BASE_URL;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    if (!baseUrl || !email || !apiToken) {
      return res.status(503).json({
        success: false,
        message:
          "Jira not configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN.",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    const { issueKey, targetStatus } = req.body || {};

    if (!issueKey || !targetStatus) {
      return res.status(400).json({
        success: false,
        message: "Both issueKey and targetStatus fields are required.",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    // Step 1: Get all available transitions for the issue
    const transitionsResponse = await axios.get(
      `${baseUrl.replace(/\/$/, "")}/rest/api/3/issue/${issueKey}/transitions`,
      {
        auth: { username: email, password: apiToken },
        headers: { Accept: "application/json" },
      }
    );

    const transitions = transitionsResponse.data.transitions;

    // Step 2: Find the transition ID matching the target status name (case-insensitive)
    const transition = transitions.find(
      (t) => t.to && t.to.name.toLowerCase() === targetStatus.toLowerCase()
    );

    if (!transition) {
      return res.status(400).json({
        success: false,
        message: `No transition found to target status '${targetStatus}'. Available: ${transitions
          .map((t) => t.to.name)
          .join(", ")}`,
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    // Step 3: Trigger the transition to update the issue status
    await axios.post(
      `${baseUrl.replace(/\/$/, "")}/rest/api/3/issue/${issueKey}/transitions`,
      { transition: { id: transition.id } },
      {
        auth: { username: email, password: apiToken },
        headers: { "Content-Type": "application/json" },
      }
    );

    return res.status(200).json({
      success: true,
      message: `Transitioned issue ${issueKey} to status '${targetStatus}'`,
      timestamp: new Date().toISOString(),
      data: null,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const errorMsg =
      err.response?.data?.errors || err.response?.data || err.message;

    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      message: `Jira transition issue error: ${
        typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg)
      }`,
      timestamp: new Date().toISOString(),
      data: err.response?.data || null,
    });
  }
});

// Create a Jira issue (requires JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)
app.post("/api/jira/issue", async (req, res) => {
  try {
    const baseUrl = process.env.JIRA_BASE_URL;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    if (!baseUrl || !email || !apiToken) {
      return res.status(503).json({
        success: false,
        message:
          "Jira not configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN.",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    const {
      projectKey = process.env.JIRA_PROJECT_KEY || "KAN",
      summary,
      description,
      issueType = "Task",
      labels = [],
    } = req.body || {};

    if (!summary) {
      return res.status(400).json({
        success: false,
        message: "summary is required",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    // Allow plain text or ADF object in description
    let adfDescription = description;
    if (!adfDescription || typeof adfDescription === "string") {
      const textValue =
        typeof adfDescription === "string" ? adfDescription : "";
      adfDescription = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: textValue
              ? [
                  {
                    type: "text",
                    text: textValue,
                  },
                ]
              : [],
          },
        ],
      };
    }

    const url = `${baseUrl.replace(/\/$/, "")}/rest/api/3/issue`;
    const payload = {
      fields: {
        project: { key: projectKey },
        summary,
        issuetype: { name: issueType },
        description: adfDescription,
        ...(Array.isArray(labels) && labels.length > 0 ? { labels } : {}),
      },
    };

    const result = await axios.post(url, payload, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      auth: { username: email, password: apiToken },
    });

    return res.status(201).json({
      success: true,
      message: `Jira issue created: ${result.data?.key || "OK"}`,
      timestamp: new Date().toISOString(),
      data: result.data,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const errorMsg =
      err.response?.data?.errors || err.response?.data || err.message;
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      message: `Jira create issue error: ${
        typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg)
      }`,
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

    // Get conversation history from the database (source of truth). This includes
    // summarized tool results so the model can reuse real links in follow-ups.
    const conversationHistory = await db.getConversationHistory(
      conversation.id
    );

    // Check if the message requires tool usage (context-aware approvals)
    const reversedHistory = [...(conversationHistory || [])].reverse();
    const lastAssistantEntry =
      reversedHistory.find((m) => m.role === "model") ||
      reversedHistory.find((m) => m.role === "assistant");
    const lastAssistantText =
      (lastAssistantEntry &&
        (lastAssistantEntry.content ||
          (Array.isArray(lastAssistantEntry.parts)
            ? lastAssistantEntry.parts.map((p) => p.text).join(" ")
            : ""))) ||
      "";
    const needsTools = requiresTools(message, lastAssistantText);

    let loopResult;

    if (needsTools) {
      // Get available tools, but DO NOT expose Notion task creation
      const notionDecls = notionTools
        ? notionTools
            .getFunctionDeclarations()
            .filter((t) => t.name !== "addNotionTask")
        : [];
      const tools = [
        ...notionDecls,
        ...(githubTools ? githubTools.getFunctionDeclarations() : []),
        ...(jiraTools ? jiraTools.getFunctionDeclarations() : []),
        ...(slackTools ? slackTools.getFunctionDeclarations() : []),
        ...(teamTools ? teamTools.getFunctionDeclarations() : []),
      ];

      const notionFuncs = notionTools
        ? notionTools.getAvailableFunctions()
        : {};
      if (notionFuncs && notionFuncs.addNotionTask) {
        delete notionFuncs.addNotionTask;
      }

      const availableFunctions = {
        ...notionFuncs,
        ...(githubTools ? githubTools.getAvailableFunctions() : {}),
        ...(jiraTools ? jiraTools.getAvailableFunctions() : {}),
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

    // Enrich response content by inserting GitHub/Jira links before the follow-up question, without a header.
    let enrichedContent = String(loopResult.content || "");
    try {
      let ghUrl = null;
      let jiraUrl = null;
      const results = Array.isArray(loopResult.functionResults)
        ? loopResult.functionResults
        : [];
      for (const r of results) {
        if (!r || r.success === false) continue;
        const name = String(r.name || "");
        const data = r.result && r.result.data ? r.result.data : r.result;

        if (
          !ghUrl &&
          (name.includes("createGithubIssue") ||
            name.includes("createPullRequest") ||
            name.includes("github"))
        ) {
          const url = data?.html_url || data?.url || null;
          if (url) ghUrl = url;
        }

        if (
          !jiraUrl &&
          (name.includes("createJiraIssue") || name.includes("jira"))
        ) {
          const browseUrl = data?.browseUrl;
          const key = data?.key;
          const base = String(process.env.JIRA_BASE_URL || "").replace(
            /\/$/,
            ""
          );
          const url =
            browseUrl || (key && base ? `${base}/browse/${key}` : null);
          if (url) jiraUrl = url;
        }
      }

      if (ghUrl || jiraUrl) {
        const contentLower = enrichedContent.toLowerCase();
        const hasGitHubUrl = ghUrl
          ? contentLower.includes(ghUrl.toLowerCase())
          : true;
        const hasJiraUrl = jiraUrl
          ? contentLower.includes(jiraUrl.toLowerCase())
          : true;

        if (!hasGitHubUrl || !hasJiraUrl) {
          const linkLines = [];
          if (ghUrl && !hasGitHubUrl) linkLines.push(`GitHub: ${ghUrl}`);
          if (jiraUrl && !hasJiraUrl) linkLines.push(`Jira: ${jiraUrl}`);
          const linkSection = ["", ...linkLines, ""].join("\n");

          const lower = enrichedContent.toLowerCase();
          const followNeedle = "should i send";
          const idx = lower.lastIndexOf(followNeedle);
          if (idx >= 0) {
            const lineStart = enrichedContent.lastIndexOf("\n", idx);
            const insertAt = lineStart >= 0 ? lineStart : idx;
            enrichedContent =
              enrichedContent.slice(0, insertAt) +
              linkSection +
              enrichedContent.slice(insertAt);
          } else {
            enrichedContent = `${enrichedContent}${linkSection}`;
          }
        }
      }
    } catch (_err) {
      // If enrichment fails, fall back to original content
    }

    // Ensure spacing: add a blank line (two \n) before the first link and before the follow-up question
    try {
      const lowerAll = enrichedContent.toLowerCase();
      const followNeedle = "should i send";
      const followIdx = lowerAll.lastIndexOf(followNeedle);
      if (followIdx >= 0) {
        const linkCandidates = [
          enrichedContent.indexOf("GitHub Issue:"),
          enrichedContent.indexOf("GitHub:"),
          enrichedContent.indexOf("https://github.com"),
          enrichedContent.indexOf("Jira Issue:"),
          enrichedContent.indexOf("Jira:"),
          enrichedContent.indexOf("atlassian.net/browse"),
        ].filter((i) => i >= 0 && i < followIdx);

        if (linkCandidates.length > 0) {
          const firstLinkIdx = Math.min.apply(null, linkCandidates);
          const before = enrichedContent.slice(0, firstLinkIdx);
          let nlCount = 0;
          for (let i = before.length - 1; i >= 0 && before[i] === "\n"; i--) {
            nlCount += 1;
          }
          if (nlCount < 2) {
            const needed = 2 - nlCount;
            enrichedContent =
              before +
              "\n".repeat(needed) +
              enrichedContent.slice(firstLinkIdx);
          }
        }

        // Ensure two newlines immediately before the follow-up line
        const followLineStart = enrichedContent.lastIndexOf("\n", followIdx);
        const pos = followLineStart >= 0 ? followLineStart : followIdx;
        const beforeFollow = enrichedContent.slice(0, pos);
        let nlCount2 = 0;
        for (
          let i = beforeFollow.length - 1;
          i >= 0 && beforeFollow[i] === "\n";
          i--
        ) {
          nlCount2 += 1;
        }
        if (nlCount2 < 2) {
          const needed2 = 2 - nlCount2;
          enrichedContent =
            enrichedContent.slice(0, pos) +
            "\n".repeat(needed2) +
            enrichedContent.slice(pos);
        }
      }
    } catch (_err) {}

    // Save AI response to database (with enriched content)
    await db.createMessage(
      conversation.id,
      userId || null,
      "assistant",
      enrichedContent,
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
        response: enrichedContent,
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

// --- Streaming chat endpoint (SSE) ---
app.post("/api/chat/stream", async (req, res) => {
  try {
    const {
      message,
      userId,
      conversationId: incomingConversationId,
      conversationHistory: historyFromClient,
    } = req.body || {};

    if (!message) {
      res.status(400);
      return res.end();
    }

    // Prepare SSE headers early
    res.writeHead(geminiClient ? 200 : 503, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    const send = (event, data) => {
      try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (_e) {}
    };

    // Keep connection alive
    const keepAlive = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch (_e) {}
    }, 15000);

    if (!geminiClient) {
      send("error", {
        message:
          "Gemini AI service not available. Please check GEMINI_API_KEY configuration.",
      });
      clearInterval(keepAlive);
      return res.end();
    }

    // Get or create conversation
    let conversation;
    if (incomingConversationId) {
      conversation = await db.getConversation(incomingConversationId);
      if (!conversation) {
        send("error", { message: "Conversation not found" });
        clearInterval(keepAlive);
        return res.end();
      }
    } else {
      conversation = await db.createConversation(userId || null, "New Chat");
      console.log(`📝 Created new conversation: ${conversation.id}`);
    }

    // Emit conversation info ASAP
    send("conversation", { conversationId: conversation.id });

    // Persist user message
    await db.createMessage(conversation.id, userId || null, "user", message);
    console.log(`💬 User message saved to conversation ${conversation.id}`);

    // Build history
    const dbHistory = await db.getConversationHistory(conversation.id);
    const conversationHistory =
      Array.isArray(historyFromClient) && historyFromClient.length
        ? historyFromClient
        : dbHistory;

    // Determine need for tools
    const lastAssistantText =
      [...(conversationHistory || [])]
        .reverse()
        .find((m) => m.role === "model")
        ?.parts?.map((p) => p.text)
        .join(" ") || "";
    const needsTools = requiresTools(message, lastAssistantText);

    const tools = needsTools
      ? [
          ...(notionTools ? notionTools.getFunctionDeclarations() : []),
          ...(githubTools ? githubTools.getFunctionDeclarations() : []),
          ...(slackTools ? slackTools.getFunctionDeclarations() : []),
          ...(teamTools ? teamTools.getFunctionDeclarations() : []),
        ]
      : [];

    const availableFunctions = needsTools
      ? {
          ...(notionTools ? notionTools.getAvailableFunctions() : {}),
          ...(githubTools ? githubTools.getAvailableFunctions() : {}),
          ...(slackTools ? slackTools.getAvailableFunctions() : {}),
          ...(teamTools ? teamTools.getAvailableFunctions() : {}),
        }
      : {};

    // Prepare model with tools if needed
    const model = geminiClient.genAI.getGenerativeModel({
      model: geminiClient.modelName,
      tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: geminiClient.buildSystemPrompt(tools) }] },
        ...conversationHistory,
      ],
    });

    const aggregatedFunctionCalls = [];
    const aggregatedFunctionResults = [];
    let finalText = "";
    let usage = null;

    // Helper to stream a single assistant turn and capture function calls
    async function streamAssistantTurn(promptText) {
      const result = await chat.sendMessageStream(promptText);
      for await (const chunk of result.stream) {
        const delta = typeof chunk.text === "function" ? chunk.text() : "";
        if (delta) {
          finalText += delta;
          send("token", { delta });
        }
      }
      const response = await result.response;
      usage = response?.usageMetadata || usage;
      const fcs = geminiClient.extractFunctionCalls(response) || [];
      return { functionCalls: fcs };
    }

    // Initial turn
    let { functionCalls } = await streamAssistantTurn(message);

    let safetyIters = 0;
    const MAX_ITERS = 6;

    // Tool loop
    while (functionCalls && functionCalls.length > 0 && safetyIters < MAX_ITERS) {
      safetyIters += 1;
      aggregatedFunctionCalls.push(...functionCalls);

      // Emit tool_call events
      for (const fc of functionCalls) {
        send("tool_call", { name: fc.name, args: fc.args || {} });
      }

      // Execute sequentially and emit results
      const execResults = [];
      for (const call of functionCalls) {
        try {
          const fn = availableFunctions[call.name];
          if (!fn) throw new Error(`Function ${call.name} not found`);
          const result = await fn(call.args || {});
          const ok = { name: call.name, success: true, result };
          aggregatedFunctionResults.push(ok);
          execResults.push(ok);
          send("tool_result", ok);
        } catch (err) {
          const fail = {
            name: call.name,
            success: false,
            error: err?.message || String(err),
          };
          aggregatedFunctionResults.push(fail);
          execResults.push(fail);
          send("tool_result", fail);
        }
      }

      // Ask the model to continue with results
      const resultsText = execResults
        .map((r) =>
          r.success
            ? `Function ${r.name} executed successfully: ${JSON.stringify(r.result)}`
            : `Function ${r.name} failed: ${r.error}`
        )
        .join("\n\n");
      const followUp = [
        "Here are the latest tool results.",
        resultsText,
        "If more actions are needed, call additional tools now. Then provide a concise confirmation for the user.",
      ].join("\n\n");

      ({ functionCalls } = await streamAssistantTurn(followUp));
    }

    // Persist assistant message
    await db.createMessage(
      conversation.id,
      userId || null,
      "assistant",
      finalText,
      aggregatedFunctionCalls.length ? aggregatedFunctionCalls : null,
      aggregatedFunctionResults.length ? aggregatedFunctionResults : null
    );
    console.log(`🤖 AI response saved to conversation ${conversation.id}`);

    // Final event
    send("done", {
      finalText,
      conversationId: conversation.id,
      functionCalls: aggregatedFunctionCalls,
      functionResults: aggregatedFunctionResults,
      usage,
    });

    clearInterval(keepAlive);
    res.end();
  } catch (error) {
    try {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
    } catch (_e) {}
    return res.end();
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
    const notionDecls = notionTools
      ? notionTools
          .getFunctionDeclarations()
          .filter((t) => t.name !== "addNotionTask")
      : [];
    const tools = [
      ...notionDecls,
      ...(githubTools ? githubTools.getFunctionDeclarations() : []),
      ...(slackTools ? slackTools.getFunctionDeclarations() : []),
      ...(teamTools ? teamTools.getFunctionDeclarations() : []),
      ...(jiraTools ? jiraTools.getFunctionDeclarations() : []),
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
          jira: !!jiraTools,
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
