import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { APP_NAME, APP_TAGLINE } from "../constants/branding";
import { useAuth } from "../providers";
import { identityService } from "../services/identityService";
import { resolveApiAssetUrl } from "../utils/roles";

export function useOrgBranding() {
  const { authState } = useAuth();
  const enabled = authState.isAuthenticated;

  const query = useQuery({
    queryKey: ["org-branding"],
    queryFn: () => identityService.getMyBranding(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const branding = query.data;
  const displayName = branding?.app_display_name || branding?.name || APP_NAME;
  const tagline = branding?.app_tagline || APP_TAGLINE;
  const logoUrl = resolveApiAssetUrl(branding?.logo_url);
  const faviconUrl = resolveApiAssetUrl(branding?.favicon_url);

  useEffect(() => {
    if (!enabled || !branding) return;
    document.title = displayName;
    const link =
      document.querySelector<HTMLLinkElement>("link[rel='icon']") ??
      document.head.appendChild(Object.assign(document.createElement("link"), { rel: "icon" }));
    if (faviconUrl) {
      link.href = faviconUrl;
    }
  }, [enabled, branding, displayName, faviconUrl]);

  return { ...query, displayName, tagline, logoUrl, faviconUrl };
}
