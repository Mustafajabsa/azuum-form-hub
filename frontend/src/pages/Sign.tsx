import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, FileSignature } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Sign = () => {
  const navigate = useNavigate();

  const handleSendForSignatures = () => {
    // TODO: Navigate to send for signatures page
    console.log("Navigate to send for signatures");
  };

  const handleSignYourself = () => {
    // TODO: Navigate to sign yourself page
    console.log("Navigate to sign yourself");
  };

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Sign"
        description="Choose how you want to sign documents"
      />

      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
          {/* Send for signatures card */}
          <Card
            className="p-8 border-2 border-green-500 hover:shadow-lg transition-all duration-300 cursor-pointer bg-card hover:border-green-600 dark:bg-card dark:border-green-500 dark:hover:border-green-400 group"
            onClick={handleSendForSignatures}
          >
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Send className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  Send for signatures
                </h3>
                <p className="text-muted-foreground">
                  Send documents to others for electronic signatures
                </p>
              </div>
              <Button className="mt-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 group-hover:scale-105 transition-transform duration-300">
                Get Started
              </Button>
            </div>
          </Card>

          {/* Sign yourself card */}
          <Card
            className="p-8 border-2 border-green-500 hover:shadow-lg transition-all duration-300 cursor-pointer bg-card hover:border-green-600 dark:bg-card dark:border-green-500 dark:hover:border-green-400 group"
            onClick={handleSignYourself}
          >
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <FileSignature className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  Sign yourself
                </h3>
                <p className="text-muted-foreground">
                  Sign documents that require your signature
                </p>
              </div>
              <Button className="mt-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 group-hover:scale-105 transition-transform duration-300">
                Get Started
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Sign;
