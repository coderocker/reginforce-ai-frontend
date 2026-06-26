import { apiClient, rawClient } from "../api/client";
import type {
  OrganizationBranding,
  OrganizationCreate,
  OrganizationList,
  OrganizationPublic,
  OrganizationUpdate,
  OrgAdminCreate,
  OrgAdminUpdate,
  OrgUserCreate,
  OrgUserList,
  OrgUserPublic,
  OrgUserUpdate,
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

  // --- Org admin ---
  async getMyOrganization(): Promise<OrganizationPublic> {
    const response = await apiClient.get<OrganizationPublic>("/api/identity/org/me");
    return response.data;
  }

  async updateMyOrganization(data: OrganizationUpdate): Promise<OrganizationPublic> {
    const response = await apiClient.patch<OrganizationPublic>("/api/identity/org/me", data);
    return response.data;
  }

  async listOrgUsers(): Promise<OrgUserList> {
    const response = await apiClient.get<OrgUserList>("/api/identity/org/users");
    return response.data;
  }

  async createOrgUser(data: OrgUserCreate): Promise<OrgUserPublic> {
    const response = await apiClient.post<OrgUserPublic>("/api/identity/org/users", data);
    return response.data;
  }

  async updateOrgUser(userId: string, data: OrgUserUpdate): Promise<OrgUserPublic> {
    const response = await apiClient.patch<OrgUserPublic>(`/api/identity/org/users/${userId}`, data);
    return response.data;
  }

  async deleteOrgUser(userId: string): Promise<void> {
    await apiClient.delete(`/api/identity/org/users/${userId}`);
  }

  async uploadMyLogo(file: File): Promise<OrganizationPublic> {
    const form = new FormData();
    form.append("file", file);
    const response = await apiClient.post<OrganizationPublic>("/api/identity/org/me/logo", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async uploadMyFavicon(file: File): Promise<OrganizationPublic> {
    const form = new FormData();
    form.append("file", file);
    const response = await apiClient.post<OrganizationPublic>("/api/identity/org/me/favicon", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async getMyBranding(): Promise<OrganizationBranding> {
    const response = await apiClient.get<OrganizationBranding>("/api/public/branding/me");
    return response.data;
  }

  async lookupBrandingByEmail(email: string): Promise<OrganizationBranding | null> {
    try {
      const response = await rawClient.get<OrganizationBranding>("/api/public/branding/lookup", {
        params: { email },
      });
      return response.data;
    } catch {
      return null;
    }
  }

  // --- Platform admin ---
  async listOrganizations(): Promise<OrganizationList> {
    const response = await apiClient.get<OrganizationList>("/api/admin/organizations");
    return response.data;
  }

  async getOrganization(orgId: string): Promise<OrganizationPublic> {
    const response = await apiClient.get<OrganizationPublic>(`/api/admin/organizations/${orgId}`);
    return response.data;
  }

  async createOrganization(data: OrganizationCreate): Promise<OrganizationPublic> {
    const response = await apiClient.post<OrganizationPublic>("/api/admin/organizations", data);
    return response.data;
  }

  async updateOrganization(orgId: string, data: OrganizationUpdate): Promise<OrganizationPublic> {
    const response = await apiClient.patch<OrganizationPublic>(`/api/admin/organizations/${orgId}`, data);
    return response.data;
  }

  async deleteOrganization(orgId: string): Promise<void> {
    await apiClient.delete(`/api/admin/organizations/${orgId}`);
  }

  async listOrgAdmins(orgId: string): Promise<OrgUserList> {
    const response = await apiClient.get<OrgUserList>(`/api/admin/organizations/${orgId}/org-admins`);
    return response.data;
  }

  async createOrgAdmin(orgId: string, data: OrgAdminCreate): Promise<OrgUserPublic> {
    const response = await apiClient.post<OrgUserPublic>(`/api/admin/organizations/${orgId}/org-admins`, data);
    return response.data;
  }

  async updateOrgAdmin(orgId: string, userId: string, data: OrgAdminUpdate): Promise<OrgUserPublic> {
    const response = await apiClient.patch<OrgUserPublic>(
      `/api/admin/organizations/${orgId}/org-admins/${userId}`,
      data
    );
    return response.data;
  }

  async deleteOrgAdmin(orgId: string, userId: string): Promise<void> {
    await apiClient.delete(`/api/admin/organizations/${orgId}/org-admins/${userId}`);
  }

  async uploadOrganizationLogo(orgId: string, file: File): Promise<OrganizationPublic> {
    const form = new FormData();
    form.append("file", file);
    const response = await apiClient.post<OrganizationPublic>(
      `/api/admin/organizations/${orgId}/logo`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  }

  async uploadOrganizationFavicon(orgId: string, file: File): Promise<OrganizationPublic> {
    const form = new FormData();
    form.append("file", file);
    const response = await apiClient.post<OrganizationPublic>(
      `/api/admin/organizations/${orgId}/favicon`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  }
}

export const identityService = new IdentityService();
