import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (
    expiresIn?: number,
    maxAccess?: number,
    isViewable?: boolean,
  ) => void;
  fileName: string;
  itemCount: number;
}

export function ShareDialog({
  open,
  onOpenChange,
  onShare,
  fileName,
  itemCount,
}: ShareDialogProps) {
  const [expiresIn, setExpiresIn] = useState<string>("24");
  const [maxAccess, setMaxAccess] = useState<string>("5");
  const [isViewable, setIsViewable] = useState<boolean>(true);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleShare = () => {
    setShowConfirmation(true);
  };

  const handleConfirmShare = () => {
    const expires = expiresIn ? parseInt(expiresIn, 10) : undefined;
    const access = maxAccess ? parseInt(maxAccess, 10) : undefined;
    onShare(expires, access, isViewable);
  };

  const handleBack = () => {
    setShowConfirmation(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showConfirmation
              ? "Confirm Share Settings"
              : itemCount === 1
                ? "Share File Externally"
                : "Share Files Externally"}
          </DialogTitle>
          <DialogDescription>
            {showConfirmation
              ? `Review the sharing settings for <strong>${
                  itemCount === 1 ? fileName : `${itemCount} items`
                }</strong>`
              : itemCount === 1
                ? `Configure sharing settings for <strong>${fileName}</strong>`
                : `Configure sharing settings for <strong>${itemCount} items</strong>`}
          </DialogDescription>
        </DialogHeader>

        {!showConfirmation ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expires-in" className="text-right">
                Expires in (hours)
              </Label>
              <Input
                id="expires-in"
                type="number"
                min="1"
                max="8760" // 1 year max
                placeholder="24"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="max-access" className="text-right">
                Max Access
              </Label>
              <Input
                id="max-access"
                type="number"
                min="1"
                max="1000"
                placeholder="5"
                value={maxAccess}
                onChange={(e) => setMaxAccess(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is-viewable" className="text-right">
                View in Browser
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <input
                  id="is-viewable"
                  type="checkbox"
                  checked={isViewable}
                  onChange={(e) => setIsViewable(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is-viewable" className="text-sm text-gray-600">
                  {isViewable
                    ? "Files can be viewed in browser"
                    : "Files will force download"}
                </label>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>• Leave empty for no expiry limit</p>
              <p>• Leave empty for unlimited access</p>
              {itemCount > 1 && (
                <p>• Multiple items will be shared individually</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Expires in:</span>
                    <span>
                      {expiresIn ? `${expiresIn} hours` : "No expiry limit"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Max Access:</span>
                    <span>
                      {maxAccess ? `${maxAccess} times` : "Unlimited access"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Items to share:</span>
                    <span>
                      {itemCount === 1 ? fileName : `${itemCount} items`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">View in Browser:</span>
                    <span>
                      {isViewable
                        ? "Yes - files can be viewed inline"
                        : "No - files will force download"}
                    </span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground">
              <p>• Share links will be generated with these settings</p>
              <p>• Links can be revoked later from the storage page</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {showConfirmation ? (
            <>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleConfirmShare}>
                {itemCount === 1
                  ? "Generate Share Link"
                  : "Generate Share Links"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleShare}>Continue</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
