const axios = require("axios");
const db = require("./database");

class PokeTools {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("Poke API key is required");
    }
    this.apiKey = apiKey;
    this.apiUrl = "https://poke.com/api/v1/inbound-sms/webhook";
  }

  getFunctionDeclarations() {
    return [
      {
        name: "sendChatToPoke",
        description:
          "Send the current conversation or a custom message to the user's phone via Poke SMS. " +
          "Use this when the user asks to 'send to my phone', 'poke me', 'text me this', 'send this conversation to my phone', etc.",
        parameters: {
          type: "object",
          properties: {
            conversationId: {
              type: "string",
              description:
                "The conversation ID to send (required to fetch chat history)",
            },
            customMessage: {
              type: "string",
              description:
                "Optional: Send a custom message instead of the full chat. If omitted, sends recent conversation.",
            },
            includeLastN: {
              type: "number",
              description:
                "Number of recent messages to include (default: 5, max: 10)",
              default: 5,
            },
          },
          required: ["conversationId"],
        },
      },
    ];
  }

  getAvailableFunctions() {
    return {
      sendChatToPoke: this.sendChatToPoke.bind(this),
    };
  }

  async sendChatToPoke(params = {}) {
    try {
      const { conversationId, customMessage, includeLastN = 5 } = params;

      if (!conversationId) {
        return {
          success: false,
          error: "conversationId is required",
          code: "MISSING_CONVERSATION_ID",
        };
      }

      let message = "";

      if (customMessage) {
        message = customMessage;
      } else {
        const conversation = await db.getConversation(conversationId);

        if (!conversation || !conversation.messages) {
          return {
            success: false,
            error: "Conversation not found or has no messages",
            code: "CONVERSATION_NOT_FOUND",
          };
        }

        const limit = Math.min(Math.max(includeLastN, 1), 10);
        const recentMessages = conversation.messages
          .slice(-limit)
          .map((m) => {
            const role = m.role === "user" ? "You" : "AI";
            const content =
              (m.content || "").length > 150
                ? (m.content || "").substring(0, 147) + "..."
                : m.content || "";
            return `${role}: ${content}`;
          })
          .join("\n\n");

        const title = conversation.title || "Your Chat";

        message = `📱 ${title}\n\n${recentMessages}\n\n- Sent from Fusion`;
      }

      if (message.length > 1600) {
        message = message.substring(0, 1597) + "...";
      }

      const response = await axios.post(
        this.apiUrl,
        { message },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      console.log("✅ Poke message sent successfully");

      return {
        success: true,
        data: {
          messageSent: true,
          messageLength: message.length,
          pokeResponse: response.data,
        },
        message: "📱 Message sent to your phone via Poke!",
      };
    } catch (error) {
      console.error("❌ Poke send error:", error.message);

      const errorDetails = error.response?.data || error.message;

      return {
        success: false,
        error:
          typeof errorDetails === "string"
            ? errorDetails
            : JSON.stringify(errorDetails),
        code: error.code || "POKE_SEND_ERROR",
      };
    }
  }
}

module.exports = PokeTools;
