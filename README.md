# CalHacks 12.0 - AI Project Management Assistant

Welcome to our innovative AI-powered project management tool! This application helps teams manage their workflow efficiently.

## 🚀 Features

- **Smart Chat Interface** - Natural language interaction with your codebase
- **GitHub Integration** - Automated code fixes and PR creation
- **Notion Integration** - Seamless task management
- **Slack Notifications** - Keep your team informed
- **Quick Fix** - Automatically find and fix bugs in seconds

## 📦 Installation

Follow these steps to get started:

### Prerequisites

- Node.js version 18 or higher
- GitHub account with access token
- Notion API key
- Slack workspace (optional)

### Setup Instructions

1. Clone the repository:

```bash
git clone https://github.com/deeedaniel/calhacks-12.0.git
cd calhacks-12.0
```

2. Install dependencies for both frontend and backend:

```bash
cd backend && npm install
cd ../frontend && npm install
```

3. Configure environment variables:

```bash
cp backend/.env.example backend/.env
# Edit the .env file with your credentials
```

4. Start the development servers:

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## 🔧 Configuration

Add these variables to your `.env` file:

- `GEMINI_API_KEY` - Your Google Gemini API key
- `GITHUB_ACCESS_TOKEN` - GitHub personal access token
- `NOTION_API_KEY` - Notion integration token
- `SLACK_USER_TOKEN` - Slack bot token (optional)

## 🎯 Usage

### Quick Fix Feature

The Quick Fix feature is really powerful! Simply describe any code issue:

```
"Fix the typo in the login form"
"Add error handling to API calls"
"The dashboard crashes when data is null"
```

The AI will automatically:

1. Find the relevant code
2. Analyze the problem
3. Generate a fix
4. Create a new branch
5. Commit the changes
6. Create a pull request

All in just 10-60 seconds!

## 📚 Documentation

For more detailed information, check out:

- [Quick Fix Guide](./QUICK_FIX_GUIDE.md) - Complete guide to automated fixes
- [Backend README](./backend/README.md) - Backend API documentation
- [Frontend README](./frontend/README.md) - Frontend component guide

## 🤝 Contributors

We welcome contributions! Please read our contributing guidelines before submitting a PR.

## 📝 License

This project is licensed under the MIT License.

## 🐛 Known Issues

- Occasionally the AI might miss edge cases
- GitHub rate limits may affect performance
- Large files (>2000 lines) are not supported yet

## 💡 Tips

- Be as specific as possible when describing bugs
- Mention file names for faster searches
- Test the AI-generated fixes before merging

---

Built with ❤️ at CalHacks 12.0
