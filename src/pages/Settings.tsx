import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { identityService } from "../services/identityService";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { BrandingFileUpload } from "../components/branding/BrandingFileUpload";
import { PLUGIN_SCOPE_OPTIONS } from "../types/identity";
import { useAuth } from "../providers";
import { isOrgAdmin, isPlatformAdmin, resolveApiAssetUrl } from "../utils/roles";
import { validateFaviconFile, validateLogoFile } from "../utils/brandingValidation";
import { ConfirmDialog, DoubleConfirmDialog } from "../components/ui/ConfirmDialog";
import type { OrgUserPublic, OrgUserUpdate } from "../types/identity";
import { PROTECTED_SUPERADMIN_EMAIL } from "../constants/platformAdmin";

type SettingsTab = "integrations" | "users" | "branding";

export function Settings() {
  const { authState } = useAuth();
  const platformAdmin = isPlatformAdmin(authState.user);
  const showAdminSections = isOrgAdmin(authState.user);
  const [tab, setTab] = useState<SettingsTab>(platformAdmin ? "users" : "integrations");

  const tabs = platformAdmin
    ? ([
        ["users", "Users"],
        ["branding", "Branding"],
      ] as const)
    : showAdminSections
      ? ([
          ["integrations", "Integrations"],
          ["users", "Users"],
          ["branding", "Branding"],
        ] as const)
      : ([["integrations", "Integrations"]] as const);

  return (
    <>
      <header className="border-b border-[#f1f2f3] px-10 py-3">
        <h2 className="text-lg font-bold text-[#131416]">Settings</h2>
        <p className="text-sm text-gray-500">
          {platformAdmin ? "Platform administration — users and branding" : "Organization configuration and integrations"}
        </p>
        <div className="flex gap-2 mt-3">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                tab === id ? "bg-[#f1f2f3] font-medium" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <div className="p-6 flex flex-col gap-6">
        {tab === "integrations" && !platformAdmin && <PluginApiKeysSection />}
        {tab === "users" && showAdminSections && <OrgUsersSection platformAdmin={platformAdmin} />}
        {tab === "branding" && showAdminSections && <OrgBrandingSection />}
      </div>
    </>
  );
}

