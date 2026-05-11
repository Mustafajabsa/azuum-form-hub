import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, X, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

const Landing = () => {
  const {
    login,
    register,
    isAuthenticated,
    isLoggingIn,
    isRegistering,
    loginError,
    registerError,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("login");
  const [showContact, setShowContact] = useState(false);
  const [hasWebsite, setHasWebsite] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [formData, setFormData] = useState({
    // Shared fields
    username: "",
    password: "",
    passwordConfirm: "",

    // Signup only fields
    email: "",
    fullName: "",
    organization: "",
    role: "",
    country: "",
    website: "",
  });

  // Helper function to get user-friendly error messages
  const getErrorMessage = (error: any): string => {
    if (!error) return "";

    // Handle network errors
    if (error.code === "NETWORK_ERROR" || !error.response) {
      return "Network error. Please check your internet connection and try again.";
    }

    // Handle HTTP status codes
    const status = error.response?.status;
    const data = error.response?.data;

    switch (status) {
      case 400:
        // Bad Request - validation errors
        if (data?.non_field_errors) {
          return data.non_field_errors[0] || "Invalid input data.";
        }
        if (data?.detail) {
          return data.detail;
        }
        return "Please check your input and try again.";

      case 401:
        // Unauthorized
        if (data?.detail) {
          // Handle specific Django REST framework messages
          if (data.detail.includes("No active account")) {
            return "Invalid username or password.";
          }
          if (data.detail.includes("Invalid credentials")) {
            return "Invalid username or password.";
          }
          if (data.detail.includes("credentials")) {
            return "Invalid username or password.";
          }
          return data.detail;
        }
        return "Invalid username or password.";

      case 403:
        // Forbidden
        return "You don't have permission to perform this action.";

      case 404:
        // Not Found
        return "The requested resource was not found.";

      case 429:
        // Too Many Requests
        return "Too many requests. Please wait a moment and try again.";

      case 500:
        // Internal Server Error
        return "Server error. Please try again later.";

      default:
        // Generic error
        if (data?.detail) {
          return data.detail;
        }
        if (data?.message) {
          return data.message;
        }
        return "An error occurred. Please try again.";
    }
  };

  // Redirect authenticated users to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Use real authentication API
    login(formData.username, formData.password);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password confirmation
    if (formData.password !== formData.passwordConfirm) {
      // You might want to show an error message here
      console.error("Passwords do not match");
      return;
    }

    // Use real authentication API
    const signupData = {
      email: formData.email,
      username: formData.username,
      password: formData.password,
      password_confirm: formData.passwordConfirm,
      first_name: formData.fullName,
      // Add other fields as needed by your API
    };
    register(signupData);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Dark Mode Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        aria-label="Toggle dark mode"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>

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
                  type="text"
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {loginError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md text-sm">
                  {getErrorMessage(loginError)}
                </div>
              )}
              <Button
                type="submit"
                className="w-full mt-4"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Signing in..." : "Login"}
              </Button>
              <div className="text-center mt-4">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
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
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
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

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="passwordConfirm"
                    type={showPasswordConfirm ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.passwordConfirm}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        passwordConfirm: e.target.value,
                      })
                    }
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    aria-label={
                      showPasswordConfirm ? "Hide password" : "Show password"
                    }
                  >
                    {showPasswordConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {registerError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md text-sm">
                  {getErrorMessage(registerError)}
                </div>
              )}

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={isRegistering}
              >
                {isRegistering ? "Creating Account..." : "Create Account"}
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
