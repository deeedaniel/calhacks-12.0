import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowUp } from "lucide-react";
import { cn } from "../lib/utils";
import { chatWithBackend, fetchConversation } from "../lib/api";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatProps {
  className?: string;
}

// initial messages can be added here if needed in the future

const suggestedPrompts = [
  "Create this issue...",
  "Review latest PR with CodeRabbit",
  "Summarize open issues",
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

      // Persist conversationId from server
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
    } catch (err) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          err instanceof Error
            ? `Error from server: ${err.message}`
            : "Unexpected error",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
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
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-24 space-y-4 scrollbar-nice">
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
                  "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm tracking-normal",
                  message.role === "user"
                    ? "bg-white text-black"
                    : "bg-gray-800 border border-gray-700 text-gray-100"
                )}
              >
                {message.role === "assistant" ? (
                  <MarkdownRenderer
                    content={replaceSlackUserIdsWithNames(message.content)}
                    className="text-md leading-relaxed"
                  />
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
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            {/* <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div> */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 shadow-sm">
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
