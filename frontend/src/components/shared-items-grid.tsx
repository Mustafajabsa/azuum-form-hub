import { FileIcon } from "./file-icon";
import { cn } from "@/lib/utils";
import type { FileNode } from "./file-utils";
import React, { useState } from "react";
import {
  Shield,
  Eye,
  EyeOff,
  Calendar,
  Link2,
  Trash2,
  Copy,
} from "lucide-react";

// Helper functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};

const formatExpirationDate = (dateString: string | null): string => {
  if (!dateString) return "Never expires";
  const date = new Date(dateString);
  const now = new Date();
  const isExpired = date < now;
  return isExpired ? "Expired" : `Expires ${formatDate(dateString)}`;
};

interface Props {
  items: FileNode[];
  selectedIds: Set<string>;
  onSelect: (
    ids: Set<string>,
    clickedId: string,
    shiftKey: boolean,
    ctrlKey: boolean,
    clickedItem?: FileNode,
  ) => void;
  onOpen: (node: FileNode) => void;
  view: "grid" | "list";
  onDeselectAll: () => void;
  onRevoke: (token: string) => void;
  onDragStart?: (e: React.DragEvent, node: FileNode) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent, targetNode: FileNode) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
}

export function SharedItemsGrid({
  items,
  selectedIds,
  onSelect,
  onOpen,
  view,
  onDeselectAll,
  onRevoke,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onDragLeave,
}: Props) {
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  const handleCopyLink = async (shareUrl: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedItemId(itemId);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedItemId(null), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopiedItemId(itemId);
        setTimeout(() => setCopiedItemId(null), 2000);
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };
  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Link2 size={26} />
        </div>
        <p className="text-sm font-medium text-foreground">No shared items</p>
        <p className="mt-1 text-xs">Share files or folders to see them here.</p>
      </div>
    );
  }

  if (view === "list") {
    return (
      <div
        className="flex-1 overflow-auto"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const isItem = target.closest("tr[data-item-id]");
          if (!isItem) {
            onDeselectAll();
          }
        }}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-toolbar text-xs font-medium text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">
                Shared Date
              </th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">
                Expires
              </th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">
                Viewable
              </th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">
                Access
              </th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">
                Status
              </th>
              <th className="px-4 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((node) => {
              const isExpired = (node as any).is_expired;
              const isActive = (node as any).is_active;
              const accessesRemaining = (node as any).accesses_remaining;
              const token = (node as any).token;

              return (
                <tr
                  key={node.id}
                  data-item-id={node.id}
                  className={cn(
                    "cursor-default border-b border-border/50 transition-colors hover:bg-accent/40",
                    selectedIds.has(node.id) &&
                      "bg-[var(--selection)] hover:bg-[var(--selection)]",
                    !isActive && "opacity-50",
                  )}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <FileIcon
                        kind={node.kind}
                        size={18}
                        filled={node.kind === "folder"}
                      />
                      <span className="truncate">{node.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">
                    {formatDate(node.modified)}
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span
                        className={cn(isExpired && "text-red-500 font-medium")}
                      >
                        {formatExpirationDate((node as any).expires_at)}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">
                    <div className="flex items-center gap-1">
                      {(node as any).is_viewable ? (
                        <Eye size={12} className="text-green-500" />
                      ) : (
                        <EyeOff size={12} className="text-orange-500" />
                      )}
                      <span>{(node as any).is_viewable ? "Yes" : "No"}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">
                    <div className="text-xs">
                      {accessesRemaining !== null &&
                      accessesRemaining !== undefined ? (
                        <span
                          className={cn(
                            "font-medium",
                            accessesRemaining === 0 && "text-red-500",
                            accessesRemaining <= 2 && "text-orange-500",
                            accessesRemaining > 2 && "text-green-500",
                          )}
                        >
                          {accessesRemaining} left
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unlimited</span>
                      )}
                      <div className="text-muted-foreground">
                        {(node as any).current_access || 0} used
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">
                    <div className="flex items-center gap-1">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          isActive && !isExpired
                            ? "bg-green-500"
                            : "bg-red-500",
                        )}
                      />
                      <span className="text-xs">
                        {isActive && !isExpired
                          ? "Active"
                          : isExpired
                            ? "Expired"
                            : "Revoked"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const shareUrl =
                            (node as any).download_url ||
                            (node as any).share_url;
                          if (shareUrl && token) {
                            handleCopyLink(shareUrl, node.id);
                          }
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors",
                          copiedItemId === node.id
                            ? "bg-green-500 text-white"
                            : "bg-blue-500 text-white hover:bg-blue-600",
                        )}
                      >
                        <Copy size={10} />
                        {copiedItemId === node.id ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (token) {
                            onRevoke(token);
                          }
                        }}
                        disabled={!isActive || isExpired}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors",
                          "bg-red-500 text-white hover:bg-red-600",
                          "disabled:bg-gray-300 disabled:cursor-not-allowed",
                        )}
                      >
                        <Trash2 size={10} />
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-auto p-4"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const isItem = target.closest("div[data-item-id]");
        if (!isItem) {
          onDeselectAll();
        }
      }}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {items.map((node) => {
          const isExpired = (node as any).is_expired;
          const isActive = (node as any).is_active;
          const accessesRemaining = (node as any).accesses_remaining;
          const token = (node as any).token;

          return (
            <div
              key={node.id}
              data-item-id={node.id}
              className={cn(
                "group flex flex-col rounded-lg border border-border p-4 transition-colors",
                "hover:bg-accent/50 hover:border-accent",
                selectedIds.has(node.id) &&
                  "bg-[var(--selection)] border-[var(--selection)]",
                !isActive && "opacity-50",
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                  <FileIcon
                    kind={node.kind}
                    size={24}
                    filled={node.kind === "folder"}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      isActive && !isExpired ? "bg-green-500" : "bg-red-500",
                    )}
                  />
                  <span className="text-xs text-muted-foreground">
                    {isActive && !isExpired
                      ? "Active"
                      : isExpired
                        ? "Expired"
                        : "Revoked"}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <h3
                  className="font-medium text-sm truncate mb-2"
                  title={node.name}
                >
                  {node.name}
                </h3>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar size={10} />
                    <span className="truncate">
                      Shared: {formatDate(node.modified)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Calendar size={10} />
                    <span
                      className={cn(
                        "truncate",
                        isExpired && "text-red-500 font-medium",
                      )}
                    >
                      {formatExpirationDate((node as any).expires_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {(node as any).is_viewable ? (
                      <Eye size={10} className="text-green-500" />
                    ) : (
                      <EyeOff size={10} className="text-orange-500" />
                    )}
                    <span>
                      {(node as any).is_viewable ? "Viewable" : "Download only"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Shield size={10} />
                    <span>
                      {accessesRemaining !== null &&
                      accessesRemaining !== undefined ? (
                        <span
                          className={cn(
                            "font-medium",
                            accessesRemaining === 0 && "text-red-500",
                            accessesRemaining <= 2 && "text-orange-500",
                            accessesRemaining > 2 && "text-green-500",
                          )}
                        >
                          {accessesRemaining} left
                        </span>
                      ) : (
                        <span>Unlimited access</span>
                      )}
                      <span className="text-muted-foreground">
                        ({(node as any).current_access || 0} used)
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border space-y-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const shareUrl =
                      (node as any).download_url || (node as any).share_url;
                    if (shareUrl && token) {
                      handleCopyLink(shareUrl, node.id);
                    }
                  }}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-1 px-2 py-1 text-xs rounded-md transition-colors",
                    copiedItemId === node.id
                      ? "bg-green-500 text-white"
                      : "bg-blue-500 text-white hover:bg-blue-600",
                  )}
                >
                  <Copy size={10} />
                  {copiedItemId === node.id ? "Link Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (token) {
                      onRevoke(token);
                    }
                  }}
                  disabled={!isActive || isExpired}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-1 px-2 py-1 text-xs rounded-md transition-colors",
                    "bg-red-500 text-white hover:bg-red-600",
                    "disabled:bg-gray-300 disabled:cursor-not-allowed",
                  )}
                >
                  <Trash2 size={10} />
                  Revoke Access
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
