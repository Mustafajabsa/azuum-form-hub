import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Folder,
  File,
  Upload,
  FolderPlus,
  FolderOpen,
  ArrowLeft,
  Search,
  Download,
  Trash2,
  Plus,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "../hooks/use-auth";
import { apiService } from "@/services/api";

type FileItem = {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  modified: string;
  parent?: string;
};

export default function Storage() {
  const { folderId } = useParams<{ folderId?: string }>();
  const [items, setItems] = useState<FileItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Load storage data
  const loadStorageData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError("Please login to access storage");
        return;
      }

      const [foldersResponse, filesResponse] = await Promise.allSettled([
        apiService.getFolders(),
        apiService.getFiles()
      ]);

      const folders = foldersResponse.status === 'fulfilled' 
        ? foldersResponse.value.results || []
        : [];
      
      const files = filesResponse.status === 'fulfilled'
        ? filesResponse.value.results || []
        : [];

      const convertedFolders: FileItem[] = folders.map((folder: any) => ({
        id: folder.id,
        name: folder.name,
        type: "folder" as const,
        modified: folder.created_at,
        parent: folder.parent,
      }));

      const convertedFiles: FileItem[] = files.map((file: any) => ({
        id: file.id,
        name: file.filename,
        type: "file" as const,
        size: file.size,
        modified: file.uploaded_at,
        parent: file.folder,
      }));

      setItems([...convertedFolders, ...convertedFiles]);
    } catch (err: any) {
      console.error("Failed to load storage data:", err);
      setError("Failed to load storage data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadStorageData();
      } else {
        setError("Please login to access storage");
        setLoading(false);
      }
    }
  }, [user, authLoading, loadStorageData]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesFolder = folderId
        ? item.parent === folderId
        : !item.parent;
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesFolder && matchesSearch;
    });
  }, [items, folderId, searchQuery]);

  const currentFolder = useMemo(() => {
    if (!folderId) return null;
    return items.find((item) => item.id === folderId && item.type === "folder");
  }, [items, folderId]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        if (folderId) {
          formData.append("folder_id", folderId);
        }
        await apiService.uploadFile(formData);
      }

      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      });

      await loadStorageData();
    } catch (err: any) {
      console.error("File upload failed:", err);
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload files",
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle folder upload
  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please login to upload folders",
          variant: "destructive",
        });
        return;
      }

      const folderStructure = new Map<string, string>();
      let uploadedFolders = 0;
      let uploadedFilesCount = 0;

      for (const file of files) {
        const relativePath = (file as any).webkitRelativePath || file.name;
        const pathParts = relativePath.split('/');
        
        let currentPath = '';
        let parentId = folderId || null;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
          
          if (!folderStructure.has(currentPath)) {
            try {
              const newFolder = await apiService.createFolder({
                name: pathParts[i],
                description: "",
                parent: parentId,
              });
              
              folderStructure.set(currentPath, newFolder.id);
              parentId = newFolder.id;
              uploadedFolders++;
            } catch (err) {
              console.error(`Failed to create folder ${pathParts[i]}:`, err);
            }
          } else {
            parentId = folderStructure.get(currentPath);
          }
        }

        try {
          const formData = new FormData();
          formData.append("file", file);
          if (parentId) {
            formData.append("folder_id", parentId);
          }

          await apiService.uploadFile(formData);
          uploadedFilesCount++;
        } catch (err) {
          console.error(`Failed to upload file ${file.name}:`, err);
        }
      }

      toast({
        title: "Upload Complete",
        description: `Uploaded ${uploadedFolders} folders and ${uploadedFilesCount} files`,
      });

      await loadStorageData();
    } catch (err: any) {
      console.error("Folder upload failed:", err);
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload folder",
        variant: "destructive",
      });
    }

    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  // Handle navigation
  const handleNavigateToFolder = (folderId: string) => {
    navigate(`/storage/${folderId}`);
  };

  const handleNavigateBack = () => {
    if (currentFolder?.parent) {
      navigate(`/storage/${currentFolder.parent}`);
    } else {
      navigate("/storage");
    }
  };

  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await apiService.createFolder({
        name: newFolderName.trim(),
        description: "",
        parent: folderId || null,
      });

      toast({
        title: "Success",
        description: "Folder created successfully",
      });

      setShowNewFolderDialog(false);
      setNewFolderName("");
      await loadStorageData();
    } catch (err: any) {
      console.error("Folder creation failed:", err);
      toast({
        title: "Creation Failed",
        description: err.message || "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStorageData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading storage...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Folder className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Storage Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate("/landing")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {folderId && (
                <Button variant="ghost" size="sm" onClick={handleNavigateBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  {currentFolder ? currentFolder.name : "Storage"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <File className="w-4 h-4 mr-2" />
                    Upload Files
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => folderInputRef.current?.click()}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Upload Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setShowNewFolderDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Folder
              </Button>

              <div className="relative w-64 ml-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search files and folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9"
                />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                multiple
              />
              <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderUpload}
                className="hidden"
                webkitdirectory=""
                directory=""
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              <Folder className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg">No items in this folder</p>
            </div>
            <div className="space-x-2">
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
              <Button onClick={() => folderInputRef.current?.click()}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Upload Folder
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => item.type === "folder" && handleNavigateToFolder(item.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-primary">
                      {item.type === "folder" ? (
                        <Folder className="w-8 h-8" />
                      ) : (
                        <File className="w-8 h-8" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.type === "folder" ? "Folder" : `${item.size ? `${(item.size / 1024).toFixed(1)} KB` : "Unknown size"}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.modified).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create New Folder</h2>
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
