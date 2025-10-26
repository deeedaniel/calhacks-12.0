const axios = require("axios");
const FormData = require("form-data");

class SlackTools {
  constructor(userToken) {
    if (!userToken) {
      throw new Error("Slack user token is required");
    }

    this.userToken = userToken;
    this.apiBaseUrl = "https://slack.com/api";

    this.client = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        Authorization: `Bearer ${this.userToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });

    this.defaultChannels = {
      general: process.env.SLACK_CHANNEL_GENERAL || "C09NJS10869",
      backend: process.env.SLACK_CHANNEL_BACKEND || "C09NNALTW74",
      frontend: process.env.SLACK_CHANNEL_FRONTEND || "C09NL8GRZ2A",
    };
  }

  // Best-effort scope diagnostics from Slack response headers
  logScopeDiagnostics(context, respOrErr) {
    try {
      const headers = respOrErr?.headers || respOrErr?.response?.headers || {};
      const accepted =
        headers["x-accepted-oauth-scopes"] ||
        headers["X-Accepted-OAuth-Scopes"];
      const granted = headers["x-oauth-scopes"] || headers["X-OAuth-Scopes"];
      const status = respOrErr?.status || respOrErr?.response?.status || "";
      const data = respOrErr?.data || respOrErr?.response?.data || {};
      const err = data?.error || respOrErr?.message || "unknown_error";
      if (accepted || granted || err) {
        console.warn(
          `[SlackScopes] ${context} failed. status=${status} error=${err} accepted_scopes="${
            accepted || ""
          }" granted_scopes="${granted || ""}"`
        );
      }
      return {
        acceptedScopes:
          typeof accepted === "string"
            ? accepted.split(",").map((s) => s.trim())
            : [],
        grantedScopes:
          typeof granted === "string"
            ? granted.split(",").map((s) => s.trim())
            : [],
      };
    } catch (_) {
      return { acceptedScopes: [], grantedScopes: [] };
    }
  }

  getFunctionDeclarations() {
    return [
      {
        name: "postSlackMessage",
        description:
          "Post a message to a Slack channel. If no channel is provided, defaults to the 'general' mapped channel.",
        parameters: {
          type: "object",
          properties: {
            channel: {
              type: "string",
              description:
                "Channel ID to post to (e.g., C0123456789). For DMs, prefer dmSlackUser.",
            },
            channelName: {
              type: "string",
              enum: ["general", "backend", "frontend"],
              description:
                "Friendly channel name to map to a configured channel ID. Defaults to 'general' if omitted.",
            },
            text: { type: "string", description: "Message text to send" },
            threadTs: {
              type: "string",
              description: "Optional thread timestamp to reply in a thread",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "dmSlackUser",
        description:
          "Send a direct message to a Slack user by userId or email. Automatically opens a DM if needed.",
        parameters: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "Slack user ID (e.g., U123...)",
            },
            email: {
              type: "string",
              description: "User email to resolve to ID",
            },
            text: { type: "string", description: "Message text to send" },
          },
          required: ["text"],
        },
      },
      {
        name: "getSlackUserByEmail",
        description: "Look up Slack user profile by email address.",
        parameters: {
          type: "object",
          properties: {
            email: { type: "string", description: "User email" },
          },
          required: ["email"],
        },
      },
      {
        name: "uploadSlackFileByUrl",
        description:
          "Upload a file to Slack by URL. Can target channels or a DM thread.",
        parameters: {
          type: "object",
          properties: {
            fileUrl: {
              type: "string",
              description: "Publicly accessible file URL",
            },
            channels: {
              type: "array",
              items: { type: "string" },
              description: "Optional list of channel IDs to upload into",
              default: [],
            },
            threadTs: {
              type: "string",
              description: "Optional thread timestamp to attach the file in",
            },
            filename: { type: "string", description: "Override filename" },
            title: {
              type: "string",
              description: "Optional title for the file",
            },
            initialComment: {
              type: "string",
              description: "Optional comment to include with the upload",
            },
          },
          required: ["fileUrl"],
        },
      },
      {
        name: "getSlackChatHistory",
        description:
          "Fetch recent chat messages from a channel or DM, optionally a specific thread. Use this to summarize conversations.",
        parameters: {
          type: "object",
          properties: {
            channel: {
              type: "string",
              description:
                "Channel ID. If not provided, specify userId or email to fetch DM",
            },
            channelName: {
              type: "string",
              enum: ["general", "backend", "frontend"],
              description:
                "Friendly channel name to map to a configured channel ID (e.g., 'general').",
            },
            userId: {
              type: "string",
              description: "Slack user ID to open/fetch DM channel",
            },
            email: {
              type: "string",
              description: "Email to resolve user and open/fetch DM channel",
            },
            threadTs: {
              type: "string",
              description: "If provided, fetch replies for this thread only",
            },
            limit: {
              type: "number",
              description: "Max messages to return",
              default: 50,
            },
            oldest: {
              type: "string",
              description: "Oldest message ts (as string) to include",
            },
            latest: {
              type: "string",
              description: "Latest message ts (as string) to include",
            },
            inclusive: {
              type: "boolean",
              description: "Include messages at oldest/latest timestamps",
              default: true,
            },
          },
          required: [],
        },
      },
    ];
  }

  getAvailableFunctions() {
    return {
      postSlackMessage: this.postSlackMessage.bind(this),
      dmSlackUser: this.dmSlackUser.bind(this),
      getSlackUserByEmail: this.getSlackUserByEmail.bind(this),
      uploadSlackFileByUrl: this.uploadSlackFileByUrl.bind(this),
      getSlackChatHistory: this.getSlackChatHistory.bind(this),
    };
  }

  async getSlackUserByEmail(params) {
    try {
      const { email } = params || {};
      if (!email) {
        throw new Error("email is required");
      }

      const response = await this.client.get("/users.lookupByEmail", {
        params: { email },
      });

      if (!response.data?.ok) {
        const scopeInfo = this.logScopeDiagnostics(
          "users.lookupByEmail",
          response
        );
        return {
          success: false,
          error: response.data?.error || "slack_error",
          code: "SLACK_API_ERROR",
          ...scopeInfo,
        };
      }

      return {
        success: true,
        data: response.data.user,
        message: "User found",
      };
    } catch (error) {
      const scopeInfo = this.logScopeDiagnostics("users.lookupByEmail", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        code: error.response?.status || "UNKNOWN",
        ...scopeInfo,
      };
    }
  }

  async postSlackMessage(params) {
    try {
      const { channel, channelName, text, threadTs } = params || {};
      if (!text) {
        throw new Error("text is required");
      }

      // Resolve target channel
      let targetChannel = channel;
      if (!targetChannel) {
        const key = (channelName || "general").toLowerCase();
        targetChannel =
          this.defaultChannels[key] || this.defaultChannels.general;
      }

      const body = { channel: targetChannel, text };
      if (threadTs) body.thread_ts = threadTs;

      const response = await this.client.post("/chat.postMessage", body);
      if (!response.data?.ok) {
        const scopeInfo = this.logScopeDiagnostics(
          "chat.postMessage",
          response
        );
        return {
          success: false,
          data: response.data,
          message: response.data?.error || "slack_error",
          ...scopeInfo,
        };
      }
      return { success: true, data: response.data, message: "Message posted" };
    } catch (error) {
      const scopeInfo = this.logScopeDiagnostics("chat.postMessage", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        code: error.response?.status || "UNKNOWN",
        ...scopeInfo,
      };
    }
  }

  async dmSlackUser(params) {
    try {
      let { userId, email, text } = params || {};
      if (!text || (!userId && !email)) {
        throw new Error("text and (userId or email) are required");
      }

      // Resolve email to userId if needed
      if (!userId && email) {
        const lookup = await this.getSlackUserByEmail({ email });
        if (!lookup.success) {
          return lookup;
        }
        userId = lookup.data?.id;
      }

      // Try posting directly to user ID (works in many workspaces)
      let postResp = await this.client.post("/chat.postMessage", {
        channel: userId,
        text,
      });

      if (
        !postResp.data?.ok &&
        ["channel_not_found", "not_in_channel"].includes(postResp.data?.error)
      ) {
        // Open DM first, then post to the resulting channel
        const openResp = await this.client.post("/conversations.open", {
          users: userId,
        });
        if (!openResp.data?.ok) {
          const scopeInfo = this.logScopeDiagnostics(
            "conversations.open",
            openResp
          );
          return {
            success: false,
            error: openResp.data?.error || "failed_to_open_dm",
            code: "SLACK_OPEN_DM_FAILED",
            ...scopeInfo,
          };
        }
        const dmChannelId = openResp.data?.channel?.id;
        postResp = await this.client.post("/chat.postMessage", {
          channel: dmChannelId,
          text,
        });
      }

      if (!postResp.data?.ok) {
        const scopeInfo = this.logScopeDiagnostics(
          "chat.postMessage",
          postResp
        );
        return {
          success: false,
          data: postResp.data,
          message: postResp.data?.error || "slack_error",
          ...scopeInfo,
        };
      }
      return { success: true, data: postResp.data, message: "DM sent" };
    } catch (error) {
      const scopeInfo = this.logScopeDiagnostics("dmSlackUser", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        code: error.response?.status || "UNKNOWN",
        ...scopeInfo,
      };
    }
  }

  async uploadSlackFileByUrl(params) {
    try {
      const { fileUrl, channels, threadTs, filename, title, initialComment } =
        params || {};
      if (!fileUrl) {
        throw new Error("fileUrl is required");
      }

      const fileResp = await axios.get(fileUrl, { responseType: "stream" });
      const derivedName =
        filename || new URL(fileUrl).pathname.split("/").pop() || "upload";

      const form = new FormData();
      form.append("file", fileResp.data, { filename: derivedName });
      if (channels && Array.isArray(channels) && channels.length > 0) {
        form.append("channels", channels.join(","));
      }
      if (typeof channels === "string" && channels.trim()) {
        form.append("channels", channels.trim());
      }
      if (threadTs) form.append("thread_ts", threadTs);
      if (title) form.append("title", title);
      if (initialComment) form.append("initial_comment", initialComment);

      const headers = {
        ...form.getHeaders(),
        Authorization: `Bearer ${this.userToken}`,
      };

      const uploadResp = await axios.post(
        `${this.apiBaseUrl}/files.upload`,
        form,
        { headers }
      );

      if (!uploadResp.data?.ok) {
        const scopeInfo = this.logScopeDiagnostics("files.upload", uploadResp);
        return {
          success: false,
          data: uploadResp.data,
          message: uploadResp.data?.error || "slack_error",
          ...scopeInfo,
        };
      }
      return { success: true, data: uploadResp.data, message: "File uploaded" };
    } catch (error) {
      const scopeInfo = this.logScopeDiagnostics("files.upload", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        code: error.response?.status || "UNKNOWN",
        ...scopeInfo,
      };
    }
  }

  async getSlackChatHistory(params = {}) {
    try {
      let {
        channel,
        channelName,
        userId,
        email,
        threadTs,
        limit = 50,
        oldest,
        latest,
        inclusive = true,
      } = params;

      // Resolve mapped channel by friendly name if provided
      if (!channel && channelName) {
        const key = String(channelName).toLowerCase();
        if (this.defaultChannels[key]) {
          channel = this.defaultChannels[key];
        }
      }

      // Resolve DM channel from user/email if channel isn't provided
      if (!channel && (userId || email)) {
        if (!userId && email) {
          const lookup = await this.getSlackUserByEmail({ email });
          if (!lookup.success) {
            return lookup;
          }
          userId = lookup.data?.id;
        }

        const openResp = await this.client.post("/conversations.open", {
          users: userId,
        });
        if (!openResp.data?.ok) {
          const scopeInfo = this.logScopeDiagnostics(
            "conversations.open",
            openResp
          );
          return {
            success: false,
            error: openResp.data?.error || "failed_to_open_dm",
            code: "SLACK_OPEN_DM_FAILED",
            ...scopeInfo,
          };
        }
        channel = openResp.data?.channel?.id;
      }

      // As a final fallback, default to the 'general' mapped channel
      if (!channel) {
        channel = this.defaultChannels.general;
      }

      // Fetch history or thread replies
      const endpoint = threadTs
        ? "/conversations.replies"
        : "/conversations.history";
      const paramsObj = {
        channel,
        limit: Math.min(limit, 200),
        inclusive: inclusive ? 1 : 0,
      };
      if (oldest) paramsObj.oldest = oldest;
      if (latest) paramsObj.latest = latest;
      if (threadTs) paramsObj.ts = threadTs;

      const historyResp = await this.client.get(endpoint, {
        params: paramsObj,
      });
      if (!historyResp.data?.ok) {
        const scopeInfo = this.logScopeDiagnostics(endpoint, historyResp);
        return {
          success: false,
          error: historyResp.data?.error || "slack_error",
          code: "SLACK_API_ERROR",
          ...scopeInfo,
        };
      }

      const messages = Array.isArray(historyResp.data.messages)
        ? historyResp.data.messages
        : [];

      // Map essential fields for summarization
      const simplified = messages.map((m) => ({
        ts: m.ts,
        user: m.user || m.username || null,
        text: m.text || "",
        thread_ts: m.thread_ts || null,
        reply_count: m.reply_count || 0,
        subtype: m.subtype || null,
      }));

      return {
        success: true,
        data: {
          channel,
          threadTs: threadTs || null,
          count: simplified.length,
          messages: simplified,
          raw: historyResp.data,
        },
        message: `Fetched ${simplified.length} message(s)`,
      };
    } catch (error) {
      const scopeInfo = this.logScopeDiagnostics(
        "conversations.history|replies",
        error
      );
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        code: error.response?.status || "UNKNOWN",
        ...scopeInfo,
      };
    }
  }
}

module.exports = SlackTools;
