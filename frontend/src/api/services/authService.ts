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

// Add response interceptor to handle session expiration
authClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle session expiration
    if (error.response?.status === 401) {
      // Clear tokens and redirect to landing page
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

// ===== TYPESCRIPT INTERFACES =====

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  password: string;
  password2: string;
  storage_quota: number;
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
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role: string;
  storage_quota?: number;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
}

export interface UserProfile {
  bio: string;
  phone: string;
  picture_url?: string;
  updated_at: string;
}

export interface ProfileData {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  profile: UserProfile;
}

// ===== PROFILE CACHE =====

interface CacheEntry {
  data: ProfileData;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ProfileCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: ProfileData, ttl?: number): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    };
    this.cache.set(key, entry);
  }

  get(key: string): ProfileData | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const profileCache = new ProfileCache();

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

  // Get detailed profile data (with caching)
  getProfile: async (useCache = true): Promise<ProfileData> => {
    const cacheKey = "user-profile";

    // Check cache first if enabled
    if (useCache) {
      const cachedProfile = profileCache.get(cacheKey);
      if (cachedProfile) {
        console.log("Profile loaded from cache");
        return cachedProfile;
      }
    }

    // Fetch from API if not in cache or cache disabled
    console.log("Fetching profile from API");
    const response = await authClient.get("/api/auth/profile/");
    const profileData = response.data;

    // Cache the result
    profileCache.set(cacheKey, profileData);

    return profileData;
  },

  // Update profile data (with cache invalidation)
  updateProfile: async (profileData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    bio?: string;
    phone?: string;
  }): Promise<ProfileData> => {
    const response = await authClient.patch("/api/auth/profile/", profileData);

    // Invalidate cache after update
    profileCache.invalidate("user-profile");

    return response.data;
  },

  // Upload profile picture (with cache invalidation)
  uploadProfilePicture: async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("picture", file);

    const response = await authClient.post(
      "/api/auth/profile/picture/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    // Invalidate cache after picture upload
    profileCache.invalidate("user-profile");

    return response.data;
  },

  // Get profile picture as data URL (authenticated)
  getProfilePicture: async (): Promise<string | null> => {
    try {
      const response = await authClient.get(
        "/api/auth/profile/picture/serve/",
        {
          responseType: "blob",
        },
      );

      const contentType = response.headers["content-type"] as string;
      const blob = new Blob([response.data], { type: contentType });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Error fetching profile picture:", error);
      return null;
    }
  },

  // Delete profile picture (with cache invalidation)
  deleteProfilePicture: async (): Promise<void> => {
    try {
      await authClient.delete("/api/auth/profile/picture/");
      console.log("Profile picture deleted successfully");

      // Invalidate cache after picture deletion
      profileCache.invalidate("user-profile");
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      throw error;
    }
  },

  // Update user profile (legacy)
  updateUserProfile: async (userData: Partial<User>): Promise<User> => {
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
    await authClient.post("/auth/users/reset_password/", { email });
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

  // Get all users
  getUsers: async (): Promise<User[]> => {
    const response = await authClient.get("/api/auth/users/");
    return response.data;
  },

  // Get user details by ID
  getUserDetail: async (userId: number): Promise<User> => {
    const response = await authClient.get(`/api/auth/users/${userId}/`);
    return response.data;
  },

  // Create user (admin only) - uses register endpoint but doesn't return auth tokens to avoid session interference
  createUser: async (userData: RegisterRequest): Promise<void> => {
    const response = await authClient.post("/api/auth/register/", userData);
    // Don't return the response to avoid token conflicts
    return;
  },

  // Edit user (admin only)
  editUser: async (
    userId: number,
    userData: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      role?: string;
      storage_quota?: number;
    },
  ): Promise<User> => {
    const response = await authClient.patch(
      `/api/auth/users/edit/${userId}/`,
      userData,
    );
    return response.data;
  },

  // Delete user (admin only)
  deleteUser: async (userId: number): Promise<void> => {
    await authClient.delete(`/api/auth/users/delete/${userId}/`);
  },
};
