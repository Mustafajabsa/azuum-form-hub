import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileIcon,
  FolderIcon,
  DownloadIcon,
  EyeIcon,
  Share2,
  Clock,
  Users,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  FileSpreadsheet,
  FileCode,
  File,
  ExternalLink,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fileService } from "@/api/services/storageService";

interface SharedItem {
  id: string;
  name: string;
  original_name?: string;
  type: "file" | "folder";
  file_size?: number;
  mime_type?: string;
  path?: string;
  token?: string;
  expires_at?: string;
  max_access?: number;
  current_access?: number;
  shared_by?: string;
  download_url?: string;
  preview_url?: string;
  file_extension?: string;
  is_viewable: boolean;
}

interface ShareInfo {
  title?: string;
  description?: string;
  expiresAt?: string;
  maxAccess?: number;
  currentAccess?: number;
  sharedBy?: string;
}

export default function Share() {
  const [searchParams] = useSearchParams();
  const { tokens } = useParams();
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse tokens from URL or query parameters
  const getTokensFromUrl = (): string[] => {
    if (tokens) {
      // From URL path: /share/abc123,def456
      return tokens.split(",").filter((token) => token.trim());
    }

    // From query parameters: ?token=abc123&token=def456
    const queryTokens = searchParams.getAll("token");
    if (queryTokens.length > 0) {
      return queryTokens;
    }

    // From single token parameter: ?token=abc123
    const singleToken = searchParams.get("token");
    if (singleToken) {
      return [singleToken];
    }

    return [];
  };

  useEffect(() => {
    const loadSharedData = async () => {
      const tokens = getTokensFromUrl();

      if (tokens.length === 0) {
        setError("No valid share tokens found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Make API calls to fetch shared items by tokens
        if (tokens.length === 1) {
          // Single token - use getSharedItem
          const response = await fileService.getSharedItem(tokens[0]);
          const item = response.data;

          const itemName =
            item.original_name ||
            item.name ||
            item.path?.split("/").pop() ||
            "Unknown";
          const sharedItem: SharedItem = {
            id: item.id || item.token,
            name: itemName,
            original_name: item.original_name,
            type: item.type || (item.mime_type ? "file" : "folder"),
            file_size: item.file_size,
            mime_type: item.mime_type,
            path: item.path,
            token: item.token,
            expires_at: item.expires_at,
            max_access: item.max_access,
            current_access: item.current_access,
            shared_by: item.shared_by,
            download_url: item.download_url,
            preview_url: item.preview_url,
            file_extension: getFileExtension(itemName),

            is_viewable: item.is_viewable,
          };

          console.log("🔍 API Response Item:", item);
          console.log("🔍 Item Structure:", JSON.stringify(item, null, 2));
          console.log("✅ Parsed Viewable Status:", sharedItem.is_viewable);
          console.log("✅ Viewable Type:", typeof sharedItem.is_viewable);
          console.log(
            "✅ Viewable Value:",
            JSON.stringify(sharedItem.is_viewable),
          );

          setSharedItems([sharedItem]);

          if (item.expires_at || item.max_access || item.shared_by) {
            setShareInfo({
              title: "Shared File",
              expiresAt: item.expires_at,
              maxAccess: item.max_access,
              currentAccess: item.current_access,
              sharedBy: item.shared_by,
            });
          }
        } else {
          // Multiple tokens - use getSharedItems endpoint
          const response = await fileService.getSharedItems(tokens);
          const items = response.data.shared || response.data || [];

          console.log("🔍 Bulk Share Response:", response.data);

          // Check each item's is_viewable value and type
          items.forEach((item, index) => {
            console.log(`📋 Item ${index}:`, {
              name: item.original_name || item.name,
              type: item.type,
              is_viewable: item.is_viewable,
              is_viewable_type: typeof item.is_viewable,
              is_viewable_value: JSON.stringify(item.is_viewable),
            });
          });
          const sharedItems: SharedItem[] = items.map((item: any) => {
            const itemName =
              item.original_name ||
              item.name ||
              item.path?.split("/").pop() ||
              "Unknown";
            return {
              id: item.id || item.token,
              name: itemName,
              original_name: item.original_name,
              type: item.type || (item.mime_type ? "file" : "folder"),
              file_size: item.file_size,
              mime_type: item.mime_type,
              path: item.path,
              token: item.token,
              expires_at: item.expires_at,
              max_access: item.max_access,
              current_access: item.current_access,
              shared_by: item.shared_by,
              download_url: item.download_url,
              preview_url: item.preview_url,
              file_extension: getFileExtension(itemName),

              is_viewable: item.is_viewable,
            };
          });

          setSharedItems(sharedItems);

          if (items.length > 0) {
            const firstItem = items[0];
            setShareInfo({
              title: "Shared Collection",
              expiresAt: firstItem.expires_at,
              maxAccess: firstItem.max_access,
              currentAccess: firstItem.current_access,
              sharedBy: firstItem.shared_by,
            });
          }
        }
      } catch (err) {
        setError("Failed to load shared content");
      } finally {
        setLoading(false);
      }
    };

    loadSharedData();
  }, [tokens, searchParams]);

  const handleDownload = async (item: SharedItem) => {
    // Handle download logic
    console.log(`Downloading ${item.name}`);

    if (item.token) {
      try {
        const response = await fileService.downloadSharedFile(item.token);
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error("Download failed:", error);
        alert("Failed to download file. Please try again.");
      }
    } else {
      alert("Download link not available for this item.");
    }
  };

  const handlePreview = (item: SharedItem) => {
    // Handle preview logic
    console.log(`Previewing ${item.name}`);
    // This would open preview modal or navigate to preview
    if (item.preview_url) {
      window.open(item.preview_url, "_blank");
    }
  };

  const handleView = (item: SharedItem) => {
    // Handle view logic - open file in new window using the share URL
    console.log(`Viewing ${item.name}`);

    // Use the full backend URL for viewing shared items
    if (item.token) {
      const viewUrl = `http://127.0.0.1:8000/api/files/shared/${item.token}/`;
      window.open(viewUrl, "_blank");
    } else if (item.download_url) {
      window.open(item.download_url, "_blank");
    } else if (item.preview_url) {
      window.open(item.preview_url, "_blank");
    } else {
      // Fallback: try to construct a view URL
      console.log("No direct view URL available for:", item.name);
    }
  };

  const handleDownloadAll = () => {
    // Handle download all logic
    console.log("Downloading all items");
    // This would trigger bulk download
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatExpiryDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const timeString = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });

    if (diffDays < 0) {
      return "Expired";
    } else if (diffDays === 0) {
      return `Expires today at ${timeString}`;
    } else if (diffDays === 1) {
      return `Expires tomorrow at ${timeString}`;
    } else if (diffDays <= 7) {
      return `Expires in ${diffDays} days at ${timeString}`;
    } else if (diffDays <= 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Expires in ${weeks} week${weeks > 1 ? "s" : ""} at ${timeString}`;
    } else {
      return `Expires ${date.toLocaleDateString()} at ${timeString}`;
    }
  };

  const getFileExtension = (filename: string): string => {
    const lastDotIndex = filename.lastIndexOf(".");
    return lastDotIndex > -1
      ? filename.substring(lastDotIndex + 1).toLowerCase()
      : "";
  };

  const getFileIcon = (filename: string, type: string) => {
    if (type === "folder") {
      return FolderIcon;
    }

    const extension = getFileExtension(filename);

    switch (extension) {
      case "pdf":
        return FileText;
      case "doc":
      case "docx":
      case "txt":
      case "rtf":
        return FileText;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "svg":
      case "bmp":
      case "webp":
        return Image;
      case "mp4":
      case "avi":
      case "mov":
      case "wmv":
      case "flv":
      case "mkv":
        return Video;
      case "mp3":
      case "wav":
      case "flac":
      case "aac":
      case "ogg":
        return Music;
      case "zip":
      case "rar":
      case "7z":
      case "tar":
      case "gz":
        return Archive;
      case "xls":
      case "xlsx":
      case "csv":
        return FileSpreadsheet;
      case "js":
      case "ts":
      case "html":
      case "css":
      case "py":
      case "java":
      case "cpp":
      case "c":
        return FileCode;
      default:
        return File;
    }
  };

  const getFileDescription = (
    filename: string,
    type: string,
    fileSize?: number,
  ): string => {
    if (type === "folder") {
      return "Folder";
    }

    const extension = getFileExtension(filename);
    const size = fileSize ? ` • ${formatFileSize(fileSize)}` : "";

    switch (extension) {
      case "pdf":
        return `PDF Document${size}`;
      case "doc":
      case "docx":
        return `Microsoft Word Document${size}`;
      case "txt":
        return `Text File${size}`;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "svg":
      case "bmp":
      case "webp":
        return `Image File${size}`;
      case "mp4":
      case "avi":
      case "mov":
      case "wmv":
      case "flv":
      case "mkv":
        return `Video File${size}`;
      case "mp3":
      case "wav":
      case "flac":
      case "aac":
      case "ogg":
        return `Audio File${size}`;
      case "zip":
      case "rar":
      case "7z":
      case "tar":
      case "gz":
        return `Archive File${size}`;
      case "xls":
      case "xlsx":
      case "csv":
        return `Spreadsheet${size}`;
      case "js":
      case "ts":
      case "html":
      case "css":
      case "py":
      case "java":
      case "cpp":
      case "c":
        return `Code File${size}`;
      default:
        return `File${size}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Share2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {shareInfo?.title || "Shared Content"}
                </h1>
                {shareInfo?.description && (
                  <p className="text-gray-600 mt-1">{shareInfo.description}</p>
                )}
              </div>
            </div>
            {sharedItems.length > 1 && (
              <Button
                onClick={handleDownloadAll}
                className="flex items-center space-x-2"
              >
                <DownloadIcon className="h-4 w-4" />
                <span>Download All</span>
              </Button>
            )}
          </div>

          {/* Share Info */}
          {shareInfo && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
              {shareInfo.sharedBy && (
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>Shared by {shareInfo.sharedBy}</span>
                </div>
              )}
              {shareInfo.expiresAt && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatExpiryDate(shareInfo.expiresAt)}</span>
                </div>
              )}
              {shareInfo.maxAccess && (
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>
                    {shareInfo.currentAccess || 0}/{shareInfo.maxAccess}{" "}
                    accesses
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {sharedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <FileIcon className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No items found
            </h3>
            <p className="text-gray-600">
              The shared content is not available or has expired.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sharedItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {(() => {
                          const IconComponent = getFileIcon(
                            item.name,
                            item.type,
                          );
                          return (
                            <IconComponent className="h-10 w-10 text-blue-600" />
                          );
                        })()}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {item.name}
                        </h3>
                        <div className="mt-1 text-sm text-gray-500">
                          {getFileDescription(
                            item.name,
                            item.type,
                            item.file_size,
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Container */}
                    <div className="flex items-center space-x-2">
                      {item.type === "file" && (
                        <>
                          {/* 1. Preview (Optional) */}
                          {item.preview_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreview(item)}
                            >
                              <EyeIcon className="h-4 w-4" />
                              <span>Preview</span>
                            </Button>
                          )}

                          {/* 2. View Button - Showing based on is_viewable */}
                          {item.is_viewable && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleView(item)}
                              className="flex items-center space-x-1"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>View</span>
                            </Button>
                          )}

                          {/* 3. Download Button - Always show for files/folders */}
                          <Button
                            size="sm"
                            onClick={() => handleDownload(item)}
                            className="flex items-center space-x-1"
                          >
                            <DownloadIcon className="h-4 w-4" />
                            <span>Download</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
