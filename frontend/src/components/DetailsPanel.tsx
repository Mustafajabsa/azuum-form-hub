import { FileIcon } from "./FileIcon";
import { formatBytes, formatDate, type FileNode } from "./file-utils";

interface Props {
  node: FileNode | null;
}

export function DetailsPanel({ node }: Props) {
  if (!node) {
    return (
      <aside className="hidden h-full shrink-0 flex-col border-l border-border bg-card md:flex overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground">
          <FileIcon kind="other" size={36} />
          <p className="mt-3">Select an item to see details</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden h-full shrink-0 flex-col border-l border-border bg-card md:flex overflow-hidden">
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
        <dl className="space-y-3">
          <Row
            label="Size"
            value={
              node.kind === "folder"
                ? `${node.children?.length ?? 0} items`
                : formatBytes(node.size)
            }
          />
          <Row label="Modified" value={formatDate(node.modified)} />
          <Row label="Created" value={formatDate(node.modified)} />
          <Row
            label="Kind"
            value={node.kind.charAt(0).toUpperCase() + node.kind.slice(1)}
          />
        </dl>

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
