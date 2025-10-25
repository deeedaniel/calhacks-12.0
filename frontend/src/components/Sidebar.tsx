import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  BarChart3,
  Settings,
  Users,
  GitBranch,
  FileText,
  Zap,
  Menu,
  X,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigationItems = [
  { id: "chat", label: "AI Assistant", icon: MessageSquare },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "projects", label: "Projects", icon: GitBranch },
  { id: "team", label: "Team", icon: Users },
  { id: "docs", label: "Documents", icon: FileText },
  { id: "automations", label: "Automations", icon: Zap },
  { id: "settings", label: "Settings", icon: Settings },
];

const recentChats = [
  { id: "1", title: "Sprint Planning Discussion", time: "2m ago" },
  { id: "2", title: "Code Review Summary", time: "1h ago" },
  { id: "3", title: "Bug Triage Meeting", time: "3h ago" },
  { id: "4", title: "Feature Requirements", time: "1d ago" },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 },
  };

  const contentVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -20 },
  };

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
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white rounded-lg shadow-md"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <motion.div
        variants={sidebarVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        className={cn(
          "fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-50 flex flex-col",
          "lg:relative lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ width: isCollapsed ? 80 : 280 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <motion.div
              variants={contentVariants}
              animate={isCollapsed ? "collapsed" : "expanded"}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="font-semibold text-gray-900 whitespace-nowrap">
                    SyncMind
                  </h1>
                  <p className="text-xs text-gray-500 whitespace-nowrap">
                    AI Command Center
                  </p>
                </div>
              )}
            </motion.div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
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
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary-50 text-primary-600 border-r-2 border-primary-500"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Recent Chats
                </h3>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Plus className="w-3 h-3 text-gray-400" />
                </button>
              </div>

              <div className="space-y-1">
                {recentChats.map((chat) => (
                  <button
                    key={chat.id}
                    className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    <div className="text-sm text-gray-900 truncate group-hover:text-primary-600">
                      {chat.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {chat.time}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Search Bar */}
        {!isCollapsed && (
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
        )}
      </motion.div>
    </>
  );
}
