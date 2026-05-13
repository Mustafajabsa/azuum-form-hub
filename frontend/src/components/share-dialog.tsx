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
import { Switch } from "@/components/ui/switch";
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
  const [hasExpiryLimit, setHasExpiryLimit] = useState<boolean>(true);
  const [hasAccessLimit, setHasAccessLimit] = useState<boolean>(true);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleShare = () => {
    setShowConfirmation(true);
  };

  const handleConfirmShare = () => {
    const expires =
      hasExpiryLimit && expiresIn ? parseInt(expiresIn, 10) : undefined;
    const access =
      hasAccessLimit && maxAccess ? parseInt(maxAccess, 10) : undefined;
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
            {showConfirmation ? (
              <>
                Review sharing settings for{" "}
                <strong>
                  {itemCount === 1 ? fileName : `${itemCount} items`}
                </strong>
              </>
            ) : itemCount === 1 ? (
              <>
                Configure sharing settings for <strong>{fileName}</strong>
              </>
            ) : (
              <>
                Configure sharing settings for{" "}
                <strong>{itemCount} items</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!showConfirmation ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Expires in (hours)</Label>
              <div className="col-span-3 flex items-center space-x-3">
                <Switch
                  id="has-expiry-limit"
                  checked={hasExpiryLimit}
                  onCheckedChange={setHasExpiryLimit}
                />
                <span className="text-sm text-muted-foreground">
                  {hasExpiryLimit ? "Limited" : "No limit"}
                </span>
                {hasExpiryLimit && (
                  <Input
                    id="expires-in"
                    type="number"
                    min="1"
                    max="8760" // 1 year max
                    placeholder="24"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    className="w-24"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Max Access</Label>
              <div className="col-span-3 flex items-center space-x-3">
                <Switch
                  id="has-access-limit"
                  checked={hasAccessLimit}
                  onCheckedChange={setHasAccessLimit}
                />
                <span className="text-sm text-muted-foreground">
                  {hasAccessLimit ? "Limited" : "Unlimited"}
                </span>
                {hasAccessLimit && (
                  <Input
                    id="max-access"
                    type="number"
                    min="1"
                    max="1000"
                    placeholder="5"
                    value={maxAccess}
                    onChange={(e) => setMaxAccess(e.target.value)}
                    className="w-24"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">View in Browser</Label>
              <div className="col-span-3 flex items-center">
                <Switch
                  id="view-in-browser"
                  checked={isViewable}
                  onCheckedChange={setIsViewable}
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {isViewable
                    ? "Files can be viewed in browser"
                    : "Files will force download"}
                </span>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
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
