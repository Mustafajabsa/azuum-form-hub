import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Eye,
  FileText,
  Calendar,
  User,
  File,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

type FormStatus =
  | "Deployed"
  | "Drafted"
  | "Edited"
  | "pending"
  | "in-progress"
  | "completed";

interface FormSubmission {
  id: string;
  formId: string;
  formTitle: string;
  submittedAt: string;
  submittedBy: string;
  assignedTo?: string;
  data: Record<string, any>;
  status?: FormStatus;
  createdAt: string;
  isAssigned?: boolean;
  submissionCount?: number;
}

interface UserStats {
  userId: string;
  user: User;
  formsSubmitted: number;
  formsAssigned: number;
  submissions: FormSubmission[];
}

const FilledForms = () => {
  const { userId } = useParams<{ userId: string }>();
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Export to Excel function
  const exportToExcel = (user: UserStats) => {
    const data = user.submissions.map((sub) => ({
      "Form Title": sub.formTitle,
      "Created At": new Date(sub.submittedAt).toLocaleString(),
      Status: sub.status || "N/A",
      Type: sub.assignedTo === user.userId ? "Assigned" : "Created",
      Submissions: user.submissions.length,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Form Submissions");

    // Generate Excel file and trigger download
    XLSX.writeFile(
      workbook,
      `${user.user.name}_forms_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // Mock user data - in a real app, this would come from your backend
  const mockUsers: User[] = [
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@example.com",
      role: "Admin",
      avatar: "https://ui-avatars.com/api/?name=John+Doe&background=random",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane.smith@example.com",
      role: "Manager",
      avatar: "https://ui-avatars.com/api/?name=Jane+Smith&background=random",
    },
    {
      id: "3",
      name: "Alex Wong",
      email: "alex.wong@example.com",
      role: "User",
      avatar: "https://ui-avatars.com/api/?name=Alex+Wong&background=random",
    },
  ];

  // Mock form statuses
  const getRandomStatus = (): FormStatus => {
    const statuses: FormStatus[] = ["Deployed", "Drafted", "Edited"];
    return statuses[Math.floor(Math.random() * statuses.length)];
  };

  // Mock submission count
  const getRandomSubmissionCount = () => Math.floor(Math.random() * 10);

  // Calculate user statistics from submissions
  const calculateUserStats = (subs: FormSubmission[]): UserStats[] => {
    const userMap = new Map<string, UserStats>();

    // First pass: Count created forms (submitted by the user)
    subs.forEach((sub) => {
      if (sub.submittedBy) {
        const userEmail = sub.submittedBy;
        const mockUser = mockUsers.find((u) => u.email === userEmail) || {
          id: userEmail,
          name: userEmail
            .split("@")[0]
            .replace(/\./g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          email: userEmail,
          role: "User",
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            userEmail.split("@")[0]
          )}&background=random`,
        };

        if (!userMap.has(userEmail)) {
          userMap.set(userEmail, {
            userId: userEmail,
            user: mockUser,
            formsSubmitted: 0,
            formsAssigned: 0,
            submissions: [],
          });
        }

        // Add status to the submission
        const submissionWithStatus: FormSubmission = {
          ...sub,
          status: getRandomStatus(),
          createdAt: sub.submittedAt,
          isAssigned: false,
          submissionCount: getRandomSubmissionCount(),
        };

        userMap.get(userEmail)!.formsSubmitted++;
        userMap.get(userEmail)!.submissions.push(submissionWithStatus);
      }
    });

    // Second pass: Count assigned forms (assigned to the user)
    subs.forEach((sub) => {
      if (sub.assignedTo) {
        const userEmail = sub.assignedTo;
        if (!userMap.has(userEmail)) {
          const mockUser = mockUsers.find((u) => u.email === userEmail) || {
            id: userEmail,
            name: userEmail
              .split("@")[0]
              .replace(/\./g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase()),
            email: userEmail,
            role: "User",
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
              userEmail.split("@")[0]
            )}&background=random`,
          };
          userMap.set(userEmail, {
            userId: userEmail,
            user: mockUser,
            formsSubmitted: 0,
            formsAssigned: 0,
            submissions: [],
          });
        }

        // Add status to the assigned submission
        const submissionWithStatus: FormSubmission = {
          ...sub,
          status: getRandomStatus(),
          createdAt: sub.submittedAt,
          isAssigned: true,
          submissionCount: getRandomSubmissionCount(),
        };

        userMap.get(userEmail)!.formsAssigned++;
        userMap.get(userEmail)!.submissions.push(submissionWithStatus);
      }
    });

    return Array.from(userMap.values());
  };

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Get submissions from localStorage
        const savedSubmissions = JSON.parse(
          localStorage.getItem("formSubmissions") || "[]"
        ) as FormSubmission[];

        // Add some mock data for demonstration
        const mockSubmissions: FormSubmission[] = [
          ...savedSubmissions,
          {
            id: "mock1",
            formId: "form1",
            formTitle: "Employee Survey",
            submittedAt: new Date().toISOString(),
            submittedBy: "john.doe@example.com",
            assignedTo: "jane.smith@example.com",
            status: "completed",
            data: {},
            createdAt: new Date().toISOString(),
          },
          {
            id: "mock2",
            formId: "form2",
            formTitle: "Project Feedback",
            submittedAt: new Date().toISOString(),
            submittedBy: "jane.smith@example.com",
            status: "in-progress",
            data: {},
            createdAt: new Date().toISOString(),
          },
          {
            id: "mock3",
            formId: "form3",
            formTitle: "Training Evaluation",
            submittedAt: new Date().toISOString(),
            submittedBy: "john.doe@example.com",
            assignedTo: "alex.wong@example.com",
            status: "pending",
            data: {},
            createdAt: new Date().toISOString(),
          },
        ];

        setSubmissions(mockSubmissions);
        setUserStats(calculateUserStats(mockSubmissions));
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleView = (submission: FormSubmission) => {
    navigate(`/forms/submission/${submission.id}`, { state: { submission } });
  };

  const handleDownload = (submission: FormSubmission) => {
    const dataStr = JSON.stringify(submission.data, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;

    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute(
      "download",
      `${submission.formTitle.replace(/\s+/g, "_")}_${submission.id}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Find the selected user if userId is in URL
  useEffect(() => {
    if (userId) {
      // If we have userStats, try to find the user
      if (userStats.length > 0) {
        const user = userStats.find((u) => u.userId === userId);
        if (user) {
          setSelectedUser(user);
          return;
        }
      }
      // If no user found or no userStats yet, try to find in mockUsers
      const mockUser = mockUsers.find((u) => u.id === userId);
      if (mockUser) {
        // Create a temporary user stats object
        setSelectedUser({
          userId: mockUser.id,
          user: mockUser,
          formsSubmitted: 0,
          formsAssigned: 0,
          submissions: [],
        });
        return;
      }
    }
    setSelectedUser(null);
  }, [userId, userStats]);

  const handleBack = () => {
    setSelectedUser(null);
    navigate("/forms/filled");
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // If a user is selected, show their details and forms
  if (selectedUser) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <Button variant="ghost" className="mb-6" onClick={handleBack}>
            ← Back to Users
          </Button>

          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={selectedUser.user.avatar}
                    alt={selectedUser.user.name}
                  />
                  <AvatarFallback>
                    {getUserInitials(selectedUser.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-semibold">
                    {selectedUser.user.name}
                  </h2>
                  <p className="text-muted-foreground">
                    {selectedUser.user.email}
                  </p>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {selectedUser.user.role}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-xl font-semibold">
                    {selectedUser.formsSubmitted}
                  </p>
                </div>
                <div className="h-10 w-px bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Assigned</p>
                  <p className="text-xl font-semibold">
                    {selectedUser.formsAssigned}
                  </p>
                </div>
                <div className="h-10 w-px bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-semibold">
                    {selectedUser.formsSubmitted + selectedUser.formsAssigned}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">Forms</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToExcel(selectedUser)}
              >
                Export to Excel
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Form Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Created
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Submissions
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedUser.submissions.length > 0 ? (
                    selectedUser.submissions.map((submission, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {submission.formTitle}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(submission.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              submission.status === "Deployed"
                                ? "bg-green-100 text-green-800"
                                : submission.status === "Drafted"
                                ? "bg-yellow-100 text-yellow-800"
                                : submission.status === "Edited"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {submission.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.isAssigned ? "Assigned" : "Created"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.submissionCount || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to view the form
                              navigate(`/forms/view/${submission.formId}`, {
                                state: { form: submission },
                              });
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Form
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Navigate to form submissions
                              navigate(
                                `/forms/submissions/${submission.formId}`,
                                {
                                  state: { form: submission },
                                }
                              );
                            }}
                            disabled={
                              !submission.submissionCount ||
                              submission.submissionCount === 0
                            }
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Submissions
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        No forms found for this user.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show user list if no user is selected
  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Filled Forms"
        description="View form submissions and user statistics"
      />

      <div className="p-6">
        {userStats.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">
              No form submissions yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by creating and sharing a form.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userStats.map((user) => (
              <Card key={user.userId} className="overflow-hidden">
                <div className="p-6">
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage
                          src={user.user.avatar}
                          alt={user.user.name}
                        />
                        <AvatarFallback>
                          {getUserInitials(user.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {user.user.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {user.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {user.user.role}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Created Forms
                        </p>
                        <p className="text-2xl font-semibold">
                          {user.formsSubmitted}
                        </p>
                      </div>
                      <div className="h-12 w-px bg-gray-200"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Assigned Forms
                        </p>
                        <p className="text-2xl font-semibold">
                          {user.formsAssigned}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedUser(user);
                        navigate(
                          `/forms/user/${encodeURIComponent(user.userId)}`
                        );
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilledForms;
