import { useState } from "react";
import {
  ChevronRight,
  HardDrive,
  Star,
  Clock,
  Trash2,
  Cloud,
  Share2,
} from "lucide-react";
import { FileIcon } from "./file-icon";
import { useQuery } from "@tanstack/react-query";
import { fileService } from "@/api/services/storageService";
import { FileKind, FileNode, getFileKind } from "@/components/file-utils";
import { cn } from "@/lib/utils";

interface Props {
  currentId: string;
  onNavigate: (id: string) => void;
}

interface TreeRowProps {
  node: FileNode;
  depth: number;
  currentId: string;
  onNavigate: (id: string) => void;
  expanded: Set<string>;
  toggle: (id: string) => void;
}

function TreeRow({
  node,
  depth,
  currentId,
  onNavigate,
  expanded,
  toggle,
}: TreeRowProps) {
  const isFolder = node.kind === "folder";
  const isOpen = expanded.has(node.id);
  const isActive = currentId === node.id;
  const children = node.children || [];

  if (!isFolder) return null;

  return (
    <div>
      <button
        onClick={() => onNavigate((node as any).path || node.id)}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm transition-colors",
          "hover:bg-sidebar-accent",
          isActive &&
            "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
        )}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            toggle(node.id);
          }}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded transition-transform",
            children.length === 0 && "invisible",
            isOpen && "rotate-90",
          )}
        >
          <ChevronRight size={12} />
        </span>
        <FileIcon kind="folder" size={16} filled />
        <span className="truncate">{node.name}</span>
      </button>
      {isOpen && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              currentId={currentId}
              onNavigate={onNavigate}
              expanded={expanded}
              toggle={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ExplorerSidebar({ currentId, onNavigate }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));

  // Query for folders from backend
  const { data: filesData, isLoading } = useQuery({
    queryKey: ["files", "root"],
    queryFn: () => fileService.getFiles(),
  });

  // Query for storage statistics
  const { data: storageStats } = useQuery({
    queryKey: ["storageStats"],
    queryFn: async () => {
      console.log("=== FETCHING STORAGE STATS ===");
      try {
        const response = await fileService.getStorageStats();
        console.log("Storage stats API response:", response);
        console.log("Storage stats data:", response.data);
        console.log("=== END FETCHING STORAGE STATS ===");
        return response;
      } catch (error) {
        console.error("Storage stats API error:", error);
        throw error;
      }
    },
  });

  // Debug: Log the API data
  console.log("ExplorerSidebar - filesData:", filesData);
  console.log("ExplorerSidebar - directories:", filesData?.data?.directories);

  // Recursive function to build folder tree with arbitrary nesting
  const buildFolderTree = (directories: any[]): FileNode[] => {
    return (
      directories?.map((dir: any) => ({
        id: dir.id,
        name: dir.name,
        kind: "folder" as FileKind,
        size: 0,
        modified: new Date().toISOString(),
        path: dir.path,
        children: buildFolderTree(dir.directories || []),
      })) || []
    );
  };

  // Convert API data to FileNode structure
  const fileTree: FileNode = {
    id: "root",
    name: "Home",
    kind: "folder",
    size: 0,
    modified: new Date().toISOString(),
    children: buildFolderTree(filesData?.data?.directories || []),
  };

  // Debug: Log the final fileTree
  console.log("ExplorerSidebar - fileTree:", fileTree);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const quickLinks = [
    { id: "root", label: "Home", Icon: HardDrive },
    { id: "documents", label: "Documents", Icon: Star },
    { id: "downloads", label: "Recents", Icon: Clock },
  ];

  return (
    <aside className="flex h-full w-44 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <HardDrive size={16} />
        </div>
        <span className="text-sm font-semibold">Finder</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-3">
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Favorites
          </div>
          {quickLinks.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
                currentId === id && "bg-sidebar-accent font-medium",
              )}
            >
              <Icon size={15} className="text-muted-foreground" />
              {label}
            </button>
          ))}

          {/* Share section with toggle */}
          <div>
            <button
              onClick={() => toggle("share")}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
                (currentId === "shared-received" ||
                  currentId === "shared-sent") &&
                  "bg-sidebar-accent font-medium",
              )}
            >
              <ChevronRight
                size={12}
                className={cn(
                  "transition-transform",
                  expanded.has("share") && "rotate-90",
                )}
              />
              <Share2 size={15} className="text-muted-foreground" />
              Share
            </button>

            {expanded.has("share") && (
              <div className="ml-4">
                <button
                  onClick={() => onNavigate("shared-received")}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
                    currentId === "shared-received" &&
                      "bg-sidebar-accent font-medium",
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Received
                </button>
                <button
                  onClick={() => onNavigate("shared-sent")}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
                    currentId === "shared-sent" &&
                      "bg-sidebar-accent font-medium",
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Sent
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Locations
          </div>
          <button
            onClick={() => onNavigate("trash")}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
              currentId === "trash" && "bg-sidebar-accent font-medium",
            )}
          >
            <Trash2 size={15} className="text-muted-foreground" />
            Trash
          </button>
        </div>

        <div>
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Folders
          </div>
          <TreeRow
            node={fileTree}
            depth={0}
            currentId={currentId}
            onNavigate={onNavigate}
            expanded={expanded}
            toggle={toggle}
          />
        </div>
      </div>

      <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
        <div className="mb-1 flex items-center justify-between">
          <span>Storage</span>
          <span>
            {(() => {
              if (!storageStats?.data) return "Loading...";

              // Handle stats endpoint response
              if (storageStats.data.total_size_readable) {
                return `${storageStats.data.total_size_readable} (${storageStats.data.total_files} files)`;
              }

              // Handle fallback from files endpoint
              const files = storageStats.data.files || [];
              const directories = storageStats.data.directories || [];
              const totalSize = files.reduce(
                (sum: number, file: any) =>
                  sum + (file.file_size || file.size || 0),
                0,
              );
              const totalSizeGB = Math.round(totalSize / 1024 ** 3);

              return `${totalSizeGB} GB (${files.length} files)`;
            })()}
          </span>
        </div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {(() => {
              if (!storageStats?.data) return "";

              // Handle stats endpoint response
              if (storageStats.data.total_folders) {
                return `${storageStats.data.total_folders} folders`;
              }

              // Handle fallback from files endpoint
              const directories = storageStats.data.directories || [];
              return `${directories.length} folders`;
            })()}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-sidebar-accent">
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: (() => {
                if (!storageStats?.data) return "0%";

                // Handle stats endpoint response
                if (storageStats.data.total_size_bytes) {
                  return `${Math.min(100, Math.round((storageStats.data.total_size_bytes / (512 * 1024 * 1024 * 1024)) * 100))}%`;
                }

                // Handle fallback from files endpoint
                const files = storageStats.data.files || [];
                const totalSize = files.reduce(
                  (sum: number, file: any) =>
                    sum + (file.file_size || file.size || 0),
                  0,
                );
                return `${Math.min(100, Math.round((totalSize / (512 * 1024 * 1024 * 1024)) * 100))}%`;
              })(),
            }}
          />
        </div>
      </div>
    </aside>
  );
}
