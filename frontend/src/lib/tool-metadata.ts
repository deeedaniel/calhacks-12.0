export interface ToolMetadata {
  icon: string;
  label: string;
  getDescription: (args: Record<string, unknown>) => string;
}

export const TOOL_METADATA: Record<string, ToolMetadata> = {
  // GitHub tools
  getDailyCommits: {
    icon: "📊",
    label: "GitHub Activity",
    getDescription: (args) => `Fetching commits from the past ${args.days || 7} days`,
  },
  createGithubIssue: {
    icon: "🐛",
    label: "Create Issue",
    getDescription: (args) => `Creating GitHub issue: "${args.title}"`,
  },
  listGithubIssues: {
    icon: "📋",
    label: "List Issues",
    getDescription: (args) =>
      `Fetching ${args.state || "open"} issues${args.assignee ? ` for ${args.assignee}` : ""}`,
  },
  getGithubIssueDetails: {
    icon: "🔍",
    label: "Issue Details",
    getDescription: (args) => `Getting details for issue #${args.issueNumber}`,
  },
  listPullRequests: {
    icon: "🔀",
    label: "Pull Requests",
    getDescription: (args) =>
      `Fetching ${args.state || "open"} pull requests`,
  },
  requestCodeRabbitReview: {
    icon: "🤖",
    label: "CodeRabbit Review",
    getDescription: (args) => `Requesting CodeRabbit review for PR #${args.prNumber}`,
  },

  // Notion tools
  getProjectContext: {
    icon: "📁",
    label: "Project Context",
    getDescription: () => "Fetching project overview and context",
  },
  getNotionPage: {
    icon: "📄",
    label: "Notion Page",
    getDescription: (args) =>
      `Loading ${args.type || "page"} from Notion`,
  },
  addNotionTask: {
    icon: "✅",
    label: "Add Task",
    getDescription: (args) => `Adding task: "${args.title}"`,
  },

  // Slack tools
  postSlackMessage: {
    icon: "💬",
    label: "Send Message",
    getDescription: (args) => `Posting to #${args.channel}`,
  },
  dmSlackUser: {
    icon: "📩",
    label: "Send DM",
    getDescription: (args) => `Sending DM to ${args.email || "user"}`,
  },
  getSlackUserByEmail: {
    icon: "👤",
    label: "Lookup User",
    getDescription: (args) => `Looking up Slack user: ${args.email}`,
  },
  uploadSlackFileByUrl: {
    icon: "📎",
    label: "Upload File",
    getDescription: (args) => `Uploading file to Slack`,
  },
  getSlackChatHistory: {
    icon: "💭",
    label: "Chat History",
    getDescription: (args) => `Fetching messages from #${args.channel}`,
  },

  // Team tools
  getTeamMembers: {
    icon: "👥",
    label: "Team Members",
    getDescription: () => "Fetching team member list",
  },
  suggestAssigneesForTask: {
    icon: "🎯",
    label: "Find Assignees",
    getDescription: (args) => `Finding best assignees for: "${args.taskTitle}"`,
  },
};

export function getToolMetadata(toolName: string): ToolMetadata {
  return (
    TOOL_METADATA[toolName] || {
      icon: "🔧",
      label: toolName,
      getDescription: () => `Executing ${toolName}`,
    }
  );
}

