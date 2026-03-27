import axios, { AxiosResponse, AxiosError } from "axios";

// API base URL
const API_BASE_URL = "http://localhost:8001/api";

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
}

export interface LoginResponseWithUser extends LoginResponse {
  user: User | null;
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
  withCredentials: false, // Changed to false to avoid CORS issues
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
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

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest) {
      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem("access_token", access);

          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        window.location.href = "/landing";
      }
    }

    return Promise.reject(error);
  },
);

// API Service class
class ApiService {
  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<LoginResponseWithUser> {
    try {
      const response = await apiClient.post<LoginResponse>(
        "/token/",
        credentials,
      );
      const { access, refresh } = response.data;

      // Store tokens
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      // Get user data - create a basic user object if profile endpoint fails
      try {
        const userResponse = await apiClient.get("/accounts/profile/");
        const user = userResponse.data;
        localStorage.setItem("user", JSON.stringify(user));

        return {
          access,
          refresh,
          user,
        };
      } catch (profileError) {
        console.warn("Could not fetch user profile, using basic user data");
        // Create a basic user object from the login response
        const basicUser: User = {
          id: 1,
          email: credentials.email,
          first_name: credentials.email.split("@")[0],
          last_name: "",
          username: credentials.email.split("@")[0],
          is_active: true,
          date_joined: new Date().toISOString(),
        };
        localStorage.setItem("user", JSON.stringify(basicUser));

        return {
          access,
          refresh,
          user: basicUser,
        };
      }
    } catch (error: any) {
      console.error("Login error details:", error);

      if (error.code === "NETWORK_ERROR" || error.code === "ERR_NETWORK") {
        throw new Error(
          "Network error: Unable to connect to the server. Please check:\n" +
            "1. Your internet connection\n" +
            "2. Backend server is running on http://localhost:8001\n" +
            "3. No firewall blocking the connection",
        );
      } else if (error.code === "ECONNREFUSED") {
        throw new Error(
          "Connection refused: The backend server is not running. Please start the backend server with:\n" +
            "cd backend && python manage.py runserver 8001",
        );
      } else if (error.code === "ETIMEDOUT") {
        throw new Error(
          "Connection timeout: The server is taking too long to respond. Please try again.",
        );
      } else if (error.response) {
        // Server responded with error status
        if (error.response.status === 401) {
          throw new Error(
            "Invalid email or password. Please check your credentials and try again.",
          );
        } else if (error.response.status === 400) {
          throw new Error(
            "Invalid login credentials. Please check your email and password.",
          );
        } else if (error.response.status === 500) {
          throw new Error(
            "Server error: The backend server encountered an error. Please try again later.",
          );
        } else {
          throw new Error(
            error.response.data?.detail ||
              `Login failed (Status: ${error.response.status}). Please try again.`,
          );
        }
      } else {
        throw new Error(
          `Login failed: ${error.message || "Unknown error occurred. Please try again."}`,
        );
      }
    }
  }

  async logout(): Promise<void> {
    // Clear tokens (Django JWT doesn't have a logout endpoint)
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  }

  async register(userData: {
    email: string;
    username: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
  }): Promise<LoginResponseWithUser> {
    try {
      const response = await apiClient.post<LoginResponse>(
        "/register/",
        userData,
      );
      const { access, refresh } = response.data;

      // Store tokens
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      // Get user data
      try {
        const userResponse = await apiClient.get("/accounts/profile/");
        const user = userResponse.data;
        localStorage.setItem("user", JSON.stringify(user));

        return {
          access,
          refresh,
          user,
        };
      } catch (error) {
        // If we can't get user data, still return tokens
        return {
          access,
          refresh,
          user: null,
        };
      }
    } catch (error: any) {
      const message =
        error.response.data?.detail ||
        error.response.data?.message ||
        "Registration failed";
      throw new Error(message);
    }
  }

  async getCurrentUser(): Promise<User> {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      return JSON.parse(storedUser);
    }

