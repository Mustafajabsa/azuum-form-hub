// ===== TOKEN MANAGEMENT UTILITIES =====

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user_data";

export interface TokenData {
  access: string;
  refresh: string;
  user?: any;
}

export const tokenManager = {
  // Get access token
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  // Get refresh token
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  // Set access token
  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  // Set refresh token
  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  // Set both tokens at once
  setTokens(accessToken: string, refreshToken: string): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  },

  // Clear all tokens
  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  // Check if tokens exist
  hasTokens(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  },

  // Get token expiration time (if stored)
  getTokenExpiration(): number | null {
    const expiration = localStorage.getItem("token_expiration");
    return expiration ? parseInt(expiration, 10) : null;
  },

  // Set token expiration time
  setTokenExpiration(expiration: number): void {
    localStorage.setItem("token_expiration", expiration.toString());
  },

  // Check if token is expired
  isTokenExpired(): boolean {
    const expiration = this.getTokenExpiration();
    if (!expiration) return false; // If no expiration stored, assume not expired
    return Date.now() > expiration;
  },

  // Store user data
  setUserData(user: any): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  // Get user data
  getUserData(): any | null {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  // Parse JWT token (basic implementation)
  parseJWT(token: string): any {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error parsing JWT token:", error);
      return null;
    }
  },

  // Check if token is valid (not expired and properly formatted)
  isTokenValid(token: string): boolean {
    if (!token) return false;

    try {
      const decoded = this.parseJWT(token);
      if (!decoded) return false;

      // Check expiration
      if (decoded.exp) {
        return Date.now() < decoded.exp * 1000; // JWT exp is in seconds
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  // Get token payload
  getTokenPayload(token: string): any {
    return this.parseJWT(token);
  },

  // Check if token needs refresh (expires within next 5 minutes)
  shouldRefreshToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    const payload = this.parseJWT(token);
    if (!payload || !payload.exp) return false;

    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;

    return expirationTime <= fiveMinutesFromNow;
  },
};

// ===== TOKEN REFRESH HELPER =====

export const tokenRefreshHelper = {
  // Setup automatic token refresh
  setupAutoRefresh(refreshCallback: () => void | Promise<void>): () => void {
    // Check every 4 minutes if token needs refresh
    const interval = setInterval(
      () => {
        if (tokenManager.shouldRefreshToken()) {
          Promise.resolve(refreshCallback()).catch((error) => {
            console.error("Auto token refresh failed:", error);
          });
        }
      },
      4 * 60 * 1000,
    ); // 4 minutes

    // Cleanup on page unload
    const cleanup = () => clearInterval(interval);
    window.addEventListener("beforeunload", cleanup);

    return cleanup;
  },
};
