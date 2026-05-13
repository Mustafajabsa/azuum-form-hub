import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Check } from "lucide-react";
import { useState } from "react";

interface ShareLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  fileName: string;
  expiresAt?: string;
  maxAccess?: number;
  sharedItems?: any[]; // For mixed share response
  isMasterLink?: boolean; // Flag to indicate if this is a master link
}

export function ShareLinkDialog({
  open,
  onOpenChange,
  shareUrl,
  fileName,
  expiresAt,
  maxAccess,
  sharedItems,
  isMasterLink,
}: ShareLinkDialogProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (url: string, index: number) => {
    try {
      console.log("Attempting to copy:", url);

      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        console.log("Using modern clipboard API");
        await navigator.clipboard.writeText(url);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
        return;
      }

      // Enhanced fallback for older browsers
      console.log("Using fallback copy method");
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.left = "0px";
      textArea.style.top = "0px";
      textArea.style.width = "1px";
      textArea.style.height = "1px";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);

      // Select the text
      textArea.select();
      textArea.setSelectionRange(0, 99999);

      // Try multiple copy methods
      let successful = false;
      try {
        successful = document.execCommand("copy");
        console.log("execCommand copy result:", successful);
      } catch (e) {
        console.log("execCommand failed:", e);
      }

      // Try modern selection API as fallback
      if (!successful && window.getSelection && document.createRange) {
        try {
          const range = document.createRange();
          range.selectNodeContents(textArea);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
            successful = true;
            console.log("Selection API copy successful");
          }
        } catch (e) {
          console.log("Selection API failed:", e);
        }
      }

      // Clean up
      document.body.removeChild(textArea);

      if (successful) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
        console.log("Copy successful for index:", index);
      } else {
        console.error("All copy methods failed");
        throw new Error("Copy command failed");
      }
    } catch (err) {
      console.error("Failed to copy:", err);
      // Show user-friendly error message with more details
      const errorMsg = `Failed to copy link. Please try manually or check browser permissions. Error: ${err.message || err}`;
      alert(errorMsg);
    }
  };

  const handleOpenLink = (url: string) => {
    window.open(url, "_blank");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleCopyAll = async () => {
    if (sharedItems && sharedItems.length > 0) {
      const allUrls = sharedItems.map((item) => item.share_url).join("\n");
      try {
        // Modern clipboard API
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(allUrls);
          setCopiedIndex(-1); // Special index for "copy all"
          setTimeout(() => setCopiedIndex(null), 2000);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement("textarea");
          textArea.value = allUrls;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          const successful = document.execCommand("copy");
          document.body.removeChild(textArea);

          if (successful) {
            setCopiedIndex(-1);
            setTimeout(() => setCopiedIndex(null), 2000);
          } else {
            throw new Error("Copy all command failed");
          }
        }
      } catch (err) {
        console.error("Failed to copy all:", err);
        // Show user-friendly error message
        alert("Failed to copy links. Please select and copy manually.");
      }
    } else {
      handleCopy(shareUrl, 0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isMasterLink && sharedItems && sharedItems.length > 1
              ? "Master Share Link Generated"
              : sharedItems && sharedItems.length > 1
                ? `${sharedItems.length} Share Links Generated`
                : "Share Link Generated"}
          </DialogTitle>
          <DialogDescription>
            {isMasterLink && sharedItems && sharedItems.length > 1 ? (
              `Your master share link for ${sharedItems.length} items is ready`
            ) : sharedItems && sharedItems.length > 1 ? (
              `Your shareable links for ${sharedItems.length} items are ready`
            ) : (
              <>
                Your shareable link for <strong>{fileName}</strong> is ready
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <>
            {isMasterLink && sharedItems && sharedItems.length > 1 ? (
              // Master link display for multiple items
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Master Share Link
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 p-2 bg-muted rounded-md text-sm font-mono break-all">
                      {shareUrl}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleCopy(shareUrl, 0)}
                    variant="outline"
                    className="flex-1"
                  >
                    {copiedIndex === 0 ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Master Link
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleOpenLink(shareUrl)}
                    variant="outline"
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open
                  </Button>
                </div>

                {/* Show shared items list */}
                <div className="border-t pt-4">
                  <label className="text-sm font-medium mb-2 block">
                    Shared Items ({sharedItems.length})
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sharedItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {item.path.split("/").pop()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({item.type})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : sharedItems && sharedItems.length > 1 ? (
              // Individual links display (legacy)
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Share URLs</label>
                  <Button onClick={handleCopyAll} variant="outline" size="sm">
                    {copiedIndex === -1 ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied All!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy All
                      </>
                    )}
                  </Button>
                </div>

                {sharedItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {item.type === "folder" ? "" : ""}{" "}
                          {item.path.split("/").pop()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({item.type})
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-muted rounded-md text-xs font-mono break-all">
                      {item.share_url}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleCopy(item.share_url, index)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleOpenLink(item.share_url)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Single item display (original logic)
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Share URL</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 p-2 bg-muted rounded-md text-sm font-mono break-all">
                      {shareUrl}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleCopy(shareUrl, 0)}
                    variant="outline"
                    className="flex-1"
                  >
                    {copiedIndex === 0 ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleOpenLink(shareUrl)}
                    variant="outline"
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open
                  </Button>
                </div>
              </>
            )}
          </>

          {(expiresAt || maxAccess) && (
            <div className="text-sm text-muted-foreground border-t pt-4">
              <div className="space-y-1">
                {expiresAt && <p>• Expires: {formatDate(expiresAt)}</p>}
                {maxAccess && <p>• Max access: {maxAccess} times</p>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
