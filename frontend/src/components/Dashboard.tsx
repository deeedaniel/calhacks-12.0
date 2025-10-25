import { motion } from "framer-motion";
import {
  GitPullRequest,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  MessageSquare,
  Zap,
  Calendar,
  Target,
} from "lucide-react";
import { cn } from "../lib/utils";

interface DashboardProps {
  className?: string;
}

const stats = [
  {
    label: "Open PRs",
    value: "12",
    change: "+3",
    trend: "up",
    icon: GitPullRequest,
    color: "blue",
  },
  {
    label: "Active Issues",
    value: "8",
    change: "-2",
    trend: "down",
    icon: AlertCircle,
    color: "orange",
  },
  {
    label: "Team Members",
    value: "24",
    change: "+1",
    trend: "up",
    icon: Users,
    color: "green",
  },
  {
    label: "Completed Tasks",
    value: "156",
    change: "+12",
    trend: "up",
    icon: CheckCircle,
    color: "purple",
  },
];

const recentActivity = [
  {
    id: "1",
    type: "pr",
    title: "Fix authentication bug in login flow",
    author: "Sarah Chen",
    time: "2 minutes ago",
    status: "approved",
  },
  {
    id: "2",
    type: "issue",
    title: "Database connection timeout",
    author: "Mike Johnson",
    time: "15 minutes ago",
    status: "open",
  },
  {
    id: "3",
    type: "deployment",
    title: "Production deployment v2.1.4",
    author: "DevOps Bot",
    time: "1 hour ago",
    status: "success",
  },
  {
    id: "4",
    type: "meeting",
    title: "Sprint planning meeting",
    author: "Team Lead",
    time: "2 hours ago",
    status: "completed",
  },
];

const upcomingTasks = [
  {
    id: "1",
    title: "Code review for payment integration",
    assignee: "Alex Kim",
    dueDate: "Today, 3:00 PM",
    priority: "high",
  },
  {
    id: "2",
    title: "Update API documentation",
    assignee: "Emma Davis",
    dueDate: "Tomorrow, 10:00 AM",
    priority: "medium",
  },
  {
    id: "3",
    title: "Performance optimization review",
    assignee: "John Smith",
    dueDate: "Friday, 2:00 PM",
    priority: "low",
  },
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case "pr":
      return GitPullRequest;
    case "issue":
      return AlertCircle;
    case "deployment":
      return Zap;
    case "meeting":
      return Calendar;
    default:
      return Activity;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
    case "success":
    case "completed":
      return "text-green-600 bg-green-50";
    case "open":
    case "pending":
      return "text-orange-600 bg-orange-50";
    case "failed":
    case "rejected":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "text-red-600 bg-red-50 border-red-200";
    case "medium":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "low":
      return "text-green-600 bg-green-50 border-green-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

export function Dashboard({ className }: DashboardProps) {
  return (
    <div className={cn("p-6 space-y-6 bg-black min-h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of your engineering workspace
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-secondary">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button className="btn-primary">
            <Target className="w-4 h-4 mr-2" />
            Set Goals
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card"
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "p-3 rounded-lg",
                    stat.color === "blue" && "bg-blue-50 text-blue-600",
                    stat.color === "orange" && "bg-orange-50 text-orange-600",
                    stat.color === "green" && "bg-green-50 text-green-600",
                    stat.color === "purple" && "bg-purple-50 text-purple-600"
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <div
                  className={cn(
                    "flex items-center gap-1 text-sm",
                    stat.trend === "up" ? "text-green-600" : "text-red-600"
                  )}
                >
                  <TrendIcon className="w-4 h-4" />
                  {stat.change}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h2>
            <button className="text-sm text-primary-600 hover:text-primary-700">
              View All
            </button>
          </div>

          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.type);

              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      by {activity.author} • {activity.time}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      getStatusColor(activity.status)
                    )}
                  >
                    {activity.status}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Upcoming Tasks */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Upcoming Tasks
            </h2>
            <button className="text-sm text-primary-600 hover:text-primary-700">
              View All
            </button>
          </div>

          <div className="space-y-4">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <Clock className="w-4 h-4 text-primary-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {task.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    Assigned to {task.assignee}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Due: {task.dueDate}
                  </p>
                </div>

                <span
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded border",
                    getPriorityColor(task.priority)
                  )}
                >
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <MessageSquare className="w-5 h-5 text-primary-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Start Chat</div>
              <div className="text-sm text-gray-600">Ask AI assistant</div>
            </div>
          </button>

          <button className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <GitPullRequest className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Review PRs</div>
              <div className="text-sm text-gray-600">12 pending reviews</div>
            </div>
          </button>

          <button className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <Calendar className="w-5 h-5 text-orange-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Schedule Meeting</div>
              <div className="text-sm text-gray-600">Plan with team</div>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
