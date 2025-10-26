import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowUp } from "lucide-react";
import { cn } from "../lib/utils";
import {
  chatWithBackend,
  fetchConversation,
  streamChatWithBackend,
  sendSlackDM,
} from "../lib/api";
import type { ChatStreamEvent } from "../lib/api";
import { MarkdownRenderer } from "./MarkdownRenderer";

type TaskCard = {
  id: string;
  title: string;
  assigneeName?: string;
  assigneeEmail?: string;
  assigneeGithub?: string;
  githubUrl?: string;
  jiraUrl?: string;
};

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isTyping?: boolean;
  toolCalls?: Array<{ name: string; args?: Record<string, unknown> }>;
  tasks?: TaskCard[];
}

interface ChatProps {
  className?: string;
}

// initial messages can be added here if needed in the future

const suggestedPrompts = [
  "Split work for feature in notion doc",
  "Make PR to fix the typos in main's README",
  "Review and merge the latest PR",
  "Summarize frontend/backend channels",
];

// Map Slack user IDs to friendly names for display in assistant messages
const SLACK_USER_DISPLAY_MAP: Record<string, string> = {
  U09NJS12TNZ: "Daniel Nguyen",
  U09P179S5SM: "Arman Bance",
  U09NFTSC0FM: "Ryan Johnson",
};

function replaceSlackUserIdsWithNames(text: string): string {
  if (!text) return text;
  return text.replace(
    /\bU[0-9A-Z]{8,}\b/g,
    (id) => SLACK_USER_DISPLAY_MAP[id] || id
  );
}

