import { useEffect, useState, useRef, useMemo, type ReactNode } from "react";
import authService, { isTokenExpired } from "../services/authService";
import type { AuthState } from "../types/auth";
import { AuthContext } from "./AuthContext";

// Token storage keys
const ACCESS_TOKEN_KEY = "comply_lens_access_token";
const REFRESH_TOKEN_KEY = "comply_lens_refresh_token";

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    user: null,
    loading: true,
    error: null,
  });

  // Track refresh interval to avoid memory leaks
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track current tokens in ref to avoid stale closure in refresh interval
  const tokensRef = useRef<{ accessToken: string | null; refreshToken: string | null }>({
    accessToken: null,
    refreshToken: null,
  });

  /**
   * Initialize auth state on mount
   * Check localStorage for existing tokens and validate
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (storedAccessToken) {
          // Try to verify the stored token
          const isValid = await authService.verifyToken(storedAccessToken);

          if (isValid) {
            // Token is still valid, use it
            const user = authService.decodeToken(storedAccessToken);
            tokensRef.current = {
              accessToken: storedAccessToken,
              refreshToken: storedRefreshToken,
            };
            setAuthState({
              isAuthenticated: true,
              accessToken: storedAccessToken,
              refreshToken: storedRefreshToken,
              user,
              loading: false,
              error: null,
            });
            return;
          } else if (storedRefreshToken) {
            // Token expired but we have refresh token, try to refresh
            try {
              const tokenResponse = await authService.refreshToken(storedRefreshToken);
              localStorage.setItem(ACCESS_TOKEN_KEY, tokenResponse.access_token);
              if (tokenResponse.refresh_token) {
                localStorage.setItem(REFRESH_TOKEN_KEY, tokenResponse.refresh_token);
              }

              const user = authService.decodeToken(tokenResponse.access_token);
              tokensRef.current = {
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token || storedRefreshToken,
              };
              setAuthState({
                isAuthenticated: true,
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token || storedRefreshToken,
                user,
                loading: false,
                error: null,
              });
              return;
            } catch (refreshError) {
              // Refresh failed, clear tokens and logout
              console.error("Token refresh during initialization failed:", refreshError);
              localStorage.removeItem(ACCESS_TOKEN_KEY);
              localStorage.removeItem(REFRESH_TOKEN_KEY);
              tokensRef.current = {
                accessToken: null,
                refreshToken: null,
              };
              // Set unauthenticated state with error message
              setAuthState({
                isAuthenticated: false,
                accessToken: null,
                refreshToken: null,
                user: null,
                loading: false,
                error: "Session expired. Please log in again.",
              });
              return;
            }
          }
        }

        // No valid token found
        setAuthState({
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          user: null,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error initializing auth:", error);
        setAuthState({
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          user: null,
          loading: false,
          error: "Failed to initialize authentication",
        });
      }
    };

    initializeAuth();
  }, []);

  /**
   * Set up pre-emptive token refresh
   * Refresh token every 5 minutes to avoid session expiration
   */
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.accessToken || !authState.refreshToken) {
      // No active session, clear any existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Set up refresh interval (every 5 minutes)
    const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    refreshIntervalRef.current = setInterval(async () => {
      try {
        const currentAccessToken = tokensRef.current.accessToken;
        const currentRefreshToken = tokensRef.current.refreshToken;

        if (!currentAccessToken || !currentRefreshToken) {
          return;
        }

        // Check if token is already expired
        if (isTokenExpired(currentAccessToken)) {
          console.log("Token expired, attempting refresh...");

          const tokenResponse = await authService.refreshToken(currentRefreshToken);

          // Update tokens in ref and storage
          tokensRef.current = {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token || currentRefreshToken,
          };

          localStorage.setItem(ACCESS_TOKEN_KEY, tokenResponse.access_token);
          if (tokenResponse.refresh_token) {
            localStorage.setItem(REFRESH_TOKEN_KEY, tokenResponse.refresh_token);
          }

          const user = authService.decodeToken(tokenResponse.access_token);
          setAuthState((prev) => ({
            ...prev,
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token || prev.refreshToken,
            user,
          }));

          console.log("Token refreshed successfully");
        }
      } catch (error) {
        console.error("Error during pre-emptive token refresh:", error);
        
        // If refresh token is expired or invalid, logout the user
        if (error instanceof Error && 
            (error.message.includes("refresh token") || 
             error.message.includes("expired") ||
             error.message.includes("invalid"))) {
          console.warn("Refresh token is expired or invalid, logging out user");
          
          // Clear refresh interval
          if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
          }
          
          // Clear tokens
          tokensRef.current = {
            accessToken: null,
            refreshToken: null,
          };
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          
          // Update auth state
          setAuthState({
            isAuthenticated: false,
            accessToken: null,
            refreshToken: null,
            user: null,
            loading: false,
            error: "Session expired. Please log in again.",
          });
          
          // Try to call backend logout (best effort)
          try {
            await authService.logout();
          } catch (logoutError) {
            console.error("Error calling backend logout:", logoutError);
          }
        }
      }
    }, REFRESH_INTERVAL_MS);

    // Cleanup interval on unmount or when auth state changes
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [authState.isAuthenticated, authState.accessToken, authState.refreshToken]);

  /**
   * Handle user login
   * Store tokens and update auth state
   */
  const login = async (username: string, password: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const tokenResponse = await authService.login({ username, password });

      // Store tokens
      localStorage.setItem(ACCESS_TOKEN_KEY, tokenResponse.access_token);
      if (tokenResponse.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, tokenResponse.refresh_token);
      }

      // Decode user from token
      const user = authService.decodeToken(tokenResponse.access_token);

      // Update tokens ref
      tokensRef.current = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || null,
      };

      setAuthState({
        isAuthenticated: true,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || null,
        user,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";

      setAuthState({
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        user: null,
        loading: false,
        error: errorMessage,
      });

      throw error;
    }
  };

  /**
   * Handle user logout
   * Clear tokens and auth state
   */
  const logout = async () => {
    try {
      // Clear refresh interval if exists
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      // Call logout on backend
      await authService.logout();
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Clear tokens ref, storage and state
      tokensRef.current = {
        accessToken: null,
        refreshToken: null,
      };
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);

      setAuthState({
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        user: null,
        loading: false,
        error: null,
      });
    }
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    setAuthState((prev) => ({ ...prev, error: null }));
  };

  const value = useMemo(
    () => ({
      authState,
      login,
      logout,
      clearError,
      isLoading: authState.loading,
    }),
    [authState, login, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
