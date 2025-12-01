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
    // In a real app, you would check for an existing session/token here
    // For demo purposes, we'll simulate a logged-in user
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        // Simulate API call to check auth status
        await new Promise((resolve) => setTimeout(resolve, 500));

        // For demo, we'll set a mock user
        // In a real app, you would verify the token and get user data
        setUser({
          email: "user@example.com",
          role: "user",
        });
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
      // In a real app, you would make an API call to authenticate
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For demo, we'll just set a mock user
      setUser({
        email,
        role: "user",
      });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // In a real app, you would clear the auth token
    setUser(null);
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
