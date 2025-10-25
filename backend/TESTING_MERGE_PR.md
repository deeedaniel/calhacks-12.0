# Testing the Merge PR Function

## 🎯 Prerequisites

Before testing, you need:

1. **A test pull request** in your repository (`deeedaniel/calhacks-12.0`)
2. **GitHub token** with proper permissions (already in your `.env` file)

### Creating a Test PR

```bash
# 1. Create a test branch
git checkout -b test-merge-pr

# 2. Make a small change
echo "# Test PR" >> test-file.txt
git add test-file.txt
git commit -m "Add test file for merge PR testing"

# 3. Push and create PR
git push origin test-merge-pr

# 4. Go to GitHub and create a PR from this branch
# Note the PR number (e.g., #5)
```

---

## 🧪 Method 1: Standalone Test Script (Recommended for Development)

This directly tests the `mergePullRequest` function without the server.

```bash
# 1. Edit the PR_NUMBER in test-merge-pr.js (line 27)
# 2. Run the test script
node test-merge-pr.js
```

**What it tests:**

- ✅ Valid PR merge
- ✅ Invalid PR number (404 error)
- ✅ Invalid merge method (validation error)
- ✅ Error handling

**Pros:** Fast, direct testing of the function
**Cons:** Doesn't test the full API flow

---

## 🌐 Method 2: API Endpoint Testing (Recommended for Integration)

Test through the REST API endpoint.

### Step 1: Start the server

```bash
cd backend
npm start
```

### Step 2: Test with curl

#### Basic Merge

```bash
curl -X POST http://localhost:3001/api/github/merge-pr \
  -H "Content-Type: application/json" \
  -d '{
    "pullNumber": 5
  }'
```

#### Squash and Merge

```bash
curl -X POST http://localhost:3001/api/github/merge-pr \
  -H "Content-Type: application/json" \
  -d '{
    "pullNumber": 5,
    "mergeMethod": "squash",
    "commitTitle": "feat: Add new feature",
    "commitMessage": "This PR adds a new feature with tests"
  }'
```

#### Merge with Branch Deletion

```bash
curl -X POST http://localhost:3001/api/github/merge-pr \
  -H "Content-Type: application/json" \
  -d '{
    "pullNumber": 5,
    "mergeMethod": "merge",
    "deleteBranch": true
  }'
```

#### Rebase and Merge

```bash
curl -X POST http://localhost:3001/api/github/merge-pr \
  -H "Content-Type: application/json" \
  -d '{
    "pullNumber": 5,
    "mergeMethod": "rebase"
  }'
```

#### Test Invalid PR (Should fail gracefully)

```bash
curl -X POST http://localhost:3001/api/github/merge-pr \
  -H "Content-Type: application/json" \
  -d '{
    "pullNumber": 99999
  }'
```

### Step 3: Test with your Frontend

If you have a frontend, you can call this endpoint:

```typescript
// Example React/TypeScript code
const mergePR = async (pullNumber: number) => {
  const response = await fetch("http://localhost:3001/api/github/merge-pr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pullNumber,
      mergeMethod: "merge",
    }),
  });

  const data = await response.json();
  console.log(data);
};
```

---

## 🤖 Method 3: AI Chat Testing (Recommended for End-to-End)

Test through the AI chat interface - this is how users will actually use it!

### Step 1: Start the server

```bash
cd backend
npm start
```

### Step 2: Send a chat message

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Merge PR #5"
  }'
```

Or test with various natural language commands:

```bash
# Squash merge
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Squash and merge pull request 5"
  }'

# Merge with branch deletion
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Merge PR #5 and delete the branch"
  }'

# Rebase merge
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Rebase and merge the feature PR number 5"
  }'
```

The AI will automatically call the `mergePullRequest` function!

---

## 📊 Expected Responses

### ✅ Success Response

```json
{
  "success": true,
  "message": "Successfully merged pull request #5 using merge method",
  "timestamp": "2025-10-25T12:00:00.000Z",
  "data": {
    "pullNumber": 5,
    "sha": "abc123def456",
    "merged": true,
    "message": "Pull Request successfully merged",
    "mergeMethod": "merge",
    "html_url": "https://github.com/deeedaniel/calhacks-12.0/pull/5"
  }
}
```

### ❌ Error Response (PR Not Found)

```json
{
  "success": false,
  "message": "Pull request #99999 not found",
  "timestamp": "2025-10-25T12:00:00.000Z",
  "data": {
    "error": "Pull request #99999 not found",
    "code": 404
  }
}
```

### ❌ Error Response (Already Merged)

```json
{
  "success": false,
  "message": "Pull request #5 is already merged",
  "timestamp": "2025-10-25T12:00:00.000Z",
  "data": {
    "error": "Pull request #5 is already merged",
    "code": "ALREADY_MERGED"
  }
}
```

### ❌ Error Response (Has Conflicts)

```json
{
  "success": false,
  "message": "Pull request #5 has conflicts and cannot be merged automatically",
  "timestamp": "2025-10-25T12:00:00.000Z",
  "data": {
    "error": "Pull request #5 has conflicts and cannot be merged automatically",
    "code": "NOT_MERGEABLE"
  }
}
```

---

## 🔍 Debugging Tips

### Check if the function is available

```bash
curl http://localhost:3001/api/tools | jq '.data.tools[] | select(.name == "mergePullRequest")'
```

### Enable verbose logging

Add this to your test script:

```javascript
// In test-merge-pr.js, before calling mergePullRequest
githubTools.client.interceptors.request.use((request) => {
  console.log("🔵 Request:", request.method.toUpperCase(), request.url);
  return request;
});

githubTools.client.interceptors.response.use(
  (response) => {
    console.log("🟢 Response:", response.status, response.statusText);
    return response;
  },
  (error) => {
    console.log("🔴 Error:", error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);
```

### Check GitHub API directly

```bash
# Get PR info
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.github.com/repos/deeedaniel/calhacks-12.0/pulls/5

# Check if PR is mergeable
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.github.com/repos/deeedaniel/calhacks-12.0/pulls/5 | jq '.mergeable'
```

---

## ⚠️ Important Notes

1. **Token Permissions**: Your GitHub token needs the `repo` scope to merge PRs
2. **Branch Protection**: If the base branch has required status checks or reviews, the merge will fail
3. **Conflicts**: PRs with merge conflicts cannot be merged automatically
4. **Already Merged**: You can't merge the same PR twice (you'll need to create a new test PR)
5. **Rate Limits**: GitHub API has rate limits (5000 requests/hour for authenticated requests)

---

## 🎯 Quick Test Workflow

1. Create a test PR on GitHub
2. Run: `node test-merge-pr.js` (update PR number first)
3. Check the output
4. If successful, verify the PR is merged on GitHub
5. Create another test PR for additional testing

---

## 🆘 Common Issues

| Issue                | Solution                                                     |
| -------------------- | ------------------------------------------------------------ |
| "Not found" error    | Make sure the PR number exists in `deeedaniel/calhacks-12.0` |
| "Already merged"     | Create a new test PR                                         |
| "Not mergeable"      | Check if PR has conflicts, resolve them first                |
| "Method not allowed" | PR might have required checks or reviews                     |
| 401/403 errors       | Check your GitHub token permissions                          |

---

Happy testing! 🚀
