import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusCard } from "@/components/StatusCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Edit, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusData = [
  { title: "Deployed", count: 145, color: "green" as const },
  { title: "Drafted", count: 32, color: "yellow" as const },
  { title: "Edited", count: 56, color: "blue" as const },
  { title: "Deleted", count: 15, color: "red" as const },
];

const mockProjects = [
  {
    id: 1,
    name: "Customer Feedback Form",
    creator: "Sarah Johnson",
    createdAt: "2024-01-15 10:30 AM",
    status: "Deployed",
  },
  {
    id: 2,
    name: "Employee Survey",
    creator: "Michael Chen",
    createdAt: "2024-01-14 02:15 PM",
    status: "Deployed",
  },
  {
    id: 3,
    name: "Product Review Form",
    creator: "Emily Davis",
    createdAt: "2024-01-13 09:45 AM",
    status: "Drafted",
  },
  {
    id: 4,
    name: "Registration Form",
    creator: "James Wilson",
    createdAt: "2024-01-12 04:20 PM",
    status: "Edited",
  },
];

const Forms = () => {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const filteredProjects = selectedStatus
    ? mockProjects.filter((p) => p.status === selectedStatus)
    : mockProjects;

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader title="Forms">
        <Button className="gap-2" onClick={() => navigate("/forms/builder")}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </PageHeader>

      <div className="p-6 space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statusData.map((status) => (
            <StatusCard
              key={status.title}
              {...status}
              isActive={selectedStatus === status.title}
              onClick={() =>
                setSelectedStatus(
                  selectedStatus === status.title ? null : status.title
                )
              }
            />
          ))}
        </div>

        {/* Projects Table */}
        <Card className="border border-border shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {selectedStatus ? `${selectedStatus} Projects` : "All Projects"}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.name}
                    </TableCell>
                    <TableCell>{project.creator}</TableCell>
                    <TableCell>{project.createdAt}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {project.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="gap-1">
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Forms;
