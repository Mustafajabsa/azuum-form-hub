import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Folder, File, Upload, FolderPlus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "../hooks/use-auth";

type FileItem = {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  modified: string;
  parentId: string | null;
};

export default function Storage() {
  const { folderId } = useParams<{ folderId?: string }>();
  const [currentFolder, setCurrentFolder] = useState<FileItem | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mock data - in a real app, this would come from an API
  const mockItems: FileItem[] = [
    {
      id: "folder1",
      name: "Documents",
      type: "folder",
      modified: "2023-11-20",
      parentId: null,
    },
    {
      id: "folder2",
      name: "Images",
      type: "folder",
      modified: "2023-11-19",
      parentId: null,
    },
    {
      id: "file1",
      name: "report.pdf",
      type: "file",
      size: 1024 * 1024 * 2.5,
      modified: "2023-11-18",
      parentId: null,
    },
    {
      id: "file2",
      name: "presentation.pptx",
      type: "file",
      size: 1024 * 1024 * 5.8,
      modified: "2023-11-17",
      parentId: null,
    },
  ];

  useEffect(() => {
    // In a real app, you would fetch the folder contents from an API
    if (folderId) {
      // Simulate API call to get folder contents
      const folder = mockItems.find(
        (item) => item.id === folderId && item.type === "folder"
      );
      setCurrentFolder(folder || null);

      // Filter items that belong to this folder
      const folderItems = mockItems.filter(
        (item) => item.parentId === folderId
      );
      setItems(folderItems);
    } else {
      // Root folder items
      setCurrentFolder(null);
      const rootItems = mockItems.filter((item) => item.parentId === null);
      setItems(rootItems);
    }
  }, [folderId]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Folder name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // In a real app, this would be an API call
    const newFolder: FileItem = {
      id: `folder-${Date.now()}`,
      name: newFolderName,
      type: "folder",
      modified: new Date().toISOString(),
      parentId: folderId || null,
    };

    setItems([...items, newFolder]);
    setNewFolderName("");
    setShowNewFolderDialog(false);

    toast({
      title: "Success",
      description: `Folder "${newFolderName}" created successfully`,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // In a real app, you would upload the file to a server
      const newFile: FileItem = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: "file",
        size: file.size,
        modified: new Date(file.lastModified).toISOString(),
        parentId: folderId || null,
      };

      setItems((prevItems) => [...prevItems, newFile]);
    });

    toast({
      title: "Success",
      description: `${files.length} file(s) uploaded successfully`,
    });
  };

  const navigateToFolder = (folder: FileItem) => {
    navigate(`/storage/${folder.id}`);
  };

  const navigateUp = () => {
    if (currentFolder?.parentId) {
      navigate(`/storage/${currentFolder.parentId}`);
    } else {
      navigate("/storage");
    }
  };

  const formatFileSize = (bytes: number = 0) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Storage</h1>
          <p className="text-muted-foreground">
            {user?.email} • {user?.role || "User"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button onClick={() => setShowNewFolderDialog(true)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
          />
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <button
          onClick={navigateUp}
          className="hover:text-foreground flex items-center"
          disabled={!folderId}
        >
          <ArrowLeft
            className={`w-4 h-4 mr-1 ${!folderId ? "opacity-50" : ""}`}
          />
          Back
        </button>
        <span className="mx-2">/</span>
        <span className="text-foreground font-medium">
          {currentFolder ? currentFolder.name : "My Storage"}
        </span>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => (
          <Card
            key={item.id}
            className={`cursor-pointer transition-colors hover:bg-accent/50 ${
              item.type === "folder" ? "hover:border-primary" : ""
            }`}
            onClick={() =>
              item.type === "folder" ? navigateToFolder(item) : null
            }
          >
            <CardHeader className="pb-2">
              <div className="flex justify-center mb-2">
                {item.type === "folder" ? (
                  <Folder className="w-12 h-12 text-yellow-500" />
                ) : (
                  <File className="w-12 h-12 text-blue-500" />
                )}
              </div>
              <CardTitle className="text-base font-medium text-center truncate">
                {item.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-center text-sm text-muted-foreground">
              {item.type === "file" ? (
                <p>{formatFileSize(item.size)}</p>
              ) : (
                <p>Folder</p>
              )}
              <p className="text-xs">Modified {formatDate(item.modified)}</p>
            </CardContent>
          </Card>
        ))}

        {items.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>This folder is empty</p>
            <p className="text-sm">
              Upload files or create a new folder to get started
            </p>
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Folder</h3>
            <Input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowNewFolderDialog(false)}
              >
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
