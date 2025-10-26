const axios = require("axios");

class JiraTools {
  constructor(baseUrl, email, apiToken) {
    if (!baseUrl || !email || !apiToken) {
      throw new Error("Jira base URL, email, and API token are required");
    }

    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: email,
        password: apiToken,
      },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  getFunctionDeclarations() {
    return [
      {
        name: "readAllJiraIssues",
        description:
          "Read all issues from a Jira project to find a specific task. Returns a compact list of issues.",
        parameters: {
          type: "object",
          properties: {
            projectKey: {
              type: "string",
              description:
                "The Jira project key (e.g., 'KAN'). Defaults to the configured project key.",
            },
            limit: {
              type: "number",
              description:
                "The maximum number of issues to return. Defaults to 100.",
              default: 100,
            },
          },
          required: [],
        },
      },
      {
        name: "updateJiraIssue",
        description:
          "Update fields on a specific Jira issue, such as its summary or description.",
        parameters: {
          type: "object",
          properties: {
            issueKey: {
              type: "string",
              description: "The key of the issue to update (e.g., 'KAN-123').",
            },
            summary: {
              type: "string",
              description: "The new summary (title) for the issue.",
            },
            description: {
              type: "string",
              description: "The new description for the issue (in plain text).",
            },
          },
          required: ["issueKey"],
        },
      },
      {
        name: "createJiraIssue",
        description: "Create a new issue in a Jira project.",
        parameters: {
          type: "object",
          properties: {
            projectKey: {
              type: "string",
              description:
                "The Jira project key (e.g., 'KAN'). Defaults to the configured project key.",
            },
            summary: {
              type: "string",
              description: "The summary (title) for the new issue.",
            },
            description: {
              type: "string",
              description: "The description for the new issue (in plain text).",
            },
            issueType: {
              type: "string",
              description:
                "The type of the issue, e.g., 'Task', 'Story', 'Bug'. Defaults to 'Task'.",
              default: "Task",
            },
          },
          required: ["summary"],
        },
      },
    ];
  }

  getAvailableFunctions() {
    return {
      readAllJiraIssues: this.readAllJiraIssues.bind(this),
      updateJiraIssue: this.updateJiraIssue.bind(this),
      createJiraIssue: this.createJiraIssue.bind(this),
    };
  }

  async readAllJiraIssues(params = {}) {
    try {
      const {
        projectKey = process.env.JIRA_PROJECT_KEY || "KAN",
        limit = 100,
      } = params;
      const fields = ["key", "summary", "status", "updated"];

      // Using the exact logic from the working fetchJiraIssues helper
      const jql = `project = ${projectKey} ORDER BY updated DESC`;
      const fieldsParam = fields.join(",");
      const url = `https://fusioncalhacks.atlassian.net/rest/api/3/search/jql`;

      const response = await axios.get(url, {
        params: {
          jql,
          maxResults: Math.min(limit, 100),
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

      const issues = (response.data.issues || []).map((issue) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        updated: issue.fields.updated,
      }));

      return { success: true, data: { count: issues.length, issues: issues } };
    } catch (error) {
      const errorMsg =
        error.response?.data?.errorMessages?.join(", ") || error.message;
      return { success: false, error: errorMsg };
    }
  }

  async updateJiraIssue(params = {}) {
    try {
      const { issueKey, summary, description } = params;
      if (!issueKey) {
        throw new Error("issueKey is required to update an issue.");
      }

      const fieldsPayload = {};
      if (summary) fieldsPayload.summary = summary;
      if (description) {
        fieldsPayload.description = {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: description }],
            },
          ],
        };
      }

      if (Object.keys(fieldsPayload).length === 0) {
        return {
          success: false,
          error: "Nothing to update. Provide summary or description.",
        };
      }

      await this.apiClient.put(`/rest/api/3/issue/${issueKey}`, {
        fields: fieldsPayload,
      });

      return {
        success: true,
        data: { issueKey, message: "Issue updated successfully." },
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.errorMessages ||
        error.response?.data?.errors ||
        error.message;
      return { success: false, error: errorMsg };
    }
  }

  async createJiraIssue(params = {}) {
    try {
      const {
        projectKey = process.env.JIRA_PROJECT_KEY || "KAN",
        summary,
        description,
        issueType = "Task",
      } = params;
      if (!summary) {
        throw new Error("summary is required to create an issue.");
      }

      const fieldsPayload = {
        project: { key: projectKey },
        summary,
        issuetype: { name: issueType },
      };

      if (description) {
        fieldsPayload.description = {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: description }],
            },
          ],
        };
      }

      const response = await this.apiClient.post("/rest/api/3/issue", {
        fields: fieldsPayload,
      });

      return {
        success: true,
        data: { key: response.data.key, self: response.data.self },
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.errorMessages ||
        error.response?.data?.errors ||
        error.message;
      return { success: false, error: errorMsg };
    }
  }
}

module.exports = JiraTools;
