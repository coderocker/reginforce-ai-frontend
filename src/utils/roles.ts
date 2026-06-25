import type { AuthUser } from "../types/auth";

export function userHasRole(user: AuthUser | null | undefined, role: string): boolean {
  return Boolean(user?.roles?.includes(role));
}

export function isPlatformAdmin(user: AuthUser | null | undefined): boolean {
  return userHasRole(user, "platform_admin");
}

export function isOrgAdmin(user: AuthUser | null | undefined): boolean {
  return (
    userHasRole(user, "organization_admin") ||
    userHasRole(user, "admin") ||
    isPlatformAdmin(user)
  );
}

export function getDefaultAppPath(user: AuthUser | null | undefined): string {
  return isPlatformAdmin(user) ? "/admin/organizations" : "/dashboard";
}

export function isPlatformAdminOnlyRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/organizations") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings")
  );
}

export function resolveApiAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
