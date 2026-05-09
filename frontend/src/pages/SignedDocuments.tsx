import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Download,
  Calendar,
  User,
  FileText,
  CheckCircle,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";
import * as XLSX from "xlsx";

interface Signature {
  id: string;
  documentId: string;
  documentTitle: string;
  signatureText: string;
  signatureImage?: string;
  signedAt: string;
  signedBy: string;
  signedByName: string;
  ipAddress?: string;
  userAgent?: string;
}

interface UserStats {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  signedDocuments: number;
  signatures: Signature[];
}

const SignedDocuments = () => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  // Mock signature data
  useEffect(() => {
    const fetchSignatures = async () => {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock signatures data
        const mockSignatures: Signature[] = [
          {
            id: "sig1",
            documentId: "doc1",
            documentTitle: "Employee Survey",
            signatureText: "John Doe",
            signedAt: new Date().toISOString(),
            signedBy: "john.doe@example.com",
            signedByName: "John Doe",
            ipAddress: "192.168.1.1",
            userAgent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          {
            id: "sig2",
            documentId: "doc2",
            documentTitle: "Project Feedback",
            signatureText: "Jane Smith",
            signedAt: new Date(Date.now() - 86400000).toISOString(),
            signedBy: "jane.smith@example.com",
            signedByName: "Jane Smith",
            ipAddress: "192.168.1.2",
            userAgent: "Chrome/91.0.4472.124 Safari/537.36",
          },
          {
            id: "sig3",
            documentId: "doc3",
            documentTitle: "Training Evaluation",
            signatureText: "Alex Wong",
            signatureImage: "/signatures/alex_signature.png",
            signedAt: new Date(Date.now() - 172800000).toISOString(),
            signedBy: "alex.wong@example.com",
            signedByName: "Alex Wong",
            ipAddress: "192.168.1.3",
            userAgent: "Safari/605.1.15",
          },
        ];

        setSignatures(mockSignatures);

        // Calculate user statistics
        const userMap = new Map<string, UserStats>();

        mockSignatures.forEach((signature) => {
          const userEmail = signature.signedBy;
          const userName = signature.signedByName;

          if (!userMap.has(userEmail)) {
            userMap.set(userEmail, {
              userId: userEmail,
              userName: userName,
              userEmail: userEmail,
              userRole: "User", // In real app, this would come from user data
              signedDocuments: 0,
              signatures: [],
            });
          }

          const userStats = userMap.get(userEmail)!;
          userStats.signedDocuments++;
          userStats.signatures.push(signature);
        });

        setUserStats(Array.from(userMap.values()));
      } catch (error) {
        console.error("Error fetching signatures:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignatures();
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

  const exportToExcel = (user: UserStats) => {
    const data = user.signatures.map((sig) => ({
      "Document Title": sig.documentTitle,
      "Signed At": new Date(sig.signedAt).toLocaleString(),
      Signature: sig.signatureText,
      "IP Address": sig.ipAddress || "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Signed Documents");

    XLSX.writeFile(
      workbook,
      `${user.userName}_signed_documents_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleBack = () => {
    setSelectedUser(null);
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

  // If a user is selected, show their signed documents
  if (selectedUser) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <Button variant="ghost" className="mb-6" onClick={handleBack}>
            ← Back to Users
          </Button>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">
                    {selectedUser.userName}
                  </h2>
                  <p className="text-muted-foreground">
                    {selectedUser.userEmail}
                  </p>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      {selectedUser.userRole}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Signed Documents
                  </p>
                  <p className="text-xl font-semibold">
                    {selectedUser.signedDocuments}
                  </p>
                </div>
                <div className="h-10 w-px bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Total Signatures
                  </p>
                  <p className="text-xl font-semibold">
                    {selectedUser.signatures.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">Signed Documents</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToExcel(selectedUser)}
              >
                Export to Excel
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Document Title
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Signed At
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Signature
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      IP Address
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedUser.signatures.length > 0 ? (
                    selectedUser.signatures.map((signature, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {signature.documentTitle}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(signature.signedAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {signature.signatureText}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {signature.ipAddress || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/50 hover:text-green-700 dark:hover:text-green-300"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No signed documents found for this user.
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
    <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="Sign"
        description="Digitally sign documents and manage signatures"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </PageHeader>

      <div className="p-6">
        {userStats.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground dark:text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-foreground dark:text-white">
              No signed documents yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground dark:text-gray-400">
              Get started by signing documents from the filled forms section.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userStats.map((user) => (
              <Card key={user.userId} className="overflow-hidden">
                <div className="p-6">
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {user.userName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {user.userEmail}
                        </p>
                        <div className="mt-1">
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            {user.userRole}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Signed Documents
                        </p>
                        <p className="text-2xl font-semibold">
                          {user.signedDocuments}
                        </p>
                      </div>
                      <div className="h-12 w-px bg-gray-200 dark:bg-gray-600"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Signatures
                        </p>
                        <p className="text-2xl font-semibold">
                          {user.signatures.length}
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
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Signed Documents
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

export default SignedDocuments;
