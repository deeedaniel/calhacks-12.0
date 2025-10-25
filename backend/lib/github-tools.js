const axios = require("axios");

class GithubTools {
  constructor(accessToken) {
    if (!accessToken) {
      throw new Error("GitHub access token is required");
    }

    this.accessToken = accessToken;
    this.apiBaseUrl = "https://api.github.com";

    this.owner = "deeedaniel"; // hardcoded per requirements
    this.repo = "calhacks-12.0"; // hardcoded per requirements

    this.client = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
  }

  getFunctionDeclarations() {
    return [
      {
        name: "getDailyCommits",
        description:
          "Get repository commits since a given ISO time (default last 24h). Useful when asked to summarize today's commits.",
        parameters: {
          type: "object",
          properties: {
            since: {
              type: "string",
              description:
                "ISO 8601 timestamp in UTC to filter commits since then. Optional; defaults to now-24h.",
            },
          },
          required: [],
        },
      },
      {
        name: "createGithubIssue",
        description:
          "Create a GitHub issue in the hardcoded repository, returning the issue URL and number.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Issue title" },
            body: {
              type: "string",
              description:
                "Issue body/description. Include context and acceptance criteria if available.",
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Optional list of labels to apply",
              default: [],
            },
          },
          required: ["title"],
        },
      },
    ];
  }

  getAvailableFunctions() {
    return {
      getDailyCommits: this.getDailyCommits.bind(this),
      createGithubIssue: this.createGithubIssue.bind(this),
    };
  }

  async getDailyCommits(params = {}) {
    try {
      const { since } = params;

      let sinceIso;
      if (since) {
        sinceIso = since;
      } else {
        const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
        sinceIso = d.toISOString();
      }

      const url = `/repos/${this.owner}/${this.repo}/commits`;
      const response = await this.client.get(url, {
        params: { since: sinceIso },
      });

      const items = Array.isArray(response.data) ? response.data : [];
      const commits = items.map((c) => ({
        message: c?.commit?.message || "",
        html_url: c?.html_url || "",
        author: c?.commit?.author?.name || c?.author?.login || "",
        timestamp: c?.commit?.author?.date || "",
        sha: c?.sha || "",
      }));

      return {
        success: true,
        data: {
          owner: this.owner,
          repo: this.repo,
          since: sinceIso,
          count: commits.length,
          commits,
        },
        message: `Fetched ${commits.length} commits since ${sinceIso}`,
      };
    } catch (error) {
      console.error(
        "GitHub API Error (getDailyCommits):",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        code: error.response?.status || "UNKNOWN",
      };
    }
  }

  async createGithubIssue(params) {
    try {
      const { title, body = "", labels = [] } = params || {};
      if (!title) {
        throw new Error("title is required");
      }

      const url = `/repos/${this.owner}/${this.repo}/issues`;
      const response = await this.client.post(url, {
        title,
        body,
        labels,
      });

      return {
        success: true,
        data: {
          number: response.data?.number,
          html_url: response.data?.html_url,
          title: response.data?.title,
          state: response.data?.state,
        },
        message: `Issue #${response.data?.number} created: ${response.data?.html_url}`,
      };
    } catch (error) {
      console.error(
        "GitHub API Error (createGithubIssue):",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        code: error.response?.status || "UNKNOWN",
      };
    }
  }
}

module.exports = GithubTools;
