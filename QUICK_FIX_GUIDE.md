# Quick Fix Feature Guide

## Overview

The Quick Fix feature allows users to describe code issues through the chat interface, and the AI will automatically:

1. Find the problematic code
2. Analyze and fix the issue
3. Create a new branch
4. Commit the changes
5. Create a pull request

All of this happens automatically in seconds!

## How It Works

### User Experience

Simply describe a bug or issue in the chat:

```
User: "The login form doesn't validate email addresses"
```

The AI will:

- Search the codebase for login-related files
- Read the relevant code
- Identify the missing validation
- Create a fix branch
- Apply the fix
- Create a PR with detailed description
- Return the PR link to you

### Example Interactions

#### Simple Typo Fix

```
User: "There's a typo in README.md - 'instllation' should be 'installation'"

AI Response:
✅ Fixed! Found the typo in README.md line 12. Created PR #45 with the correction.
🔗 https://github.com/deeedaniel/calhacks-12.0/pull/45
```

#### Bug Fix

```
User: "The dashboard crashes when there are no tasks"

AI Response:
✅ Found and fixed the issue! The Dashboard component in frontend/src/components/Dashboard.tsx
was missing a null check for the tasks array. I've added:
- Null/undefined check before mapping tasks
- Loading state while data is fetched
- Empty state message when no tasks exist

Created PR #46 for review.
🔗 https://github.com/deeedaniel/calhacks-12.0/pull/46
```

#### Feature Enhancement

```
User: "Add error handling to all API calls in the backend"

AI Response:
✅ Enhanced error handling across the backend! I've updated:
- backend/lib/api.ts: Added try-catch blocks and error interceptor
- backend/server.js: Added global error middleware
- All API endpoints now return proper error responses with status codes

Created PR #47 with comprehensive error handling.
🔗 https://github.com/deeedaniel/calhacks-12.0/pull/47
```

## Available GitHub Functions

### Code Discovery Functions

#### `searchCodeInRepository`

Search for code patterns in the repository.

```javascript
searchCodeInRepository({
  query: "login email validation",
  language: "typescript", // optional
  path: "frontend/src", // optional
});
```

#### `getRepositoryTree`

Get the file structure of the repository.

```javascript
getRepositoryTree({
  path: "frontend/src", // optional, defaults to root
  recursive: true, // optional, defaults to true
});
```

#### `getFileContent`

Read the complete content of a file.

```javascript
getFileContent({
  path: "frontend/src/components/Login.tsx",
  ref: "main", // optional, defaults to main
});
// Returns: { content, sha, size, ... }
```

### Code Modification Functions

#### `createBranch`

Create a new branch for changes.

```javascript
createBranch({
  branchName: "fix/email-validation",
  baseBranch: "main", // optional, defaults to main
});
```

#### `createOrUpdateFile`

Commit file changes to a branch.

```javascript
createOrUpdateFile({
  path: "frontend/src/components/Login.tsx",
  content: "... complete file content ...",
  message: "Fix: Add email validation to login form",
  branch: "fix/email-validation",
  sha: "abc123...", // required for updates, from getFileContent
});
```

#### `createPullRequest`

Create a PR with the changes.

```javascript
createPullRequest({
  title: "Fix: Add email validation to login form",
  body: `
## Problem
The login form was accepting invalid email addresses.

## Solution
Added regex validation for email format.

## Changes
- Modified handleSubmit in Login.tsx
- Added email format validation
- Added error state display

## Testing
- ✅ Empty emails now show error
- ✅ Invalid formats rejected
- ✅ Valid emails accepted
  `,
  head: "fix/email-validation",
  base: "main", // optional, defaults to main
});
```

## AI Workflow

The AI follows this workflow automatically:

```
┌─────────────────────────────────────┐
│ 1. User describes issue             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 2. Search for relevant code         │
│    → searchCodeInRepository()       │
│    → getRepositoryTree()            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. Read and analyze code            │
│    → getFileContent()               │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 4. Generate fix                     │
│    (AI writes corrected code)       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 5. Create branch                    │
│    → createBranch()                 │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 6. Commit changes                   │
│    → createOrUpdateFile()           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 7. Create Pull Request              │
│    → createPullRequest()            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 8. Return PR URL to user            │
└─────────────────────────────────────┘
```

## Safety Features

### Automatic Safeguards

1. **Branch-First Strategy**: Always creates a new branch, never commits to main
2. **PR Required**: All changes go through pull request review
3. **File Size Limits**: Only reads/modifies files under 2000 lines
4. **Directory Restrictions**: Only modifies approved directories
5. **No Destructive Changes**: Never touches node_modules, .env, or config files

### Protected Files/Directories

The AI will **NOT** modify:

- `node_modules/`
- `.env` files
- `package-lock.json`
- `.git/`
- Any ignored files

