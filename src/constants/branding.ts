/** Product branding — override via Vite env at build time (see Dockerfile.demo). */
export const APP_NAME = import.meta.env.VITE_APP_NAME || "Comply Lens";
export const APP_SLUG = import.meta.env.VITE_APP_SLUG || "comply-lens";
export const APP_TAGLINE =
  import.meta.env.VITE_APP_TAGLINE || "Compliance & OSS Management";
export const APP_DOCUMENT_TITLE =
  import.meta.env.VITE_APP_DOCUMENT_TITLE || APP_NAME;
/** When set, shown in login sidebar instead of text-only title */
export const APP_LOGO = import.meta.env.VITE_APP_LOGO || "";
export const APP_FAVICON = import.meta.env.VITE_APP_FAVICON || "/vite.svg";
