import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
  Grid3x3,
  List,
  FolderPlus,
  Upload,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreMenu } from "@/components/more-menu";

interface Props {
  currentId: string;
  onNavigate: (id: string) => void;
  history: { back: string[]; forward: string[] };
  onBack: () => void;
  onForward: () => void;
  onUp: () => void;
  view: "grid" | "list";
  onViewChange: (v: "grid" | "list") => void;
  query: string;
  onQueryChange: (q: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  sortOrder: string;
  onSortOrderChange: (order: string) => void;
  selectedIds: Set<string>;
  onNewFolder: () => void;
  onUpload: () => void;
  onMoveToTrash: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onRename: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  canPaste: boolean;
  onCompress: () => void;
  onSelectAll: () => void;
  onShare: () => void;
  items: any[];
}

export function ExplorerToolbar({
  currentId,
  onNavigate,
  history,
  onBack,
  onForward,
  onUp,
  view,
  onViewChange,
  query,
  onQueryChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  selectedIds,
  onNewFolder,
  onUpload,
  onMoveToTrash,
  onDelete,
  onDownload,
  onRename,
  onCopy,
  onCut,
  onPaste,
  canPaste,
  onCompress,
  onSelectAll,
  onShare,
  items,
}: Props) {
  // Determine if up button should be enabled (not at root)
  const canGoUp = currentId !== "root" && currentId !== "";

  // Determine if all items are selected
  const areAllItemsSelected =
    items && selectedIds.size > 0 && selectedIds.size === items.length;

  // Handle select all functionality
  const handleSelectAll = () => {
    onSelectAll();
  };

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
          <ToolbarBtn onClick={onUp} disabled={!canGoUp} aria-label="Up">
            <ChevronUp size={16} />
          </ToolbarBtn>
        </div>

        <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm">
          {currentId === "root" ? (
            <button
              onClick={() => onNavigate("root")}
              className="truncate rounded px-2 py-1 transition-colors font-semibold text-foreground"
            >
              Home
            </button>
          ) : (
            <>
              <button
                onClick={() => onNavigate("root")}
                className="truncate rounded px-2 py-1 transition-colors text-muted-foreground hover:bg-accent"
              >
                Home
              </button>
              <ChevronRight
                size={14}
                className="shrink-0 text-muted-foreground"
              />
              <button
                onClick={() => onNavigate(currentId)}
                className="truncate rounded px-2 py-1 transition-colors font-semibold text-foreground"
              >
                {currentId.split("/").pop() || currentId}
              </button>
            </>
          )}
        </nav>

        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files..."
            className="h-8 w-56 rounded-md border border-border bg-card pl-8 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-8 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="">Sort by</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="created">Created</option>
            <option value="modified">Modified</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value)}
            className="h-8 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            disabled={!sortBy}
          >
            <option value="asc">A-Z</option>
            <option value="desc">Z-A</option>
          </select>
        </div>
      </div>

      <div className="flex h-11 items-center justify-between border-t border-border px-4">
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
          <ActionBtn
            icon={FolderPlus}
            label="New Folder"
            onClick={onNewFolder}
          />
          <ActionBtn icon={Upload} label="Upload" onClick={onUpload} />
          <button
            onClick={handleSelectAll}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              areAllItemsSelected ? "bg-accent text-foreground" : "",
            )}
            title={areAllItemsSelected ? "Deselect all" : "Select all"}
          >
            <Check size={14} />
            <span className="ml-1">Select all</span>
          </button>
          <MoreMenu
            selectedIds={selectedIds}
            onMoveToTrash={onMoveToTrash}
            onDelete={onDelete}
            onDownload={onDownload}
            onRename={onRename}
            onCopy={onCopy}
            onCut={onCut}
            onPaste={onPaste}
            canPaste={canPaste}
            onCompress={onCompress}
            onSelectAll={handleSelectAll}
            onShare={onShare}
            items={items}
          />
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
