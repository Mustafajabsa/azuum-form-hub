import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { tokenManager } from "@/utils/tokenManager";
import { User } from "@/api/services/authService";

// ===== AUTHENTICATION CONTEXT TYPES =====

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  refreshAccessToken: (refreshToken: string) => void;
}

// ===== AUTHENTICATION CONTEXT =====

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===== AUTH PROVIDER COMPONENT =====

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedAccessToken = tokenManager.getAccessToken();
        const storedRefreshToken = tokenManager.getRefreshToken();
        const storedUser = tokenManager.getUserData();

        if (storedAccessToken && storedUser) {
          // Validate token before using it
          if (tokenManager.isTokenValid(storedAccessToken)) {
            setAccessToken(storedAccessToken);
            setRefreshToken(storedRefreshToken);
            setUser(storedUser);
          } else {
            // Token is invalid, clear everything
            tokenManager.clearTokens();
          }
        }
      } catch (error) {
        console.error("Error initializing authentication:", error);
        tokenManager.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function - stores tokens and user globally
  const login = (accessToken: string, refreshToken: string, userData: User) => {
    try {
      // Store in token manager
      tokenManager.setAccessToken(accessToken);
      tokenManager.setRefreshToken(refreshToken);
      tokenManager.setUserData(userData);

      // Update context state
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      setUser(userData);
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
  };

  // Logout function - clears all authentication data
  const logout = () => {
    try {
      // Clear from token manager
      tokenManager.clearTokens();

      // Update context state
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    } catch (error) {
      console.error("Error during logout:", error);
      // Still clear state even if there's an error
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  };

  // Update user data
  const updateUser = (userData: Partial<User>) => {
    try {
      if (user) {
        const updatedUser = { ...user, ...userData };

        // Update in token manager
        tokenManager.setUserData(updatedUser);

        // Update context state
        setUser(updatedUser);
      }
    } catch (error) {
      console.error("Error updating user data:", error);
    }
  };

  // Refresh access token
  const refreshAccessToken = (newAccessToken: string) => {
    try {
      // Update in token manager
      tokenManager.setAccessToken(newAccessToken);

      // Update context state
      setAccessToken(newAccessToken);
    } catch (error) {
      console.error("Error refreshing access token:", error);
      throw error;
    }
  };

  // Computed values
  const isAuthenticated = !!accessToken && !!user;

  const contextValue: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser,
    refreshAccessToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// ===== HOOK FOR USING AUTH CONTEXT =====

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

// ===== EXPORTS =====

export default AuthContext;
