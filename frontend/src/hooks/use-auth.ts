import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  createElement,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService, LoginRequest, User } from "@/api/services/authService";
import { tokenManager } from "@/utils/tokenManager";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: any) => Promise<void>;
  updateProfile: (userData: any) => Promise<void>;
  changePassword: (passwords: any) => Promise<void>;
  isLoggingIn: boolean;
  isRegistering: boolean;
  isUpdatingProfile: boolean;
  isChangingPassword: boolean;
  loginError: any;
  registerError: any;
  updateProfileError: any;
  changePasswordError: any;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Get current user query
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => authService.getCurrentUser(),
    enabled: !!tokenManager.getAccessToken(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      tokenManager.setTokens(data.access, data.refresh);
      queryClient.setQueryData(["currentUser"], data.user);
    },
    onError: (error) => {
      console.error("Login failed:", error);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: any) => authService.register(userData),
    onSuccess: (data) => {
      tokenManager.setTokens(data.access, data.refresh);
      queryClient.setQueryData(["currentUser"], data.user);
    },
    onError: (error) => {
      console.error("Registration failed:", error);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => {
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        return authService.logout(refreshToken);
      }
      return Promise.resolve();
    },
    onSuccess: () => {
      tokenManager.clearTokens();
      queryClient.clear();
    },
    onError: (error) => {
      console.error("Logout failed:", error);
      // Still clear tokens even if logout API fails
      tokenManager.clearTokens();
      queryClient.clear();
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (userData: Partial<User>) => authService.updateProfile(userData),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["currentUser"], updatedUser);
    },
    onError: (error) => {
      console.error("Profile update failed:", error);
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (passwords: any) => authService.changePassword(passwords),
    onError: (error) => {
      console.error("Password change failed:", error);
    },
  });

  // Login function
  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  // Logout function
  const logout = () => {
    logoutMutation.mutate();
  };

  // Register function
  const register = async (userData: any) => {
    await registerMutation.mutateAsync(userData);
  };

  // Update profile function
  const updateProfile = async (userData: any) => {
    await updateProfileMutation.mutateAsync(userData);
  };

  // Change password function
  const changePassword = async (passwords: any) => {
    await changePasswordMutation.mutateAsync(passwords);
  };

  const value: AuthContextType = {
    user: user || null,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    isAuthenticated: !!tokenManager.getAccessToken(),
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    updateProfileError: updateProfileMutation.error,
    changePasswordError: changePasswordMutation.error,
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
