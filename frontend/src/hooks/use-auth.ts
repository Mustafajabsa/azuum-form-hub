import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  createElement,
} from "react";
import {
  apiService,
  LoginRequest,
  LoginResponseWithUser,
} from "@/services/api";

type User = NonNullable<LoginResponseWithUser["user"]>;

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: {
    email: string;
    username: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<LoginResponseWithUser>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on initial load
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const refreshToken = localStorage.getItem("refresh_token");

        if (token && refreshToken) {
          console.log("🔑 Found tokens, validating...");
          // Verify token and get user data
          const userData = await apiService.getCurrentUser();
          console.log("✅ User data loaded:", userData.email);
          setUser(userData);
        } else {
          console.log("❌ No tokens found");
          setUser(null);
        }
      } catch (error) {
        console.error("❌ Auth check failed:", error);
        // Clear invalid tokens
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("🔐 Attempting login...");
      const response = await apiService.login({ email, password });
      console.log("✅ Login successful:", response.user?.email);
      setUser(response.user);
    } catch (error) {
      console.error("❌ Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Clear user state
      setUser(null);
      // Clear tokens from localStorage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    }
  };

  const register = async (userData: {
    email: string;
    username: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
  }) => {
    try {
      setIsLoading(true);
      const response = await apiService.register(userData);
      setUser(response.user);
      return response;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
