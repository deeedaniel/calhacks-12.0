import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Menu, X, Plus } from "lucide-react";
import { cn } from "../lib/utils";
import { fetchAllConversations, type ConversationSummary } from "../lib/api";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSelectConversation?: (conversationId: string) => void;
}

const navigationItems = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  //{ id: "dashboard", label: "Dashboard", icon: BarChart3 },
  // { id: "projects", label: "Projects", icon: GitBranch },
  // { id: "team", label: "Team", icon: Users },
  // { id: "docs", label: "Documents", icon: FileText },
  // { id: "automations", label: "Automations", icon: Zap },
  // { id: "settings", label: "Settings", icon: Settings },
];

function formatRelativeTime(iso: string) {
  const now = new Date().getTime();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function Sidebar({
  activeTab,
  onTabChange,
  onSelectConversation,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 },
  };

  const contentVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -20 },
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchAllConversations();
        setConversations(data || []);
      } catch (_e) {
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const recentChats = useMemo(() => {
    return (conversations || []).map((c) => {
      let preview = c.title || "New Chat";
      const msgs = (c as any).messages as
        | Array<{ role: string; content: string; created_at: string }>
        | undefined;
      if (msgs && msgs.length) {
        const firstUser = msgs
          .filter((m) => m.role === "user")
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )[0];
        if (firstUser && firstUser.content) {
          preview = firstUser.content;
        }
      }
      return {
        id: c.id,
        title: preview,
        time: formatRelativeTime(c.updated_at || c.created_at),
      };
    });
  }, [conversations]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2  text-white rounded-lg shadow-md"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <motion.div
        variants={sidebarVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        className={cn(
          "fixed left-0 top-0 h-full bg-black border-r border-gray-800 z-50 flex flex-col",
          "lg:relative lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ width: isCollapsed ? 80 : 280 }}
      >
        {/* Header */}
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <motion.div
              variants={contentVariants}
              animate={isCollapsed ? "collapsed" : "expanded"}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <img
                  src="/icon.png"
                  alt="Fusion"
                  className="w-6 h-6 text-white"
                />
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="font-semibold text-white whitespace-nowrap text-2xl">
                    Fusion
                  </h1>
                  {/* <p className="text-xs text-gray-500 whitespace-nowrap">
                    AI Command Center
                  </p> */}
                </div>
              )}
            </motion.div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-1.5 hover:bg-gray-800 text-gray-300 rounded-md transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>

              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-1.5 hover:bg-gray-800 text-gray-300 rounded-md transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    // <-- Add opening curly brace
                    onSelectConversation?.("");
                    onTabChange(item.id);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm  transition-all duration-200 font-semibold",
                    isActive
                      ? "bg-white/10 text-white border-white/20"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <motion.span
                    variants={contentVariants}
                    animate={isCollapsed ? "collapsed" : "expanded"}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                </button>
              );
            })}
          </nav>

          {/* Recent Chats */}
          {!isCollapsed && activeTab === "chat" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 px-3"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Recent Chats
                </h3>
                <button className="p-1 hover:bg-gray-800 rounded">
                  <Plus
                    className="w-3 h-3 text-gray-400"
                    onClick={() => {
                      onTabChange("chat");
                      onSelectConversation?.("");
                    }}
                  />
                </button>
              </div>

              <div className="space-y-1">
                {loading && (
                  <div className="text-xs text-gray-400 p-2">Loading…</div>
                )}
                {!loading && recentChats.length === 0 && (
                  <div className="text-xs text-gray-500 p-2">
                    No conversations yet
                  </div>
                )}
                {!loading &&
                  recentChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        onTabChange("chat");
                        onSelectConversation?.(chat.id);
                        setIsMobileOpen(false);
                      }}
                      className="w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors group"
                    >
                      <div className="text-sm text-white truncate">
                        {chat.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {chat.time}
                      </div>
                    </button>
                  ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Search Bar */}
        {/* {!isCollapsed && (
          <motion.div
            variants={contentVariants}
            animate="expanded"
            className="p-3 border-t border-gray-200"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </motion.div>
        )} */}
      </motion.div>
    </>
  );
}
