const express = require("express");
require("dotenv").config();
const cors = require("cors");
const GeminiClient = require("./lib/gemini-client");
const NotionTools = require("./lib/notion-tools");

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize AI and tools
let geminiClient;
let notionTools;

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

// Chat endpoint with MCP tool calling
app.post("/api/chat", async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    if (!geminiClient) {
      return res.status(503).json({
        success: false,
        message:
          "Gemini AI service not available. Please check GEMINI_API_KEY configuration.",
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    // Get available tools
    const tools = notionTools ? notionTools.getFunctionDeclarations() : [];
    const availableFunctions = notionTools
      ? notionTools.getAvailableFunctions()
      : {};

    // Generate initial response with tools
    const initialResponse = await geminiClient.generateWithTools(
      message,
      tools,
      conversationHistory
    );

    // If there are function calls, execute them
    if (
      initialResponse.functionCalls &&
      initialResponse.functionCalls.length > 0
    ) {
      console.log(
        "🔧 Executing function calls:",
        initialResponse.functionCalls.map((fc) => fc.name)
      );

      const functionResults = await geminiClient.executeFunctionCalls(
        initialResponse.functionCalls,
        availableFunctions
      );

      // Continue conversation with function results
      const finalResponse = await geminiClient.continueWithFunctionResults(
        message,
        functionResults,
        conversationHistory
      );

      return res.json({
        success: true,
        message: "Chat response generated successfully",
        timestamp: new Date().toISOString(),
        data: {
          response: finalResponse.content,
          functionCalls: initialResponse.functionCalls,
          functionResults: functionResults,
          usage: finalResponse.usage,
        },
      });
    } else {
      // No function calls needed, return direct response
      return res.json({
        success: true,
        message: "Chat response generated successfully",
        timestamp: new Date().toISOString(),
        data: {
          response: initialResponse.content,
          functionCalls: [],
          functionResults: [],
          usage: initialResponse.usage,
        },
      });
    }
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
    const tools = notionTools ? notionTools.getFunctionDeclarations() : [];

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
