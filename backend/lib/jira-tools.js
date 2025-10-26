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

  // Resolve a Jira Cloud accountId from an assignee name or email
  async resolveAssigneeAccountId({ assignee, assigneeEmail }) {
    try {
      const query = assigneeEmail || assignee;
      if (!query) return null;

      const resp = await this.apiClient.get("/rest/api/3/user/search", {
        params: { query },
      });
      const users = Array.isArray(resp.data) ? resp.data : [];
      const match = users[0];
      return match?.accountId || null;
    } catch (_err) {
      return null;
    }
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
            assignee: {
              type: "string",
              description:
                "Optional assignee display name (or partial) to assign the issue to.",
            },
            assigneeEmail: {
              type: "string",
              description:
                "Optional assignee email to assign the issue (preferred for accuracy).",
            },
            githubIssueUrl: {
              type: "string",
              description:
                "Optional GitHub issue URL to add as a Jira comment after creation.",
            },
            commentText: {
              type: "string",
              description:
                "Optional freeform text to include in the Jira comment before the link.",
            },
            linkText: {
              type: "string",
              description:
                "Optional link label for the GitHub URL when commenting. Defaults to 'GitHub issue'.",
              default: "GitHub issue",
            },
          },
          required: ["summary"],
        },
      },
      {
        name: "addJiraComment",
        description:
          "Add a comment to a Jira issue (e.g., include a GitHub issue link).",
        parameters: {
          type: "object",
          properties: {
            issueKey: {
              type: "string",
              description:
                "The key of the issue to comment on (e.g., 'KAN-123').",
            },
            comment: {
              type: "string",
              description:
                "Optional freeform comment text to include before the link.",
            },
            linkUrl: {
              type: "string",
              description:
                "Optional URL to include as a clickable link in the comment (e.g., a GitHub issue).",
            },
            linkText: {
              type: "string",
              description:
                "Optional label for the link. Defaults to 'GitHub issue'.",
              default: "GitHub issue",
            },
          },
          required: ["issueKey"],
        },
      },
    ];
  }

  getAvailableFunctions() {
    return {
      readAllJiraIssues: this.readAllJiraIssues.bind(this),
      updateJiraIssue: this.updateJiraIssue.bind(this),
      createJiraIssue: this.createJiraIssue.bind(this),
      addJiraComment: this.addJiraComment.bind(this),
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
        assignee,
        assigneeEmail,
        githubIssueUrl,
        commentText,
        linkText = "GitHub issue",
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

      // Assign issue if assignee provided (resolve to accountId)
      const accountId = await this.resolveAssigneeAccountId({
        assignee,
        assigneeEmail,
      });
      if (accountId) {
        fieldsPayload.assignee = { id: accountId };
      }

      const response = await this.apiClient.post("/rest/api/3/issue", {
        fields: fieldsPayload,
      });

      // Optionally add a comment with GitHub link
      try {
        if (githubIssueUrl || commentText) {
          await this.addJiraComment({
            issueKey: response.data.key,
            comment: commentText,
            linkUrl: githubIssueUrl,
            linkText,
          });
        }
      } catch (_err) {
        // Do not fail overall creation if commenting fails
      }

      return {
        success: true,
        data: {
          key: response.data.key,
          self: response.data.self,
          browseUrl: `${this.baseUrl}/browse/${response.data.key}`,
        },
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.errorMessages ||
        error.response?.data?.errors ||
        error.message;
      return { success: false, error: errorMsg };
    }
  }

  async addJiraComment(params = {}) {
    try {
      const { issueKey, comment, linkUrl, linkText = "GitHub issue" } = params;
      if (!issueKey) {
        throw new Error("issueKey is required to add a comment.");
      }

      if (!comment && !linkUrl) {
        return {
          success: false,
          error: "Provide at least one of: comment or linkUrl.",
        };
      }

      // Build ADF body for the comment. If linkUrl provided, include clickable link.
      const paragraphContent = [];
      if (comment && typeof comment === "string" && comment.trim()) {
        paragraphContent.push({ type: "text", text: comment.trim() });
        if (linkUrl) {
          paragraphContent.push({ type: "text", text: " " });
        }
      }
      if (linkUrl && typeof linkUrl === "string") {
        paragraphContent.push({
          type: "text",
          text: linkText || "Link",
          marks: [
            {
              type: "link",
              attrs: { href: linkUrl },
            },
          ],
        });
      }

      const adfBody = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: paragraphContent.length > 0 ? paragraphContent : [],
          },
        ],
      };

      const response = await this.apiClient.post(
        `/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`,
        { body: adfBody }
      );

      return {
        success: true,
        data: {
          id: response.data?.id,
          self: response.data?.self,
        },
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
