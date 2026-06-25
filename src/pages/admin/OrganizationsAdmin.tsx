import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { identityService } from "../../services/identityService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import type { OrganizationCreate } from "../../types/identity";
import { resolveApiAssetUrl } from "../../utils/roles";
import { DoubleConfirmDialog } from "../../components/ui/ConfirmDialog";

export function OrganizationsAdmin() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState<OrganizationCreate>({
    name: "",
    domain: "",
    admin_email: "",
    admin_first_name: "",
    admin_last_name: "",
    admin_password: "",
    app_display_name: "",
    app_tagline: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: () => identityService.listOrganizations(),
  });

  const createMutation = useMutation({
    mutationFn: () => identityService.createOrganization(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setShowCreate(false);
      setForm({
        name: "",
        domain: "",
        admin_email: "",
        admin_first_name: "",
        admin_last_name: "",
        admin_password: "",
        app_display_name: "",
        app_tagline: "",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (orgId: string) => identityService.deleteOrganization(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setDeleteTarget(null);
    },
  });

  return (
    <>
      <header className="border-b border-[#f1f2f3] px-10 py-3 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-[#131416]">Organizations</h2>
          <p className="text-sm text-gray-500">Platform admin — create and manage tenants</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "New organization"}
        </Button>
      </header>

      <div className="p-6 flex flex-col gap-6">
        {showCreate && (
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Create organization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(
                [
                  ["name", "Organization name"],
                  ["domain", "Primary domain (e.g. a10networks.com)"],
                  ["admin_email", "Admin email"],
                  ["admin_first_name", "Admin first name"],
                  ["admin_last_name", "Admin last name"],
                  ["admin_password", "Admin password"],
                  ["app_display_name", "App display name (optional)"],
                  ["app_tagline", "App tagline (optional)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-sm">
                  <span className="text-gray-600">{label}</span>
                  <input
                    type={key === "admin_password" ? "password" : "text"}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <Button
              className="mt-4 bg-emerald-600 hover:bg-emerald-700"
              disabled={createMutation.isPending || !form.name || !form.domain || !form.admin_email}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating…" : "Create organization"}
            </Button>
            {createMutation.isError && (
              <p className="text-sm text-red-600 mt-2">Failed to create organization.</p>
            )}
          </Card>
        )}

        {isLoading && <p className="text-sm text-gray-500">Loading organizations…</p>}
        {Boolean(error) && (
          <p className="text-sm text-red-600">
            Could not load organizations. Check that the backend Keycloak service account has manage-realm
            permissions, then refresh.
          </p>
        )}
        {!isLoading && !error && (data?.items?.length ?? 0) === 0 && (
          <p className="text-sm text-gray-500">No organizations found.</p>
        )}

        <div className="grid gap-4">
          {(data?.items || []).map((org) => (
            <Card key={org.id} className="p-4">
              <div className="flex flex-wrap justify-between gap-4 items-start">
                <div className="flex gap-4 items-start">
                  {org.logo_url && (
                    <img
                      src={resolveApiAssetUrl(org.logo_url) || ""}
                      alt={`${org.name} logo`}
                      className="h-10 object-contain"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{org.name}</h3>
                    <p className="text-sm text-gray-500">{org.domain}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {org.current_users}/{org.max_users} users · {org.status}
                      {!org.is_active && " · Inactive"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/admin/organizations/${org.id}`}>
                    <Button variant="secondary">View</Button>
                  </Link>
                  <Link to={`/admin/organizations/${org.id}?edit=1`}>
                    <Button variant="primary">Edit</Button>
                  </Link>
                  <Button
                    variant="secondary"
                    className="text-red-600 border-red-200"
                    onClick={() => setDeleteTarget({ id: org.id, name: org.name })}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <DoubleConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name}?`}
        message="All organization data and users will be removed from Keycloak. This action is permanent."
        confirmText={deleteTarget?.name || "DELETE"}
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
