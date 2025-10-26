export interface ChatRequestBody {
  message: string;
  conversationId?: string;
  userId?: string | null;
  conversationHistory?: unknown[];
}

export interface ChatEndpointResponse {
  success: boolean;
  message: string;
  timestamp: string;
  data: {
    conversationId?: string;
    response: string;
    functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
    functionResults?: Array<{
      name: string;
      result?: unknown;
      error?: string;
      success: boolean;
    }>;
    usage?: unknown;
  } | null;
}

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.replace(/\/$/, "");
  }
  // Use relative path to leverage Vite dev proxy, or same-origin in production
  return "";
}

export async function chatWithBackend(
  body: ChatRequestBody
): Promise<ChatEndpointResponse> {
  const base = getApiBaseUrl();
  const url = `${base}/api/chat`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let json: ChatEndpointResponse;
  try {
    json = (await res.json()) as ChatEndpointResponse;
  } catch (err) {
    throw new Error(`Invalid server response`);
  }

  if (!res.ok || !json.success) {
    const serverMsg = json?.message || `HTTP ${res.status}`;
    throw new Error(serverMsg);
  }

  return json;
}

export type ChatStreamEvent =
  | { type: "meta"; conversationId?: string }
  | { type: "assistant_text"; text: string }
  | {
      type: "function_calls";
      functionCalls: Array<{ name: string; args?: Record<string, unknown> }>;
    }
  | { type: "function_call"; name: string; args?: Record<string, unknown> }
  | {
      type: "function_result";
      name: string;
      success: boolean;
      result?: unknown;
      error?: string;
    }
  | { type: "done"; response: string; conversationId?: string }
  | { type: "error"; message: string };

export interface ChatStreamHandlers {
  onEvent?: (ev: ChatStreamEvent) => void;
  onError?: (err: Error) => void;
  onComplete?: () => void;
}

export function streamChatWithBackend(
  body: ChatRequestBody,
  handlers: ChatStreamHandlers = {}
) {
  const base = getApiBaseUrl();
  const url = `${base}/api/chat/stream`;
  const controller = new AbortController();
  const { onEvent, onError, onComplete } = handlers;

  (async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = raw.split("\n");
          let eventName = "message";
          let dataStr = "";
          for (const ln of lines) {
            if (ln.startsWith("event:")) {
              eventName = ln.slice(6).trim();
            } else if (ln.startsWith("data:")) {
              dataStr += ln.slice(5).trim();
            }
          }

          if (!dataStr) continue;
          try {
            const payload = JSON.parse(dataStr);
            if (onEvent) {
              if (eventName === "assistant_text") {
                onEvent({ type: "assistant_text", text: payload.text || "" });
              } else if (eventName === "function_calls") {
                onEvent({
                  type: "function_calls",
                  functionCalls: payload.functionCalls || [],
                });
              } else if (eventName === "function_call") {
                onEvent({
                  type: "function_call",
                  name: payload.name,
                  args: payload.args || {},
                });
              } else if (eventName === "function_result") {
                onEvent({
                  type: "function_result",
                  name: payload.name,
                  success: !!payload.success,
                  result: payload.result,
                  error: payload.error,
                });
              } else if (eventName === "meta") {
                onEvent({
                  type: "meta",
                  conversationId: payload.conversationId,
                });
              } else if (eventName === "done") {
                onEvent({
                  type: "done",
                  response: payload.response || "",
                  conversationId: payload.conversationId,
                });
              } else if (eventName === "error") {
                onEvent({ type: "error", message: payload.message || "error" });
              }
            }
          } catch (e) {
            // ignore malformed event payloads
          }
        }
      }

      if (onComplete) onComplete();
    } catch (err) {
      if (onError) onError(err as Error);
    }
  })();

  return {
    abort: () => controller.abort(),
  };
}

export async function sendSlackDM(params: {
  email?: string;
  userId?: string;
  text: string;
}): Promise<{ success: boolean; message: string }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/slack/dm-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json().catch(() => ({}));
  return {
    success: !!json?.success,
    message: (json && json.message) || (res.ok ? "ok" : `HTTP ${res.status}`),
  };
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  user_id: string | null;
  updated_at: string;
  created_at: string;
  lastMessage?: {
    id: string;
    content: string;
    role: string;
    created_at: string;
  } | null;
  messageCount?: number;
}

export async function fetchAllConversations(): Promise<ConversationSummary[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/conversations`);
  const json = (await res.json()) as ChatEndpointResponse & {
    data: ConversationSummary[];
  };
  if (!res.ok || !json.success) {
    throw new Error(json?.message || `HTTP ${res.status}`);
  }
  return (json.data as unknown as ConversationSummary[]) || [];
}

export interface ConversationWithMessages extends ConversationSummary {
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
  }>;
}

export async function fetchConversation(
  conversationId: string
): Promise<ConversationWithMessages> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/conversations/${conversationId}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.message || `HTTP ${res.status}`);
  }
  return json.data as ConversationWithMessages;
}
