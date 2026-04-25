import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { FileIcon } from "@/components/FileIcon";
import { type FileKind } from "@/components/file-utils";
import { ExplorerSidebar } from "@/components/ExplorerSidebar";
import { ExplorerToolbar } from "@/components/ExplorerToolbar";
import { FileGrid } from "@/components/FileGrid";
import { DetailsPanel } from "@/components/DetailsPanel";
import {
  getFileKind,
  formatBytes,
  formatDate,
  type FileNode,
} from "@/components/file-utils";
import {
  getMockNode,
  getMockPath,
  getMockChildren,
  getMockFolders,
  mockFileTree,
} from "@/components/mock-file-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [history, setHistory] = useState({
    back: [] as string[],
    forward: [] as string[],
  });
  const [trashItems, setTrashItems] = useState<FileNode[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  );
  const [deletedItems, setDeletedItems] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(240); // Default sidebar width
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get current folder and items from mock data or trash
  const currentFolder = folderId ? getMockNode(folderId) : null;
  const items = folderId === "trash" ? trashItems : getMockChildren(folderId);

  // Get folders for sidebar
  const foldersForSidebar = getMockFolders();

  // Filter items based on search query and deleted items
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filter out deleted items (only for non-trash folders)
    if (folderId !== "trash") {
      filtered = filtered.filter((item) => !deletedItems.includes(item.id));
    }

    // Apply search filter
    if (!searchQuery.trim()) return filtered;
    const query = searchQuery.toLowerCase().trim();
    return filtered.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, searchQuery, deletedItems, folderId]);

  // Debug logging
  console.log("Debug - folderId:", folderId);
  console.log("Debug - items:", items);
  console.log("Debug - filteredItems:", filteredItems);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Folder name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Mock folder creation
    toast({
      title: "Success",
      description: `Folder "${newFolderName}" created successfully`,
    });

    setNewFolderName("");
    setShowNewFolderDialog(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Mock file upload
    toast({
      title: "Success",
      description: `${files.length} file(s) uploaded successfully`,
    });

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Convert FileNode to FileItem for compatibility
  const convertToFileItem = (node: FileNode) => ({
    id: node.id,
    name: node.name,
    type: node.kind === "folder" ? ("folder" as const) : ("file" as const),
    size: node.size,
    modified: node.modified,
    parentId: node.parentId || null,
    selected: false,
  });

  // Get current path for navigation
  const getCurrentPath = (): FileNode[] => {
    if (folderId === "trash") {
      return [
        {
          id: "trash",
          name: "Trash",
          kind: "folder",
          modified: new Date().toISOString(),
        },
      ];
    }
    if (folderId) {
      return getMockPath(folderId);
    }
    return [
      {
        id: "root",
        name: "Home",
        kind: "folder",
        modified: new Date().toISOString(),
      },
    ];
  };

  // Navigation handlers
  const handleNavigate = (id: string) => {
    if (id === "root") {
      navigate("/storage");
    } else {
      navigate(`/storage/${id}`);
    }
  };

  const handleBack = () => {
    if (history.back.length > 0) {
      const newBack = [...history.back];
      const targetId = newBack.pop()!;
      setHistory({
        back: newBack,
        forward: [...history.forward, folderId || "root"],
      });
      handleNavigate(targetId);
    }
  };

  const handleForward = () => {
    if (history.forward.length > 0) {
      const newForward = [...history.forward];
      const targetId = newForward.pop()!;
      setHistory({
        back: [...history.back, folderId || "root"],
        forward: newForward,
      });
      handleNavigate(targetId);
    }
  };

  const handleFileSelect = (id: string, event?: React.MouseEvent) => {
    // Handle click-away deselection (empty string)
    if (id === "") {
      setSelectedItems([]);
      setSelectedId(null);
      setSelectedNode(null);
      return;
    }

    const currentIndex = filteredItems.findIndex((item) => item.id === id);
    const node = filteredItems.find((item) => item.id === id);

    if (event?.shiftKey) {
      // Shift+click: Add item to selection (regardless of order)
      if (selectedItems.includes(id)) {
        // If already selected, remove from selection
        setSelectedItems((prev) => prev.filter((item) => item !== id));
        if (selectedId === id) {
          setSelectedId(null);
          setSelectedNode(null);
        }
      } else {
        // Add to selection
        setSelectedItems((prev) => [...prev, id]);
        setSelectedId(id);
        setSelectedNode(node || null);
      }
    } else {
      // Regular click: Single selection or toggle
      const isSelected = selectedItems.includes(id);

      if (event?.ctrlKey || event?.metaKey) {
        // Ctrl/Cmd+click: Toggle selection
        if (isSelected) {
          setSelectedItems((prev) => prev.filter((item) => item !== id));
          if (selectedId === id) {
            setSelectedId(null);
            setSelectedNode(null);
          }
        } else {
          setSelectedItems((prev) => [...prev, id]);
          setSelectedId(id);
          setSelectedNode(node || null);
        }
      } else {
        // Normal click: Single selection
        setSelectedItems([id]);
        setSelectedId(id);
        setSelectedNode(node || null);
        setLastSelectedIndex(currentIndex);
      }
    }

    console.log("Debug - selected node:", node);
  };

  const handleFileOpen = (node: FileNode) => {
    setSelectedNode(node);
    setSelectedId(node.id);

    if (node.kind === "folder") {
      setHistory((prev) => ({
        back: [...prev.back, folderId || "root"],
        forward: [],
      }));
      handleNavigate(node.id);
    } else {
      // Handle file opening - could show preview or download
      toast({
        title: "File Selected",
        description: `Selected file: ${node.name}`,
      });
    }
  };

  // Convert filtered items to FileNode array
  const fileNodes: FileNode[] = filteredItems;

  const handleDownload = (item: FileNode) => {
    // Mock download functionality
    toast({
      title: "Download",
      description: `Download for "${item.name}" will be available soon`,
    });
  };

  const handleDownloadSelected = useCallback(() => {
    toast({
      title: "Download",
      description: `Downloading ${selectedItems.length} item(s)...`,
    });
  }, [selectedItems]);

  const handleMoveToTrash = useCallback(() => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select items to move to trash",
        variant: "destructive",
      });
      return;
    }

    if (
      confirm(
        `Are you sure you want to move ${selectedItems.length} item(s) to trash?`,
      )
    ) {
      // Get the items to move to trash
      const itemsToTrash = selectedItems
        .map((id) => getMockNode(id))
        .filter(Boolean) as FileNode[];

      // Add items to trash
      setTrashItems((prev) => [...prev, ...itemsToTrash]);

      // Show success message
      toast({
        title: "Moved to Trash",
        description: `${selectedItems.length} item(s) moved to trash`,
      });

      // Clear selection
      setSelectedItems([]);
      setSelectedId(null);
      setSelectedNode(null);
    }
  }, [selectedItems]);

  const handleSelectAll = useCallback(() => {
    const allItemIds = filteredItems.map((item) => item.id);
    setSelectedItems(allItemIds);

    if (allItemIds.length > 0) {
      // Set the last item as the selected node for details panel
      const lastItem = filteredItems[filteredItems.length - 1];
      setSelectedId(lastItem.id);
      setSelectedNode(lastItem);
    }

    toast({
      title: "All Selected",
      description: `${allItemIds.length} item(s) selected`,
    });
  }, [filteredItems]);

  const handleDelete = useCallback(() => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select items to delete",
        variant: "destructive",
      });
      return;
    }

    if (
      confirm(
        `Are you sure you want to permanently delete ${selectedItems.length} item(s)? This action cannot be undone.`,
      )
    ) {
      if (folderId === "trash") {
        // Delete from trash - permanently remove
        setTrashItems((prev) =>
          prev.filter((item) => !selectedItems.includes(item.id)),
        );
      } else {
        // Delete from current folder - mark as deleted
        setDeletedItems((prev) => [...prev, ...selectedItems]);
        // Also move to trash for recovery
        const itemsToTrash = selectedItems
          .map((id) => getMockNode(id))
          .filter(Boolean) as FileNode[];
        setTrashItems((prev) => [...prev, ...itemsToTrash]);
      }

      // Show success message
      toast({
        title: "Deleted",
        description: `${selectedItems.length} item(s) permanently deleted`,
      });

      // Clear selection
      setSelectedItems([]);
      setSelectedId(null);
      setSelectedNode(null);
    }
  }, [selectedItems, folderId]);

  const handleDeleteSelected = useCallback(() => {
    if (
      confirm(
        `Are you sure you want to delete ${selectedItems.length} item(s)?`,
      )
    ) {
      handleDelete();
      // Mock delete functionality
      toast({
        title: "Success",
        description: `${selectedItems.length} item(s) deleted`,
      });

      // Clear selection
      setSelectedItems([]);
    }
  }, [selectedItems]);

  // Loading state (not needed for mock data)
  // Error state (not needed for mock data)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Favorites Section (Sidebar) */}
      <div style={{ width: `${sidebarWidth}px` }} className="flex-shrink-0">
        <ExplorerSidebar
          currentId={folderId || "root"}
          onNavigate={handleNavigate}
          folders={foldersForSidebar}
          trashItems={trashItems}
        />
      </div>

      {/* Vertical Resize Line - Between Favorites and Items */}
      <div
        className="w-1 bg-border cursor-col-resize hover:bg-accent transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = sidebarWidth;

          const handleMouseMove = (e: MouseEvent) => {
            const newWidth = startWidth + (e.clientX - startX);
            if (newWidth >= 180 && newWidth <= 400) {
              setSidebarWidth(newWidth);
            }
          };

          const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
          };

          document.addEventListener("mousemove", handleMouseMove);
          document.addEventListener("mouseup", handleMouseUp);
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <ExplorerToolbar
          currentId={folderId || "root"}
          onNavigate={handleNavigate}
          history={history}
          onBack={handleBack}
          onForward={handleForward}
          view={view}
          onViewChange={setView}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onUpload={() => fileInputRef.current?.click()}
          onNewFolder={() => setShowNewFolderDialog(true)}
          currentPath={getCurrentPath()}
          selectedItems={selectedItems}
          onMoveToTrash={handleMoveToTrash}
          onDelete={handleDelete}
          onSelectAll={handleSelectAll}
        />

        <main className="flex min-h-0 flex-1 flex-col bg-background">
          <FileGrid
            items={fileNodes}
            selectedId={selectedId}
            selectedItems={selectedItems}
            onSelect={handleFileSelect}
            onOpen={handleFileOpen}
            view={view}
          />
          <div className="flex h-7 items-center justify-between border-t border-border bg-toolbar px-4 text-xs text-muted-foreground">
            <span>
              {fileNodes.length} item{fileNodes.length === 1 ? "" : "s"}
              {selectedNode && `, 1 selected`}
            </span>
            <span>248 GB available</span>
          </div>
        </main>
      </div>

      {/* Item Details Section (Details Panel) */}
      <div className="w-80 flex-shrink-0">
        <DetailsPanel node={selectedNode} />
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        disabled={false}
      />

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
              disabled={false}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowNewFolderDialog(false)}
                disabled={false}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={false}>
                {false ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
