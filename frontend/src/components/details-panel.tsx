import { FileIcon } from "./file-icon";
import { formatBytes, formatDate } from "@/lib/file-data";
import { type FileNode } from "@/components/file-utils";

interface Props {
  node: FileNode | null;
  details?: any; // API response with detailed information
  folderContents?: any; // Folder contents from API for item counting
  isLoading?: boolean;
}

export function DetailsPanel({
  node,
  details,
  folderContents,
  isLoading,
}: Props) {
  if (!node) {
    return (
      <aside className="hidden h-full w-72 shrink-0 flex-col border-l border-border bg-card xl:flex">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground">
          <FileIcon kind="other" size={36} />
          <p className="mt-3">Select an item to see details</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden h-full w-72 shrink-0 flex-col border-l border-border bg-card xl:flex">
      <div className="flex flex-col items-center border-b border-border px-6 py-8">
        <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-2xl bg-muted">
          <FileIcon
            kind={node.kind}
            size={64}
            filled={node.kind === "folder"}
          />
        </div>
        <h3 className="line-clamp-2 break-all text-center text-sm font-semibold">
          {node.name}
        </h3>
        <p className="mt-1 text-xs capitalize text-muted-foreground">
          {node.kind}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 text-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-xs text-muted-foreground">
              Loading details...
            </div>
          </div>
        ) : (
          <dl className="space-y-3">
            {/* Size - use API data if available, otherwise fallback to node data */}
            <Row
              label="Size"
              value={
                details?.size_readable ||
                details?.size ||
                details?.file_size ||
                (details?.size_bytes && formatBytes(details.size_bytes)) ||
                details?.data?.size_readable ||
                (details?.data?.size_bytes &&
                  formatBytes(details.data.size_bytes)) ||
                (node.kind === "folder"
                  ? `${(node as any).fileCount || 0} files, ${(node as any).folderCount || 0} folders`
                  : formatBytes(node.size || 0))
              }
            />

            {/* For folders, show actual item count from folderContents */}
            {node.kind === "folder" && (
              <Row
                label="Total Items"
                value={
                  folderContents
                    ? `${(folderContents.files?.length || 0) + (folderContents.directories?.length || 0)} items`
                    : details?.size_readable
                      ? "Multiple items"
                      : `${((node as any).fileCount || 0) + ((node as any).folderCount || 0)} items`
                }
              />
            )}

            {/* Show breakdown for folders with contents */}
            {node.kind === "folder" && folderContents && (
              <>
                {(folderContents.files?.length || 0) > 0 && (
                  <Row
                    label="Files"
                    value={`${folderContents.files?.length || 0} files`}
                  />
                )}
                {(folderContents.directories?.length || 0) > 0 && (
                  <Row
                    label="Subfolders"
                    value={`${folderContents.directories?.length || 0} folders`}
                  />
                )}
              </>
            )}

            {/* Modified date */}
            <Row
              label="Modified"
              value={formatDate(
                details?.modified_at ||
                  details?.uploaded_at ||
                  node.modified ||
                  new Date().toISOString(),
              )}
            />

            {/* Created date */}
            <Row
              label="Created"
              value={formatDate(
                details?.created_at ||
                  (node as { created_at?: string }).created_at ||
                  node.modified ||
                  new Date().toISOString(),
              )}
            />

            {/* File type/MIME */}
            <Row
              label="Type"
              value={
                details?.extension
                  ? `${details.type} (${details.extension})`
                  : details?.type || node.kind || "Unknown"
              }
            />

            {/* Path */}
            {(details?.path || (node as any).path) && (
              <Row label="Path" value={details?.path || (node as any).path} />
            )}

            {/* Extension (for files) */}
            {details?.extension && (
              <Row label="Extension" value={details.extension} />
            )}

            {/* Owner */}
            {(details?.owner || (node as any).owner) && (
              <Row
                label="Owner"
                value={details?.owner || (node as any).owner}
              />
            )}

            {/* File kind */}
            <Row
              label="Kind"
              value={
                details?.type ||
                node.kind.charAt(0).toUpperCase() + node.kind.slice(1)
              }
            />
          </dl>
        )}

        <div className="mt-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Important", "Work"].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-accent px-2.5 py-0.5 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
        <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90">
          Open
        </button>
        <button className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent">
          Share
        </button>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-medium">{value}</dd>
    </div>
  );
}
