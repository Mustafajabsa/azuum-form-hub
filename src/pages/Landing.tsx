import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, X } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";

const Landing = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [showContact, setShowContact] = useState(false);
  const [hasWebsite, setHasWebsite] = useState(false);
  const [formData, setFormData] = useState({
    // Login form
    username: "",
    password: "",

    // Signup form
    fullName: "",
    organization: "",
    role: "",
    email: "",
    country: "",
    website: "",
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic
    console.log("Login attempt:", {
      username: formData.username,
      password: formData.password,
    });
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle signup logic
    console.log("Signup data:", {
      ...formData,
      website: hasWebsite ? formData.website : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="Azuum Logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Azuum</h1>
          <p className="text-lg text-muted-foreground">
            Professional Form Management System
          </p>
        </div>

        <Tabs
          defaultValue="login"
          className="w-full"
          onValueChange={(value) => setActiveTab(value)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-4">
                Login
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization Name</Label>
                <Input
                  id="organization"
                  placeholder="Acme Inc."
                  value={formData.organization}
                  onChange={(e) =>
                    setFormData({ ...formData, organization: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  placeholder="e.g., Manager, Developer"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="Your country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  required
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="hasWebsite"
                  checked={hasWebsite}
                  onChange={(e) => setHasWebsite(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="hasWebsite" className="text-sm">
                  Does your organization have a website?
                </Label>
              </div>

              {hasWebsite && (
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    required
                  />
                </div>
              )}

              <Button type="submit" className="w-full mt-4">
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-sm text-muted-foreground text-center">
          Streamline your form creation and management workflow
        </p>
      </div>

      {/* Floating Contact Button */}
      {!showContact ? (
        <Button
          onClick={() => setShowContact(true)}
          className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      ) : (
        <ContactForm onClose={() => setShowContact(false)} />
      )}
    </div>
  );
};

export default Landing;
