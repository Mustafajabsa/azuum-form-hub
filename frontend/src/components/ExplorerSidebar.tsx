import { useState } from "react";
import { ChevronRight, HardDrive, Star, Clock, Trash2 } from "lucide-react";
import { FileIcon } from "./FileIcon";
import { cn } from "@/lib/utils";

interface FileNode {
  id: string;
  name: string;
  kind:
    | "folder"
    | "image"
    | "doc"
    | "code"
    | "video"
    | "audio"
    | "archive"
    | "pdf"
    | "other";
  size?: number;
  modified: string;
  children?: FileNode[];
  parentId?: string;
}

interface Props {
  currentId: string;
  onNavigate: (id: string) => void;
  folders: FileNode[];
  trashItems: FileNode[];
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
  const folders = node.children?.filter((c) => c.kind === "folder") ?? [];

  if (!isFolder) return null;

  return (
    <div>
      <button
        onClick={() => onNavigate(node.id)}
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
            folders.length === 0 && "invisible",
            isOpen && "rotate-90",
          )}
        >
          <ChevronRight size={12} />
        </span>
        <FileIcon kind="folder" size={16} filled />
        <span className="truncate">{node.name}</span>
      </button>
      {isOpen && folders.length > 0 && (
        <div>
          {folders.map((child) => (
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

export function ExplorerSidebar({
  currentId,
  onNavigate,
  folders,
  trashItems,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));

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

  // Create a root folder structure
  const rootFolder: FileNode = {
    id: "root",
    name: "Home",
    kind: "folder",
    modified: new Date().toISOString(),
    children: folders,
  };

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      style={{ width: "100%" }}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <HardDrive size={16} />
        </div>
        <span className="text-sm font-semibold">File Explorer</span>
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
            {trashItems.length > 0 && (
              <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {trashItems.length}
              </span>
            )}
          </button>
        </div>

        <div>
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Folders
          </div>
          <TreeRow
            node={rootFolder}
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
          <span>Calculating...</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-sidebar-accent">
          <div className="h-full w-[48%] rounded-full bg-primary" />
        </div>
      </div>
    </aside>
  );
}
