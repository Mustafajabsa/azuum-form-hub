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
  // Country phone codes data
  const countryPhoneCodes = [
    { code: "+1", name: "United States", pattern: /^\d{10}$/ },
    { code: "+44", name: "United Kingdom", pattern: /^\d{10,11}$/ },
    { code: "+91", name: "India", pattern: /^[6-9]\d{9}$/ },
    { code: "+86", name: "China", pattern: /^\d{11}$/ },
    { code: "+81", name: "Japan", pattern: /^\d{10}$/ },
    { code: "+49", name: "Germany", pattern: /^\d{10,11}$/ },
    { code: "+33", name: "France", pattern: /^\d{9}$/ },
    { code: "+39", name: "Italy", pattern: /^\d{9,10}$/ },
    { code: "+34", name: "Spain", pattern: /^\d{9}$/ },
    { code: "+31", name: "Netherlands", pattern: /^\d{9}$/ },
    { code: "+61", name: "Australia", pattern: /^\d{9}$/ },
    { code: "+7", name: "Russia", pattern: /^\d{10}$/ },
    { code: "+55", name: "Brazil", pattern: /^\d{10,11}$/ },
    { code: "+52", name: "Mexico", pattern: /^\d{10}$/ },
    { code: "+82", name: "South Korea", pattern: /^\d{10}$/ },
    { code: "+27", name: "South Africa", pattern: /^\d{9}$/ },
    { code: "+20", name: "Egypt", pattern: /^\d{10}$/ },
    { code: "+966", name: "Saudi Arabia", pattern: /^\d{9}$/ },
    { code: "+971", name: "UAE", pattern: /^\d{9}$/ },
  ];

  const [showContact, setShowContact] = useState(false);
  const [hasWebsite, setHasWebsite] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [formData, setFormData] = useState({
    // Shared fields
    username: "",
    password: "",
    password2: "",

    // Registration fields
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    country_code: "+1",
    role: "Project Manager",
    storage_quota: 1000,
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

  // Redirect authenticated users to storage
  if (isAuthenticated) {
    return <Navigate to="/storage" replace />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Use real authentication API
    login(formData.username, formData.password);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password confirmation
    if (formData.password !== formData.password2) {
      console.error("Passwords do not match");
      return;
    }

    // Use real authentication API with all required fields
    const signupData = {
      username: formData.username,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone_number: `${formData.country_code}${formData.phone_number}`,
      role: formData.role,
      password: formData.password,
      password2: formData.password2,
      storage_quota: formData.storage_quota,
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    required
                  />
                </div>
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
                <Label htmlFor="phone_number">Phone Number</Label>
                <div className="flex gap-2">
                  <select
                    value={formData.country_code}
                    onChange={(e) =>
                      setFormData({ ...formData, country_code: e.target.value })
                    }
                    className="w-24 p-2 border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    {countryPhoneCodes.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.code}
                      </option>
                    ))}
                  </select>
                  <Input
                    id="phone_number"
                    type="tel"
                    placeholder="1234567890"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    required
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="user">User</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="Finance">Finance</option>
                  <option value="Program">Program</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storage_quota">Storage Quota (MB)</Label>
                <Input
                  id="storage_quota"
                  type="number"
                  placeholder="1000"
                  value={formData.storage_quota}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      storage_quota: parseInt(e.target.value) || 0,
                    })
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
                <Label htmlFor="password2">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="password2"
                    type={showPasswordConfirm ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.password2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        password2: e.target.value,
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
