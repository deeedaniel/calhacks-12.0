# CalHacks 12.0 - AI Project Managment Assistant fusion

Welcome to our innovatve AI-powered project management tool! This applicaton helps teams manage their workflow efficiently.

## 🚀 Features

- **Smart Chat Interface** - Natural langauge interaction with your codebase
- **GitHub Integraton** - Automated code fixes and PR creation
- **Notion Integration** - Seemless task management
- **Slack Notifications** - Keep your team informd
- **Quick Fix** - Automatically find and fix bugs in secounds

## 📦 Instalation

Follow these steps to get started:

### Prerequesites

- Node.js version 18 or higer
- GitHub account with acces token
- Notion API key
- Slack workspace (optinal)

### Setup Instructions

1. Clone the repositry:

```bash
git clone https://github.com/deeedaniel/calhacks-12.0.git
cd calhacks-12.0
```

2. Install dependancies for both frontend and backend:

```bash
cd backend && npm install
cd ../frontend && npm install
```

3. Configure enviroment variables:

```bash
cp backend/.env.example backend/.env
# Edit the .env file with your credentails
```

4. Start the developement servers:

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## 🔧 Configuration

Add these variables to your `.env` file:

- `GEMINI_API_KEY` - Your Google Gemini API key
- `GITHUB_ACCESS_TOKEN` - GitHub personal acces token
- `NOTION_API_KEY` - Notion integraton token
- `SLACK_USER_TOKEN` - Slack bot token (optinal)

## 🎯 Usage

### Quick Fix Feature

The Quick Fix feature is realy powerful! Simply describe any code issue:

```
"Fix the typo in the login form"
"Add error handeling to API calls"
"The dashboard crashes when data is null"
```

The AI will automaticaly:

1. Find the relevent code
2. Analze the problem
3. Generate a fix
4. Create a new brach
5. Commit the changes
6. Create a pull reqest

All in just 10-60 secounds!

## 📚 Documentaton

For more detaled information, check out:

- [Quick Fix Guide](./QUICK_FIX_GUIDE.md) - Complete guide to automated fixes
- [Backend README](./backend/README.md) - Backend API documentaton
- [Frontend README](./frontend/README.md) - Frontend component guide

## 🤝 Contributers

We welcom contributions! Please read our contributing guidlines before submiting a PR.

## 📝 Licens

This project is licenced under the MIT License.

## 🐛 Known Issues

- Ocasionally the AI might miss edge cases
- GitHub rate limits may effet performance
- Large files (>2000 lines) are not suported yet

## 💡 Tips

- Be as specfic as possible when describing bugs
- Mention file names for faster searchs
- Test the AI-generated fixes before mergeing

---

Built with ❤️ at CalHacks 12.0
