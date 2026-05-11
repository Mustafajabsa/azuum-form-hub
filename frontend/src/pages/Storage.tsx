import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Folder as FolderIcon,
  Cloud,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";

import { ExplorerSidebar } from "@/components/explorer-sidebar";
import { ExplorerToolbar } from "@/components/explorer-toolbar";
import { FileGrid } from "@/components/file-grid";
import { SharedItemsGrid } from "@/components/shared-items-grid";
import { DetailsPanel } from "@/components/details-panel";
import { ShareDialog } from "@/components/share-dialog";
import { ShareLinkDialog } from "@/components/share-link-dialog";
import {
  fileService,
  folderService,
  searchService,
  trashService,
  favoritesService,
} from "@/api/services/storageService";
import { FileItem, Folder } from "@/api/services/storageService";
import { FileKind, FileNode, getFileKind } from "@/components/file-utils";
import { useClipboard } from "@/contexts/ClipboardContext";

export type { FileNode } from "@/components/file-utils";

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
  const {
    copyToClipboard,
    cutToClipboard,
    pasteFromClipboard,
    hasClipboardContent,
  } = useClipboard();

  const [currentId, setCurrentId] = useState<string>(folderId || "root");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedItemPath, setSelectedItemPath] = useState<string | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [zipFileName, setZipFileName] = useState("");
  const [showZipNameDialog, setShowZipNameDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMode, setUploadMode] = useState<"file" | "folder" | "cloud">(
    "file",
  );
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string>("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("asc");
  const [back, setBack] = useState<string[]>([]);
  const [forward, setForward] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCompressDialog, setShowCompressDialog] = useState(false);
  const [compressFileName, setCompressFileName] = useState("");
  const [draggedItems, setDraggedItems] = useState<FileNode[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showShareLinkDialog, setShowShareLinkDialog] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const [shareSentType, setShareSentType] = useState<"internal" | "external">(
    "internal",
  );
  const [showTrashAlert, setShowTrashAlert] = useState(false);
  const [showRemoveFavoritesDialog, setShowRemoveFavoritesDialog] =
    useState(false);
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const [openingProgress, setOpeningProgress] = useState(0);

  // Query for files and folders from backend API
  const { data: filesData, isLoading: isLoadingFiles } = useQuery({
    queryKey: ["files", currentId, searchQuery, sortBy, sortOrder],
    queryFn: async () => {
      // Pass folder path if not root
      const folderPath = currentId === "root" ? undefined : currentId;
      console.log("API call with folderPath:", folderPath);
      console.log("Search query:", searchQuery);
      console.log("Sort by:", sortBy, "Order:", sortOrder);

      try {
        const response = await fileService.getFiles(
          1,
          20,
          folderPath,
          searchQuery,
          sortBy,
          sortOrder,
        );
        console.log("API Response:", response);
        console.log("API Response data:", response.data);
        console.log("Files in response:", response.data?.files);
        console.log("Directories in response:", response.data?.directories);
        return response;
      } catch (error) {
        console.error("API Error:", error);
        throw error;
      }
    },
    enabled: !!currentId && currentId !== "trash",
    staleTime: 0, // Ensure data is always considered stale to force refetch
  });

  // Query for trash contents
  const { data: trashData, isLoading: isLoadingTrash } = useQuery({
    queryKey: ["trash"],
    queryFn: () => trashService.getTrash(),
    enabled: currentId === "trash",
  });

  // Query for selected item details
  const { data: selectedItemDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["itemDetails", selectedItemPath],
    queryFn: () => fileService.getFileDetails(selectedItemPath!),
    enabled: !!selectedItemPath,
    staleTime: 0,
  });

  // Query for folder contents to get item count
  const { data: folderContents } = useQuery({
    queryKey: ["folderContents", selectedItemPath],
    queryFn: () => fileService.getFiles(1, 1000, selectedItemPath!),
    enabled: !!selectedItemPath && selectedItemDetails?.data?.type === "folder",
    staleTime: 0,
  });

  // Auto-set shareSentType based on navigation
  useEffect(() => {
    if (currentId === "shared-sent-internal") {
      setShareSentType("internal");
    } else if (currentId === "shared-sent-external") {
      setShareSentType("external");
    }
  }, [currentId]);

  // Query for shared items
  const { data: sharedItemsData, isLoading: isLoadingSharedItems } = useQuery({
    queryKey: ["sharedItems"],
    queryFn: () => fileService.getSharedItemsList(),
    enabled: currentId === "shared-sent",
    staleTime: 0,
  });

  // Query for shared received items
  const { data: sharedReceivedData, isLoading: isLoadingSharedReceived } =
    useQuery({
      queryKey: ["sharedReceived"],
      queryFn: () => fileService.getSharedReceivedItems(),
      enabled: currentId === "shared-received",
      staleTime: 0,
    });

  // Query for favorites (load globally to show star indicators)
  const { data: favoritesData, isLoading: isLoadingFavorites } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => favoritesService.getFavorites(),
    staleTime: 0,
  });

  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parentId?: string }) =>
      folderService.createFolder(data),
    onSuccess: () => {
      // Invalidate both specific folder query and general files query to ensure refresh
      queryClient.invalidateQueries({ queryKey: ["files", currentId] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setNewFolderName("");
      setShowNewFolderDialog(false);
    },
  });

  const uploadFilesMutation = useMutation({
    mutationFn: async (data: { files: File[]; folderId?: string }) => {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const totalFiles = data.files.length;
        let completedFiles = 0;

        const promises = data.files.map((file) =>
          fileService
            .uploadFile(file, data.folderId, (progress) => {
              // Calculate overall progress across all files
              const fileProgress = progress / 100;
              const overallProgress =
                ((completedFiles + fileProgress) / totalFiles) * 100;
              setUploadProgress(Math.round(overallProgress));
            })
            .then((result) => {
              completedFiles++;
              return result;
            }),
        );

        const results = await Promise.all(promises);
        setUploadProgress(100);
        return results;
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 1000);
      }
    },
    onSuccess: (data, variables, context) => {
      console.log("Upload successful, invalidating queries...");
      console.log("Upload response data:", data);
      console.log("Upload variables:", variables);
      console.log("Upload context:", context);
      queryClient.invalidateQueries({ queryKey: ["folder"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["files", currentId] });
      setSelectedFiles(null);
      setShowUploadDialog(false);
      console.log("Queries invalidated, currentId:", currentId);
    },
    onError: (error) => {
      console.error("Upload failed:", error);
      setIsUploading(false);
      setUploadProgress(0);
      alert("Upload failed. Please try again.");
    },
  });

  const uploadFolderMutation = useMutation({
    mutationFn: async (data: {
      files: File[];
      relativePaths: string[];
      directory?: string;
    }) => {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        // Simulate progress for folder upload
        const totalFiles = data.files.length;
        setUploadProgress(10);

        const result = await folderService.uploadFolderStructure(
          data.files,
          data.relativePaths,
          data.directory,
        );

        setUploadProgress(100);
        return result;
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 1000);
      }
    },
    onSuccess: (data, variables, context) => {
      console.log("Folder upload successful, invalidating queries...");
      console.log("Folder upload response data:", data);
      console.log("Folder upload variables:", variables);
      console.log("Folder upload context:", context);
      queryClient.invalidateQueries({ queryKey: ["folder"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["files", currentId] });
      setSelectedFiles(null);
      setSelectedFolderName("");
      setShowUploadDialog(false);
      console.log("Queries invalidated, currentId:", currentId);
    },
    onError: (error) => {
      console.error("Folder upload failed:", error);
      setIsUploading(false);
      setUploadProgress(0);
      alert("Folder upload failed. Please try again.");
    },
  });

  const moveToTrashMutation = useMutation({
    mutationFn: (paths: string[]) => trashService.moveToTrash(paths),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setSelectedIds(new Set());
    },
  });

  const renameMutation = useMutation({
    mutationFn: (data: { path: string; new_name: string }) =>
      fileService.renameFile(data.path, data.new_name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", currentId] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setSelectedIds(new Set());
      setSelectedItemPath(null);
      setShowRenameDialog(false);
      setNewName("");
    },
    onError: (error) => {
      console.error("Rename failed:", error);
      alert("Rename failed. Please try again.");
    },
  });

  const mixedMoveMutation = useMutation({
    mutationFn: (data: { paths: string[]; destination: string }) =>
      fileService.mixedMoveFiles(data.paths, data.destination),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", currentId] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setSelectedIds(new Set());
      setDraggedItems([]);
      setIsDragging(false);
      setDropTarget(null);
    },
    onError: (error) => {
      console.error("Move failed:", error);
      alert("Move failed. Please try again.");
      setIsDragging(false);
      setDropTarget(null);
    },
  });

  const compressMutation = useMutation({
    mutationFn: (data: {
      paths: string[];
      zipName: string;
      destination?: string;
    }) => fileService.compressFiles(data.paths, data.zipName, data.destination),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", currentId] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setShowCompressDialog(false);
      setCompressFileName("");
    },
    onError: (error) => {
      console.error("Compression failed:", error);
      alert("Compression failed. Please try again.");
    },
  });

  const mixedShareMutation = useMutation({
    mutationFn: (data: {
      paths: string[];
      expiresIn?: number;
      maxAccess?: number;
      is_viewable?: boolean;
    }) =>
      fileService.mixedShare(
        data.paths,
        data.expiresIn,
        data.maxAccess,
        data.is_viewable,
      ),
    onSuccess: (response) => {
      console.log("Mixed share successful:", response.data);
      // Handle response with multiple shared items
      if (response.data.shared && response.data.shared.length > 0) {
        // Create master link with all tokens
        const tokens = response.data.shared
          .map((item: any) => item.token)
          .join(",");
        const masterLink = `${window.location.origin}/share/${tokens}`;

        // Create master link data structure
        const masterLinkData = {
          share_url: masterLink,
          shared: response.data.shared,
          isMasterLink: true,
        };

        setShareData(masterLinkData); // Store master link data
        setShowShareLinkDialog(true);
      }
    },
    onError: (error) => {
      console.error("Mixed share failed:", error);
      alert("Failed to generate share links. Please try again.");
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: (token: string) => fileService.revokeShare(token),
    onSuccess: () => {
      console.log("Share revoked successfully");
      // Refresh the shared items list
      queryClient.invalidateQueries({ queryKey: ["sharedItems"] });
      setSelectedIds(new Set());
    },
    onError: (error) => {
      console.error("Revoke share failed:", error);
      alert("Failed to revoke share. Please try again.");
    },
  });

  const removeFromFavoritesMutation = useMutation({
    mutationFn: (ids: number[]) => favoritesService.removeFromFavorites(ids),
    onSuccess: () => {
      console.log("Removed from favorites successfully");
      // Refresh the favorites list
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      setSelectedIds(new Set());
    },
    onError: (error) => {
      console.error("Remove from favorites failed:", error);
      alert("Failed to remove items from favorites. Please try again.");
    },
  });

  const handleRevokeShare = (token: string) => {
    const proceed = confirm(
      "Are you sure you want to revoke this share link? This action cannot be undone.",
    );
    if (proceed) {
      revokeShareMutation.mutate(token);
    }
  };

  const navigateToFolder = (id: string) => {
    if (id === currentId) return;
    setBack((b) => [...b, currentId]);
    setForward([]);
    setCurrentId(id);
    setSelectedIds(new Set());

    // Update URL - encode the full path to handle nested folders
    if (id === "root") {
      navigate("/storage");
    } else {
      // Encode the full path to ensure it's treated as a single parameter
      const encodedPath = encodeURIComponent(id);
      navigate(`/storage/${encodedPath}`);
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
      const encodedPath = encodeURIComponent(prev);
      navigate(`/storage/${encodedPath}`);
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
      const encodedPath = encodeURIComponent(next);
      navigate(`/storage/${encodedPath}`);
    }
  };

  const handleUp = () => {
    if (currentId === "root" || !currentId) return;

    // Get parent directory by removing last segment from path
    const pathSegments = currentId.split("/");
    if (pathSegments.length === 1) {
      // If we're in a direct subfolder of root, go to root
      navigateToFolder("root");
    } else {
      // Remove the last segment to get parent path
      const parentPath = pathSegments.slice(0, -1).join("/");
      navigateToFolder(parentPath);
    }
  };

  const open = (node: FileNode) => {
    console.log("Opening node:", node);
    if (node.kind === "folder") {
      // Use folder name/path instead of UUID for API calls
      const folderPath = (node as any).path || node.name;
      console.log("Navigating to folder:", folderPath);
      console.log("Folder path for API call:", folderPath);
      console.log("Current user context - should see nested folders");
      navigateToFolder(folderPath);
    } else {
      // Handle file viewing
      const filePath = (node as any).path || node.name;
      console.log("Viewing file:", filePath);

      // Check if trying to view file from trash
      if (currentId === "trash") {
        setShowTrashAlert(true);
        return;
      }

      // Start file opening progress
      setIsOpeningFile(true);
      setOpeningProgress(0);

      // Simulate progress updates during file loading
      const progressInterval = setInterval(() => {
        setOpeningProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 15;
        });
      }, 100);

      // Use the viewFile API to get the file URL for inline viewing
      fileService
        .viewFile(filePath)
        .then((response) => {
          // Clear progress interval and set to complete
          clearInterval(progressInterval);
          setOpeningProgress(100);

          // Create a blob URL from the response and open in new tab
          const contentType =
            (response.headers as any)["content-type"] ||
            "application/octet-stream";
          const blob = new Blob([response.data], { type: contentType });
          const url = window.URL.createObjectURL(blob);

          // Open in new tab for viewing
          window.open(url, "_blank");

          // Clean up the blob URL after a delay
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);

          // Reset opening state after a short delay
          setTimeout(() => {
            setIsOpeningFile(false);
            setOpeningProgress(0);
          }, 500);
        })
        .catch((error) => {
          console.error("Failed to view file:", error);
          clearInterval(progressInterval);
          setIsOpeningFile(false);
          setOpeningProgress(0);
          alert("Failed to view file. Please try again.");
        });
    }
  };

  const handleSelection = (
    currentSelectedIds: Set<string>,
    clickedId: string,
    shiftKey: boolean,
    ctrlKey: boolean,
    clickedItem?: FileNode,
  ) => {
    // Construct the full path for the selected item
    let itemPath = "";

    if ((clickedItem as any)?.path) {
      // Use the full path if available from the API response
      itemPath = (clickedItem as any).path;
    } else if (clickedItem?.name) {
      // Construct full path by combining current folder context with item name
      if (currentId === "root") {
        itemPath = clickedItem.name;
      } else {
        itemPath = `${currentId}/${clickedItem.name}`;
      }
    }

    console.log("Selected item path:", itemPath);
    console.log("Current folder context:", currentId);

    if (shiftKey) {
      // Shift+Click: add to selection (multi-selection)
      const newSelectedIds = new Set(currentSelectedIds);
      if (newSelectedIds.has(clickedId)) {
        newSelectedIds.delete(clickedId);
      } else {
        newSelectedIds.add(clickedId);
      }
      setSelectedIds(newSelectedIds);
    } else if (ctrlKey) {
      // Ctrl/Cmd+Click: toggle selection (multi-selection)
      const newSelectedIds = new Set(currentSelectedIds);
      if (newSelectedIds.has(clickedId)) {
        newSelectedIds.delete(clickedId);
      } else {
        newSelectedIds.add(clickedId);
      }
      setSelectedIds(newSelectedIds);
    } else {
      // Normal click: toggle selection - if already selected, deselect; otherwise select only this item
      if (currentSelectedIds.has(clickedId)) {
        setSelectedIds(new Set());
        setSelectedItemPath(null);
      } else {
        setSelectedIds(new Set([clickedId]));
        setSelectedItemPath(itemPath);
      }
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
    setSelectedItemPath(null);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    createFolderMutation.mutate({
      name: newFolderName,
      parentId: currentId === "root" ? undefined : currentId,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setSelectedFiles(files);

    // Extract folder name for folder uploads
    if (uploadMode === "folder" && files && files.length > 0) {
      // Get the folder path from the first file's webkitRelativePath
      const firstFile = files[0];
      const relativePath = (firstFile as any).webkitRelativePath;
      if (relativePath) {
        // Extract folder name from the path (first segment before '/')
        const folderName = relativePath.split("/")[0];
        setSelectedFolderName(folderName);
      }
    } else if (uploadMode === "file") {
      setSelectedFolderName("");
    }
  };

  const handleUpload = () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const filesArray = Array.from(selectedFiles);

    if (uploadMode === "folder") {
      // Use folder upload API for folder uploads
      const relativePaths = filesArray.map(
        (file) => (file as any).webkitRelativePath,
      );

      // Check if we're in media folder or if we need to upload to a specific directory
      const isMediaFolder =
        currentId === "media" || currentId?.startsWith("media/");
      const targetDirectory = isMediaFolder
        ? ""
        : currentId === "root"
          ? ""
          : currentId; // Convert "root" to empty string for backend

      uploadFolderMutation.mutate({
        files: filesArray,
        relativePaths: relativePaths,
        directory: targetDirectory,
      });
    } else {
      // Use regular file upload API for file uploads
      const isMediaFolder =
        currentId === "media" || currentId?.startsWith("media/");
      const targetFolder = isMediaFolder
        ? ""
        : currentId === "root"
          ? ""
          : currentId; // Convert "root" to empty string for backend

      uploadFilesMutation.mutate({
        files: filesArray,
        folderId: targetFolder,
      });
    }
  };

  const handleDownload = async () => {
    console.log("=== DOWNLOAD HANDLER CALLED ===");
    console.log("Selected IDs:", Array.from(selectedIds));
    console.log("Selected IDs size:", selectedIds.size);

    if (selectedIds.size === 0) return;

    // Find the selected items from the current items list
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    const selectedFiles = selectedItems.filter(
      (item) => item.kind !== "folder",
    );

    // Check if any folders are selected
    const selectedFolders = selectedItems.filter(
      (item) => item.kind === "folder",
    );

    console.log("Selected items:", selectedItems);
    console.log("Selected files:", selectedFiles);
    console.log("Selected folders:", selectedFolders);

    if (selectedItems.length === 1 && selectedFolders.length === 0) {
      // Download single file using authenticated API call
      const file = selectedItems[0];
      const filePath = (file as any).path || file.name;

      // Start download progress
      setIsDownloading(true);
      setDownloadProgress(0);

      try {
        // Simulate progress updates during download
        const progressInterval = setInterval(() => {
          setDownloadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        const response = await fileService.downloadFile(filePath);

        // Clear progress interval
        clearInterval(progressInterval);
        setDownloadProgress(100);

        // Create blob URL and trigger download
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        window.URL.revokeObjectURL(url);

        console.log("Single file download completed successfully");
      } catch (error) {
        console.error("Single file download failed:", error);
        alert("File download failed. Please try again.");
      } finally {
        // Reset download state
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
        }, 1000);
      }
    } else {
      // Show zip name dialog for multiple files, folders, or mixed selections
      setShowZipNameDialog(true);
    }
  };

  const handleBulkDownload = async () => {
    if (!zipFileName.trim()) {
      alert("Please enter a name for the zip file");
      return;
    }

    // Find the selected items from the current items list
    const selectedItems = items.filter((item) => selectedIds.has(item.id));

    // Get paths for all selected items (files and folders)
    const itemPaths = selectedItems.map(
      (item) => (item as any).path || item.name,
    );

    console.log("=== MIXED DOWNLOAD DEBUG ===");
    console.log("Selected items:", selectedItems);
    console.log("Item paths being sent:", itemPaths);
    console.log("Zip file name:", zipFileName);
    console.log("Item paths array length:", itemPaths.length);
    console.log("Are item paths empty?", itemPaths.length === 0);

    // Check if paths are valid
    if (itemPaths.length === 0) {
      console.error("ERROR: No paths to send to backend!");
      alert("Error: No items selected for download");
      return;
    }

    // Check if only empty folders are selected
    const hasFiles = selectedItems.some((item) => item.kind !== "folder");
    const hasFolders = selectedItems.some((item) => item.kind === "folder");

    if (hasFolders && !hasFiles) {
      // Only folders selected, check if they might be empty
      console.log("Only folders selected - checking if they might be empty");
      const folderNames = selectedItems
        .filter((item) => item.kind === "folder")
        .map((item) => item.name)
        .join(", ");

      console.log("Folders to download:", folderNames);

      // Show a warning that empty folders can't be downloaded
      const proceed = confirm(
        `You're about to download folder(s): ${folderNames}\n\n` +
          `Note: Empty folders cannot be zipped and downloaded.\n` +
          `If any folder is empty, the download will fail.\n\n` +
          `Do you want to continue?`,
      );

      if (!proceed) {
        console.log("User cancelled download of potentially empty folders");
        return;
      }
    }

    // Start download progress
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Simulate progress updates during download
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Use mixed download endpoint for files and folders
      const response = await fileService.mixedDownloadFiles(
        itemPaths,
        zipFileName,
      );

      // Clear progress interval
      clearInterval(progressInterval);
      setDownloadProgress(100);

      // Handle the response - it should be a blob for the zip file
      if (response.data instanceof Blob) {
        const url = window.URL.createObjectURL(response.data);

        const link = document.createElement("a");
        link.href = url;
        link.download = `${zipFileName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        window.URL.revokeObjectURL(url);

        console.log("Mixed download completed successfully");
      } else {
        console.error("Response is not a blob:", response.data);
        alert("Download failed - invalid response format");
      }

      // Close dialog and reset zip name
      setShowZipNameDialog(false);
      setZipFileName("");
    } catch (error: any) {
      console.error("Mixed download failed:", error);
      console.error("Error response:", error.response);
      console.error("Error status:", error.response?.status);
      console.error("Error data:", error.response?.data);

      // Read the Blob error response to get the actual error message
      if (error.response?.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string);
            console.error("Parsed error data:", errorData);

            // Provide user-friendly message for empty folders
            let errorMessage = errorData.error || "Unknown backend error";
            if (
              errorMessage.includes("empty") ||
              errorMessage.includes("no valid items")
            ) {
              errorMessage =
                "Cannot download empty folders. Please select folders that contain files, or add files to the folders first.";
            }

            alert(`Download failed: ${errorMessage}`);
          } catch (e) {
            console.error("Failed to parse error blob:", reader.result);
            alert(`Download failed: Backend error (check console for details)`);
          }
        };
        reader.readAsText(error.response.data);
      } else if (error.response?.data?.error) {
        let errorMessage = error.response.data.error;
        if (
          errorMessage.includes("empty") ||
          errorMessage.includes("no valid items")
        ) {
          errorMessage =
            "Cannot download empty folders. Please select folders that contain files, or add files to the folders first.";
        }
        alert(`Download failed: ${errorMessage}`);
      } else {
        alert(`Download failed: ${error.message || "Unknown error"}`);
      }

      // Close dialog and reset zip name
      setShowZipNameDialog(false);
      setZipFileName("");
    } finally {
      // Reset download state
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 1000);
    }
  };

  const handleMoveToTrash = () => {
    if (selectedIds.size === 0) return;

    // Find the selected items from the current items list
    const selectedItems = items.filter((item) => selectedIds.has(item.id));

    // Get paths for all selected items
    const pathsToTrash = selectedItems.map((item) => {
      // Use the full path if available from the API response
      if ((item as any).path) {
        return (item as any).path;
      } else {
        // Construct full path by combining current folder context with item name
        if (currentId === "root") {
          return item.name;
        } else {
          return `${currentId}/${item.name}`;
        }
      }
    });

    // Sanitize paths to convert Windows backslashes to forward slashes
    const sanitizePath = (path: string) => path.replace(/\\/g, "/");
    const sanitizedPaths = pathsToTrash.map((path) => sanitizePath(path));

    moveToTrashMutation.mutate(sanitizedPaths);
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) return;

    const selectedIdsArray = Array.from(selectedIds);

    if (currentId === "trash") {
      // Handle trash-specific deletion using IDs
      const proceed = confirm(
        `Are you sure you want to permanently delete ${selectedIdsArray.length} item(s)? This action cannot be undone.`,
      );
      if (proceed) {
        trashService
          .deletePermanently(selectedIdsArray, "file")
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["trash"] });
            setSelectedIds(new Set());
          })
          .catch((error) => {
            console.error("Delete permanently failed:", error);
            alert("Failed to delete items permanently. Please try again.");
          });
      }
    } else {
      // Handle regular file/folder deletion
      const pathsToDelete = selectedIdsArray.map((id) => {
        // Find the item in our current items to get its path
        const item = items.find((item) => item.id === id);

        if (item?.kind === "folder") {
          // For folders, use the folder path
          return (item as any).path || item.name;
        } else {
          // For files, construct the path from folder structure
          return (item as any).path || item.name;
        }
      });

      // Use bulk delete for all selected items
      fileService
        .batchDeleteFiles(pathsToDelete)
        .then(() => {
          // Refresh the files query to update the UI
          queryClient.invalidateQueries({ queryKey: ["files", currentId] });
          queryClient.invalidateQueries({ queryKey: ["files"] });
          setSelectedIds(new Set());
        })
        .catch((error) => {
          console.error("Error deleting items:", error);
        });
    }
  };

  const handleRename = () => {
    if (selectedIds.size === 0) return;

    const selectedItem = items.find((item) => selectedIds.has(item.id));
    if (!selectedItem) return;

    setNewName(selectedItem.name);
    setShowRenameDialog(true);
  };

  const handleRenameConfirm = () => {
    if (!newName.trim() || selectedIds.size === 0) return;

    const selectedItem = items.find((item) => selectedIds.has(item.id));
    if (!selectedItem) return;

    const itemPath = (selectedItem as any).path || selectedItem.name;

    renameMutation.mutate({
      path: itemPath,
      new_name: newName.trim(),
    });
  };

  // Clipboard handlers
  const handleCopy = () => {
    if (selectedIds.size === 0) return;

    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    const clipboardItems = selectedItems.map(
      (item): { path: string; name: string; type: "file" | "folder" } => ({
        path: (item as any).path || item.name,
        name: item.name,
        type: item.kind === "folder" ? "folder" : "file",
      }),
    );

    copyToClipboard(clipboardItems);
  };

  const handleCut = () => {
    if (selectedIds.size === 0) return;

    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    const clipboardItems = selectedItems.map(
      (item): { path: string; name: string; type: "file" | "folder" } => ({
        path: (item as any).path || item.name,
        name: item.name,
        type: item.kind === "folder" ? "folder" : "file",
      }),
    );

    cutToClipboard(clipboardItems);
  };

  const handlePaste = async () => {
    if (!hasClipboardContent) return;

    try {
      await pasteFromClipboard(currentId === "root" ? "" : currentId);

      // Refresh the files query to show the pasted items
      queryClient.invalidateQueries({ queryKey: ["files", currentId] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
    } catch (error) {
      console.error("Paste failed:", error);
      alert("Paste failed. Please try again.");
    }
  };

  const handleCompress = () => {
    if (selectedIds.size === 0) return;

    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    const pathsToCompress = selectedItems.map(
      (item) => (item as any).path || item.name,
    );

    if (pathsToCompress.length === 0) {
      alert("No valid items selected for compression");
      return;
    }

    // Default zip name based on selection
    const defaultZipName =
      selectedItems.length === 1
        ? `${selectedItems[0].name}_archive`
        : `archive_${new Date().toISOString().split("T")[0]}`;

    setCompressFileName(defaultZipName);
    setShowCompressDialog(true);
  };

  const handleCompressConfirm = async () => {
    if (!compressFileName.trim()) return;

    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    const pathsToCompress = selectedItems.map(
      (item) => (item as any).path || item.name,
    );

    if (pathsToCompress.length === 0) {
      alert("No valid items selected for compression");
      return;
    }

    compressMutation.mutate({
      paths: pathsToCompress,
      zipName: compressFileName,
      destination: currentId === "root" ? "" : currentId,
    });
  };

  // Wrapper function for ExplorerToolbar
  const handleShareClick = () => {
    handleShare("external");
  };

  const handleEmptyTrash = () => {
    const proceed = confirm(
      "Are you sure you want to empty trash? This action will permanently delete all items in trash and cannot be undone.",
    );
    if (proceed) {
      trashService
        .emptyTrash()
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["trash"] });
          setSelectedIds(new Set());
        })
        .catch((error) => {
          console.error("Empty trash failed:", error);
          alert("Failed to empty trash. Please try again.");
        });
    }
  };

  const handleRestore = () => {
    if (selectedIds.size === 0) return;

    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    const itemIds = selectedItems.map((item) => item.id);

    const proceed = confirm(
      `Are you sure you want to restore ${selectedItems.length} item(s)?`,
    );
    if (proceed) {
      trashService
        .restoreFromTrash(itemIds, "file")
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["trash"] });
          queryClient.invalidateQueries({ queryKey: ["files"] });
          setSelectedIds(new Set());
        })
        .catch((error) => {
          console.error("Restore failed:", error);
          alert("Failed to restore items. Please try again.");
        });
    }
  };

  const handleShare = (type: "external" | "internal") => {
    if (selectedIds.size === 0) {
      alert("Please select items to share");
      return;
    }

    const selectedItems = items.filter((item) => selectedIds.has(item.id));

    if (type === "external") {
      if (selectedIds.size === 0) {
        alert("Please select items to share");
        return;
      }

      // Show dialog for both single and multiple items
      setShowShareDialog(true);
    } else {
      alert("Internal sharing is not implemented yet");
    }
  };

  const handleShareConfirm = (
    expiresIn?: number,
    maxAccess?: number,
    isViewable?: boolean,
  ) => {
    const selectedItems = items.filter((item) => selectedIds.has(item.id));

    // Use mixed-share endpoint for both single and multiple items
    // This ensures consistent behavior and follows the same method as multiple selection
    const paths = selectedItems.map((item) => (item as any).path || item.name);

    mixedShareMutation.mutate({
      paths,
      expiresIn,
      maxAccess,
      is_viewable: isViewable,
    });
  };

  const handleAddToFavorites = async () => {
    if (selectedIds.size === 0) return;

    // Find the selected items from the current items list
    const selectedItems = items.filter((item) => selectedIds.has(item.id));

    // Get the paths of the selected items
    const pathsToAdd = selectedItems.map((item) => {
      // Use the path if available, otherwise construct it
      if ((item as any).path) {
        return (item as any).path;
      }
      // Construct path based on current folder context
      if (currentId === "root") {
        return item.name;
      } else {
        return `${currentId}/${item.name}`;
      }
    });

    console.log("Adding to favorites:", pathsToAdd);

    // Add to favorites via API
    try {
      const response = await favoritesService.addToFavorites(pathsToAdd);
      console.log("Added to favorites:", response.data);

      // Show success message
      const { added, skipped, failed } = response.data;
      if (added.length > 0) {
        console.log(`Successfully added ${added.length} item(s) to favorites`);
      }
      if (skipped.length > 0) {
        console.log(`${skipped.length} item(s) were already in favorites`);
      }
      if (failed.length > 0) {
        console.error(
          `${failed.length} item(s) failed to add to favorites:`,
          failed,
        );
      }

      // Refresh the favorites list
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch (error) {
      console.error("Failed to add items to favorites:", error);
      alert("Failed to add items to favorites. Please try again.");
    }
  };

  const handleRemoveFromFavorites = () => {
    if (selectedIds.size === 0) return;
    setShowRemoveFavoritesDialog(true);
  };

  const confirmRemoveFromFavorites = () => {
    // Convert selected IDs to numbers (favorites API expects number IDs)
    const idsToRemove = Array.from(selectedIds).map((id) => parseInt(id, 10));
    removeFromFavoritesMutation.mutate(idsToRemove);
    setShowRemoveFavoritesDialog(false);
  };

  // Helper function to check if an item is in favorites
  const isItemFavorited = (item: any) => {
    if (!favoritesData?.data?.items) return false;

    const itemPath = (item as any).path || item.name;
    const itemName = item.name;

    return favoritesData.data.items.some((favorite: any) => {
      const favoritePath = favorite.path || favorite.item_name;
      const favoriteName =
        favorite.item_name || favoritePath?.split("/")?.pop();

      // Check by path or name
      return favoritePath === itemPath || favoriteName === itemName;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      // Deselect all if all are already selected
      setSelectedIds(new Set());
    } else if (items.length > 0) {
      // Select all items
      const allItemIds = items.map((item) => item.id);
      setSelectedIds(new Set(allItemIds));
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    console.log("Drag started:", node.name);

    // Get all selected items or just the dragged item if nothing is selected
    const itemsToMove =
      selectedIds.size > 0
        ? items.filter((item) => selectedIds.has(item.id))
        : [node];

    setDraggedItems(itemsToMove);
    setIsDragging(true);

    // Set drag data
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify(itemsToMove.map((item) => item.id)),
    );
  };

  const handleDragEnd = () => {
    console.log("Drag ended");
    setIsDragging(false);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drop target if we're actually leaving the target element
    const target = e.currentTarget as HTMLElement;
    if (!target.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetNode: FileNode) => {
    e.preventDefault();

    if (!targetNode || targetNode.kind !== "folder") {
      console.log("Drop target is not a folder");
      return;
    }

    console.log("Dropping on folder:", targetNode.name);
    console.log("Dragged items:", draggedItems);

    if (draggedItems.length === 0) {
      console.log("No items to move");
      return;
    }

    // Get paths of all items to move
    const pathsToMove = draggedItems.map(
      (item) => (item as any).path || item.name,
    );
    const destinationPath = (targetNode as any).path || targetNode.name;

    console.log("Moving paths:", pathsToMove);
    console.log("To destination:", destinationPath);

    // Move items using mixed move API
    mixedMoveMutation.mutate({
      paths: pathsToMove,
      destination: destinationPath,
    });
  };

  // Combine files and folders into items array based on API response
  const items = useMemo(() => {
    let allItems: FileNode[] = [];

    if (currentId === "trash" && trashData?.data) {
      // Handle trash data - API returns { items: [...] }
      const trashItems = trashData.data.items || [];
      allItems = trashItems.map((item: any) => {
        const isFolder = item.type === "folder";
        const fileName =
          item.item_name || item.original_path?.split("/").pop() || "Unknown";

        return {
          id: item.id.toString(),
          name: fileName,
          kind: isFolder ? "folder" : getFileKind(fileName, false),
          size: item.size_bytes || 0,
          modified: item.trashed_at || new Date().toISOString(),
          original_name: item.item_name,
          file_size: item.size_bytes || 0,
          mime_type: isFolder ? null : "application/octet-stream",
          folder_id: null,
          owner: "current",
          uploaded_at: item.trashed_at,
          is_deleted: true,
          description: `Trashed from ${item.original_path}`,
          parent_id: null,
          created_at: item.trashed_at,
          updated_at: item.trashed_at,
          path: item.original_path,
        };
      });
    } else if (filesData?.data) {
      // Handle files and folders from main API - actual backend structure
      const directories = filesData.data.directories || [];
      const files = filesData.data.files || [];

      console.log("=== API RESPONSE DEBUG ===");
      console.log("Full API response:", filesData.data);
      console.log("Directories count:", directories.length);
      console.log("Files count:", files.length);
      console.log("Processing directories:", directories);
      console.log("Processing files:", files);
      console.log("Current ID for filtering:", currentId);
      console.log("=== END DEBUG ===");

      // Recursive function to find folder by path in nested structure
      const findFolderByPath = (folders: any[], targetPath: string): any => {
        for (const folder of folders) {
          if (folder.path === targetPath || folder.name === targetPath) {
            return folder;
          }
          // Search recursively in subdirectories
          if (folder.directories && folder.directories.length > 0) {
            const found = findFolderByPath(folder.directories, targetPath);
            if (found) return found;
          }
        }
        return null;
      };

      // Filter directories based on current navigation context
      let filteredDirectories = directories;
      if (currentId !== "root" && currentId !== "") {
        console.log("Looking for folder with currentId:", currentId);
        console.log(
          "Available directories:",
          directories.map((d: any) => ({ name: d.name, path: d.path })),
        );

        // When navigating into a folder, find its contents recursively
        const currentFolder = findFolderByPath(directories, currentId);

        console.log("Found currentFolder:", currentFolder);

        if (currentFolder && currentFolder.directories) {
          // Show subdirectories of current folder
          filteredDirectories = currentFolder.directories;
          console.log(
            "Setting filteredDirectories to subdirectories:",
            filteredDirectories,
          );
        } else {
          // If no matching folder found, show empty
          filteredDirectories = [];
          console.log(
            "No matching folder found, setting filteredDirectories to empty",
          );
        }
      }

      // Process directories (folders)
      const folderItems = filteredDirectories.map((dir: any) => {
        // Ensure folder has a valid ID - use fallback if missing
        const folderId =
          dir.id ||
          dir.path ||
          dir.name ||
          `folder-${Date.now()}-${Math.random()}`;

        const subdirectories = dir.directories || [];

        return {
          id: folderId,
          name: dir.name,
          kind: "folder" as FileKind,
          size: 0, // Will be updated by API details
          modified: new Date().toISOString(), // Backend doesn't provide modified date for folders
          path:
            dir.path ||
            (currentId === "root" ? dir.name : `${currentId}/${dir.name}`),
          directories: dir.directories || [],
          children: [
            // Add subdirectories
            ...(dir.directories?.map((subDir: any) => ({
              id:
                subDir.id ||
                subDir.path ||
                subDir.name ||
                `subfolder-${Date.now()}-${Math.random()}`,
              name: subDir.name,
              kind: "folder" as FileKind,
              size: 0,
              modified: new Date().toISOString(),
              path:
                subDir.path ||
                `${dir.path || (currentId === "root" ? dir.name : `${currentId}/${dir.name}`)}/${subDir.name}`,
              directories: subDir.directories || [],
            })) || []),
          ],
          // Add additional properties for folder statistics
          fileCount: 0, // Will be updated by API details
          folderCount: subdirectories.length,
        };
      });

      // Process files
      const fileItems = files.map((file: any) => {
        // Try multiple possible name fields
        const fileName =
          file.name ||
          file.original_name ||
          file.filename ||
          file.display_name ||
          "Unknown";

        // Ensure file has a valid ID - use fallback if missing
        const fileId =
          file.id ||
          file.path ||
          fileName ||
          `file-${Date.now()}-${Math.random()}`;

        return {
          id: fileId,
          name: fileName,
          kind: getFileKind(fileName, false),
          size: file.size || 0, // Use 'size' field from backend
          modified: file.uploaded_at || new Date().toISOString(),
          original_name: file.original_name || fileName,
          file_size: file.size || 0, // Keep for compatibility
          mime_type: file.mime_type,
          folder_id: file.folder_id,
          owner: file.owner,
          uploaded_at: file.uploaded_at || file.created_at,
          is_deleted: file.is_deleted || false,
          description: file.description,
          parent_id: file.parent_id,
          created_at: file.created_at,
          updated_at: file.updated_at,
          path:
            file.path ||
            (currentId === "root" ? fileName : `${currentId}/${fileName}`),
        };
      });

      allItems = [...folderItems, ...fileItems];
    }

    // Handle shared-sent items
    if (currentId === "shared-sent" && sharedItemsData?.data) {
      allItems = sharedItemsData.data.items.map((item: any) => {
        const isFolder = item.type === "folder";
        // Extract filename from file_path since the new API doesn't provide original_name
        const fileName = item.file_path
          ? item.file_path.split("/").pop()
          : "Unknown";

        return {
          id: item.token,
          name: fileName,
          kind: isFolder ? "folder" : getFileKind(fileName, false),
          size: 0, // The new API doesn't provide file_size
          modified: item.created_at || new Date().toISOString(),
          original_name: fileName,
          file_size: 0,
          mime_type: isFolder ? null : "application/octet-stream",
          token: item.token,
          expires_at: item.expires_at,
          max_access: item.max_access,
          current_access: item.access_count,
          shared_by: "Me", // Since these are items shared by the current user
          download_url: item.share_url,
          preview_url: item.share_url,
          path: item.file_path,
          is_viewable: item.is_viewable,
          is_active: item.is_active,
          is_expired: item.is_expired,
          accesses_remaining: item.accesses_remaining,
        };
      });
    }

    // Handle shared-received items
    if (currentId === "shared-received" && sharedReceivedData?.data) {
      allItems = sharedReceivedData.data.map((item: any) => {
        const isFolder = item.type === "folder";
        const fileName = item.original_name || item.name || "Unknown";

        return {
          id: item.id || item.token,
          name: fileName,
          kind: isFolder ? "folder" : getFileKind(fileName, false),
          size: item.file_size || 0,
          modified: item.created_at || new Date().toISOString(),
          original_name: item.original_name || item.name,
          file_size: item.file_size || 0,
          mime_type: item.mime_type,
          token: item.token,
          expires_at: item.expires_at,
          max_access: item.max_access,
          current_access: item.current_access,
          shared_by: item.shared_by,
          download_url: item.download_url,
          preview_url: item.preview_url,
          path: item.path,
        };
      });
    }

    // Handle favorites items
    if (currentId === "favorites" && favoritesData?.data) {
      allItems = favoritesData.data.items.map((item: any) => {
        const isFolder = item.type === "folder";
        const fileName =
          item.item_name || item.path?.split("/").pop() || "Unknown";

        return {
          id: item.id.toString(),
          name: fileName,
          kind: isFolder ? "folder" : getFileKind(fileName, false),
          size: item.size_bytes || 0, // Use actual size from backend
          modified: item.added_at || new Date().toISOString(),
          original_name: fileName,
          file_size: item.size_bytes || 0,
          mime_type: isFolder ? null : "application/octet-stream",
          path: item.path || fileName,
          exists: item.exists, // Include exists flag from backend
          added_at: item.added_at,
          is_favorite: true,
        };
      });
    }

    // Filter by search query - now handled by API directly
    const filtered = allItems;

    // No client-side sorting - let backend handle all sorting
    return filtered;
  }, [
    filesData,
    trashData,
    sharedItemsData,
    sharedReceivedData,
    favoritesData,
    query,
    currentId,
    shareSentType,
  ]);

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
          onUp={handleUp}
          view={view}
          onViewChange={setView}
          query={query}
          onQueryChange={setQuery}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          selectedIds={selectedIds}
          onNewFolder={() => setShowNewFolderDialog(true)}
          onUpload={() => setShowUploadDialog(true)}
          onMoveToTrash={handleMoveToTrash}
          onDelete={handleDelete}
          onDownload={handleDownload}
          onRename={handleRename}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          canPaste={hasClipboardContent}
          onCompress={handleCompress}
          onSelectAll={handleSelectAll}
          onShare={handleShareClick}
          onAddToFavorites={handleAddToFavorites}
          onRemoveFromFavorites={handleRemoveFromFavorites}
          onEmptyTrash={handleEmptyTrash}
          onRestore={handleRestore}
          items={items}
        />

        <main className="flex min-h-0 flex-1 flex-col bg-background">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-6xl mb-4">
                  {currentId === "trash"
                    ? "🗑️"
                    : currentId === "shared-sent"
                      ? "📤"
                      : currentId === "shared-received"
                        ? "📥"
                        : currentId === "favorites"
                          ? "⭐"
                          : "📁"}
                </div>
                <h3 className="text-lg font-medium mb-2">
                  {currentId === "trash"
                    ? "Trash is empty"
                    : currentId === "shared-sent"
                      ? "No sent items"
                      : currentId === "shared-received"
                        ? "No received items"
                        : currentId === "favorites"
                          ? "No favorites yet"
                          : "This folder is empty"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentId === "root"
                    ? "Create folders or upload files to get started"
                    : currentId === "trash"
                      ? "Items moved to trash will appear here"
                      : currentId === "shared-sent"
                        ? "Items you share will appear here"
                        : currentId === "shared-received"
                          ? "Items shared with you will appear here"
                          : currentId === "favorites"
                            ? "Add files or folders to favorites to see them here"
                            : "Add files or folders to this directory"}
                </p>
              </div>
            </div>
          ) : (
            <>
              {currentId === "shared-sent" ? (
                <SharedItemsGrid
                  items={items}
                  selectedIds={selectedIds}
                  onSelect={handleSelection}
                  onOpen={open}
                  view={view}
                  onDeselectAll={handleDeselectAll}
                  onRevoke={handleRevokeShare}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                />
              ) : (
                <FileGrid
                  items={items}
                  selectedIds={selectedIds}
                  onSelect={handleSelection}
                  onOpen={open}
                  view={view}
                  onDeselectAll={handleDeselectAll}
                  onDelete={handleDelete}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  isItemFavorited={isItemFavorited}
                />
              )}
              <div className="flex h-7 items-center justify-between border-t border-border bg-toolbar px-4 text-xs text-muted-foreground">
                <span>
                  {items.length} item{items.length === 1 ? "" : "s"}
                  {selectedIds.size > 0 && `, ${selectedIds.size} selected`}
                </span>
                <span>248 GB available</span>
              </div>
            </>
          )}
        </main>
      </div>

      <DetailsPanel
        node={selected}
        details={selectedItemDetails?.data || selectedItemDetails}
        folderContents={folderContents?.data || folderContents}
        isLoading={isLoadingDetails}
      />

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background border border-border/20 shadow-2xl rounded-xl w-full max-w-md mx-4 transition-all">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                Create New Folder
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Enter a name for the new folder.
              </p>

              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                  autoFocus
                  className="w-full px-4 py-3 bg-muted/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground/70 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNewFolderDialog(false)}
                  className="px-4 py-2.5 text-sm font-medium bg-muted/50 hover:bg-muted border border-border/50 rounded-lg transition-all hover:shadow-sm text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2.5 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold mb-4">Upload to Storage</h3>

            {/* Progress Indicator */}
            {isUploading && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {uploadProgress < 100
                    ? "Please wait while files upload..."
                    : "Upload complete!"}
                </p>
              </div>
            )}

            {/* Upload Options */}
            {!isUploading && (
              <div className="mb-6">
                <p className="text-sm font-medium mb-3">
                  Choose upload method:
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setUploadMode("file")}
                    className={`group flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                      uploadMode === "file"
                        ? "border-primary bg-primary/10 shadow-md shadow-primary/20 scale-105"
                        : "border-border hover:border-primary hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10"
                    }`}
                  >
                    <div
                      className={`transition-transform duration-300 group-hover:scale-110 ${
                        uploadMode === "file"
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-primary"
                      }`}
                    >
                      <Upload className="w-6 h-6 mb-2" />
                    </div>
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        uploadMode === "file"
                          ? "text-primary"
                          : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      Upload Files
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 transition-colors duration-300 group-hover:text-primary/70">
                      Select one or more files
                    </span>
                  </button>

                  <button
                    onClick={() => setUploadMode("folder")}
                    className={`group flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                      uploadMode === "folder"
                        ? "border-primary bg-primary/10 shadow-md shadow-primary/20 scale-105"
                        : "border-border hover:border-primary hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10"
                    }`}
                  >
                    <div
                      className={`transition-transform duration-300 group-hover:scale-110 ${
                        uploadMode === "folder"
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-primary"
                      }`}
                    >
                      <FolderIcon className="w-6 h-6 mb-2" />
                    </div>
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        uploadMode === "folder"
                          ? "text-primary"
                          : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      Upload Folder
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 transition-colors duration-300 group-hover:text-primary/70">
                      Select entire folder
                    </span>
                  </button>

                  <button
                    onClick={() => setUploadMode("cloud")}
                    className={`group flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                      uploadMode === "cloud"
                        ? "border-primary bg-primary/10 shadow-md shadow-primary/20 scale-105"
                        : "border-border hover:border-primary hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10"
                    }`}
                  >
                    <div
                      className={`transition-transform duration-300 group-hover:scale-110 ${
                        uploadMode === "cloud"
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-primary"
                      }`}
                    >
                      <Cloud className="w-6 h-6 mb-2" />
                    </div>
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        uploadMode === "cloud"
                          ? "text-primary"
                          : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      Import from Cloud
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 transition-colors duration-300 group-hover:text-primary/70">
                      Google Drive, Dropbox
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* File/Folder Input */}
            {!isUploading && uploadMode === "file" && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">
                  Select files to upload:
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
              </div>
            )}

            {!isUploading && uploadMode === "folder" && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">
                  Select folder to upload:
                </p>
                <div className="relative">
                  <input
                    ref={(input) => {
                      if (input && !input.hasAttribute("data-custom-styled")) {
                        input.setAttribute("data-custom-styled", "true");
                        input.style.display = "none";
                      }
                    }}
                    type="file"
                    multiple
                    {...({ webkitdirectory: "", directory: "" } as any)}
                    onChange={handleFileSelect}
                    id="folder-input"
                  />
                  <label
                    htmlFor="folder-input"
                    className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <FolderIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedFolderName ? (
                        <span className="text-foreground font-medium">
                          {selectedFolderName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Choose Folder
                        </span>
                      )}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Folder structure will be preserved during upload
                </p>
              </div>
            )}

            {!isUploading && uploadMode === "cloud" && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Cloud Import:</p>
                <div className="border border-border rounded-md p-4 text-center">
                  <Cloud className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Connect your cloud storage account to import files
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                      Google Drive
                    </button>
                    <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                      Dropbox
                    </button>
                    <button className="px-3 py-1 text-xs bg-muted-foreground text-background rounded hover:bg-muted transition-colors">
                      OneDrive
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Files Display */}
            {selectedFiles &&
              selectedFiles.length > 0 &&
              !isUploading &&
              uploadMode !== "cloud" && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">
                    Selected {uploadMode === "folder" ? "items" : "files"}:
                  </p>
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
                  setSelectedFolderName("");
                  setIsUploading(false);
                  setUploadProgress(0);
                  setUploadMode("file");
                }}
                disabled={isUploading}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              {!isUploading && uploadMode !== "cloud" && (
                <button
                  onClick={handleUpload}
                  disabled={!selectedFiles || selectedFiles.length === 0}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Zip Name Dialog */}
      {showZipNameDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Download as Zip</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a name for the zip file that will contain your selected
              files and folders. Folder structures will be preserved.
            </p>

            {/* Progress Indicator */}
            {isDownloading && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Creating zip file...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This may take a moment for large files...
                </p>
              </div>
            )}

            {!isDownloading && (
              <input
                type="text"
                value={zipFileName}
                onChange={(e) => setZipFileName(e.target.value)}
                placeholder="Enter zip file name"
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowZipNameDialog(false);
                  setZipFileName("");
                  setIsDownloading(false);
                  setDownloadProgress(0);
                }}
                disabled={isDownloading}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              {!isDownloading && (
                <button
                  onClick={handleBulkDownload}
                  disabled={!zipFileName.trim()}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compress Dialog */}
      {showCompressDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Compress Files
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Enter a name for the zip file:
            </p>
            <input
              type="text"
              value={compressFileName}
              onChange={(e) => setCompressFileName(e.target.value)}
              placeholder="archive"
              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCompressDialog(false)}
                className="px-4 py-2 text-sm bg-muted/50 hover:bg-muted border border-border/50 rounded-lg transition-all hover:shadow-sm text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCompressConfirm}
                disabled={
                  !compressFileName.trim() || compressMutation.isPending
                }
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {compressMutation.isPending ? "Compressing..." : "Compress"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background border border-border/20 shadow-2xl rounded-xl w-full max-w-md mx-4 transition-all">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                Rename Item
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Enter a new name for the selected item.
              </p>

              {/* Progress Indicator */}
              {renameMutation.isPending && (
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm font-medium text-foreground">
                      Renaming...
                    </span>
                  </div>
                </div>
              )}

              {!renameMutation.isPending && (
                <div className="mb-6">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleRenameConfirm()
                    }
                    placeholder="Enter new name"
                    autoFocus
                    className="w-full px-4 py-3 bg-muted/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground/70 transition-all"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRenameDialog(false);
                    setNewName("");
                  }}
                  disabled={renameMutation.isPending}
                  className="px-4 py-2.5 text-sm font-medium bg-muted/50 hover:bg-muted border border-border/50 rounded-lg transition-all hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
                >
                  Cancel
                </button>
                {!renameMutation.isPending && (
                  <button
                    onClick={handleRenameConfirm}
                    disabled={!newName.trim()}
                    className="px-4 py-2.5 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    Rename
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single File Download Progress Indicator */}
      {isDownloading && !showZipNameDialog && (
        <div className="fixed bottom-4 right-4 bg-background border border-border rounded-lg shadow-lg p-4 z-50 min-w-80">
          <div className="flex items-center gap-3 mb-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm font-medium">Downloading file...</span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-muted-foreground">{downloadProgress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {downloadProgress < 100
              ? "Please wait while the file downloads..."
              : "Download complete!"}
          </p>
        </div>
      )}

      {/* File Opening Progress Indicator */}
      {isOpeningFile && (
        <div className="fixed bottom-4 right-4 bg-background border border-border rounded-lg shadow-lg p-4 z-50 min-w-80">
          <div className="flex items-center gap-3 mb-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm font-medium">Opening file...</span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-muted-foreground">{openingProgress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${openingProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {openingProgress < 100
              ? "Please wait while the file opens..."
              : "Opening complete!"}
          </p>
        </div>
      )}

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        onShare={handleShareConfirm}
        fileName={
          selectedIds.size === 1
            ? items.find((item) => selectedIds.has(item.id))?.name || ""
            : ""
        }
        itemCount={selectedIds.size}
      />

      {/* Share Link Dialog */}
      {shareData && (
        <ShareLinkDialog
          open={showShareLinkDialog}
          onOpenChange={setShowShareLinkDialog}
          shareUrl={
            shareData.share_url ||
            (shareData.shared && shareData.shared[0]?.share_url) ||
            ""
          }
          fileName={
            selectedIds.size === 1
              ? items.find((item) => selectedIds.has(item.id))?.name || ""
              : ""
          }
          expiresAt={
            shareData.expires_at ||
            (shareData.shared && shareData.shared[0]?.expires_at)
          }
          maxAccess={
            shareData.max_access ||
            (shareData.shared && shareData.shared[0]?.max_access)
          }
          sharedItems={shareData.shared}
          isMasterLink={shareData.isMasterLink}
        />
      )}

      {/* Trash Alert Dialog */}
      <AlertDialog open={showTrashAlert} onOpenChange={setShowTrashAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <AlertDialogTitle>Cannot View Trash Items</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left">
              Files and folders in the trash cannot be opened directly. To view
              this item, you need to restore it first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove from Favorites Dialog */}
      <AlertDialog
        open={showRemoveFavoritesDialog}
        onOpenChange={setShowRemoveFavoritesDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <AlertDialogTitle>Remove from Favorites</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left">
              Are you sure you want to remove the selected items from favorites?
              {selectedIds.size > 0 && (
                <span className="block mt-2 text-sm font-medium">
                  {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} will
                  be removed.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              onClick={() => setShowRemoveFavoritesDialog(false)}
              className="px-4 py-2 text-sm font-medium bg-muted hover:bg-accent border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
            <AlertDialogAction
              onClick={confirmRemoveFromFavorites}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Remove from Favorites
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
