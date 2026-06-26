import { apiClient, rawClient } from "../api/client";

// OAuth2 Keycloak Configuration
const KEYCLOAK_CLIENT_ID = "comply-lens-backend";
const KEYCLOAK_CLIENT_SECRET = "your-client-secret";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
}

/**
 * Check if a token is expired
 * Returns true if token has expired or cannot be decoded
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return true; // Invalid token
    }

    const decoded = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    if (!decoded.exp) {
      return false; // No expiration, assume valid
    }

    // exp is in seconds, convert to milliseconds and compare with current time
    const expiryTime = decoded.exp * 1000;
    const isExpired = Date.now() >= expiryTime;

    if (isExpired) {
      console.warn("Token has expired");
    }

    return isExpired;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true; // Assume expired if we can't decode
  }
}

/**
 * Get token expiration time
 * Returns the expiration date or null if invalid
 */
function getTokenExpirationTime(token: string): Date | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const decoded = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    if (!decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
}

/**
 * Extract roles from a decoded JWT payload (realm + client roles).
 */
function extractRolesFromToken(decoded: Record<string, unknown>): string[] {
  const realmRoles = (decoded.realm_access as { roles?: string[] } | undefined)?.roles ?? [];
  const topLevelRoles = (decoded.roles as string[] | undefined) ?? [];
  const resourceAccess = decoded.resource_access as Record<string, { roles?: string[] }> | undefined;
  const clientRoles = resourceAccess?.[KEYCLOAK_CLIENT_ID]?.roles ?? [];

  const combined = [...realmRoles, ...topLevelRoles, ...clientRoles];
  return [...new Set(combined)];
}

/**
 * Decodes JWT token to extract user information
 * Note: This is client-side decoding for convenience. Verify tokens on backend.
 */
function decodeToken(token: string): AuthUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const decoded = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    ) as Record<string, unknown>;

    return {
      id: (decoded.sub as string) || (decoded.user_id as string) || "",
      username: (decoded.preferred_username as string) || (decoded.username as string) || "",
      email: (decoded.email as string) || "",
      roles: extractRolesFromToken(decoded),
    };
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

/**
 * Authentication Service
 * Handles OAuth2 Password Bearer flow with Keycloak
 */
const authService = {
  /**
   * Login with username and password using OAuth2 Password Bearer flow
   * POST /api/auth/login with OAuth2 credentials
   */
  async login(request: LoginRequest): Promise<TokenResponse> {
    try {
      const response = await apiClient.post<TokenResponse>("/api/auth/login", {
        username: request.username,
        password: request.password,
        client_id: KEYCLOAK_CLIENT_ID,
        client_secret: KEYCLOAK_CLIENT_SECRET,
        grant_type: "password",
        scope: "openid organization profile email",
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error("Invalid username or password");
      }
      if (error.response?.status === 422) {
        throw new Error("Invalid input format");
      }
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error("Login failed. Please check your credentials and try again.");
    }
  },

  /**
   * Refresh access token using refresh token
   * POST /api/auth/refresh
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const response = await rawClient.post<TokenResponse>("/api/auth/refresh", {
        refresh_token: refreshToken,
        client_id: KEYCLOAK_CLIENT_ID,
        client_secret: KEYCLOAK_CLIENT_SECRET,
        grant_type: "refresh_token",
        scope: "openid organization profile email",
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error("Session expired. Please login again.");
      }
      throw new Error("Failed to refresh token");
    }
  },

  /**
   * Verify if a token is valid (client-side check only)
   * Returns true only if token exists, is not expired, and decodes properly
   */
  async verifyToken(token: string): Promise<boolean> {
    if (!token || isTokenExpired(token)) {
      return false;
    }
    return true;
  },

  /**
   * Get current user information from token
   * Uses client-side decoding (no API call needed)
   */
  async getCurrentUser(token: string): Promise<AuthUser | null> {
    if (isTokenExpired(token)) {
      return null;
    }
    return decodeToken(token);
  },

  /**
   * Decode JWT token (client-side)
   * Use for quick access without API call
   */
  decodeToken,

  /**
   * Logout - clear tokens on backend
   */
  async logout(): Promise<void> {
    try {
      await rawClient.post("/api/auth/logout", {});
    } catch (error) {
      console.error("Error during logout:", error);
      // Still proceed with local logout even if backend fails
    }
  },

  /**
   * Check if token is expired (utility for components/providers)
   */
  isTokenExpired,

  /**
   * Get token expiration time (utility for components/providers)
   */
  getTokenExpirationTime,
};

export default authService;
export { isTokenExpired, getTokenExpirationTime, decodeToken };
