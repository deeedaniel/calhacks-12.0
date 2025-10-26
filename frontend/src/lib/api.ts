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
  | { type: "conversation"; data: { conversationId: string } }
  | { type: "token"; data: { delta: string } }
  | {
      type: "tool_call";
      data: { name: string; args: Record<string, unknown> };
    }
  | {
      type: "tool_result";
      data: {
        name: string;
        success: boolean;
        result?: unknown;
        error?: string;
      };
    }
  | { type: "status"; data: { message: string } }
  | { type: "error"; data: { message: string } }
  | {
      type: "done";
      data: {
        finalText: string;
        conversationId: string;
        functionCalls: Array<{ name: string; args?: Record<string, unknown> }>;
        functionResults: Array<{
          name: string;
          success: boolean;
          result?: unknown;
          error?: string;
        }>;
        usage?: unknown;
      };
    };

export async function chatStream(
  body: ChatRequestBody,
  onEvent: (evt: ChatStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  const emit = (type: ChatStreamEvent["type"], data: any) =>
    onEvent({ type, data } as ChatStreamEvent);

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);

      let eventType: string | null = null;
      const dataLines: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }
      if (!eventType) continue;
      const dataRaw = dataLines.join("\n");
      try {
        const parsed = dataRaw ? JSON.parse(dataRaw) : null;
        emit(eventType as any, parsed);
      } catch {
        // ignore malformed JSON
      }
    }
  }
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
