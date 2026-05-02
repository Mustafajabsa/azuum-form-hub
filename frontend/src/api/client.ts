// API client for backend connection
interface MockResponse {
  data: any;
  status?: number;
  headers?: any;
}

interface UploadResponse {
  mode: "flat" | "folder_tree";
  files_created: number;
  folders_created: number;
  root_folder_id: string | null;
  message: string;
}

import axios from "axios";
import { tokenManager } from "@/utils/tokenManager";

// Create axios instance for real API connection
const client = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
client.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add response interceptor to handle token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenManager.getRefreshToken();
        if (refreshToken) {
          // Attempt to refresh the token
          const refreshResponse = await axios.post(
            "http://127.0.0.1:8000/api/auth/refresh/",
            {
              refresh: refreshToken,
            },
          );

          const { access } = refreshResponse.data;
          tokenManager.setAccessToken(access);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return client(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        tokenManager.clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// Export the axios instance with the same interface as the mock client
export default {
  get: async (url: string, config?: any) => {
    try {
      const response = await client.get(url, config);
      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      console.error("API GET Error:", error);
      throw error;
    }
  },
  post: async (url: string, data?: any, config?: any) => {
    try {
      const response = await client.post(url, data, config);
      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      console.error("API POST Error:", error);
      throw error;
    }
  },
  put: async (url: string, data?: any, config?: any) => {
    try {
      const response = await client.put(url, data, config);
      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      console.error("API PUT Error:", error);
      throw error;
    }
  },
  delete: async (url: string, config?: any) => {
    try {
      const response = await client.delete(url, config);
      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      console.error("API DELETE Error:", error);
      throw error;
    }
  },
};
