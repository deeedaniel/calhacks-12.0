const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
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
        model: "gemini-2.5-pro",
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
        history: conversationHistory,
      });

      const result = await chat.sendMessage(prompt);
      const response = await result.response;

      // Check if there are function calls
      const functionCalls = this.extractFunctionCalls(response);

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

        if (!availableFunctions[name]) {
          throw new Error(`Function ${name} not found`);
        }

        const result = await availableFunctions[name](args);
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

      const followUpPrompt = `Based on the function call results:\n\n${resultsText}\n\nPlease provide a helpful response to the user's original request: "${originalPrompt}"`;

      const result = await this.model.generateContent(followUpPrompt);
      const response = await result.response;

      return {
        content: response.text(),
        functionCalls: [],
        usage: response.usageMetadata || null,
      };
    } catch (error) {
      console.error("Error continuing with function results:", error);
      throw new Error(`Failed to continue conversation: ${error.message}`);
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

CRITICAL BEHAVIOR - MANDATORY TASK CREATION:
When a user asks to "split up tasks", "create tasks for our project", or similar requests, you MUST:

1. Call getProjectContext() to understand the project
2. IMMEDIATELY create 5-8 tasks using addNotionTask() - DO NOT ASK FOR PERMISSION
3. NEVER say "Shall I create these tasks?" - JUST CREATE THEM AUTOMATICALLY

MANDATORY TASK CREATION - NO EXCEPTIONS:
- ALWAYS create tasks immediately after getting project context
- NEVER ask for user confirmation or permission
- Create specific, actionable task titles
- Assign to "Daniel" or leave assignee empty
- Set status as "Not started"
- Create tasks for: database, backend API, frontend UI, authentication, testing, documentation, deployment

RESPONSE FORMAT:
After creating tasks, say: "I've created [X] tasks in your Notion database based on the project requirements. Here's what I added:" then list the tasks you created.

FORBIDDEN PHRASES:
- "Shall I create these tasks?"
- "Would you like me to add these?"
- "Should I go ahead and create?"
- Any asking for permission

REQUIRED: Always call addNotionTask() multiple times immediately after getProjectContext().`;
    } else {
      prompt += `Currently no tools are available. Provide helpful responses based on your knowledge.`;
    }

    return prompt;
  }
}

module.exports = GeminiClient;
