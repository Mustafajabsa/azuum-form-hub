import { FileIcon } from "./FileIcon";
import { formatBytes, formatDate, type FileNode } from "./file-utils";
import { cn } from "@/lib/utils";

interface Props {
  items: FileNode[];
  selectedId: string | null;
  selectedItems: string[];
  onSelect: (id: string, event?: React.MouseEvent) => void;
  onOpen: (node: FileNode) => void;
  view: "grid" | "list";
}

export function FileGrid({
  items,
  selectedId,
  selectedItems,
  onSelect,
  onOpen,
  view,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FileIcon kind="folder" size={26} filled />
        </div>
        <p className="text-sm font-medium text-foreground">
          This folder is empty
        </p>
        <p className="mt-1 text-xs">
          Drop files here or use the upload button.
        </p>
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="flex-1 overflow-hidden">
        <div
          className="h-full overflow-auto"
          onClick={(e) => {
            // Check if click is on empty space (not on an item)
            if (e.target === e.currentTarget) {
              onSelect(""); // Pass empty string to clear selection
            }
          }}
        >
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-toolbar text-xs font-medium text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">
                  Modified
                </th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">
                  Size
                </th>
                <th className="hidden px-4 py-2 text-left font-medium lg:table-cell">
                  Kind
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((node) => (
                <tr
                  key={node.id}
                  onClick={(e) => onSelect(node.id, e)}
                  onDoubleClick={() => onOpen(node)}
                  className={cn(
                    "cursor-default border-b border-border/50 transition-colors hover:bg-accent/40",
                    selectedId === node.id &&
                      "bg-[var(--selection)] hover:bg-[var(--selection)]",
                    selectedItems.includes(node.id) &&
                      "bg-[var(--selection)] hover:bg-[var(--selection)]",
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
                    {node.kind === "folder"
                      ? `${node.children?.length ?? 0} items`
                      : formatBytes(node.size)}
                  </td>
                  <td className="hidden px-4 py-2 capitalize text-muted-foreground lg:table-cell">
                    {node.kind}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden p-4">
      <div
        className="h-full overflow-auto"
        onClick={(e) => {
          // Check if click is on empty space (not on an item)
          if (e.target === e.currentTarget) {
            onSelect(""); // Pass empty string to clear selection
          }
        }}
      >
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
          {items.map((node) => (
            <button
              key={node.id}
              onClick={(e) => onSelect(node.id, e)}
              onDoubleClick={() => onOpen(node)}
              className={cn(
                "group flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-colors",
                "hover:bg-accent/50",
                selectedId === node.id &&
                  "bg-[var(--selection)] hover:bg-[var(--selection)]",
                selectedItems.includes(node.id) &&
                  "bg-[var(--selection)] hover:bg-[var(--selection)]",
              )}
            >
              <div className="flex h-16 w-16 items-center justify-center">
                <FileIcon
                  kind={node.kind}
                  size={48}
                  filled={node.kind === "folder"}
                />
              </div>
              <span className="line-clamp-2 break-all text-xs font-medium text-foreground">
                {node.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
