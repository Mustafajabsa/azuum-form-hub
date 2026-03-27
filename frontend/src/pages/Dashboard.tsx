import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiService } from "@/services/api";
import {
  FileText,
  FilePlus,
  FileEdit,
  FileCheck,
  Trash2,
  TrendingUp,
  FolderOpen,
  Users,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [storageAnalytics, setStorageAnalytics] = useState(null);
  const [forms, setForms] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is available
      if (!user) {
        console.log("❌ No user found, cannot load dashboard data");
        setError("Please login to access dashboard");
        return;
      }

      // Load dashboard stats with error handling
      try {
        const statsData = await apiService.getDashboardStats();
        setStats(statsData);
        console.log("✅ Dashboard stats loaded");
      } catch (err: any) {
        console.error("❌ Failed to load dashboard stats:", err);
        if (err.response?.status === 401) {
          setError("Please login to access dashboard");
          return;
        }
        // Continue with default stats
        setStats(null);
      }

      // Load storage analytics with error handling
      try {
        const storageData = await apiService.getStorageAnalytics();
        setStorageAnalytics(storageData);
        console.log("✅ Storage analytics loaded");
      } catch (err: any) {
        console.error("❌ Failed to load storage analytics:", err);
        if (err.response?.status === 401) {
          setError("Please login to access dashboard");
          return;
        }
        // Continue with default storage data
        setStorageAnalytics(null);
      }

      // Load forms with error handling
      try {
        const formsData = await apiService.getForms();
        setForms(formsData.results || []);
        console.log("✅ Forms loaded");
      } catch (err: any) {
        console.error("❌ Failed to load forms:", err);
        if (err.response?.status === 401) {
          setError("Please login to access dashboard");
          return;
        }
        // Continue with empty forms
        setForms([]);
      }

      // Load folders with error handling
      try {
        const foldersData = await apiService.getFolders();
        setFolders(foldersData.results || []);
        console.log("✅ Folders loaded");
      } catch (err: any) {
        console.error("❌ Failed to load folders:", err);
        if (err.response?.status === 401) {
          setError("Please login to access dashboard");
          return;
        }
        // Continue with empty folders
        setFolders([]);
      }

      console.log("✅ Dashboard data loaded successfully");
    } catch (err: any) {
      console.error("❌ Failed to load dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    } else {
      console.log("❌ No user available for dashboard");
      setError("Please login to access dashboard");
      setLoading(false);
    }
  }, [user, loadDashboardData]);

  // Fallback stats if API data is not available
  const defaultStats = [
    { title: "Total Forms", value: stats?.total_forms || 0, icon: FileText },
    {
      title: "Filled Forms",
      value: stats?.total_submissions || 0,
      icon: FileCheck,
    },
    { title: "Drafts", value: stats?.draft_forms || 0, icon: FilePlus },
    { title: "Folders", value: folders.length || 0, icon: FolderOpen },
    { title: "Active Users", value: stats?.active_users || 1, icon: Users },
    {
      title: "Storage Used",
      value: stats?.storage_used || "0 MB",
      icon: TrendingUp,
    },
  ];

  // Timeline data for charts
  const timelineData = stats?.timeline_data || [
    { month: "Jan", created: 0, filled: 0 },
    { month: "Feb", created: 0, filled: 0 },
    { month: "Mar", created: 1, filled: 0 },
    { month: "Apr", created: 0, filled: 0 },
    { month: "May", created: 0, filled: 0 },
    { month: "Jun", created: 0, filled: 0 },
  ];

  // Recent activity data
  const recentActivity = [
    ...forms.slice(0, 3).map((form) => ({
      action: "Form Created",
      user: user?.email || "You",
      form: form.title || "Untitled Form",
      time: "Just now",
    })),
    {
      action: "Account Created",
      user: user?.email || "You",
      form: "Welcome to Azuum!",
      time: "Today",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <Card>
          <div className="p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.first_name || user?.email?.split("@")[0] || "User"}!`}
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {defaultStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline Chart */}
          <Card className="p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Form Operations Timeline
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e4" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="created"
                  stackId="1"
                  stroke="#005cff"
                  fill="#005cff"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="filled"
                  stackId="1"
                  stroke="#00c853"
                  fill="#00c853"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Storage Analytics */}
          <Card className="p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Storage Overview
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Total Storage
                </span>
                <span className="font-semibold">
                  {storageAnalytics?.total_storage || "0 MB"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Used Storage
                </span>
                <span className="font-semibold">
                  {storageAnalytics?.used_storage || "0 MB"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Available Storage
                </span>
                <span className="font-semibold">
                  {storageAnalytics?.available_storage || "Unlimited"}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${storageAnalytics?.storage_percentage || 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6 border border-border shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {activity.action}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.user} • {activity.form}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
