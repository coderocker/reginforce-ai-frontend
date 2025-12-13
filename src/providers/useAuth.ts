import { useContext } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthContextType } from "../types/auth";

/**
 * Hook to use auth context
 * Must be used within AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