export function Chat({ className }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string>("");
  const [streamToolCalls, setStreamToolCalls] = useState<
    Array<{ name: string; args?: Record<string, unknown> }>
  >([]);
  const streamToolCallsRef = useRef<
    Array<{ name: string; args?: Record<string, unknown> }>
  >([]);
  const [streamTasks, setStreamTasks] = useState<TaskCard[]>([]);
  const pendingByFunctionRef = useRef<
    Record<string, Array<Record<string, unknown>>>
  >({});
  const [conversationId, setConversationId] = useState<string | null>(
    typeof window !== "undefined"
      ? localStorage.getItem("conversationId")
      : null
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing conversation history if we have a stored conversationId
  useEffect(() => {
    const loadHistory = async () => {
      if (!conversationId) return;
      try {
        const conv = await fetchConversation(conversationId);
        const loaded: Message[] = (conv.messages || []).map((m) => ({
          id: m.id,
          content: m.content,
          role: m.role,
          timestamp: new Date(m.created_at),
        }));
        setMessages(loaded);
      } catch (_err) {
        // if fetch fails, clear bad id
        localStorage.removeItem("conversationId");
        setConversationId(null);
      }
    };
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a ref to latest tool calls so 'done' event uses fresh state
  useEffect(() => {
    streamToolCallsRef.current = streamToolCalls;
  }, [streamToolCalls]);

  const upsertTask = (
    taskId: string,
    updates: Partial<TaskCard> & { title?: string }
  ) => {
    setStreamTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === taskId);
      if (idx === -1) {
        const next: TaskCard = {
          id: taskId,
          title: updates.title || taskId,
          assigneeName: updates.assigneeName,
          assigneeEmail: updates.assigneeEmail,
          assigneeGithub: updates.assigneeGithub,
          githubUrl: updates.githubUrl,
          jiraUrl: updates.jiraUrl,
        };
        return [...prev, next];
      } else {
        const cur = prev[idx];
        const merged: TaskCard = {
          ...cur,
          ...updates,
        };
        const copy = [...prev];
        copy[idx] = merged;
        return copy;
      }
    });
  };

  const handleSendSlackDM = async (task: TaskCard) => {
    if (!task.assigneeEmail) return;
    const parts: string[] = [];
    parts.push(`Assigned: ${task.title}`);
    if (task.githubUrl) parts.push(`GitHub: ${task.githubUrl}`);
    if (task.jiraUrl) parts.push(`Jira: ${task.jiraUrl}`);
    const text = parts.join(" | ");
    const resp = await sendSlackDM({ email: task.assigneeEmail, text });
    // Lightweight feedback; could be replaced with toast later
    alert(resp.success ? "Slack DM sent" : `Slack DM failed: ${resp.message}`);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingText("");
    setStreamToolCalls([]);

    try {
      streamChatWithBackend(
        {
          message: userMessage.content,
          conversationId: conversationId || undefined,
          userId: null,
          conversationHistory: messages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          })),
        },
        {
          onEvent: (ev: ChatStreamEvent) => {
            if (ev.type === "meta" && ev.conversationId) {
              if (!conversationId || ev.conversationId !== conversationId) {
                setConversationId(ev.conversationId);
                localStorage.setItem("conversationId", ev.conversationId);
              }
            } else if (ev.type === "assistant_text") {
              setStreamingText((prev) => ev.text || prev);
            } else if (ev.type === "function_calls") {
              setStreamToolCalls((prev) => {
                const next = [...prev];
                for (const fc of ev.functionCalls || []) {
                  if (!next.some((x) => x.name === fc.name)) next.push(fc);
                }
                return next;
              });
            } else if (ev.type === "function_call") {
              setStreamToolCalls((prev) => {
                if (prev.some((x) => x.name === ev.name)) return prev;
                return [...prev, { name: ev.name, args: ev.args }];
              });
              // Track pending args for matching results
              const arr = pendingByFunctionRef.current[ev.name] || [];
              pendingByFunctionRef.current[ev.name] = [...arr, ev.args || {}];
              // Initialize tasks based on known functions
              if (ev.name === "createGithubIssue") {
                const title = String((ev.args as any)?.title || "").trim();
                if (title) {
                  const assignees = ((ev.args as any)?.assignees ||
                    []) as string[];
                  upsertTask(title, {
                    title,
                    assigneeGithub:
                      assignees && assignees.length > 0
                        ? assignees[0]
                        : undefined,
                  });
                }
              } else if (ev.name === "createJiraIssue") {
                const summary = String((ev.args as any)?.summary || "").trim();
                if (summary) {
                  upsertTask(summary, { title: summary });
                }
              } else if (ev.name === "suggestAssigneesForTask") {
                const title = String((ev.args as any)?.title || "").trim();
                if (title) {
                  upsertTask(title, { title });
                }
              }
            } else if (ev.type === "function_result") {
              const queue = pendingByFunctionRef.current[ev.name] || [];
              const args = queue.length > 0 ? queue.shift() : {};
              pendingByFunctionRef.current[ev.name] = queue;
              try {
                if (ev.name === "createGithubIssue" && ev.success) {
                  const title = String((args as any)?.title || "").trim();
                  const ghUrl =
                    (ev.result as any)?.data?.html_url ||
                    (ev.result as any)?.html_url;
                  if (title && ghUrl) upsertTask(title, { githubUrl: ghUrl });
                } else if (ev.name === "createJiraIssue" && ev.success) {
                  const summary = String((args as any)?.summary || "").trim();
                  const jiraUrl =
                    (ev.result as any)?.data?.browseUrl ||
                    (ev.result as any)?.browseUrl;
                  if (summary && jiraUrl) upsertTask(summary, { jiraUrl });
                } else if (
                  ev.name === "suggestAssigneesForTask" &&
                  ev.success
                ) {
                  const title = String((args as any)?.title || "").trim();
                  const rec = (ev.result as any)?.data?.recommended?.[0];
                  if (title && rec) {
                    upsertTask(title, {
                      assigneeName: rec.name,
                      assigneeEmail: rec.email,
                      assigneeGithub: rec.github_username,
                    });
                  }
                }
              } catch (_err) {
                // ignore mapping errors
              }
            } else if (ev.type === "done") {
              const content = ev.response || streamingText || "(No response)";
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content,
                role: "assistant",
                timestamp: new Date(),
                toolCalls: streamToolCallsRef.current,
                tasks: streamTasks,
              };
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamingText("");
              setStreamToolCalls([]);
              setStreamTasks([]);
              pendingByFunctionRef.current = {};
              setIsLoading(false);
            } else if (ev.type === "error") {
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: `Error from server: ${ev.message}`,
                role: "assistant",
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMessage]);
              setIsLoading(false);
            }
          },
          onError: (err) => {
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              content: `Stream error: ${err.message}`,
              role: "assistant",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsLoading(false);
          },
        }
      );
    } catch (err) {
      // Fallback to non-streaming
      try {
        const response = await chatWithBackend({
          message: userMessage.content,
          conversationId: conversationId || undefined,
          userId: null,
          conversationHistory: messages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          })),
        });
        const newConversationId = response.data?.conversationId;
        if (newConversationId && newConversationId !== conversationId) {
          setConversationId(newConversationId);
          localStorage.setItem("conversationId", newConversationId);
        }
        const content = response.data?.response || "";
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: content.length > 0 ? content : "(No response)",
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err2) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content:
            err2 instanceof Error
              ? `Error from server: ${err2.message}`
              : "Unexpected error",
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const isInitial = messages.length === 0;

  if (isInitial) {
    return (
      <div className={cn("flex flex-col h-full bg-black", className)}>
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-2xl text-center">
            <div className=" flex items-center justify-center mb-6 gap-4">
              <div className="h-full rounded-lg flex items-center justify-center">
                <img
                  src="/icon.png"
                  alt="Fusion"
                  className="w-14 h-14 text-white"
                />
              </div>
              <h1 className="text-6xl font-semibold tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Fusion.
              </h1>
            </div>

            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything to get started..."
                className="w-full px-4 py-4 pr-12 bg-gray-800 text-gray-100 placeholder-gray-400 border border-gray-700 rounded-3xl focus:border-white/40 outline-none resize-none tracking-normal"
                rows={1}
                style={{
                  height: "auto",
                  minHeight: "56px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = target.scrollHeight + "px";
                }}
              />

              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-3 top-2 inline-flex items-center justify-center w-10 h-10 rounded-2xl transition-colors",
                  input.trim() && !isLoading
                    ? "bg-white text-black hover:bg-gray-200"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                )}
                aria-label="Send"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
              {suggestedPrompts.map((prompt, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -1, transition: { duration: 0.2 } }}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="p-3 bg-gray-900 border border-gray-700 text-gray-100 rounded-2xl hover:border-white/40 hover:bg-white/5 text-sm transition-colors duration-200 "
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-white" />
                    <p className="text-left tracking-tight">{prompt}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-black relative", className)}>
      {/* Chat Header */}
      {/* <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">AI Assistant</h2>
              <p className="text-sm text-gray-500">Always ready to help</p>
            </div>
          </div>

          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div> */}
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 pt-10 pb-24 space-y-4 scrollbar-nice">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {/* {message.role === "assistant" && (
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )} */}

              <div
                className={cn(
                  "max-w-xs lg:max-w-md px-4 py-1.5 rounded-2xl shadow-sm tracking-normal",
                  message.role === "user"
                    ? "bg-gray-100 text-black"
                    : " text-gray-100"
                )}
              >
                {message.role === "assistant" ? (
                  <>
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="flex gap-2 flex-nowrap overflow-x-auto pb-2 mb-4">
                        {message.toolCalls.map((fc) => (
                          <div
                            key={fc.name}
                            className="px-3 py-1 rounded-full text-xs bg-gray-800 border border-gray-700 text-gray-100 whitespace-nowrap"
                            title={fc.args ? JSON.stringify(fc.args) : fc.name}
                          >
                            {fc.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {message.tasks && message.tasks.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {message.tasks.map((t) => (
                          <div
                            key={t.id}
                            className="border border-gray-700 rounded-xl p-3 bg-gray-900"
                          >
                            <div className="text-sm font-medium mb-1">
                              {t.title}
                            </div>
                            <div className="text-xs text-gray-300 mb-2">
                              {t.assigneeName ? (
                                <span>
                                  Assigned to {t.assigneeName}
                                  {t.assigneeGithub
                                    ? ` (@${t.assigneeGithub})`
                                    : ""}
                                </span>
                              ) : (
                                <span>Assignee: pending</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              {t.githubUrl && (
                                <a
                                  href={t.githubUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs underline text-blue-300 hover:text-blue-200"
                                >
                                  GitHub issue
                                </a>
                              )}
                              {t.jiraUrl && (
                                <a
                                  href={t.jiraUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs underline text-blue-300 hover:text-blue-200"
                                >
                                  Jira task
                                </a>
                              )}
                            </div>
                            {t.assigneeEmail && (
                              <button
                                onClick={() => handleSendSlackDM(t)}
                                className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/20"
                              >
                                DM assignee on Slack
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <MarkdownRenderer
                      content={replaceSlackUserIdsWithNames(message.content)}
                      className="text-md leading-relaxed"
                    />
                  </>
                ) : (
                  <p className="text-md leading-relaxed">{message.content}</p>
                )}
                {/* <div
                  className={cn(
                    "flex items-center justify-between mt-2 text-xs",
                    message.role === "user"
                      ? "text-primary-100"
                      : "text-gray-500"
                  )}
                >
                  <span>{formatTime(message.timestamp)}</span>
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-1">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div> */}
              </div>

              {/* {message.role === "user" && (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )} */}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && streamingText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="rounded-2xl px-4 py-3 shadow-sm max-w-xs lg:max-w-md">
              {streamToolCalls.length > 0 && (
                <div className="flex gap-2 flex-nowrap overflow-x-auto pb-2">
                  {streamToolCalls.map((fc) => (
                    <div
                      key={fc.name}
                      className="px-3 py-1 rounded-full text-xs bg-gray-800 border border-gray-700 text-gray-100 whitespace-nowrap"
                      title={fc.args ? JSON.stringify(fc.args) : fc.name}
                    >
                      {fc.name}
                    </div>
                  ))}
                </div>
              )}
              <MarkdownRenderer
                content={replaceSlackUserIdsWithNames(streamingText)}
                className="text-md leading-relaxed"
              />
            </div>
          </motion.div>
        )}

        {isLoading && !streamingText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="rounded-2xl px-4 py-3 shadow-sm">
              {streamToolCalls.length > 0 && (
                <div className="flex gap-2 flex-nowrap overflow-x-auto pb-2 mb-4">
                  {streamToolCalls.map((fc) => (
                    <div
                      key={fc.name}
                      className="px-3 py-1 rounded-full text-xs bg-gray-800 border border-gray-700 text-gray-100 whitespace-nowrap"
                      title={fc.args ? JSON.stringify(fc.args) : fc.name}
                    >
                      {fc.name}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>
      {/* Bottom fade overlay for smooth message-to-input transition */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-black to-black z-10"></div>
      {/* Input Area */}
      <div className="relative z-20 -mt-4  border-gray-800 px-6 py-4">
        <div className="flex items-end gap-3">
          <div className="relative flex-1 flex items-center">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything to get started..."
              className="w-full px-4 py-4 pr-12 bg-gray-800 text-gray-100 placeholder-gray-400 border border-gray-700 rounded-3xl focus:border-white/40 outline-none resize-none text-md tracking-normal"
              rows={1}
              style={{
                height: "auto",
                minHeight: "56px",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                "absolute right-3 inline-flex items-center justify-center w-10 h-10 rounded-2xl transition-colors",
                input.trim() && !isLoading
                  ? "bg-white text-black hover:bg-gray-200"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              )}
              aria-label="Send"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>

          {/* <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={cn(
                "p-3 rounded-xl transition-all duration-200",
                isRecording
                  ? "bg-red-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {isRecording ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                "p-3 rounded-xl transition-all duration-200",
                input.trim() && !isLoading
                  ? "bg-primary-500 text-white hover:bg-primary-600 shadow-lg hover:shadow-xl"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
