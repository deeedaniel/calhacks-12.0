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
