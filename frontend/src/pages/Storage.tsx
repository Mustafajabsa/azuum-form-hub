import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ExplorerSidebar } from "@/components/explorer-sidebar";
import { ExplorerToolbar } from "@/components/explorer-toolbar";
import { FileGrid } from "@/components/file-grid";
import { DetailsPanel } from "@/components/details-panel";
import {
  fileService,
  folderService,
  searchService,
  trashService,
} from "@/api/services/storageService";
import { FileItem, Folder } from "@/api/services/storageService";

// Define FileNode type that matches what the UI components expect
export interface FileNode {
  id: string;
  name: string;
  kind: "file" | "folder";
  size: number;
  modified: string;
  // Additional properties for files
  original_name?: string;
  file_size?: number;
  mime_type?: string;
  folder_id?: string | null;
  owner?: string;
  uploaded_at?: string;
  is_deleted?: boolean;
  // Additional properties for folders
  description?: string;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
  // For folder structure
  children?: FileNode[];
}

// Helper function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function Storage() {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentId, setCurrentId] = useState<string>(folderId || "root");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [back, setBack] = useState<string[]>([]);
  const [forward, setForward] = useState<string[]>([]);

  // Query for current folder contents
  const { data: currentFolder, isLoading: isLoadingFolder } = useQuery({
    queryKey: ["folder", currentId],
    queryFn: () => {
      if (currentId === "trash") {
        return trashService.getTrash();
      } else if (currentId === "root") {
        return folderService.getFolders();
      } else {
        return folderService.getFolder(currentId);
      }
    },
    enabled: !!currentId,
  });

  // Query for files in current folder
  const { data: files, isLoading: isLoadingFiles } = useQuery({
    queryKey: ["files", currentId],
    queryFn: () => fileService.getFiles(),
    enabled: !!currentId && currentId !== "trash",
  });

  // Search query
  const { data: searchResults } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchService.search(query),
    enabled: !!query && query.length > 0,
  });

  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parentId?: string }) =>
      folderService.createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setNewFolderName("");
      setShowNewFolderDialog(false);
    },
  });

  const uploadFilesMutation = useMutation({
    mutationFn: (data: { files: File[]; folderId?: string }) => {
      const promises = data.files.map((file) =>
        fileService.uploadFile(file, data.folderId),
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setSelectedFiles(null);
      setShowUploadDialog(false);
    },
  });

  const moveToTrashMutation = useMutation({
    mutationFn: (data: { itemIds: string[]; itemType: "file" | "folder" }) =>
      trashService.moveToTrash(data.itemIds, data.itemType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setSelectedIds(new Set());
    },
  });

  const navigateToFolder = (id: string) => {
    if (id === currentId) return;
    setBack((b) => [...b, currentId]);
    setForward([]);
    setCurrentId(id);
    setSelectedIds(new Set());

    // Update URL
    if (id === "root") {
      navigate("/storage");
    } else {
      navigate(`/storage/${id}`);
    }
  };

  const handleBack = () => {
    if (back.length === 0) return;
    const prev = back[back.length - 1];
    setBack((b) => b.slice(0, -1));
    setForward((f) => [currentId, ...f]);
    setCurrentId(prev);
    setSelectedIds(new Set());

    // Update URL
    if (prev === "root") {
      navigate("/storage");
    } else {
      navigate(`/storage/${prev}`);
    }
  };

  const handleForward = () => {
    if (forward.length === 0) return;
    const next = forward[0];
    setForward((f) => f.slice(1));
    setBack((b) => [...b, currentId]);
    setCurrentId(next);
    setSelectedIds(new Set());

    // Update URL
    if (next === "root") {
      navigate("/storage");
    } else {
      navigate(`/storage/${next}`);
    }
  };

  const open = (node: FileNode) => {
    if (node.kind === "folder") navigateToFolder(node.id);
  };

  const handleSelection = (
    currentSelectedIds: Set<string>,
    clickedId: string,
    shiftKey: boolean,
    ctrlKey: boolean,
  ) => {
    if (shiftKey) {
      // Shift+Click: add to selection (multi-selection)
      const newSelectedIds = new Set(currentSelectedIds);
      if (newSelectedIds.has(clickedId)) {
        newSelectedIds.delete(clickedId);
      } else {
        newSelectedIds.add(clickedId);
      }
      setSelectedIds(newSelectedIds);
    } else {
      // Normal click: select only this item (single selection)
      setSelectedIds(new Set([clickedId]));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    createFolderMutation.mutate({
      name: newFolderName,
      parentId: currentId === "root" ? undefined : currentId,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const filesArray = Array.from(selectedFiles);
    uploadFilesMutation.mutate({
      files: filesArray,
      folderId: currentId === "root" ? undefined : currentId,
    });
  };

  const handleMoveToTrash = () => {
    if (selectedIds.size === 0) return;

    const selectedIdsArray = Array.from(selectedIds);
    // For simplicity, assume all selected items are files
    // In a real implementation, you'd need to determine the type of each item
    moveToTrashMutation.mutate({
      itemIds: selectedIdsArray,
      itemType: "file",
    });
  };

  // Combine folders and files into items array
  const items = useMemo(() => {
    const folderItems =
      currentFolder?.data?.map((folder) => ({
        ...folder,
        kind: "folder" as const,
        size: 0,
        modified: folder.updated_at,
      })) || [];

    const fileItems =
      files?.data?.map((file) => ({
        ...file,
        kind: "file" as const,
        name: file.original_name,
        size: file.file_size,
        modified: file.uploaded_at,
      })) || [];

    const allItems = [...folderItems, ...fileItems];

    // Filter by search query
    const filtered =
      query && searchResults?.data
        ? allItems.filter((item) =>
            searchResults.data.some((result) => result.id === item.id),
          )
        : allItems;

    // Sort: folders first, then by name
    return [...filtered].sort((a, b) => {
      if (a.kind === "folder" && b.kind !== "folder") return -1;
      if (a.kind !== "folder" && b.kind === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [currentFolder, files, searchResults, query]);

  const selected = items.find((item) => selectedIds.has(item.id)) || null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <ExplorerSidebar currentId={currentId} onNavigate={navigateToFolder} />

      <div className="flex min-w-0 flex-1 flex-col">
        <ExplorerToolbar
          currentId={currentId}
          onNavigate={navigateToFolder}
          history={{ back, forward }}
          onBack={handleBack}
          onForward={handleForward}
          view={view}
          onViewChange={setView}
          query={query}
          onQueryChange={setQuery}
          selectedIds={selectedIds}
          onNewFolder={() => setShowNewFolderDialog(true)}
          onUpload={() => setShowUploadDialog(true)}
          onMoveToTrash={handleMoveToTrash}
        />

        <main className="flex min-h-0 flex-1 flex-col bg-background">
          <FileGrid
            items={items}
            selectedIds={selectedIds}
            onSelect={handleSelection}
            onOpen={open}
            view={view}
            onDeselectAll={handleDeselectAll}
          />
          <div className="flex h-7 items-center justify-between border-t border-border bg-toolbar px-4 text-xs text-muted-foreground">
            <span>
              {items.length} item{items.length === 1 ? "" : "s"}
              {selectedIds.size > 0 && `, ${selectedIds.size} selected`}
            </span>
            <span>248 GB available</span>
          </div>
        </main>
      </div>

      <DetailsPanel node={selected} />

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
              className="w-full mb-4 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewFolderDialog(false)}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Upload Files</h3>

            {/* File Input */}
            <div className="mb-4">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
            </div>

            {/* Selected Files Display */}
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Selected files:</p>
                <div className="max-h-32 overflow-y-auto border border-border rounded-md p-2">
                  {Array.from(selectedFiles).map((file, index) => (
                    <div
                      key={index}
                      className="text-sm text-muted-foreground py-1"
                    >
                      {file.name} ({formatBytes(file.size)})
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowUploadDialog(false);
                  setSelectedFiles(null);
                }}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFiles || selectedFiles.length === 0}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
