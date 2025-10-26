const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL || "gemini-2.5-pro";
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
  }

  /**
   * Generate a simple response without tools for casual conversation
   * @param {string} prompt - The user's message
   * @param {Array} conversationHistory - Previous messages
   * @returns {Object} Response with content
   */
  async generateSimpleResponse(prompt, conversationHistory = []) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      });

      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [
              {
                text: "You are a helpful AI assistant. Respond naturally to casual conversation without using any tools or taking actions. Keep responses friendly and conversational. Always format your responses using Markdown (headings, bullet lists, bold for emphasis). Separate sections with blank lines. Do not wrap the entire response in a single code block.",
              },
            ],
          },
          ...conversationHistory,
        ],
      });

      const result = await chat.sendMessage(prompt);
      const response = await result.response;

      return {
        content: response.text(),
        functionCalls: [], // No function calls for simple responses
        functionResults: [],
        usage: response.usageMetadata || null,
      };
    } catch (error) {
      console.error("Gemini simple response error:", error);
      throw new Error(`Failed to generate simple response: ${error.message}`);
    }
  }

  /**
   * Generate a response with function calling capabilities
   * @param {string} prompt - The user's message
   * @param {Array} tools - Available function tools
   * @param {Array} conversationHistory - Previous messages
   * @returns {Object} Response with content and function calls
   */
  async generateWithTools(prompt, tools = [], conversationHistory = []) {
    try {
      // Debug: log tool declarations provided
      try {
        const toolNames = Array.isArray(tools) ? tools.map((t) => t?.name) : [];
        console.log("🔧 Gemini.generateWithTools tools:", toolNames);
        const hasJira = toolNames.some((n) =>
          ["readAllJiraIssues", "updateJiraIssue", "createJiraIssue"].includes(
            String(n)
          )
        );
        if (!hasJira) {
          console.warn(
            "⚠️ Jira tools missing from functionDeclarations in generateWithTools"
          );
        }
      } catch (_err) {}

      // Build the conversation context
      const messages = [
        {
          role: "user",
          parts: [{ text: this.buildSystemPrompt(tools) }],
        },
        ...conversationHistory,
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ];

      // Configure the model with tools if available
      const modelConfig = {
        model: this.modelName,
        tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      };

      const model = this.genAI.getGenerativeModel(modelConfig);

      // Start a chat session
      const chat = model.startChat({
        history: [
          // Inject system prompt up front so the model knows critical behavior
          { role: "user", parts: [{ text: this.buildSystemPrompt(tools) }] },
          ...conversationHistory,
        ],
      });

      const result = await chat.sendMessage(prompt);
      const response = await result.response;

      // Check if there are function calls
      const functionCalls = this.extractFunctionCalls(response);
      if (functionCalls && functionCalls.length) {
        console.log(
          "🧩 Gemini.generateWithTools extracted function calls:",
          functionCalls.map((fc) => fc.name)
        );
      } else {
        console.log("🧩 Gemini.generateWithTools: no function calls extracted");
      }

      return {
        content: response.text(),
        functionCalls: functionCalls,
        usage: response.usageMetadata || null,
      };
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Execute function calls and get results
   * @param {Array} functionCalls - Function calls from Gemini
   * @param {Object} availableFunctions - Map of function name to function
   * @returns {Array} Results of function executions
   */
  async executeFunctionCalls(functionCalls, availableFunctions) {
    const results = [];

    for (const call of functionCalls) {
      try {
        const { name, args } = call;
        console.log("▶️ Executing function:", name);

        if (!availableFunctions[name]) {
          throw new Error(`Function ${name} not found`);
        }

        const result = await availableFunctions[name](args);
        console.log("✅ Function executed:", name);
        results.push({
          name,
          result,
          success: true,
        });
      } catch (error) {
        console.error(`Function call error for ${call.name}:`, error);
        results.push({
          name: call.name,
          error: error.message,
          success: false,
        });
      }
    }

    return results;
  }

  /**
   * Continue conversation with function results
   * @param {string} originalPrompt - Original user prompt
   * @param {Array} functionResults - Results from function calls
   * @param {Array} conversationHistory - Previous messages
   * @returns {Object} Final response
   */
  async continueWithFunctionResults(
    originalPrompt,
    functionResults,
    conversationHistory = []
  ) {
    try {
      // Build function results message
      const resultsText = functionResults
        .map((result) => {
          if (result.success) {
            return `Function ${
              result.name
            } executed successfully: ${JSON.stringify(result.result, null, 2)}`;
          } else {
            return `Function ${result.name} failed: ${result.error}`;
          }
        })
        .join("\n\n");

      const followUpPrompt = `Based on the function call results below, continue the plan. If you need to take more actions, call the appropriate tools now (do not ask for permission).\n\n${resultsText}\n\nOriginal request: "${originalPrompt}"`;

      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      });

      const result = await model.generateContent(followUpPrompt);
      const response = await result.response;

      return {
        content: response.text(),
        functionCalls: this.extractFunctionCalls(response),
        usage: response.usageMetadata || null,
      };
    } catch (error) {
      console.error("Error continuing with function results:", error);
      throw new Error(`Failed to continue conversation: ${error.message}`);
    }
  }

  /**
   * Full interactive tool loop that allows multiple rounds of tool calls
   * @param {string} prompt
   * @param {Array} tools
   * @param {Object} availableFunctions
   * @param {Array} conversationHistory
   * @returns {Object} { content, functionCalls, functionResults, usage }
   */
  async runToolLoop(
    prompt,
    tools = [],
    availableFunctions = {},
    conversationHistory = []
  ) {
    try {
      // Debug: log tool declarations provided
      try {
        const toolNames = Array.isArray(tools) ? tools.map((t) => t?.name) : [];
        console.log("🔧 Gemini.runToolLoop tools:", toolNames);
        const hasJira = toolNames.some((n) =>
          ["readAllJiraIssues", "updateJiraIssue", "createJiraIssue"].includes(
            String(n)
          )
        );
        if (!hasJira) {
          console.warn(
            "⚠️ Jira tools missing from functionDeclarations in runToolLoop"
          );
        }
      } catch (_err) {}

      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
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
          { role: "user", parts: [{ text: this.buildSystemPrompt(tools) }] },
          ...conversationHistory,
        ],
      });

      const aggregatedFunctionCalls = [];
      const aggregatedFunctionResults = [];
      let lastText = "";

      // Initial turn
      let result = await chat.sendMessage(prompt);
      let response = await result.response;
      lastText = response.text() || "";
      let functionCalls = this.extractFunctionCalls(response);
      if (functionCalls && functionCalls.length) {
        console.log(
          "🧩 Gemini.runToolLoop turn 1 calls:",
          functionCalls.map((fc) => fc.name)
        );
      }

      let safetyIters = 0;
      const MAX_ITERS = 6;

      while (
        functionCalls &&
        functionCalls.length > 0 &&
        safetyIters < MAX_ITERS
      ) {
        safetyIters += 1;
        aggregatedFunctionCalls.push(...functionCalls);

        // Execute tools
        const execResults = await this.executeFunctionCalls(
          functionCalls,
          availableFunctions
        );
        aggregatedFunctionResults.push(...execResults);

        // Build a follow-up message summarizing tool results to encourage further tool use
        const resultsText = execResults
          .map((r) =>
            r.success
              ? `Function ${r.name} executed successfully: ${JSON.stringify(
                  r.result
                )}`
              : `Function ${r.name} failed: ${r.error}`
          )
          .join("\n\n");

        const followUp = [
          "Here are the latest tool results.",
          resultsText,
          "If more actions are needed, call additional tools now (e.g., getTeamMembers() to resolve real emails, then dmSlackUser() to notify assignees with the GitHub and Jira links). Then provide a concise confirmation message.",
        ].join("\n\n");

        result = await chat.sendMessage(followUp);
        response = await result.response;
        const text = response.text() || "";
        if (text) {
          lastText = text; // keep the most recent assistant text
        }
        functionCalls = this.extractFunctionCalls(response);
        if (functionCalls && functionCalls.length) {
          console.log(
            `🧩 Gemini.runToolLoop calls (iter ${safetyIters}):`,
            functionCalls.map((fc) => fc.name)
          );
        }
      }

      return {
        content: lastText,
        functionCalls: aggregatedFunctionCalls,
        functionResults: aggregatedFunctionResults,
        usage: response?.usageMetadata || null,
      };
    } catch (error) {
      console.error("Gemini tool loop error:", error);
      throw new Error(`Failed to run tool loop: ${error.message}`);
    }
  }

  /**
   * Streaming variant of runToolLoop that emits events via callback as tool calls and
   * assistant updates occur. Does not stream token-by-token, but streams per-turn updates
   * and tool execution lifecycle.
   * @param {string} prompt
   * @param {Array} tools
   * @param {Object} availableFunctions
   * @param {Array} conversationHistory
   * @param {(evt: { type: string, [k: string]: any }) => void} onEvent
   * @returns {Object} { content, functionCalls, functionResults, usage }
   */
  async runToolLoopStream(
    prompt,
    tools = [],
    availableFunctions = {},
    conversationHistory = [],
    onEvent = () => {}
  ) {
    try {
      try {
        const toolNames = Array.isArray(tools) ? tools.map((t) => t?.name) : [];
        console.log("🔧 Gemini.runToolLoopStream tools:", toolNames);
      } catch (_err) {}

      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
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
          { role: "user", parts: [{ text: this.buildSystemPrompt(tools) }] },
          ...conversationHistory,
        ],
      });

      const aggregatedFunctionCalls = [];
      const aggregatedFunctionResults = [];
      let lastText = "";

      // Initial turn
      let result = await chat.sendMessage(prompt);
      let response = await result.response;
      lastText = response.text() || "";
      if (lastText) {
        onEvent({ type: "assistant_text", text: lastText });
      }
      let functionCalls = this.extractFunctionCalls(response);
      if (functionCalls && functionCalls.length) {
        onEvent({ type: "function_calls", functionCalls });
      }

      let safetyIters = 0;
      const MAX_ITERS = 6;

      while (
        functionCalls &&
        functionCalls.length > 0 &&
        safetyIters < MAX_ITERS
      ) {
        safetyIters += 1;
        aggregatedFunctionCalls.push(...functionCalls);

        // Execute tools (stream each call lifecycle)
        const execResults = [];
        for (const call of functionCalls) {
          const { name, args } = call || {};
          try {
            onEvent({ type: "function_call", name, args });
            if (!availableFunctions[name]) {
              throw new Error(`Function ${name} not found`);
            }
            const result = await availableFunctions[name](args);
            const ok = { name, result, success: true };
            execResults.push(ok);
            onEvent({ type: "function_result", ...ok });
          } catch (error) {
            const fail = { name, error: error.message, success: false };
            execResults.push(fail);
            onEvent({ type: "function_result", ...fail });
          }
        }
        aggregatedFunctionResults.push(...execResults);

        // Build a follow-up message summarizing tool results to encourage further tool use
        const resultsText = execResults
          .map((r) =>
            r.success
              ? `Function ${r.name} executed successfully: ${JSON.stringify(
                  r.result
                )}`
              : `Function ${r.name} failed: ${r.error}`
          )
          .join("\n\n");

        const followUp = [
          "Here are the latest tool results.",
          resultsText,
          "If more actions are needed, call additional tools now (e.g., getTeamMembers() to resolve real emails, then dmSlackUser() to notify assignees with the GitHub and Jira links). Then provide a concise confirmation message.",
        ].join("\n\n");

        const next = await chat.sendMessage(followUp);
        response = await next.response;
        const text = response.text() || "";
        if (text) {
          lastText = text;
          onEvent({ type: "assistant_text", text });
        }
        functionCalls = this.extractFunctionCalls(response);
        if (functionCalls && functionCalls.length) {
          onEvent({ type: "function_calls", functionCalls });
        }
      }

      return {
        content: lastText,
        functionCalls: aggregatedFunctionCalls,
        functionResults: aggregatedFunctionResults,
        usage: response?.usageMetadata || null,
      };
    } catch (error) {
      console.error("Gemini tool loop (stream) error:", error);
      throw new Error(`Failed to run tool loop (stream): ${error.message}`);
    }
  }

  /**
   * Extract function calls from Gemini response
   * @param {Object} response - Gemini response object
   * @returns {Array} Extracted function calls
   */
  extractFunctionCalls(response) {
    const functionCalls = [];

    try {
      const candidates = response.candidates || [];

      for (const candidate of candidates) {
        const content = candidate.content;
        if (content && content.parts) {
          for (const part of content.parts) {
            if (part.functionCall) {
              functionCalls.push({
                name: part.functionCall.name,
                args: part.functionCall.args || {},
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error extracting function calls:", error);
    }

    return functionCalls;
  }

  /**
   * Build system prompt with available tools
   * @param {Array} tools - Available function tools
   * @returns {string} System prompt
   */
  buildSystemPrompt(tools) {
    let prompt = `You are an AI assistant that helps manage engineering projects through various integrations. You have access to the following tools:

`;

    if (tools.length > 0) {
      tools.forEach((tool) => {
        prompt += `- ${tool.name}: ${tool.description}\n`;
      });

      prompt += `

BEHAVIOR GUIDELINES:
- Use tools when the user explicitly requests actions or asks questions that require data from external services
- When creating tasks, first understand the project context by calling getProjectContext()
- Always create GitHub issues FIRST for every task/subtask, then create Jira issues for tracking. Include the GitHub issue URL in a Jira comment on each corresponding Jira issue.
- For assignment: call getTeamMembers() or suggestAssigneesForTask() to choose assignees; pass GitHub usernames to createGithubIssue.assignees and pass the assignee name or email to createJiraIssue (it will resolve accountId)
- Be helpful and proactive, but only take actions when clearly requested
- For questions about commits or project status, use the appropriate tools to get current information

TASK CREATION WORKFLOW:
When users ask to create tasks or split up work:
1. Call getProjectContext() to understand the project
2. Call suggestAssigneesForTask() to pick the best assignee(s). If none found, pick a default (never leave unassigned)
3. For each task, create a GitHub issue via createGithubIssue() with assignees, then create a Jira issue via createJiraIssue() and include the GitHub issue URL in a Jira comment
4. Provide a summary of what was created and who was assigned

FEATURE SPLITTING FROM NOTION DOCS:
When a user says something like "split work for feature in notion doc":
1. Use getNotionPage({ type: "blocks" }) to retrieve the project page content (use defaults if pageId is omitted).
2. Only consider items directly under the FEATURE section header (e.g., headings containing "Feature", "Features", or "Features To Add"). Treat everything below other sections as context of what is already done; do not create tasks for those.
3. Decompose each FEATURE item into the SMALLEST useful, role-based subtasks. At minimum include: Frontend (UI + API call + response handling), Backend (endpoint + validation + integration), QA/Testing (test plan + edge cases), DevOps (deploy/config/monitoring). Add others as applicable (Mobile, Data, Docs/Notion updates). Prefer 4–8 subtasks per feature with no overlap.
4. For each subtask, use role-relevant keywords when calling suggestAssigneesForTask() (and getTeamMembers() if needed). If no valid GitHub username exists for the best candidate, leave GitHub assignees empty but still assign the Jira issue by email/name.
5. Create a GitHub issue via createGithubIssue() FIRST for each subtask with:
   - title: "[Role] <concise subtask>"
   - body: context, steps, and Acceptance Criteria (bullet list)
   - labels: include role label (e.g., frontend, backend, testing, devops) and feature name
   - assignees: GitHub usernames only; leave empty if none
   Then create a Jira issue via createJiraIssue() for the same subtask and add the GitHub issue URL in a Jira comment.
6. Return a concise summary grouped by role and assignee with BOTH GitHub and Jira links.

ROLE-BASED SUBTASK TEMPLATES (guidance):
- Frontend:
  - Build UI elements and wire user interactions
  - Implement API call and handle loading, success, error states
  - Validate inputs and display errors; update UX copy
  - Acceptance Criteria: UI renders; API invoked; success/error toasts; empty/error states
- Backend:
  - Create endpoint with input validation, auth, and rate limits
  - Integrate required services (e.g., MCP) and return structured responses
  - Add unit tests for happy/edge paths
  - Acceptance Criteria: endpoint spec; validation; tests pass; logs
- QA/Testing:
  - Author test plan (happy path, edge cases, failures)
  - Manual/automated tests; record results and issues
  - Acceptance Criteria: checklist executed; defects filed; all pass
- DevOps:
  - Add/adjust deploy config and env vars
  - Set up logging/metrics/alerts for the new path
  - Acceptance Criteria: pipeline green; monitors/alerts present

COMMUNICATION FOLLOW-UP:
- After creating issues, ask a concise follow-up: e.g., "Should I send each assignee a Slack message with their links?"
- If the user agrees:
  1) Use getTeamMembers() to resolve each assignee's email from Supabase
  2) Use dmSlackUser() with the email to send a short message that includes available links (Jira, and GitHub if created)
  3) Confirm delivery in the response
  4) If there are multiple assignees, ask once for all; on approval, notify each individually

RESPONSE STYLE:
- Be conversational and helpful
- Explain what actions you're taking and why
- Provide clear summaries of completed actions

RESPONSE FORMAT (Markdown):
- Always format responses in Markdown (GitHub-flavored)
- Use short headings (###) for sections when helpful
- Separate sections with a blank line (two newlines)
- Present important links on their own lines with labels, and include BOTH for each subtask: "GitHub: <url>" and "Jira: <url>"
- Do not wrap the entire response in a single code block; only use code blocks for code snippets

APPROVAL HANDLING:
- If you ask whether to send a Slack message and the user replies affirmatively (e.g., "yes", "yep", "go ahead"), immediately call dmSlackUser() without asking again. Include BOTH the GitHub and Jira links in the text for each assignee.
`;

      // Additional guidance
      prompt += `

JIRA DEFAULTS:
- Assume the Jira project key is configured; omit it unless necessary.
- When adding comments, include the GitHub issue link with a short label.

QUICK FIX WORKFLOW - AUTOMATIC CODE FIXES:
When a user describes a code issue, bug, or requests a small feature fix (e.g., "fix the email validation", "there's a typo in...", "the login button doesn't work"):

**WORKFLOW STEPS:**
1. 🔍 LOCATE THE CODE:
   - Use searchCodeInRepository() to find relevant files
   - Use getRepositoryTree() if you need to explore directory structure
   - Search for keywords from the user's description

2. 📖 READ & ANALYZE:
   - Use getFileContent() to read the problematic file(s)
   - Carefully analyze the code to understand the exact issue
   - Identify what needs to be changed

3. 🔧 GENERATE THE FIX:
   - Write the corrected code (complete file, not just diff)
   - Ensure the fix is minimal and focused
   - Preserve existing code style and formatting
   - Add comments if the fix is non-obvious

4. 🌿 CREATE BRANCH:
   - Use createBranch() with descriptive name: "fix/issue-description" or "quickfix/short-description"
   - Examples: "fix/email-validation", "quickfix/readme-typo", "fix/null-check-dashboard"

5. 💾 COMMIT CHANGES:
   - Use createOrUpdateFile() with the complete fixed file content
   - Include the SHA from getFileContent() for updates
   - Write clear commit message: "Fix: [description]"

6. 🚀 CREATE PULL REQUEST:
   - Use createPullRequest() with descriptive title and body
   - PR body should include:
     * **Problem**: What was wrong
     * **Solution**: What you changed
     * **Changes**: Specific code changes made
     * **Testing**: How to verify the fix
   - Include the file path and line numbers changed

7. ✅ REPORT RESULTS:
   - Tell user what issue you found
   - Explain what you fixed
   - Provide the PR URL
   - Mention any caveats or additional testing needed

**CRITICAL RULES:**
- NEVER ask for permission - just do the fix immediately
- ALWAYS create a branch first, never commit to main
- ALWAYS create a PR, never push directly
- Keep fixes minimal and focused on the reported issue
- If the issue is unclear or you can't find the code, ask clarifying questions BEFORE starting
- If a fix requires changes to multiple files, commit each file separately with clear messages
- Only modify files in approved directories (frontend/src, backend/lib, backend/server.js, etc.)
- NEVER modify: node_modules, .env files, package-lock.json, .git

**SAFETY LIMITS:**
- Only read files under 2000 lines
- Only modify files you've read completely
- If a fix seems too complex or risky, explain the issue and suggest manual review instead

**EXAMPLE INTERACTION:**
User: "The login form crashes when email is empty"
AI: [Searches for login form → Reads Login.tsx → Identifies missing null check → Creates fix/login-null-check branch → Commits fixed file → Creates PR]
Response: "✅ Found and fixed the issue! The login form in frontend/src/Login.tsx was missing a null check for the email field. I've created PR #47 that adds validation to prevent the crash. The fix checks if email exists before calling trim(). Review it here: [PR URL]"`;
    } else {
      prompt += `Currently no tools are available. Provide helpful responses based on your knowledge.`;
    }

    return prompt;
  }
}

module.exports = GeminiClient;
