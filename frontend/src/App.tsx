import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./components/Sidebar";
import { Chat } from "./components/Chat";
import { Dashboard } from "./components/Dashboard";
// import { TestComponent } from "./components/TestComponent";
import { Settings, Users, GitBranch, FileText, Zap } from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState("chat");

  const renderContent = () => {
    switch (activeTab) {
      case "chat":
        return <Chat />;
      case "dashboard":
        return <Dashboard />;
      case "projects":
        return (
          <ComingSoon
            icon={GitBranch}
            title="Projects"
            description="Manage your repositories and projects"
          />
        );
      case "team":
        return (
          <ComingSoon
            icon={Users}
            title="Team"
            description="Collaborate with your team members"
          />
        );
      case "docs":
        return (
          <ComingSoon
            icon={FileText}
            title="Documents"
            description="Access and manage documentation"
          />
        );
      case "automations":
        return (
          <ComingSoon
            icon={Zap}
            title="Automations"
            description="Set up automated workflows"
          />
        );
      case "settings":
        return (
          <ComingSoon
            icon={Settings}
            title="Settings"
            description="Configure your workspace"
          />
        );
      default:
        return <Chat />;
    }
  };

  return (
    <div className="flex h-screen bg-black">
      {/* Temporary test component - remove once Tailwind is confirmed working */}
      {/* <div className="fixed top-4 right-4 z-50">
        <TestComponent />
      </div> */}

      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-hidden max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

interface ComingSoonProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function ComingSoon({ icon: Icon, title, description }: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center h-full bg-black">
      <div className="text-center">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-gray-300 mb-6 max-w-md">{description}</p>
        <div className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium">
          <Zap className="w-4 h-4 mr-2" />
          Coming Soon
        </div>
      </div>
    </div>
  );
}

export default App;
