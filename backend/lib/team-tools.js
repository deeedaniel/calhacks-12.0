const db = require("./database");

class TeamTools {
  constructor() {}

  getFunctionDeclarations() {
    return [
      {
        name: "getTeamMembers",
        description:
          "Fetch team members from Supabase users table, including names, emails, and GitHub usernames.",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "suggestAssigneesForTask",
        description:
          "Suggest the most appropriate team members for a task based on title/description keywords. Returns sorted candidates and GitHub usernames for assignment.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Task or issue title" },
            description: {
              type: "string",
              description: "Optional task description for better matching",
            },
            limit: {
              type: "number",
              description: "Max number of suggested assignees",
              default: 1,
            },
          },
          required: ["title"],
        },
      },
    ];
  }

  getAvailableFunctions() {
    return {
      getTeamMembers: this.getTeamMembers.bind(this),
      suggestAssigneesForTask: this.suggestAssigneesForTask.bind(this),
    };
  }

  async getTeamMembers() {
    try {
      const users = await db.getAllUsers();

      const members = (users || []).map((u) => ({
        id: u.id,
        name: u.name || "",
        email: u.email || "",
        github_username: u.github_username || "",
        github_url: u.github_url || "",
        role: u.role || undefined,
        skills: u.skills || undefined,
        tags: u.tags || undefined,
      }));

      return {
        success: true,
        data: { members, count: members.length },
        message: `Fetched ${members.length} team member(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: "TEAM_FETCH_ERROR",
      };
    }
  }

  async suggestAssigneesForTask(params = {}) {
    try {
      const { title, description = "", limit = 1 } = params || {};
      if (!title) throw new Error("title is required");

      const users = await db.getAllUsers();
      const text = `${title} ${description}`.toLowerCase();

      // Simple keyword heuristics
      const keywordGroups = [
        {
          keys: [
            "frontend",
            "react",
            "ui",
            "tailwind",
            "css",
            "vite",
            "component",
            "typescript",
            "tsx",
          ],
          tag: "frontend",
        },
        {
          keys: [
            "backend",
            "api",
            "express",
            "node",
            "server",
            "database",
            "db",
            "postgres",
            "supabase",
            "integration",
            "webhook",
          ],
          tag: "backend",
        },
        { keys: ["notion", "docs", "documentation"], tag: "notion" },
        { keys: ["slack", "message", "notification"], tag: "slack" },
        {
          keys: ["test", "jest", "vitest", "ci", "pipeline", "qa", "quality"],
          tag: "testing",
        },
        {
          keys: [
            "devops",
            "deploy",
            "deployment",
            "infra",
            "infrastructure",
            "docker",
            "k8s",
            "kubernetes",
            "terraform",
            "pipeline",
            "actions",
          ],
          tag: "devops",
        },
        {
          keys: ["mobile", "ios", "android", "react native", "rn"],
          tag: "mobile",
        },
        {
          keys: [
            "data",
            "analytics",
            "etl",
            "airflow",
            "bigquery",
            "warehouse",
            "metric",
          ],
          tag: "data",
        },
      ];

      const matchedTags = new Set();
      for (const group of keywordGroups) {
        if (group.keys.some((k) => text.includes(k)))
          matchedTags.add(group.tag);
      }

      const candidates = (users || []).map((u) => {
        const profileText = `${u.name || ""} ${u.email || ""} ${u.role || ""} ${
          Array.isArray(u.skills) ? u.skills.join(" ") : u.skills || ""
        } ${Array.isArray(u.tags) ? u.tags.join(" ") : u.tags || ""} ${
          u.github_username || ""
        } ${u.github_url || ""}`.toLowerCase();

        let score = 0;
        matchedTags.forEach((tag) => {
          if (profileText.includes(tag)) score += 2;
        });

        // Extra signal for obvious tech keywords
        for (const group of keywordGroups) {
          for (const k of group.keys) {
            if (text.includes(k) && profileText.includes(k)) score += 1;
          }
        }

        // If no signals, keep neutral score 0
        return {
          id: u.id,
          name: u.name || "",
          email: u.email || "",
          github_username: u.github_username || "",
          role: u.role || undefined,
          score,
        };
      });

      // Prefer users with github_username defined
      candidates.sort((a, b) => {
        const ghA = a.github_username ? 1 : 0;
        const ghB = b.github_username ? 1 : 0;
        if (ghA !== ghB) return ghB - ghA;
        if (b.score !== a.score) return b.score - a.score;
        return (a.name || "").localeCompare(b.name || "");
      });

      let top = candidates.slice(0, Math.max(1, limit));
      // Only include valid, non-empty GitHub usernames; allow empty result
      const githubUsernames = top
        .map((c) => c.github_username)
        .filter((u) => typeof u === "string" && u.trim().length > 0);

      return {
        success: true,
        data: {
          candidates,
          recommended: top,
          githubUsernames,
        },
        message: `Suggested ${top.length} assignee(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: "ASSIGNEE_SUGGEST_ERROR",
      };
    }
  }
}

module.exports = TeamTools;
