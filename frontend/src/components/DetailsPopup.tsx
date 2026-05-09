import { X, FileText, Folder, Calendar, HardDrive, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatBytes,
  formatDate,
  type FileNode,
  type FileKind,
} from "./file-utils";

interface Props {
  node: FileNode | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DetailsPopup({ node, isOpen, onClose }: Props) {
  if (!isOpen || !node) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg w-full max-w-md mx-4 max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Item Details</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Icon and Name */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent">
              {node.kind === "folder" ? (
                <Folder className="h-8 w-8 text-foreground" />
              ) : (
                <FileText className="h-8 w-8 text-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">
                {node.name}
              </h3>
              <p className="text-sm text-muted-foreground capitalize">
                {node.kind}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Modified</span>
                </div>
                <p className="font-medium text-foreground">
                  {formatDate(node.modified)}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <HardDrive className="h-4 w-4" />
                  <span>Size</span>
                </div>
                <p className="font-medium text-foreground">
                  {node.kind === "folder"
                    ? `${node.children?.length ?? 0} items`
                    : formatBytes(node.size)}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Owner</span>
              </div>
              <p className="font-medium text-foreground">System</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Type</span>
              </div>
              <p className="font-medium text-foreground capitalize">
                {node.kind}
              </p>
            </div>

            {node.parentId && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Folder className="h-4 w-4" />
                  <span>Parent Folder</span>
                </div>
                <p className="font-medium text-foreground">{node.parentId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