function PluginApiKeysSection() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["oss:vet", "oss:vet:ci"]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["plugin-api-keys"],
    queryFn: () => identityService.listPluginKeys(),
  });

  const createMutation = useMutation({
    mutationFn: () => identityService.createPluginKey({ name: name.trim(), scopes }),
    onSuccess: (created) => {
      setNewKey(created.api_key);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["plugin-api-keys"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => identityService.revokePluginKey(keyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plugin-api-keys"] }),
  });

  const toggleScope = (scopeId: string) => {
    setScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const copyKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-1">Plugin API keys</h3>
      <p className="text-sm text-gray-600 mb-4">
        Keys authenticate IDE extensions and CI pipelines via the{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">X-Plugin-Api-Key</code> header.
      </p>

      {newKey && (
        <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-900 mb-2">Copy your new key now.</p>
          <div className="flex gap-2 items-start">
            <code className="text-xs bg-white border border-amber-200 rounded p-2 flex-1 break-all">{newKey}</code>
            <Button variant="secondary" onClick={copyKey} className="shrink-0">
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <button type="button" className="text-xs text-amber-800 underline mt-2" onClick={() => setNewKey(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium mb-3">Create key</h4>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="GitHub CI, VS Code dev, etc."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
        />
        <div className="space-y-2 mb-4">
          {PLUGIN_SCOPE_OPTIONS.map((opt) => (
            <label key={opt.id} className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={scopes.includes(opt.id)}
                onChange={() => toggleScope(opt.id)}
                className="mt-1"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        <Button
          variant="primary"
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={!name.trim() || scopes.length === 0 || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? "Creating…" : "Create key"}
        </Button>
      </div>

      <h4 className="text-sm font-medium mb-3">Existing keys</h4>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {Boolean(error) && <p className="text-sm text-red-600">Could not load keys.</p>}
      <ul className="space-y-2">
        {(data?.items || []).map((key) => (
          <li key={key.id} className="flex justify-between items-center gap-3 p-3 rounded-lg border text-sm bg-gray-50">
            <div>
              <div className="font-medium">{key.name}</div>
              <div className="text-xs text-gray-500">{key.key_prefix}… · {key.scopes.join(", ")}</div>
            </div>
            {key.is_active && (
              <Button variant="secondary" onClick={() => revokeMutation.mutate(key.id)}>
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function OrgUsersSection({ platformAdmin }: { readonly platformAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    is_organization_admin: false,
    is_platform_admin: false,
  });
  const [viewUser, setViewUser] = useState<OrgUserPublic | null>(null);
  const [editUser, setEditUser] = useState<OrgUserPublic | null>(null);
  const [deleteUser, setDeleteUser] = useState<OrgUserPublic | null>(null);
  const [editForm, setEditForm] = useState<OrgUserUpdate>({});

  const { data, isLoading } = useQuery({
    queryKey: ["org-users"],
    queryFn: () => identityService.listOrgUsers(),
  });

  const maxPlatformAdmins = data?.max_platform_admins ?? 5;
  const platformAdminCount = data?.platform_admin_count ?? 0;
  const atPlatformAdminLimit = platformAdminCount >= maxPlatformAdmins;

  const createMutation = useMutation({
    mutationFn: () => identityService.createOrgUser(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-users"] });
      setForm({
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        is_organization_admin: false,
        is_platform_admin: false,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => identityService.updateOrgUser(editUser!.id, editForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-users"] });
      setEditUser(null);
      setEditForm({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => identityService.deleteOrgUser(deleteUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-users"] });
      setDeleteUser(null);
    },
  });

  const openEdit = (user: OrgUserPublic) => {
    setEditUser(user);
    setEditForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      is_active: user.is_active,
      is_organization_admin: user.is_organization_admin,
      is_platform_admin: user.is_platform_admin,
    });
  };

  const canDeleteUser = (user: OrgUserPublic) => {
    if (user.is_deletable === false) return false;
    if (!platformAdmin && user.is_organization_admin) return false;
    return true;
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-1">
        {platformAdmin ? "Platform team users" : "Organization users"}
      </h3>
      {platformAdmin && (
        <p className="text-sm text-gray-500 mb-4">
          Platform admins: {platformAdminCount}/{maxPlatformAdmins}. Use @comply-lens.com emails for platform admins.
          {` ${PROTECTED_SUPERADMIN_EMAIL} is protected and cannot be deleted; admin roles are locked.`}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {(
          [
            ["email", "Email"],
            ["first_name", "First name"],
            ["last_name", "Last name"],
            ["password", "Temporary password"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-sm">
            <span className="text-gray-600">{label}</span>
            <input
              type={key === "password" ? "password" : "text"}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.is_organization_admin}
            onChange={(e) => setForm({ ...form, is_organization_admin: e.target.checked })}
          />
          Organization admin
        </label>
        {platformAdmin && (
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.is_platform_admin}
              disabled={!form.is_platform_admin && atPlatformAdminLimit}
              onChange={(e) => setForm({ ...form, is_platform_admin: e.target.checked })}
            />
            Platform admin {atPlatformAdminLimit && !form.is_platform_admin ? "(limit reached)" : ""}
          </label>
        )}
      </div>
      <Button
        className="mb-6 bg-emerald-600 hover:bg-emerald-700"
        disabled={createMutation.isPending || !form.email || !form.password}
        onClick={() => createMutation.mutate()}
      >
        Add user
      </Button>
      {createMutation.isError && (
        <p className="text-sm text-red-600 mb-4">Could not create user. Check limits and email domain.</p>
      )}

      {isLoading && <p className="text-sm text-gray-500">Loading users…</p>}
      <ul className="space-y-2">
        {(data?.items || []).map((user) => (
          <li key={user.id} className="flex justify-between items-center p-3 border rounded-lg text-sm gap-4">
            <div>
              <div className="font-medium">
                {user.first_name} {user.last_name} ({user.email})
              </div>
              <div className="text-xs text-gray-500">
                {user.is_platform_admin && "Platform admin · "}
                {user.is_organization_admin ? "Org admin" : "User"} · {user.is_active ? "Active" : "Disabled"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setViewUser(user)}>
                View
              </Button>
              <Button variant="primary" onClick={() => openEdit(user)}>
                Edit
              </Button>
              <Button
                variant="secondary"
                className="text-red-600 border-red-200"
                disabled={!canDeleteUser(user)}
                onClick={() => setDeleteUser(user)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {viewUser && (
        <ConfirmDialog
          open
          title="User details"
          message={`${viewUser.first_name} ${viewUser.last_name} · ${viewUser.email} · ${
            viewUser.is_platform_admin ? "Platform admin · " : ""
          }${viewUser.is_organization_admin ? "Org admin" : "User"} · ${viewUser.is_active ? "Active" : "Disabled"}`}
          confirmLabel="Close"
          onConfirm={() => setViewUser(null)}
          onCancel={() => setViewUser(null)}
        />
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold">Edit user</h3>
            <p className="text-xs text-gray-500 mt-1">{editUser.email}</p>
            <div className="grid gap-3 mt-4">
              <label className="text-sm">
                First name
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={editForm.first_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Last name
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={editForm.last_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              </label>
              <label className="text-sm">
                New password (optional)
                <input
                  type="password"
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value || undefined })}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.is_active ?? editUser.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                />
                Active
              </label>
              {editUser.is_role_editable !== false && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editForm.is_organization_admin ?? editUser.is_organization_admin}
                      onChange={(e) =>
                        setEditForm({ ...editForm, is_organization_admin: e.target.checked })
                      }
                    />
                    Organization admin
                  </label>
                  {platformAdmin && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editForm.is_platform_admin ?? editUser.is_platform_admin}
                        disabled={
                          !(editForm.is_platform_admin ?? editUser.is_platform_admin) && atPlatformAdminLimit
                        }
                        onChange={(e) =>
                          setEditForm({ ...editForm, is_platform_admin: e.target.checked })
                        }
                      />
                      Platform admin
                    </label>
                  )}
                </>
              )}
              {editUser.is_role_editable === false && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  Admin roles are locked for the seeded platform superadmin.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate()}
              >
                Save
              </Button>
            </div>
            {updateMutation.isError && (
              <p className="text-sm text-red-600 mt-2">Could not save user changes.</p>
            )}
          </div>
        </div>
      )}

      <DoubleConfirmDialog
        open={Boolean(deleteUser)}
        title="Delete user?"
        message={`Permanently remove ${deleteUser?.email}?`}
        confirmText={deleteUser?.email || "DELETE"}
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteUser(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </Card>
  );
}

function OrgBrandingSection() {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");

  const { data: org } = useQuery({
    queryKey: ["my-organization"],
    queryFn: () => identityService.getMyOrganization(),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      identityService.updateMyOrganization({
        app_display_name: displayName || undefined,
        app_tagline: tagline || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-organization"] });
      queryClient.invalidateQueries({ queryKey: ["org-branding"] });
    },
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) => identityService.uploadMyLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-organization"] });
      queryClient.invalidateQueries({ queryKey: ["org-branding"] });
    },
  });

  const faviconMutation = useMutation({
    mutationFn: (file: File) => identityService.uploadMyFavicon(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-organization"] });
      queryClient.invalidateQueries({ queryKey: ["org-branding"] });
    },
  });

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Organization branding</h3>
      <p className="text-sm text-gray-600 mb-4">
        Logo and favicon are stored in object storage and shown to all users in your organization.
      </p>

      {org?.logo_url && (
        <img src={resolveApiAssetUrl(org.logo_url) || ""} alt="Logo preview" className="h-12 mb-4 object-contain" />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <label className="text-sm">
          App display name
          <input
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            defaultValue={org?.app_display_name || org?.name || ""}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Tagline
          <input
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            defaultValue={org?.app_tagline || ""}
            onChange={(e) => setTagline(e.target.value)}
          />
        </label>
      </div>
      <Button className="mb-4" variant="secondary" onClick={() => updateMutation.mutate()}>
        Save text branding
      </Button>

      <div className="flex flex-wrap gap-8">
        <BrandingFileUpload
          label="Upload logo"
          hint="PNG, JPG, WebP, or SVG · ~3:1 ratio (e.g. 240×80px) · 120–800px wide · max 2 MB"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          disabled={logoMutation.isPending}
          validate={validateLogoFile}
          onValidatedFile={(file) => logoMutation.mutate(file)}
        />
        <BrandingFileUpload
          label="Upload favicon"
          hint="PNG, ICO, or WebP · square 32–512px (e.g. 64×64) · max 512 KB"
          accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/webp,image/jpeg,.ico"
          disabled={faviconMutation.isPending}
          validate={validateFaviconFile}
          onValidatedFile={(file) => faviconMutation.mutate(file)}
        />
      </div>
      {(logoMutation.isError || faviconMutation.isError) && (
        <p className="text-sm text-red-600 mt-3">Upload failed. Check file size and dimensions.</p>
      )}
    </Card>
  );
}
