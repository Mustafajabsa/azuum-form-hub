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
  Link2,
  RefreshCw,
  Share2,
  Tag,
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
}

export function MoreMenu({ selectedIds, onMoveToTrash }: Props) {
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
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>View</DropdownMenuLabel>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowUpDown />
            <span>Sort by</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Name</DropdownMenuItem>
            <DropdownMenuItem>Date Modified</DropdownMenuItem>
            <DropdownMenuItem>Size</DropdownMenuItem>
            <DropdownMenuItem>Kind</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Group />
            <span>Group by</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>None</DropdownMenuItem>
            <DropdownMenuItem>Kind</DropdownMenuItem>
            <DropdownMenuItem>Date</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem>
          <Eye />
          <span>Show hidden files</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Item</DropdownMenuLabel>
        <DropdownMenuItem>
          <Info />
          <span>Get Info</span>
          <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Pencil />
          <span>Rename</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy />
          <span>Duplicate</span>
          <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
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
        <DropdownMenuItem>
          <Copy />
          <span>Copy</span>
          <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Scissors />
          <span>Cut</span>
          <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <ClipboardPaste />
          <span>Paste</span>
          <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Folder</DropdownMenuLabel>
        <DropdownMenuItem>
          <ExternalLink />
          <span>Open in new window</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Star />
          <span>Add to Favorites</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link2 />
          <span>Copy path</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <RefreshCw />
          <span>Refresh</span>
          <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Share2 />
          <span>Share</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Tag />
          <span>Tags…</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