    const response = await apiClient.get("/accounts/profile/");
    const user = response.data;
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<any> {
    const response = await apiClient.get("/dashboard/stats/");
    return response.data;
  }

  async getStorageAnalytics(): Promise<any> {
    const response = await apiClient.get("/dashboard/storage-analytics/");
    return response.data;
  }

  // Storage endpoints
  async getFolders(folderId?: string): Promise<any> {
    const url = folderId
      ? `/storage/folders/?parent=${folderId}`
      : "/storage/folders/";
    const response = await apiClient.get(url);
    return response.data;
  }

  async getFiles(folderId?: string): Promise<any> {
    const url = folderId
      ? `/storage/files/?folder=${folderId}`
      : "/storage/files/";
    const response = await apiClient.get(url);
    return response.data;
  }

  async createFolder(name: string, parentId?: string | null): Promise<any> {
    const response = await apiClient.post("/storage/folders/", {
      name,
      parent: parentId || null,
    });
    return response.data;
  }

  async uploadFile(formData: FormData): Promise<any> {
    const response = await apiClient.post("/storage/upload/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  async deleteFile(fileId: string): Promise<void> {
    await apiClient.delete(`/storage/files/${fileId}/`);
  }

  async deleteFolder(folderId: string): Promise<void> {
    await apiClient.delete(`/storage/folders/${folderId}/`);
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const response = await apiClient.get(`/storage/files/${fileId}/download/`, {
      responseType: "blob",
    });
    return response.data;
  }

  async downloadFolder(folderId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/storage/folders/${folderId}/download/`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  }

  // Forms endpoints
  async getForms(): Promise<any> {
    const response = await apiClient.get("/forms/");
    return response.data;
  }

  async createForm(data: any): Promise<any> {
    const response = await apiClient.post("/forms/", data);
    return response.data;
  }

  async updateForm(formId: string, data: any): Promise<any> {
    const response = await apiClient.put(`/forms/${formId}/`, data);
    return response.data;
  }

  async deleteForm(formId: string): Promise<void> {
    await apiClient.delete(`/forms/${formId}/`);
  }

  async getSubmissions(formId?: string): Promise<any> {
    const url = formId ? `/submissions/?form=${formId}` : "/submissions/";
    const response = await apiClient.get(url);
    return response.data;
  }

  async createSubmission(data: any): Promise<any> {
    const response = await apiClient.post("/submissions/", data);
    return response.data;
  }

  // Search endpoints
  async search(query: string, filters?: any): Promise<any> {
    const response = await apiClient.get("/search/", {
      params: { query, ...filters },
    });
    return response.data;
  }

  async getSearchSuggestions(query: string): Promise<any> {
    const response = await apiClient.get("/search/suggestions/", {
      params: { query },
    });
    return response.data;
  }

  // Saved searches
  async getSavedSearches(): Promise<any> {
    const response = await apiClient.get("/search/saved/");
    return response.data;
  }

  async saveSearch(name: string, query: string, filters: any): Promise<any> {
    const response = await apiClient.post("/search/saved/", {
      name,
      query,
      filters,
    });
    return response.data;
  }

  // File versioning
  async getFileVersions(fileId: string): Promise<any> {
    const response = await apiClient.get(`/storage/files/${fileId}/versions/`);
    return response.data;
  }

  async restoreFileVersion(versionId: string): Promise<any> {
    const response = await apiClient.post(
      `/storage/file-versions/${versionId}/restore/`,
    );
    return response.data;
  }

  // Bulk operations
  async createBulkOperation(data: {
    operation_type: string;
    target_type: string;
    target_ids: string[];
    options?: any;
  }): Promise<any> {
    const response = await apiClient.post("/storage/bulk-operations/", data);
    return response.data;
  }

  async getBulkOperations(): Promise<any> {
    const response = await apiClient.get("/storage/bulk-operations/");
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await apiClient.get("/health/");
    return response.data;
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export types for use in components
export type { User, LoginRequest, LoginResponse, LoginResponseWithUser };
