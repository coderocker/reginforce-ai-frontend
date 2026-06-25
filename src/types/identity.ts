export interface PluginApiKeyPublic {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
  is_active: boolean;
}

export interface PluginApiKeyCreated extends PluginApiKeyPublic {
  api_key: string;
}

export interface PluginApiKeyList {
  items: PluginApiKeyPublic[];
  total: number;
}

export interface PluginApiKeyCreate {
  name: string;
  scopes: string[];
}

export interface OrganizationPublic {
  id: string;
  name: string;
  display_name?: string | null;
  domain?: string | null;
  description?: string | null;
  status: string;
  admin_email?: string | null;
  app_display_name?: string | null;
  app_tagline?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  current_users: number;
  max_users: number;
  is_active: boolean;
  created_at: string;
}

export interface OrganizationList {
  items: OrganizationPublic[];
  total: number;
}

export interface OrganizationCreate {
  name: string;
  domain: string;
  description?: string;
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_password: string;
  app_display_name?: string;
  app_tagline?: string;
}

export interface OrganizationUpdate {
  name?: string;
  description?: string;
  domain?: string;
  app_display_name?: string;
  app_tagline?: string;
  max_users?: number;
  is_active?: boolean;
}

export interface OrganizationBranding {
  organization_id: string;
  name: string;
  app_display_name?: string | null;
  app_tagline?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
}

export interface OrgUserPublic {
  id: string;
  email: string;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  roles: string[];
  is_active: boolean;
  is_organization_admin: boolean;
  is_platform_admin: boolean;
  is_role_editable?: boolean;
  is_deletable?: boolean;
}

export interface OrgUserList {
  items: OrgUserPublic[];
  total: number;
  platform_admin_count?: number;
  max_platform_admins?: number;
}

export interface OrgUserCreate {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  is_organization_admin?: boolean;
  is_platform_admin?: boolean;
}

export interface OrgUserUpdate {
  first_name?: string;
  last_name?: string;
  is_organization_admin?: boolean;
  is_platform_admin?: boolean;
  is_active?: boolean;
  password?: string;
}

export interface OrgAdminCreate {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface OrgAdminUpdate {
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  password?: string;
}

export const PLUGIN_SCOPE_OPTIONS = [
  { id: "oss:vet", label: "Package vetting (IDE)", description: "Single-package vet API" },
  { id: "oss:vet:ci", label: "CI / shift-left", description: "Manifest diff vetting in pipelines" },
  { id: "oss:vet:llm", label: "LLM summaries", description: "Optional AI-generated summaries in vet responses" },
] as const;
