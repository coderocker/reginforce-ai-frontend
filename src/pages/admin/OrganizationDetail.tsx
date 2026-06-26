import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { identityService } from "../../services/identityService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BrandingFileUpload } from "../../components/branding/BrandingFileUpload";
import type { OrganizationUpdate } from "../../types/identity";
import { resolveApiAssetUrl } from "../../utils/roles";
import { validateFaviconFile, validateLogoFile } from "../../utils/brandingValidation";
import { OrgAdminsTab } from "./OrgAdminsTab";

type DetailTab = "details" | "org-admins";

export function OrganizationDetail() {
  const { orgId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [tab, setTab] = useState<DetailTab>("details");

  useEffect(() => {
    if (searchParams.get("edit") === "1") {
      setEditing(true);
    }
  }, [searchParams]);
  const [form, setForm] = useState<OrganizationUpdate>({});

  const { data: org, isLoading, error } = useQuery({
    queryKey: ["admin-organization", orgId],
    queryFn: () => identityService.getOrganization(orgId),
    enabled: Boolean(orgId),
  });

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name,
        domain: org.domain || "",
        description: org.description || "",
        app_display_name: org.app_display_name || "",
        app_tagline: org.app_tagline || "",
        max_users: org.max_users,
        is_active: org.is_active,
      });
    }
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: () => identityService.updateOrganization(orgId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organization", orgId] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setEditing(false);
    },
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) => identityService.uploadOrganizationLogo(orgId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organization", orgId] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
  });

  const faviconMutation = useMutation({
    mutationFn: (file: File) => identityService.uploadOrganizationFavicon(orgId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organization", orgId] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
  });

  if (isLoading) {
    return <p className="p-6 text-sm text-gray-500">Loading organization…</p>;
  }

  if (error || !org) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600 mb-4">Organization not found.</p>
        <Link to="/admin/organizations" className="text-sm text-emerald-700 underline">
          Back to organizations
        </Link>
      </div>
    );
  }

  return (
    <>
      <header className="border-b border-[#f1f2f3] px-10 py-3 flex justify-between items-center gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/admin/organizations")}
            className="text-xs text-gray-500 hover:text-gray-800 mb-1"
          >
            ← Organizations
          </button>
          <h2 className="text-lg font-bold text-[#131416]">{org.name}</h2>
          <p className="text-sm text-gray-500">{org.domain}</p>
        </div>
        <Button variant={editing ? "secondary" : "primary"} onClick={() => setEditing((v) => !v)}>
          {editing ? "Cancel edit" : "Edit organization"}
        </Button>
      </header>

      <div className="px-10 pt-4 flex gap-2 border-b border-[#f1f2f3]">
        {(
          [
            ["details", "Details"],
            ["org-admins", "Org admins"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              tab === id ? "border-emerald-600 text-emerald-700 font-medium" : "border-transparent text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-6 flex flex-col gap-6">
        {tab === "org-admins" && <OrgAdminsTab orgId={orgId} />}
        {tab === "details" && (
          <>
        <Card className="p-4">
          <h3 className="font-semibold mb-4">{editing ? "Edit details" : "Organization details"}</h3>

          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(
                [
                  ["name", "Organization name"],
                  ["domain", "Primary domain"],
                  ["app_display_name", "App display name"],
                  ["app_tagline", "App tagline"],
                  ["description", "Description"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-sm md:col-span-2">
                  <span className="text-gray-600">{label}</span>
                  <input
                    type="text"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={(form[key] as string) || ""}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </label>
              ))}
              <label className="text-sm">
                <span className="text-gray-600">Max users</span>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.max_users ?? org.max_users}
                  onChange={(e) => setForm({ ...form, max_users: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  checked={form.is_active ?? org.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Active
              </label>
              <div className="md:col-span-2">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate()}
                >
                  {updateMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
                {updateMutation.isError && (
                  <p className="text-sm text-red-600 mt-2">Failed to save organization.</p>
                )}
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="font-medium">{org.status}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Users</dt>
                <dd className="font-medium">
                  {org.current_users}/{org.max_users}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Admin email</dt>
                <dd className="font-medium">{org.admin_email || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Active</dt>
                <dd className="font-medium">{org.is_active ? "Yes" : "No"}</dd>
              </div>
              {org.app_display_name && (
                <div className="md:col-span-2">
                  <dt className="text-gray-500">Branding</dt>
                  <dd className="font-medium">
                    {org.app_display_name}
                    {org.app_tagline ? ` — ${org.app_tagline}` : ""}
                  </dd>
                </div>
              )}
              {org.description && (
                <div className="md:col-span-2">
                  <dt className="text-gray-500">Description</dt>
                  <dd>{org.description}</dd>
                </div>
              )}
            </dl>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Branding assets</h3>
          <div className="flex flex-wrap items-start gap-6 mb-4">
            {org.logo_url && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Current logo</p>
                <img
                  src={resolveApiAssetUrl(org.logo_url) || ""}
                  alt={`${org.name} logo`}
                  className="h-12 object-contain border rounded p-2 bg-white"
                />
              </div>
            )}
            {org.favicon_url && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Current favicon</p>
                <img
                  src={resolveApiAssetUrl(org.favicon_url) || ""}
                  alt={`${org.name} favicon`}
                  className="h-10 w-10 object-contain border rounded p-1 bg-white"
                />
              </div>
            )}
          </div>
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
          </>
        )}
      </div>
    </>
  );
}
