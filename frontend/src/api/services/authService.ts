import client from "../client";

// ===== TYPESCRIPT INTERFACES =====

export interface LoginRequest {
  email: string;
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
    const response = await client.post('/auth/login/', credentials);
    return response.data;
  },

  // Register new user
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await client.post('/auth/register/', userData);
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refresh: string): Promise<{ access: string }> => {
    const response = await client.post('/auth/refresh/', { refresh });
    return response.data;
  },

  // Logout user
  logout: async (refresh: string): Promise<void> => {
    await client.post('/auth/logout/', { refresh });
  },

  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    const response = await client.get('/auth/user/');
    return response.data;
  },

  // Update user profile
  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const response = await client.put('/auth/user/', userData);
    return response.data;
  },

  // Change password
  changePassword: async (passwords: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<void> => {
    await client.post('/auth/change-password/', passwords);
  },

  // Request password reset
  requestPasswordReset: async (email: string): Promise<void> => {
    await client.post('/auth/password-reset/', { email });
  },

  // Reset password with token
  resetPassword: async (data: {
    token: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<void> => {
    await client.post('/auth/password-reset-confirm/', data);
  },

  // Verify email
  verifyEmail: async (token: string): Promise<void> => {
    await client.post('/auth/verify-email/', { token });
  },
};
