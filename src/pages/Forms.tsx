import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusCard } from "@/components/StatusCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Edit, Eye, Search, Calendar, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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

// Custom date format for display
const formatDate = (date: Date | null) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const Forms = () => {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [startDate, endDate] = dateRange;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredProjects = mockProjects.filter((project) => {
    const matchesStatus = !selectedStatus || project.status === selectedStatus;
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.creator.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by date range if dates are selected
    let matchesDate = true;
    if (startDate || endDate) {
      const projectDate = new Date(project.createdAt);
      if (startDate && projectDate < startDate) {
        matchesDate = false;
      }
      if (endDate) {
        // Set end of day for end date comparison
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (projectDate > endOfDay) {
          matchesDate = false;
        }
      }
    }

    return matchesStatus && matchesSearch && matchesDate;
  });

  const clearDateFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDateRange([null, null]);
  };

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader title="Forms">
        <div className="flex items-center space-x-2">
          <div className="relative" ref={datePickerRef}>
            <Button
              variant="outline"
              className="gap-2 text-sm h-9"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <Calendar className="h-4 w-4" />
              {startDate && endDate ? (
                <span className="flex items-center">
                  {formatDate(startDate)} - {formatDate(endDate)}
                  <X
                    className="ml-2 h-4 w-4 text-muted-foreground hover:text-foreground"
                    onClick={clearDateFilter}
                  />
                </span>
              ) : (
                <span>Date Range</span>
              )}
            </Button>

            {showDatePicker && (
              <div className="absolute z-10 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg p-2">
                <DatePicker
                  selectsRange={true}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => {
                    setDateRange(update);
                    // Auto-close after selecting end date
                    if (update[1]) {
                      setTimeout(() => setShowDatePicker(false), 100);
                    }
                  }}
                  isClearable={false}
                  inline
                  className="border-0"
                  calendarClassName="bg-white dark:bg-gray-800 text-foreground"
                  dayClassName={(date) =>
                    startDate && endDate && date >= startDate && date <= endDate
                      ? "bg-blue-500 text-white rounded"
                      : ""
                  }
                />
                <div className="flex justify-between px-2 py-1 border-t dark:border-gray-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateRange([null, null]);
                      setShowDatePicker(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowDatePicker(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button className="gap-2" onClick={() => navigate("/forms/builder")}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
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

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search projects by name or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Projects Table */}
        <Card className="border border-border shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {selectedStatus ? `${selectedStatus} Projects` : "All Projects"}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredProjects.length}{" "}
                {filteredProjects.length === 1 ? "item" : "items"})
              </span>
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
