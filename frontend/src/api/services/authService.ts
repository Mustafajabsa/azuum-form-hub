import axios from "axios";

// Create separate client for authentication endpoints
const authClient = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
authClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ===== TYPESCRIPT INTERFACES =====

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
  };
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

// ===== AUTHENTICATION SERVICE =====

export const authService = {
  // Login user
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      console.log(
        "Attempting login to:",
        authClient.defaults.baseURL + "/api/auth/login/",
      );
      const response = await authClient.post("/api/auth/login/", credentials);
      console.log("Login response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      if (error.response) {
        // Server responded with error status
        console.error("Error response:", error.response.data);
        console.error("Error status:", error.response.status);
      } else if (error.request) {
        // Request was made but no response received
        console.error("No response received:", error.request);
      } else {
        // Something else happened
        console.error("Error message:", error.message);
      }
      throw error;
    }
  },

  // Register new user
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await authClient.post("/api/auth/register/", userData);
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refresh: string): Promise<{ access: string }> => {
    const response = await authClient.post("/api/auth/token/refresh/", {
      refresh,
    });
    return response.data;
  },

  // Logout user
  logout: async (refresh: string): Promise<void> => {
    try {
      console.log(
        "Attempting logout to:",
        authClient.defaults.baseURL + "/api/auth/logout/",
      );
      await authClient.post("/api/auth/logout/", { refresh });
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  },

  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    const response = await authClient.get("/api/auth/me/");
    return response.data;
  },

  // Update user profile
  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const response = await authClient.put("/auth/users/me/", userData);
    return response.data;
  },

  // Change password
  changePassword: async (passwords: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<void> => {
    await authClient.post("/change-password/", passwords);
  },

  // Request password reset
  requestPasswordReset: async (email: string): Promise<void> => {
    await authClient.post("/password-reset/", { email });
  },

  // Reset password with token
  resetPassword: async (data: {
    token: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<void> => {
    await authClient.post("/password-reset-confirm/", data);
  },

  // Verify email
  verifyEmail: async (token: string): Promise<void> => {
    await authClient.post("/verify-email/", { token });
  },
};
