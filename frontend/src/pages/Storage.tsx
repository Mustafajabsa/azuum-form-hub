import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Folder,
  File,
  Upload,
  FolderPlus,
  ArrowLeft,
  Search,
  List,
  LayoutGrid,
  LayoutList,
  Download,
  Trash2,
} from "lucide-react";
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
  selected?: boolean;
};

export default function Storage() {
  const { folderId } = useParams<{ folderId?: string }>();
  const [currentFolder, setCurrentFolder] = useState<FileItem | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewSize, setViewSize] = useState<"small" | "medium" | "large">(
    "medium"
  );
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
      selected: false,
    },
    {
      id: "folder2",
      name: "Images",
      type: "folder",
      modified: "2023-11-19",
      parentId: null,
      selected: false,
    },
    {
      id: "file1",
      name: "report.pdf",
      type: "file",
      size: 1024 * 1024 * 2.5,
      modified: "2023-11-18",
      parentId: null,
      selected: false,
    },
    {
      id: "file2",
      name: "presentation.pptx",
      type: "file",
      size: 1024 * 1024 * 5.8,
      modified: "2023-11-17",
      parentId: null,
      selected: false,
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

  // Update selected items when items change
  useEffect(() => {
    const selected = items
      .filter((item) => item.selected)
      .map((item) => item.id);
    setSelectedItems(selected);
  }, [items]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase().trim();
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, searchQuery]);

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

  const handleDownload = (item: FileItem) => {
    if (item.type === "file") {
      // Handle file download
      const content =
        `This is a mock file for: ${item.name}\n\n` +
        `File ID: ${item.id}\n` +
        `Created: ${new Date().toLocaleString()}\n` +
        `Size: ${item.size ? formatFileSize(item.size) : "N/A"}\n\n` +
        `This is a demo of the download functionality. In a production environment, \n` +
        `this would download the actual file from the server.`;

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.name.endsWith(".txt") ? item.name : `${item.name}.txt`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    } else {
      // Handle folder download (as ZIP)
      const folderName = item.name;
      const zipContent =
        `This is a mock ZIP file for the folder: ${folderName}\n\n` +
        `Folder ID: ${item.id}\n` +
        `Created: ${new Date().toLocaleString()}\n` +
        `Contents would include all files in this folder.\n\n` +
        `In a production environment, this would be an actual ZIP file \n` +
        `containing all the files and subfolders.`;

      const blob = new Blob([zipContent], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    }

    toast({
      title: "Download started",
      description: `Downloading ${item.name}${
        item.type === "folder" ? " (as ZIP)" : ""
      }`,
    });
  };

  const handleDownloadSelected = useCallback(() => {
    const selectedNames = items
      .filter((item) => item.selected)
      .map((item) => item.name)
      .join(", ");

    items
      .filter((item) => item.selected)
      .forEach((item) => handleDownload(item));

    toast({
      title: "Download",
      description: `Downloading ${selectedItems.length} item(s): ${selectedNames}`,
    });
  }, [selectedItems, items]);

  const handleDeleteSelected = useCallback(() => {
    if (
      confirm(
        `Are you sure you want to delete ${selectedItems.length} item(s)?`
      )
    ) {
      setItems((prevItems) =>
        prevItems.filter((item) => !selectedItems.includes(item.id))
      );
      toast({
        title: "Deleted",
        description: `${selectedItems.length} item(s) have been deleted`,
      });
    }
  }, [selectedItems]);

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

          {/* Search Bar */}
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
        </div>
      </div>

      {/* View Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={
                  items.length > 0 && items.every((item) => item.selected)
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setItems((prevItems) =>
                      prevItems.map((item) => ({ ...item, selected: true }))
                    );
                  } else {
                    setItems((prevItems) =>
                      prevItems.map((item) => ({ ...item, selected: false }))
                    );
                  }
                }}
                className={`appearance-none h-5 w-5 rounded border-2 
                  ${
                    items.length > 0 && items.every((item) => item.selected)
                      ? "border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                      : "border-gray-300 dark:border-gray-600"
                  } 
                  bg-white dark:bg-gray-800 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 
                  transition-all duration-200
                `}
              />
              {items.length > 0 && items.every((item) => item.selected) && (
                <svg
                  className="absolute w-3 h-3 text-blue-500 left-1 top-1 pointer-events-none"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </label>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select All
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-muted-foreground">
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

          {/* View Size Toggle */}
          <div className="flex items-center border rounded-md p-1 bg-muted/50">
            <button
              onClick={() => setViewSize("small")}
              className={`p-1.5 rounded-md ${
                viewSize === "small"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Small view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewSize("medium")}
              className={`p-1.5 rounded-md ${
                viewSize === "medium"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Medium view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewSize("large")}
              className={`p-1.5 rounded-md ${
                viewSize === "large"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Large view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div
        className={`grid ${
          viewSize === "small"
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
            : viewSize === "medium"
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        }`}
      >
        {filteredItems.map((item) => (
          <div key={item.id} className="relative group">
            <Card
              className={`cursor-pointer transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                item.type === "folder"
                  ? "hover:border-blue-300 dark:hover:border-blue-700"
                  : ""
              } ${item.selected ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => {
                if (item.type === "folder") {
                  navigateToFolder(item);
                }
              }}
            >
              <CardHeader
                className={`${
                  viewSize === "small"
                    ? "p-3"
                    : viewSize === "medium"
                    ? "pb-2"
                    : "pb-3"
                }`}
              >
                <div
                  className={`flex ${
                    viewSize === "small"
                      ? "justify-start items-center space-x-3"
                      : "justify-center mb-2"
                  }`}
                >
                  {item.type === "folder" ? (
                    <Folder
                      className={`${
                        viewSize === "small"
                          ? "w-5 h-5 flex-shrink-0"
                          : viewSize === "medium"
                          ? "w-10 h-10"
                          : "w-14 h-14"
                      } text-yellow-500`}
                    />
                  ) : (
                    <File
                      className={`${
                        viewSize === "small"
                          ? "w-5 h-5 flex-shrink-0"
                          : viewSize === "medium"
                          ? "w-10 h-10"
                          : "w-14 h-14"
                      } text-blue-500`}
                    />
                  )}
                  {viewSize === "small" && (
                    <span className="truncate text-sm">{item.name}</span>
                  )}
                </div>
                {viewSize !== "small" && (
                  <CardTitle
                    className={`${
                      viewSize === "medium" ? "text-base" : "text-lg"
                    } font-medium text-center truncate`}
                  >
                    {item.name}
                  </CardTitle>
                )}
              </CardHeader>
              {viewSize !== "small" && (
                <CardContent className="pt-0 text-center text-sm text-muted-foreground">
                  {item.type === "file" ? (
                    <p>{formatFileSize(item.size)}</p>
                  ) : (
                    <p>Folder</p>
                  )}
                  <p className="text-xs">
                    Modified {formatDate(item.modified)}
                  </p>
                </CardContent>
              )}

              {/* Checkbox and Action Buttons */}
              <div className="absolute top-2 left-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.selected || false}
                    onChange={(e) => {
                      e.stopPropagation();
                      setItems((prevItems) =>
                        prevItems.map((i) =>
                          i.id === item.id ? { ...i, selected: !i.selected } : i
                        )
                      );
                    }}
                    className={`appearance-none h-5 w-5 rounded border-2 
                      ${
                        item.selected
                          ? "border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                          : "border-gray-300 dark:border-gray-600"
                      } 
                      bg-white dark:bg-gray-800 
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 
                      transition-all duration-200
                    `}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {item.selected && (
                    <svg
                      className="absolute w-3 h-3 text-blue-500 left-1 top-1 pointer-events-none"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </label>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1.5 rounded-full bg-green-500/90 text-white hover:bg-green-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(item);
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  className="p-1.5 rounded-full bg-red-500/90 text-white hover:bg-red-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(`Are you sure you want to delete ${item.name}?`)
                    ) {
                      setItems((prevItems) =>
                        prevItems.filter((i) => i.id !== item.id)
                      );
                      toast({
                        title: "Deleted",
                        description: `${item.name} has been deleted`,
                      });
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>This folder is empty</p>
            <p className="text-sm">
              Upload files or create a new folder to get started
            </p>
          </div>
        )}
      </div>

      {/* Selection Popup - Show only when 2 or more items are selected */}
      {selectedItems.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-6 py-3 flex items-center gap-4 z-50 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {selectedItems.length} item(s) selected
            </span>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <button
              onClick={handleDownloadSelected}
              className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white flex items-center gap-1.5 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={handleDeleteSelected}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1.5 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
          <button
            onClick={() => {
              setItems((prevItems) =>
                prevItems.map((item) => ({
                  ...item,
                  selected: false,
                }))
              );
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

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
