import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  createElement,
} from "react";

type User = {
  email: string;
  role: string;
  // Add other user properties as needed
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on initial load
  useEffect(() => {
    // Check for mock authentication
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check for stored mock user
        const storedUser = localStorage.getItem("mock_user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          // Set default mock user for demo
          const mockUser = {
            email: "user@example.com",
            role: "user",
          };
          setUser(mockUser);
          localStorage.setItem("mock_user", JSON.stringify(mockUser));
        }
      } catch (error) {
        console.error("Auth check failed:", error);
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
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock login - accept any credentials for demo
      const mockUser = {
        email,
        role: "user",
      };

      setUser(mockUser);
      localStorage.setItem("mock_user", JSON.stringify(mockUser));
      localStorage.setItem("access_token", "mock-access-token");
      localStorage.setItem("refresh_token", "mock-refresh-token");
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear mock authentication
    setUser(null);
    localStorage.removeItem("mock_user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
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
