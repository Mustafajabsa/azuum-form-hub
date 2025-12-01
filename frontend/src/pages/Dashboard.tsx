import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import {
  FileText,
  FilePlus,
  FileEdit,
  FileCheck,
  Trash2,
  TrendingUp,
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

const stats = [
  { title: "Total Forms", value: 248, icon: FileText },
  { title: "Filled Forms", value: 1842, icon: FileCheck },
  { title: "Drafted Forms", value: 32, icon: FilePlus },
  { title: "Edited Forms", value: 156, icon: FileEdit },
  { title: "Deleted Forms", value: 15, icon: Trash2 },
  { title: "Active Users", value: 45, icon: TrendingUp },
];

const timelineData = [
  { month: "Jan", created: 20, filled: 145 },
  { month: "Feb", created: 25, filled: 178 },
  { month: "Mar", created: 30, filled: 210 },
  { month: "Apr", created: 35, filled: 245 },
  { month: "May", created: 42, filled: 298 },
  { month: "Jun", created: 48, filled: 356 },
];

const topCreators = [
  { name: "Sarah Johnson", forms: 45 },
  { name: "Michael Chen", forms: 38 },
  { name: "Emily Davis", forms: 32 },
  { name: "James Wilson", forms: 28 },
  { name: "Linda Martinez", forms: 24 },
];

const recentActivity = [
  { action: "Form Created", user: "Sarah Johnson", form: "Customer Feedback", time: "2 minutes ago" },
  { action: "Form Filled", user: "John Doe", form: "Employee Survey", time: "15 minutes ago" },
  { action: "Form Edited", user: "Michael Chen", form: "Product Review", time: "1 hour ago" },
  { action: "Form Deployed", user: "Emily Davis", form: "Registration Form", time: "2 hours ago" },
];

const Dashboard = () => {
  return (
    <div className="flex-1 overflow-auto">
      <PageHeader title="Dashboard" />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat) => (
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

          {/* Top Creators Chart */}
          <Card className="p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Top Form Creators
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCreators} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e4" />
                <XAxis type="number" stroke="#666" />
                <YAxis dataKey="name" type="category" width={120} stroke="#666" />
                <Tooltip />
                <Bar dataKey="forms" fill="#005cff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                  <p className="font-medium text-foreground">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.user} • {activity.form}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