### Manual Review Triggers

The AI will ask for manual review if:

- Fix requires changes to more than 5 files
- File is too large (>2000 lines)
- Issue is unclear or ambiguous
- Change seems risky (e.g., database migrations)

## Configuration

The Quick Fix feature is configured through:

### Backend (`github-tools.js`)

- Hardcoded repository: `deeedaniel/calhacks-12.0`
- Uses `GITHUB_ACCESS_TOKEN` from environment

Required token permissions:

- `repo` (full repository access)
- `contents:write` (to create/update files)
- `pull_requests:write` (to create PRs)

### AI System Prompt (`gemini-client.js`)

The system prompt includes detailed workflow instructions that guide the AI through the Quick Fix process automatically.

## Testing the Feature

### Test Case 1: Simple Fix

```
User: "Fix the typo 'recieve' to 'receive' in the docs"
Expected: AI finds file, fixes typo, creates PR
```

### Test Case 2: Bug Fix

```
User: "The chat component crashes when messages array is null"
Expected: AI finds Chat.tsx, adds null check, creates PR
```

### Test Case 3: Feature Addition

```
User: "Add a loading spinner to the dashboard while data is fetching"
Expected: AI adds loading state and spinner component, creates PR
```

## Troubleshooting

### "Could not find the code"

- Issue: Search query too vague
- Solution: Provide more specific details (file name, function name, etc.)

### "File too large to modify"

- Issue: Target file exceeds 2000 lines
- Solution: Manually break file into smaller modules first

### "GitHub API rate limit exceeded"

- Issue: Too many API calls
- Solution: Wait for rate limit reset (typically 1 hour)

### "Permission denied"

- Issue: GitHub token lacks required permissions
- Solution: Update token permissions in GitHub settings

## Best Practices

### For Users

1. **Be Specific**: "Fix email validation in Login.tsx" is better than "fix login"
2. **One Issue at a Time**: Don't combine multiple unrelated fixes
3. **Review PRs**: Always review AI-generated PRs before merging
4. **Test Changes**: Pull the branch and test locally before merging

### For Development

1. **Keep System Prompt Updated**: Adjust workflow instructions as needed
2. **Monitor API Usage**: Track GitHub API rate limits
3. **Log Function Calls**: Keep logs of AI tool usage for debugging
4. **Iterate on Prompts**: Improve AI instructions based on results

## Future Enhancements

Potential improvements:

- [ ] Multi-file fixes in single PR
- [ ] Automatic test generation
- [ ] Integration with CI/CD for pre-PR testing
- [ ] CodeRabbit auto-review after PR creation
- [ ] Rollback command if fix causes issues
- [ ] Fix history and analytics

## Architecture Diagram

```
┌─────────────────┐
│   Frontend      │
│   (Chat UI)     │
└────────┬────────┘
         │
         │ HTTP POST /api/chat
         ↓
┌─────────────────┐
│   Backend       │
│   (Express)     │
└────────┬────────┘
         │
         │ Function Calling
         ↓
┌─────────────────┐      ┌──────────────┐
│  Gemini Client  │─────→│ GitHub API   │
│  (AI Agent)     │      │ (REST)       │
└─────────────────┘      └──────────────┘
         │                       │
         │ Tool Loop              │
         │                       │
         ↓                       ↓
┌─────────────────┐      ┌──────────────┐
│  GitHub Tools   │─────→│  Your Repo   │
│  (6 functions)  │      │  (Code)      │
└─────────────────┘      └──────────────┘
```

## Example PR Description (AI-Generated)

````markdown
# Fix: Add email validation to login form

## Problem

The login form was accepting empty email addresses and invalid email formats,
leading to failed login attempts and poor user experience.

## Solution

Added comprehensive email validation in the `handleSubmit` function:

- Check for empty/whitespace-only emails
- Validate email format using regex pattern
- Display appropriate error messages to users

## Changes

**File**: `frontend/src/components/Login.tsx`
**Lines Modified**: 44-52

```typescript
// Added validation before login call
if (!email || !email.trim()) {
  setError("Email is required");
  return;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  setError("Please enter a valid email address");
  return;
}
```
````

## Testing

- ✅ Empty email shows "Email is required" error
- ✅ Invalid format (e.g., "notanemail") shows format error
- ✅ Valid emails (e.g., "user@example.com") proceed to login
- ✅ Whitespace-only emails are rejected

## Review Notes

This is a Quick Fix generated by AI. Please review the validation logic
and test thoroughly before merging.

```

## Summary

The Quick Fix feature transforms your chat interface into a powerful code repair tool.
Users describe issues in natural language, and the AI automatically creates well-documented
PRs with fixes. This dramatically speeds up small bug fixes and improvements while
maintaining code quality through the PR review process.

```
