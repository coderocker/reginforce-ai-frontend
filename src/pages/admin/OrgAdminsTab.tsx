import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { identityService } from "../../services/identityService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog, DoubleConfirmDialog } from "../../components/ui/ConfirmDialog";
import type { OrgAdminCreate, OrgAdminUpdate, OrgUserPublic } from "../../types/identity";

interface OrgAdminsTabProps {
  readonly orgId: string;
}

export function OrgAdminsTab({ orgId }: OrgAdminsTabProps) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<OrgUserPublic | null>(null);
  const [viewUser, setViewUser] = useState<OrgUserPublic | null>(null);
  const [deleteUser, setDeleteUser] = useState<OrgUserPublic | null>(null);
  const [createForm, setCreateForm] = useState<OrgAdminCreate>({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [editForm, setEditForm] = useState<OrgAdminUpdate>({});

  const { data, isLoading } = useQuery({
    queryKey: ["org-admins", orgId],
    queryFn: () => identityService.listOrgAdmins(orgId),
  });

  const createMutation = useMutation({
    mutationFn: () => identityService.createOrgAdmin(orgId, createForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-admins", orgId] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setShowCreate(false);
      setCreateForm({ email: "", first_name: "", last_name: "", password: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => identityService.updateOrgAdmin(orgId, editUser!.id, editForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-admins", orgId] });
      setEditUser(null);
      setEditForm({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => identityService.deleteOrgAdmin(orgId, deleteUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-admins", orgId] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setDeleteUser(null);
    },
  });

  const openEdit = (user: OrgUserPublic) => {
    setEditUser(user);
    setEditForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      is_active: user.is_active,
    });
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold">Organization admins</h3>
          <p className="text-sm text-gray-500">Each organization must keep at least one org admin.</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "Add org admin"}
        </Button>
      </div>

      {showCreate && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 border rounded-lg p-4 bg-gray-50">
          {(
            [
              ["email", "Email"],
              ["first_name", "First name"],
              ["last_name", "Last name"],
              ["password", "Password"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              <span className="text-gray-600">{label}</span>
              <input
                type={key === "password" ? "password" : "text"}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                value={createForm[key]}
                onChange={(e) => setCreateForm({ ...createForm, [key]: e.target.value })}
              />
            </label>
          ))}
          <div className="md:col-span-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={createMutation.isPending || !createForm.email || !createForm.password}
              onClick={() => createMutation.mutate()}
            >
              Create org admin
            </Button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-500">Loading org admins…</p>}
      <ul className="space-y-2">
        {(data?.items || []).map((user) => (
          <li key={user.id} className="flex justify-between items-center gap-3 p-3 border rounded-lg text-sm">
            <div>
              <div className="font-medium">
                {user.first_name} {user.last_name} ({user.email})
              </div>
              <div className="text-xs text-gray-500">{user.is_active ? "Active" : "Disabled"}</div>
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
                disabled={!user.is_deletable || (data?.items?.length ?? 0) <= 1}
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
          title="Org admin details"
          message={`${viewUser.first_name} ${viewUser.last_name} · ${viewUser.email} · ${viewUser.is_active ? "Active" : "Disabled"}`}
          confirmLabel="Close"
          onConfirm={() => setViewUser(null)}
          onCancel={() => setViewUser(null)}
        />
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold">Edit org admin</h3>
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
          </div>
        </div>
      )}

      <DoubleConfirmDialog
        open={Boolean(deleteUser)}
        title={`Delete org admin?`}
        message={`This will permanently remove ${deleteUser?.email}. This cannot be undone.`}
        confirmText={deleteUser?.email || "DELETE"}
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteUser(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </Card>
  );
}
