import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
  Grid3x3,
  List,
  FolderPlus,
  Upload,
  MoreHorizontal,
  Info,
  RotateCcw,
  Copy,
  Trash2,
  Move,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

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
  history: { back: string[]; forward: string[] };
  onBack: () => void;
  onForward: () => void;
  view: "grid" | "list";
  onViewChange: (v: "grid" | "list") => void;
  query: string;
  onQueryChange: (q: string) => void;
  onUpload: () => void;
  onNewFolder: () => void;
  currentPath: FileNode[];
  selectedItems: string[];
  onMoveToTrash: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
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
  onUpload,
  onNewFolder,
  currentPath,
  selectedItems,
  onMoveToTrash,
  onDelete,
  onSelectAll,
}: Props) {
  const { toast } = useToast();
  const parent = currentPath[currentPath.length - 2];

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
          {currentPath.map((node, i) => (
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
                  i === currentPath.length - 1
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <MoreHorizontal size={14} />
                More
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onSelectAll}>
                <Info className="mr-2 h-4 w-4" />
                Select All
              </DropdownMenuItem>
              {selectedItems.length === 1 && (
                <DropdownMenuItem
                  onClick={() => {
                    toast({
                      title: "Rename",
                      description: "Rename functionality coming soon",
                    });
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  if (selectedItems.length === 0) {
                    toast({
                      title: "No Selection",
                      description: "Please select items to duplicate",
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Duplicate",
                      description: `Duplicating ${selectedItems.length} item(s)`,
                    });
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {currentId !== "trash" && (
                <DropdownMenuItem
                  onClick={onMoveToTrash}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Move to Trash
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (selectedItems.length === 0) {
                    toast({
                      title: "No Selection",
                      description: "Please select items to move",
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Move",
                      description: "Move functionality coming soon",
                    });
                  }
                }}
              >
                <Move className="mr-2 h-4 w-4" />
                Move
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (selectedItems.length === 0) {
                    toast({
                      title: "No Selection",
                      description: "Please select items to compress",
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Compress to .zip",
                      description: `Compressing ${selectedItems.length} item(s) to .zip`,
                    });
                  }
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                Compress to .zip
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      onClick={onClick}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
