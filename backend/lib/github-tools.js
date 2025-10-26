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
            assignees: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional list of GitHub usernames to assign to the issue.",
              default: [],
            },
          },
          required: ["title"],
        },
      },
      {
        name: "listGithubIssues",
        description:
          "List GitHub issues with basic information (title, number, state, labels, assignee). Use this to get an overview of multiple issues. Perfect for queries like 'show me all bugs' or 'what issues are assigned to alice'.",
        parameters: {
          type: "object",
          properties: {
            state: {
              type: "string",
              enum: ["open", "closed", "all"],
              description: "Filter by issue state",
              default: "open",
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description:
                "Filter by labels (e.g., ['bug', 'priority-high']). Only issues with ALL specified labels will be returned.",
            },
            assignee: {
              type: "string",
              description:
                "Filter by assignee username. Use 'none' for unassigned issues, '*' for any assigned issue, or a specific username.",
            },
            limit: {
              type: "number",
              description: "Maximum number of issues to return",
              default: 30,
            },
            sort: {
              type: "string",
              enum: ["created", "updated", "comments"],
              description: "What to sort results by",
              default: "created",
            },
            direction: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort direction",
              default: "desc",
            },
          },
          required: [],
        },
      },
      {
        name: "getGithubIssueDetails",
        description:
          "Get detailed information about a specific GitHub issue including full description, all comments, and timeline. Use when you need complete context about one specific issue. Perfect for queries like 'tell me about issue #123' or 'what's the latest on the login bug'.",
        parameters: {
          type: "object",
          properties: {
            issueNumber: {
              type: "number",
              description: "The issue number to get details for",
            },
            includeComments: {
              type: "boolean",
              description: "Include all comments on the issue (default: true)",
              default: true,
            },
            includeTimeline: {
              type: "boolean",
              description:
                "Include full event timeline (labeled, assigned, referenced, etc.). Can be large for old issues (default: false)",
              default: false,
            },
          },
          required: ["issueNumber"],
        },
      },
      {
        name: "listPullRequests",
        description:
          "List GitHub pull requests with basic information (number, title, state, author, reviewers). Use this to discover what PRs exist in the repository. Perfect for queries like 'show me all open PRs' or 'what pull requests need review'.",
        parameters: {
          type: "object",
          properties: {
            state: {
              type: "string",
              enum: ["open", "closed", "all"],
              description: "Filter by PR state",
              default: "open",
            },
            sort: {
              type: "string",
              enum: ["created", "updated", "popularity", "long-running"],
              description: "What to sort results by",
              default: "created",
            },
            direction: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort direction",
              default: "desc",
            },
            limit: {
              type: "number",
              description: "Maximum number of PRs to return",
              default: 30,
            },
          },
          required: [],
        },
      },
      {
        name: "requestCodeRabbitReview",
        description:
          "Trigger CodeRabbit AI to perform automated code review on a pull request. Use when user wants AI-powered analysis, security checks, or code quality review. CodeRabbit will analyze the code and post detailed feedback on the PR. Perfect for queries like 'review PR #45 with CodeRabbit' or 'have CodeRabbit check the security of PR #30'.",
        parameters: {
          type: "object",
          properties: {
            prNumber: {
              type: "number",
              description: "The pull request number to review",
            },
            reviewType: {
              type: "string",
              enum: ["standard", "full", "incremental"],
              description:
                "Type of review: 'standard' for normal review, 'full' for comprehensive analysis of all files, 'incremental' for only new changes since last review",
              default: "standard",
            },
            focusAreas: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "security",
                  "performance",
                  "testing",
                  "style",
                  "best-practices",
                  "documentation",
                ],
              },
              description:
                "Optional specific areas to focus the review on (e.g., ['security', 'performance']). CodeRabbit will pay special attention to these areas.",
              default: [],
            },
            instructions: {
              type: "string",
              description:
                "Optional custom instructions for CodeRabbit (e.g., 'focus on error handling in the auth module')",
              default: "",
            },
          },
          required: ["prNumber"],
        },
      },
    ];
  }

  getAvailableFunctions() {
    return {
      getDailyCommits: this.getDailyCommits.bind(this),
      createGithubIssue: this.createGithubIssue.bind(this),
      listGithubIssues: this.listGithubIssues.bind(this),
      getGithubIssueDetails: this.getGithubIssueDetails.bind(this),
      listPullRequests: this.listPullRequests.bind(this),
      requestCodeRabbitReview: this.requestCodeRabbitReview.bind(this),
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
      let { title, body = "", labels = [], assignees = [] } = params || {};
      if (!title) {
        throw new Error("title is required");
      }

      // Guarantee at least one assignee
      if (!assignees || assignees.length === 0) {
        const fallback = process.env.GITHUB_DEFAULT_ASSIGNEE || this.owner;
        assignees = [fallback];
      }

      const url = `/repos/${this.owner}/${this.repo}/issues`;
      const response = await this.client.post(url, {
        title,
        body,
        labels,
        assignees,
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

  /**
   * List GitHub issues with filtering options
   * @param {Object} params - Filter parameters
   * @returns {Object} List of issues with basic information
   */
  async listGithubIssues(params = {}) {
    try {
      const {
        state = "open",
        labels = [],
        assignee,
        limit = 30,
        sort = "created",
        direction = "desc",
      } = params;

      // Build query parameters for GitHub API
      const queryParams = {
        state,
        per_page: Math.min(limit, 100), // GitHub max is 100 per page
        sort,
        direction,
      };

      // Add labels filter if provided
      if (labels && labels.length > 0) {
        queryParams.labels = labels.join(",");
      }

      // Add assignee filter if provided
      if (assignee) {
        queryParams.assignee = assignee;
      }

      const url = `/repos/${this.owner}/${this.repo}/issues`;
      const response = await this.client.get(url, {
        params: queryParams,
      });

      const items = Array.isArray(response.data) ? response.data : [];

      // Filter out pull requests (GitHub API returns PRs as issues)
      // PRs have a pull_request property
      const issuesOnly = items.filter((item) => !item.pull_request);

      // Format the issues to return only essential information
      const issues = issuesOnly.map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels: issue.labels?.map((label) => label.name) || [],
        assignee: issue.assignee?.login || null,
        assignees: issue.assignees?.map((a) => a.login) || [],
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        closed_at: issue.closed_at,
        comments_count: issue.comments || 0,
        html_url: issue.html_url,
        author: issue.user?.login || "unknown",
      }));

      return {
        success: true,
        data: {
          owner: this.owner,
          repo: this.repo,
          count: issues.length,
          filters: {
            state,
            labels,
            assignee,
            sort,
            direction,
          },
          issues,
        },
        message: `Found ${issues.length} issue(s) matching the criteria`,
      };
    } catch (error) {
      console.error(
        "GitHub API Error (listGithubIssues):",
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
   * Get detailed information about a specific GitHub issue
   * @param {Object} params - Parameters
   * @returns {Object} Detailed issue information
   */
  async getGithubIssueDetails(params) {
    try {
      const {
        issueNumber,
        includeComments = true,
        includeTimeline = false,
      } = params || {};

      if (!issueNumber) {
        throw new Error("issueNumber is required");
      }

      // Get the main issue data
      const issueUrl = `/repos/${this.owner}/${this.repo}/issues/${issueNumber}`;
      const issueResponse = await this.client.get(issueUrl);
      const issue = issueResponse.data;

      // Check if this is actually a pull request
      if (issue.pull_request) {
        return {
          success: false,
          error: `#${issueNumber} is a pull request, not an issue. Use getPullRequestInfo instead.`,
          code: "INVALID_ISSUE_TYPE",
        };
      }

      // Format the base issue data
      const issueDetails = {
        number: issue.number,
        title: issue.title,
        body: issue.body || "",
        state: issue.state,
        labels:
          issue.labels?.map((label) => ({
            name: label.name,
            color: label.color,
            description: label.description || "",
          })) || [],
        author: {
          login: issue.user?.login || "unknown",
          avatar_url: issue.user?.avatar_url,
          html_url: issue.user?.html_url,
        },
        assignee: issue.assignee
          ? {
              login: issue.assignee.login,
              avatar_url: issue.assignee.avatar_url,
              html_url: issue.assignee.html_url,
            }
          : null,
        assignees:
          issue.assignees?.map((a) => ({
            login: a.login,
            avatar_url: a.avatar_url,
            html_url: a.html_url,
          })) || [],
        milestone: issue.milestone
          ? {
              title: issue.milestone.title,
              description: issue.milestone.description || "",
              due_on: issue.milestone.due_on,
              state: issue.milestone.state,
            }
          : null,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        closed_at: issue.closed_at,
        comments_count: issue.comments || 0,
        html_url: issue.html_url,
      };

      // Fetch comments if requested
      if (includeComments && issue.comments > 0) {
        try {
          const commentsUrl = `/repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments`;
          const commentsResponse = await this.client.get(commentsUrl);
          issueDetails.comments = commentsResponse.data.map((comment) => ({
            id: comment.id,
            user: {
              login: comment.user?.login || "unknown",
              avatar_url: comment.user?.avatar_url,
              html_url: comment.user?.html_url,
            },
            body: comment.body || "",
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            html_url: comment.html_url,
          }));
        } catch (commentError) {
          console.warn("Failed to fetch comments:", commentError.message);
          issueDetails.comments = [];
          issueDetails.comments_error = "Failed to fetch comments";
        }
      } else {
        issueDetails.comments = [];
      }

      // Fetch timeline if requested
      if (includeTimeline) {
        try {
          const timelineUrl = `/repos/${this.owner}/${this.repo}/issues/${issueNumber}/timeline`;
          const timelineResponse = await this.client.get(timelineUrl, {
            headers: {
              // Timeline API requires a special media type
              Accept: "application/vnd.github.mockingbird-preview+json",
            },
          });
          issueDetails.timeline = timelineResponse.data.map((event) => ({
            id: event.id,
            event: event.event,
            actor: event.actor
              ? {
                  login: event.actor.login,
                  avatar_url: event.actor.avatar_url,
                }
              : null,
            created_at: event.created_at,
            // Include relevant data based on event type
            ...(event.label && { label: event.label }),
            ...(event.assignee && { assignee: event.assignee.login }),
            ...(event.milestone && { milestone: event.milestone.title }),
            ...(event.commit_id && { commit_id: event.commit_id }),
            ...(event.commit_url && { commit_url: event.commit_url }),
            ...(event.source && { source: event.source }),
          }));
        } catch (timelineError) {
          console.warn("Failed to fetch timeline:", timelineError.message);
          issueDetails.timeline = [];
          issueDetails.timeline_error = "Failed to fetch timeline";
        }
      }

      return {
        success: true,
        data: issueDetails,
        message: `Retrieved details for issue #${issueNumber}`,
      };
    } catch (error) {
      console.error(
        "GitHub API Error (getGithubIssueDetails):",
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
   * List GitHub pull requests with filtering options
   * @param {Object} params - Filter parameters
   * @returns {Object} List of pull requests with basic information
   */
  async listPullRequests(params = {}) {
    try {
      const {
        state = "open",
        sort = "created",
        direction = "desc",
        limit = 30,
      } = params;

      // Build query parameters for GitHub API
      const queryParams = {
        state,
        sort,
        direction,
        per_page: Math.min(limit, 100), // GitHub max is 100 per page
      };

      const url = `/repos/${this.owner}/${this.repo}/pulls`;
      const response = await this.client.get(url, {
        params: queryParams,
      });

      const items = Array.isArray(response.data) ? response.data : [];

      // Format the pull requests to return essential information
      const pullRequests = items.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        draft: pr.draft || false,
        author: pr.user?.login || "unknown",
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        closed_at: pr.closed_at,
        merged_at: pr.merged_at,
        mergeable: pr.mergeable,
        mergeable_state: pr.mergeable_state,
        head: {
          ref: pr.head?.ref || "",
          sha: pr.head?.sha || "",
        },
        base: {
          ref: pr.base?.ref || "",
          sha: pr.base?.sha || "",
        },
        requested_reviewers: pr.requested_reviewers?.map((r) => r.login) || [],
        labels: pr.labels?.map((label) => label.name) || [],
        comments_count: pr.comments || 0,
        review_comments_count: pr.review_comments || 0,
        commits_count: pr.commits || 0,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        changed_files: pr.changed_files || 0,
        html_url: pr.html_url,
      }));

      return {
        success: true,
        data: {
          owner: this.owner,
          repo: this.repo,
          count: pullRequests.length,
          filters: {
            state,
            sort,
            direction,
          },
          pullRequests,
        },
        message: `Found ${pullRequests.length} pull request(s) matching the criteria`,
      };
    } catch (error) {
      console.error(
        "GitHub API Error (listPullRequests):",
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
   * Trigger CodeRabbit AI review on a pull request
   * @param {Object} params - Parameters
   * @returns {Object} CodeRabbit trigger confirmation
   */
  async requestCodeRabbitReview(params) {
    try {
      const {
        prNumber,
        reviewType = "standard",
        focusAreas = [],
        instructions = "",
      } = params || {};

      if (!prNumber) {
        throw new Error("prNumber is required");
      }

      // Verify the PR exists and get its details
      const prUrl = `/repos/${this.owner}/${this.repo}/pulls/${prNumber}`;
      const prResponse = await this.client.get(prUrl);
      const pr = prResponse.data;

      if (!pr) {
        throw new Error(`Pull request #${prNumber} not found`);
      }

      // Check if it's a draft PR
      if (pr.draft) {
        return {
          success: false,
          error: `PR #${prNumber} is a draft. CodeRabbit typically skips draft PRs. Convert it to a regular PR first.`,
          code: "DRAFT_PR",
        };
      }

      // Build the CodeRabbit command
      let command = "@coderabbitai review";

      // Add review type flag
      if (reviewType === "full") {
        command += " --full";
      } else if (reviewType === "incremental") {
        command += " --incremental";
      }

      // Add focus areas
      if (focusAreas && focusAreas.length > 0) {
        command += ` focus on ${focusAreas.join(", ")}`;
      }

      // Add custom instructions
      if (instructions) {
        command += `\n\n${instructions}`;
      }

      // Post the comment to trigger CodeRabbit
      const commentUrl = `/repos/${this.owner}/${this.repo}/issues/${prNumber}/comments`;
      const commentResponse = await this.client.post(commentUrl, {
        body: command,
      });

      return {
        success: true,
        data: {
          prNumber: prNumber,
          prTitle: pr.title,
          prUrl: pr.html_url,
          prState: pr.state,
          reviewType: reviewType,
          focusAreas: focusAreas,
          command: command,
          commentId: commentResponse.data.id,
          commentUrl: commentResponse.data.html_url,
        },
        message: `CodeRabbit review triggered for PR #${prNumber}. Check ${pr.html_url} for results in 1-2 minutes.`,
      };
    } catch (error) {
      console.error(
        "GitHub API Error (requestCodeRabbitReview):",
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
