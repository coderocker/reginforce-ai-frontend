import { apiClient } from "../api/client";
import type {
  PluginApiKeyCreate,
  PluginApiKeyCreated,
  PluginApiKeyList,
  PluginApiKeyPublic,
} from "../types/identity";

class IdentityService {
  async listPluginKeys(): Promise<PluginApiKeyList> {
    const response = await apiClient.get<PluginApiKeyList>("/api/identity/plugin-keys");
    return response.data;
  }

  async createPluginKey(data: PluginApiKeyCreate): Promise<PluginApiKeyCreated> {
    const response = await apiClient.post<PluginApiKeyCreated>("/api/identity/plugin-keys", data);
    return response.data;
  }

  async revokePluginKey(keyId: string): Promise<PluginApiKeyPublic> {
    const response = await apiClient.delete<PluginApiKeyPublic>(`/api/identity/plugin-keys/${keyId}`);
    return response.data;
  }
}

export const identityService = new IdentityService();
