# MCP Chat LLM Backend with Gemini & Notion Integration

This backend provides an AI-powered chat interface that integrates with Notion using the Model Context Protocol (MCP) and Google's Gemini AI for intelligent tool calling.

## 🚀 Features

- **Gemini AI Integration**: Powered by Google's Gemini 1.5 Pro model with function calling capabilities
- **Notion API Integration**: Read pages/databases and create tasks directly through chat
- **GitHub API Integration**: Summarize daily commits and auto-create issues tied to Notion tasks
- **MCP-Compatible Tools**: Structured tool definitions for seamless AI integration
- **RESTful API**: Clean endpoints for chat, tool management, and service testing
- **Error Handling**: Comprehensive error handling and validation
- **Environment Configuration**: Secure API key management

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your API keys:

```bash
cp env.example .env
```

Edit `.env` with your actual API keys:

```env
# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Notion API Configuration
NOTION_API_KEY=your_notion_integration_token_here
NOTION_VERSION=2022-06-28

# Notion Database/Page IDs (replace with your actual IDs)
NOTION_DATABASE_ID=297ae863-705c-80a5-8fc9-def0879f4069
NOTION_PAGE_ID=297ae863705c801f8ae7f5533673b57e

# GitHub API Configuration
GITHUB_ACCESS_TOKEN=your_github_personal_access_token

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### 3. Get Your API Keys

#### Gemini API Key:

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env` file

#### Notion Integration:

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the "Internal Integration Token" to your `.env` file
4. Share your Notion pages/databases with the integration

### 4. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## 📡 API Endpoints

### Chat Endpoint

**POST** `/api/chat`

Send messages to the AI with automatic tool calling capabilities.

```json
{
  "message": "Add a task 'Review PR #123' assigned to John Doe with high priority",
  "conversationHistory": []
}
```

Response:

```json
{
  "success": true,
  "message": "Chat response generated successfully",
  "timestamp": "2025-10-25T...",
  "data": {
    "response": "I've successfully added the task...",
    "functionCalls": [...],
    "functionResults": [...],
    "usage": {...}
  }
}
```

### Available Tools

**GET** `/api/tools`

Get list of available MCP tools and service status.

### Notion Test

**GET** `/api/notion/test`

Test Notion API connection and authentication.

### Health Check

**GET** `/api/health`

Server health status.

## 🔧 Available Tools

### 1. Get Notion Page (`getNotionPage`)

Retrieve content from Notion pages, databases, or blocks.

**Parameters:**

- `pageId` (string): Notion page or database ID
- `type` (string): "page", "database", or "blocks"

**Example Usage:**

> "Show me the content of my project database"
> "Get the blocks from page XYZ"

### 2. Add Notion Task (`addNotionTask`)

Create new tasks in Notion databases.

**Parameters:**

- `databaseId` (string): Target database ID
- `task` (string): Task title
- `assignee` (string, optional): Person assigned
- `status` (string, optional): "Not started", "In progress", "Done", "Blocked"
- `deadline` (string, optional): ISO date format
- `priority` (string, optional): "Low", "Medium", "High", "Urgent"
- `linkUrl` (string, optional): URL to store in `Link` (e.g., GitHub issue)

### 3. Get Daily Commits (`getDailyCommits`)

Summarize commits in `deeedaniel/calhacks-12.0` since a timestamp (defaults last 24h).

**Parameters:**

- `since` (string, optional): ISO 8601 timestamp

### 4. Create GitHub Issue (`createGithubIssue`)

Create an issue in `deeedaniel/calhacks-12.0` and return its URL/number.

**Parameters:**

- `title` (string): Issue title
- `body` (string, optional): Issue description
- `labels` (string[], optional): Labels

**Example Usage:**

> "Add a task 'Fix login bug' assigned to Alice with high priority due tomorrow"
> "Create a task 'Update documentation' with medium priority"

## 💬 Example Chat Interactions

### Creating Tasks

```
User: "Split up tasks for the project plan and add them"

AI: I'll create GitHub issues and corresponding Notion tasks with links.
[Executes getProjectContext -> createGithubIssue* -> addNotionTask*]
✅ Created issues and linked Notion tasks (see `Link` column for GitHub URLs).
```

### Retrieving Information

```
User: "Summarize today's commits"

AI: Let me fetch commits from the last 24 hours.
[Executes getDailyCommits]
Here are the commit messages with links.
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Express API   │    │   Gemini AI     │
│   (React/Vue)   │◄──►│   Server        │◄──►│   (Function     │
│                 │    │                 │    │    Calling)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Notion API    │
                       │   (MCP Tools)   │
                       └─────────────────┘
```

## 🔒 Security Notes

- Never commit your `.env` file to version control
- Keep your API keys secure and rotate them regularly
- The Notion integration only has access to pages/databases you explicitly share with it
- Use environment variables for all sensitive configuration

## 🚀 Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Configure your production API keys
3. Update `FRONTEND_URL` to your production frontend URL
4. Use a process manager like PM2 for production

## 📝 Development

### Adding New Tools

1. Create tool function in `lib/notion-tools.js` or create a new tools file
2. Add function declaration to `getFunctionDeclarations()`
3. Add function to `getAvailableFunctions()` map
4. The AI will automatically discover and use the new tool

### Extending Integrations

The architecture supports adding more integrations (GitHub, Slack, etc.) by:

1. Creating new tool classes similar to `NotionTools`
2. Adding their function declarations to the tools array
3. Including their functions in the available functions map

## 🐛 Troubleshooting

### Common Issues

1. **"Gemini AI service not available"**

   - Check your `GEMINI_API_KEY` in `.env`
   - Verify the API key is valid

2. **"Notion service not available"**

   - Check your `NOTION_API_KEY` in `.env`
   - Ensure the integration has access to your pages/databases

3. **Function calls not working**
   - Verify your Notion database schema matches the expected properties
   - Check the console logs for detailed error messages

### Logs

The server provides detailed logging:

- ✅ Service initialization status
- 🔧 Function call executions
- ❌ Error details with stack traces

## 📚 Resources

- [Notion API Documentation](https://developers.notion.com/)
- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
