import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, PenTool, CheckCircle, AlertCircle } from "lucide-react";

interface SignDocumentProps {
  submissionId: string;
  formTitle: string;
  onSignComplete?: (signatureData: {
    signatureText: string;
    signatureImage?: File;
    signedAt: string;
    signedBy: string;
  }) => void;
}

export function SignDocument({ submissionId, formTitle, onSignComplete }: SignDocumentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [signatureType, setSignatureType] = useState<'text' | 'draw'>('text');
  const [signatureText, setSignatureText] = useState('');
  const [signatureImage, setSignatureImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Create signature data
      const signatureData = {
        signatureText: signatureText || '',
        signatureImage: signatureImage,
        signedAt: new Date().toISOString(),
        signedBy: 'Current User', // This would come from auth context
      };

      // Call the sign complete callback
      onSignComplete?.(signatureData);
      
      // Show success state
      setSuccess(true);
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 2000);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to sign document. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureImage(file);
    }
  };

  const resetForm = () => {
    setSignatureType('text');
    setSignatureText('');
    setSignatureImage(null);
    setError(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Sign Document: {formTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-green-800">Document Signed Successfully!</h3>
              <p className="text-sm text-green-700">
                The document "{formTitle}" has been signed at {new Date().toLocaleString()}
              </p>
            </div>
            
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setSuccess(false);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5 text-primary" />
          Sign Document: {formTitle}
        </CardTitle>
        <CardDescription>
          Review and sign this document electronically. You can either type your signature or upload an image.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Signature Type Selection */}
            <div className="space-y-2">
              <Label>Signature Type</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={signatureType === 'text' ? 'default' : 'outline'}
                  onClick={() => setSignatureType('text')}
                  className="flex-1"
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  Type Signature
                </Button>
                <Button
                  type="button"
                  variant={signatureType === 'draw' ? 'default' : 'outline'}
                  onClick={() => setSignatureType('draw')}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Signature
                </Button>
              </div>
            </div>

            {/* Text Signature Input */}
            {signatureType === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="signature-text">Signature Text</Label>
                <Textarea
                  id="signature-text"
                  placeholder="Type your signature here..."
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  rows={4}
                  className="min-h-[100px] font-serif border-2 border-dashed rounded-md p-2"
                  required
                />
              </div>
            )}

            {/* Image Signature Upload */}
            {signatureType === 'draw' && (
              <div className="space-y-2">
                <Label htmlFor="signature-image">Upload Signature Image</Label>
                <Input
                  id="signature-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="file:mr-2 file:border-0 file:text-muted-foreground"
                />
                {signatureImage && (
                  <div className="mt-2 p-2 border rounded-md bg-gray-50">
                    <img
                      src={URL.createObjectURL(signatureImage)}
                      alt="Signature preview"
                      className="max-h-32 max-w-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Clear
              </Button>
              <Button
                type="submit"
                disabled={isLoading || (!signatureText && signatureType === 'text') || (!signatureImage && signatureType === 'draw')}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    Signing...
                  </>
                ) : (
                  <>
                    <PenTool className="h-4 w-4 mr-2" />
                    Sign Document
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            By signing this document, you confirm that you have reviewed and agree to its contents.
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
