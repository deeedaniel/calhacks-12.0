const axios = require("axios");

class NotionTools {
  constructor(apiKey, version = "2022-06-28") {
    if (!apiKey) {
      throw new Error("Notion API key is required");
    }

    this.apiKey = apiKey;
    this.version = version;
    this.baseURL = "https://api.notion.com/v1";

    // Defaults for project-specific IDs (prefer env, fallback to known IDs)
    this.defaultDatabaseId =
      process.env.NOTION_DATABASE_ID || "297ae863-705c-80a5-8fc9-def0879f4069";
    this.defaultProjectPageId =
      process.env.NOTION_PAGE_ID || "297ae863705c801f8ae7f5533673b57e";

    // Configure axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Notion-Version": this.version,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get function declarations for Gemini
   * @returns {Array} Function declarations for tool calling
   */
  getFunctionDeclarations() {
    return [
      {
        name: "getProjectContext",
        description:
          "Automatically retrieve the current project description and context to understand what tasks need to be created. Use this first when asked to create project tasks.",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "getNotionPage",
        description:
          "Retrieve content from a Notion page or database. Use this to get page content, blocks, or database entries.",
        parameters: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description:
                "The ID of the Notion page or database to retrieve. Defaults to the configured project database/page; you can omit this.",
              default: this.defaultDatabaseId,
            },
            type: {
              type: "string",
              enum: ["page", "database", "blocks"],
              description:
                'Type of content to retrieve: "page" for page properties, "database" for database entries, "blocks" for page content blocks',
              default: "database",
            },
          },
          required: [],
        },
      },
      {
        name: "addNotionTask",
        description:
          "Add a new task to a Notion database. Use this to create new tasks, todos, or database entries.",
        parameters: {
          type: "object",
          properties: {
            // databaseId: {
            //   type: "string",
            //   description:
            //     "The ID of the Notion database where the task should be added",
            // },
            task: {
              type: "string",
              description: "The task title or name",
            },
            assignee: {
              type: "string",
              description: "Person assigned to the task (optional)",
              default: "",
            },
            status: {
              type: "string",
              enum: ["Not started", "In progress", "Done", "Blocked"],
              description: "Task status",
              default: "Not started",
            },
            deadline: {
              type: "string",
              description:
                "Deadline in ISO format (e.g., 2025-10-30T15:00:00-07:00) (optional)",
            },
            linkUrl: {
              type: "string",
              description:
                "Optional URL to attach in the 'Link' column (e.g., GitHub issue URL)",
            },
          },
          required: ["task"],
        },
      },
    ];
  }

  /**
   * Get available functions map for execution
   * @returns {Object} Map of function names to functions
   */
  getAvailableFunctions() {
    return {
      getProjectContext: this.getProjectContext.bind(this),
      getNotionPage: this.getNotionPage.bind(this),
      addNotionTask: this.addNotionTask.bind(this),
    };
  }

  /**
   * Get project context automatically from hardcoded project page
   * @returns {Object} Project context and description
   */
  async getProjectContext() {
    try {
      // Hardcoded project page ID
      const projectPageId = this.defaultProjectPageId;

      // Get the project page content
      const pageResult = await this.getNotionPage({
        pageId: projectPageId,
        type: "blocks",
      });

      if (!pageResult.success) {
        return {
          success: false,
          error: `Failed to retrieve project context: ${pageResult.error}`,
          code: pageResult.code,
        };
      }

      // Format the blocks into readable text
      const projectDescription = this.formatBlocks(
        pageResult.data.results || []
      );

      return {
        success: true,
        data: {
          projectPageId: projectPageId,
          description: projectDescription,
          rawBlocks: pageResult.data.results,
        },
        message: "Project context retrieved successfully",
      };
    } catch (error) {
      console.error("Error getting project context:", error);
      return {
        success: false,
        error: error.message,
        code: "UNKNOWN",
      };
    }
  }

  /**
   * Retrieve content from a Notion page or database
   * @param {Object} params - Parameters
   * @param {string} params.pageId - Page or database ID
   * @param {string} params.type - Type of content to retrieve
   * @returns {Object} Page content or database entries
   */
  async getNotionPage(params) {
    try {
      let { pageId, type } = params || {};

      // Apply sensible defaults when arguments are omitted
      if (!type) {
        type = "database"; // default to project tasks database
      }
      if (!pageId) {
        if (type === "database") {
          pageId = this.defaultDatabaseId;
        } else {
          pageId = this.defaultProjectPageId;
        }
      }

      let response;

      switch (type) {
        case "page":
          // Get page properties
          response = await this.client.get(`/pages/${pageId}`);
          return {
            success: true,
            data: response.data,
            type: "page",
          };

        case "blocks":
          // Get page content blocks (children)
          response = await this.client.get(`/blocks/${pageId}/children`);
          return {
            success: true,
            data: response.data,
            type: "blocks",
          };

        case "database":
          // Query database entries
          response = await this.client.post(`/databases/${pageId}/query`, {
            page_size: 100,
          });
          return {
            success: true,
            data: response.data,
            type: "database",
          };

        default:
          throw new Error(
            `Invalid type: ${type}. Must be 'page', 'blocks', or 'database'`
          );
      }
    } catch (error) {
      console.error(
        "Notion API Error (getNotionPage):",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        code: error.response?.status || "UNKNOWN",
      };
    }
  }

  /**
   * Add a new task to a Notion database
   * @param {Object} params - Task parameters
   * @returns {Object} Created task data
   */
  async addNotionTask(params) {
    try {
      const {
        task,
        assignee = "",
        status = "Not started",
        deadline,
        linkUrl,
      } = params;

      // Hardcoded database ID for the project
      const databaseId = this.defaultDatabaseId;

      if (!task) {
        throw new Error("task is required");
      }

      // Build the page properties based on your database schema
      const properties = {
        Task: {
          title: [{ text: { content: task } }],
        },
        Status: {
          status: { name: status },
        },
      };

      // Add optional properties if provided
      if (assignee) {
        properties["Assignee"] = {
          rich_text: [{ text: { content: assignee } }],
        };
      }

      if (deadline) {
        properties["Deadline"] = {
          date: { start: deadline },
        };
      }

      if (linkUrl) {
        properties["Link"] = {
          url: linkUrl,
        };
      }

      const requestBody = {
        parent: { database_id: databaseId },
        properties: properties,
      };

      const response = await this.client.post("/pages", requestBody);

      return {
        success: true,
        data: response.data,
        message: `Task "${task}" created successfully`,
      };
    } catch (error) {
      console.error(
        "Notion API Error (addNotionTask):",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        code: error.response?.status || "UNKNOWN",
      };
    }
  }

  /**
   * Test the Notion API connection
   * @returns {Object} Connection test result
   */
  async testConnection() {
    try {
      const response = await this.client.get("/users/me");
      return {
        success: true,
        data: response.data,
        message: "Notion API connection successful",
      };
    } catch (error) {
      console.error(
        "Notion API Connection Test Failed:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        code: error.response?.status || "UNKNOWN",
      };
    }
  }

  /**
   * Format Notion blocks for display
   * @param {Array} blocks - Notion blocks array
   * @returns {string} Formatted text content
   */
  formatBlocks(blocks) {
    if (!blocks || !Array.isArray(blocks)) {
      return "No content available";
    }

    return blocks
      .map((block) => {
        switch (block.type) {
          case "paragraph":
            return this.extractTextFromRichText(
              block.paragraph?.rich_text || []
            );
          case "heading_1":
            return `# ${this.extractTextFromRichText(
              block.heading_1?.rich_text || []
            )}`;
          case "heading_2":
            return `## ${this.extractTextFromRichText(
              block.heading_2?.rich_text || []
            )}`;
          case "heading_3":
            return `### ${this.extractTextFromRichText(
              block.heading_3?.rich_text || []
            )}`;
          case "bulleted_list_item":
            return `• ${this.extractTextFromRichText(
              block.bulleted_list_item?.rich_text || []
            )}`;
          case "numbered_list_item":
            return `1. ${this.extractTextFromRichText(
              block.numbered_list_item?.rich_text || []
            )}`;
          case "to_do":
            const checked = block.to_do?.checked ? "[x]" : "[ ]";
            return `${checked} ${this.extractTextFromRichText(
              block.to_do?.rich_text || []
            )}`;
          default:
            return `[${block.type}]`;
        }
      })
      .join("\n");
  }

  /**
   * Extract plain text from Notion rich text array
   * @param {Array} richText - Notion rich text array
   * @returns {string} Plain text
   */
  extractTextFromRichText(richText) {
    if (!Array.isArray(richText)) {
      return "";
    }
    return richText.map((text) => text.plain_text || "").join("");
  }
}

module.exports = NotionTools;
