import {
  MoreHorizontal,
  ArrowUpDown,
  Group,
  Eye,
  Info,
  Pencil,
  Copy,
  Trash2,
  FileArchive,
  Scissors,
  ClipboardPaste,
  ExternalLink,
  Star,
  Share2,
  Tag,
  Download,
  HardDrive,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";

interface Props {
  selectedIds: Set<string>;
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
  onShare: (type: "external" | "internal") => void;
  onAddToFavorites: () => void;
  onRemoveFromFavorites?: () => void;
  items?: any[];
  isTrashView?: boolean;
  isFavoritesView?: boolean;
  onEmptyTrash?: () => void;
  onRestore?: () => void;
}

export function MoreMenu({
  selectedIds,
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
  onAddToFavorites,
  onRemoveFromFavorites,
  isTrashView,
  isFavoritesView,
  onEmptyTrash,
  onRestore,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
          aria-label="More actions"
        >
          <MoreHorizontal size={14} />
          More
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-60 max-h-48 overflow-y-auto"
      >
        {isTrashView ? (
          <>
            <DropdownMenuLabel>Trash Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onDelete}
              disabled={selectedIds.size === 0}
            >
              <Trash2 />
              <span>Delete Permanently</span>
              <DropdownMenuShortcut>Delete</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onRestore}
              disabled={selectedIds.size === 0}
            >
              <HardDrive />
              <span>Restore</span>
              <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onEmptyTrash}
            >
              <Trash2 />
              <span>Empty Trash</span>
              <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        ) : isFavoritesView ? (
          <>
            <DropdownMenuLabel>Favorites Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onDownload}
              disabled={selectedIds.size === 0}
            >
              <Download />
              <span>Download</span>
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onRemoveFromFavorites}
              disabled={selectedIds.size === 0}
            >
              <Star />
              <span>Remove from Favorites</span>
              <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onDownload}
              disabled={selectedIds.size === 0}
            >
              <Download />
              <span>Download</span>
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onShare("external")}
              disabled={selectedIds.size === 0}
            >
              <Share2 />
              <span>Share</span>
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              disabled={selectedIds.size === 0}
            >
              <Trash2 />
              <span>Delete</span>
              <DropdownMenuShortcut>Delete</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onRename}
              disabled={selectedIds.size !== 1}
            >
              <Pencil />
              <span>Rename</span>
              <DropdownMenuShortcut>F2</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onCompress}
              disabled={selectedIds.size === 0}
            >
              <FileArchive />
              <span>Compress to .zip</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onMoveToTrash}
              disabled={selectedIds.size === 0}
            >
              <Trash2 />
              <span>Move to Trash</span>
              <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Clipboard</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onCopy}
              disabled={selectedIds.size === 0}
            >
              <Copy />
              <span>Copy</span>
              <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCut} disabled={selectedIds.size === 0}>
              <Scissors />
              <span>Cut</span>
              <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPaste} disabled={!canPaste}>
              <ClipboardPaste />
              <span>Paste</span>
              <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>File/Folder</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onAddToFavorites}
              disabled={selectedIds.size === 0}
            >
              <Star />
              <span>Add to Favorites</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
