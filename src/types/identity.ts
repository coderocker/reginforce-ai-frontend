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

export const PLUGIN_SCOPE_OPTIONS = [
  { id: "oss:vet", label: "Package vetting (IDE)", description: "Single-package vet API" },
  { id: "oss:vet:ci", label: "CI / shift-left", description: "Manifest diff vetting in pipelines" },
  { id: "oss:vet:llm", label: "LLM summaries", description: "Optional AI-generated summaries in vet responses" },
] as const;
