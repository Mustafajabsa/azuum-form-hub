import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
  Grid3x3,
  List,
  FolderPlus,
  Upload,
} from "lucide-react";
import { getPath, type FileNode } from "@/lib/file-data";
import { cn } from "@/lib/utils";
import { MoreMenu } from "@/components/more-menu";

interface Props {
  currentId: string;
  onNavigate: (id: string) => void;
  history: { back: string[]; forward: string[] };
  onBack: () => void;
  onForward: () => void;
  view: "grid" | "list";
  onViewChange: (v: "grid" | "list") => void;
  query: string;
  onQueryChange: (q: string) => void;
  selectedIds: Set<string>;
  onNewFolder: () => void;
  onUpload: () => void;
  onMoveToTrash: () => void;
}

export function ExplorerToolbar({
  currentId,
  onNavigate,
  history,
  onBack,
  onForward,
  view,
  onViewChange,
  query,
  onQueryChange,
  selectedIds,
  onNewFolder,
  onUpload,
  onMoveToTrash,
}: Props) {
  const path = getPath(currentId);
  const parent = path[path.length - 2] as FileNode | undefined;

  return (
    <div className="flex flex-col border-b border-border bg-toolbar">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
          <ToolbarBtn
            onClick={onBack}
            disabled={history.back.length === 0}
            aria-label="Back"
          >
            <ChevronLeft size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={onForward}
            disabled={history.forward.length === 0}
            aria-label="Forward"
          >
            <ChevronRight size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => parent && onNavigate(parent.id)}
            disabled={!parent}
            aria-label="Up"
          >
            <ChevronUp size={16} />
          </ToolbarBtn>
        </div>

        <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm">
          {path.map((node, i) => (
            <div key={node.id} className="flex min-w-0 items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  size={14}
                  className="shrink-0 text-muted-foreground"
                />
              )}
              <button
                onClick={() => onNavigate(node.id)}
                className={cn(
                  "truncate rounded px-2 py-1 transition-colors hover:bg-accent",
                  i === path.length - 1
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {node.name}
              </button>
            </div>
          ))}
        </nav>

        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search"
            className="h-8 w-56 rounded-md border border-border bg-card pl-8 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>

      <div className="flex h-11 items-center justify-between border-t border-border px-4">
        <div className="flex items-center gap-1">
          <ActionBtn
            icon={FolderPlus}
            label="New Folder"
            onClick={onNewFolder}
          />
          <ActionBtn icon={Upload} label="Upload" onClick={onUpload} />
          <MoreMenu selectedIds={selectedIds} onMoveToTrash={onMoveToTrash} />
        </div>

        <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
          <button
            onClick={() => onViewChange("grid")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors",
              view === "grid"
                ? "bg-accent text-foreground"
                : "hover:bg-accent/60",
            )}
            aria-label="Grid view"
          >
            <Grid3x3 size={15} />
          </button>
          <button
            onClick={() => onViewChange("list")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors",
              view === "list"
                ? "bg-accent text-foreground"
                : "hover:bg-accent/60",
            )}
            aria-label="List view"
          >
            <List size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
