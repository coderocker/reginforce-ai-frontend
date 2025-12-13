import axios, { AxiosError } from "axios";
import authService from "../services/authService";

// Use VITE environment variable for API URL, fallback to localhost for development
const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Raw axios client without interceptors
 * Used for auth endpoints that shouldn't have Bearer token
 */
export const rawClient = axios.create({
  baseURL: apiBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Track if we're currently refreshing token to avoid multiple refresh requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

/**
 * Handle token refresh and retry
 */
const handleTokenRefresh = async (): Promise<string | null> => {
  try {
    const refreshToken = localStorage.getItem("comply_lens_refresh_token");

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const tokenResponse = await authService.refreshToken(refreshToken);

    // Store new tokens
    localStorage.setItem("comply_lens_access_token", tokenResponse.access_token);
    if (tokenResponse.refresh_token) {
      localStorage.setItem("comply_lens_refresh_token", tokenResponse.refresh_token);
    }

    return tokenResponse.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    throw new Error("Token refresh failed");
  }
};

/**
 * Redirect to login page
 */
const redirectToLogin = () => {
  localStorage.removeItem("comply_lens_access_token");
  localStorage.removeItem("comply_lens_refresh_token");
  globalThis.window.location.href = "/login";
};

// Add request interceptor - inject auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("comply_lens_access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor - handle 401 with token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Prevent infinite loops
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject: (err: Error) => {
              reject(err);
            },
          });
        });
      }

      isRefreshing = true;
      originalRequest._retry = true;

      try {
        const newToken = await handleTokenRefresh();

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        redirectToLogin();
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    if (error.response?.status === 401) {
      redirectToLogin();
    }

    // Log errors in development
    if (import.meta.env.DEV) {
      if (error.response) {
        console.error("API Error:", error.response.status, error.response.data);
      } else if (error.request) {
        console.error("Network Error:", error.message);
      } else {
        console.error("Error:", error.message);
      }
    }

    throw error;
  }
);
