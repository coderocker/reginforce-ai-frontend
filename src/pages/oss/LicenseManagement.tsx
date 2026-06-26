import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { ModuleHelpPanel } from "../../components/oss/ModuleHelpPanel";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LICENSE_MANAGEMENT_HELP } from "../../constants/ossModuleHelp";

type LicenseType = "permissive" | "copyleft" | "weak_copyleft" | "proprietary" | "public_domain" | "unknown";

interface License {
  id: number;
  organization_id: string | null;
  spdx_id: string;
  name: string;
  license_type: LicenseType;
  description?: string;
  full_text?: string;
  requires_attribution: boolean;
  requires_source_disclosure: boolean;
  allows_commercial_use: boolean;
  allows_modification: boolean;
  allows_distribution: boolean;
  compatible_licenses?: string;
  incompatible_licenses?: string;
  version?: string;
  is_osi_approved: boolean;
  is_fsf_approved: boolean;
  is_deprecated: boolean;
  is_global: boolean;
  official_url?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface OSSLicenseList {
  items: License[];
  total: number;
}

interface CreateLicenseRequest {
  spdx_id: string;
  name: string;
  license_type: LicenseType;
  description?: string;
  full_text?: string;
  requires_attribution?: boolean;
  requires_source_disclosure?: boolean;
  allows_commercial_use?: boolean;
  allows_modification?: boolean;
  allows_distribution?: boolean;
  compatible_licenses?: string;
  incompatible_licenses?: string;
  version?: string;
  is_osi_approved?: boolean;
  is_fsf_approved?: boolean;
  official_url?: string;
  is_global?: boolean;
}

interface UpdateLicenseRequest {
  name?: string;
  description?: string;
  full_text?: string;
  requires_attribution?: boolean;
  requires_source_disclosure?: boolean;
  allows_commercial_use?: boolean;
  allows_modification?: boolean;
  allows_distribution?: boolean;
  compatible_licenses?: string;
  incompatible_licenses?: string;
  is_deprecated?: boolean;
  official_url?: string;
}

export function LicenseManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateLicenseRequest>({
    spdx_id: "",
    name: "",
    license_type: "unknown",
    description: "",
    is_osi_approved: false,
    is_fsf_approved: false,
  });
  const queryClient = useQueryClient();

  // Fetch licenses
  const {
    data: licenseList,
    isLoading,
    error,
  } = useQuery<OSSLicenseList>({
    queryKey: ["licenses"],
    queryFn: async () => {
      const response = await apiClient.get<OSSLicenseList>("/api/oss/licenses", {
        params: { include_global: true },
      });
      return response.data;
    },
  });

  const licenses = licenseList?.items || [];

  // Create license mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateLicenseRequest) => {
      const response = await apiClient.post<License>("/api/oss/licenses", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      resetForm();
      setShowCreateForm(false);
    },
  });

  // Update license mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateLicenseRequest) => {
      const response = await apiClient.patch<License>(
        `/api/oss/licenses/${editingId}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      resetForm();
      setEditingId(null);
    },
  });

  // Delete license mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/oss/licenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
    },
  });

  const resetForm = () => {
    setFormData({
      spdx_id: "",
      name: "",
      license_type: "unknown",
      description: "",
      is_osi_approved: false,
      is_fsf_approved: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.spdx_id || !formData.name || !formData.license_type) {
      alert("Please fill in required fields: SPDX ID, Name, and License Type");
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        name: formData.name,
        description: formData.description,
        full_text: formData.full_text,
        is_deprecated: false,
        official_url: formData.official_url,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (license: License) => {
    setFormData({
      spdx_id: license.spdx_id,
      name: license.name,
      license_type: license.license_type,
      description: license.description,
      full_text: license.full_text,
      is_osi_approved: license.is_osi_approved,
      is_fsf_approved: license.is_fsf_approved,
      official_url: license.official_url,
    });
    setEditingId(license.id);
    setShowCreateForm(true);
  };

  const handleCancel = () => {
    resetForm();
    setEditingId(null);
    setShowCreateForm(false);
  };

  const getCategoryBadgeColor = (type: LicenseType) => {
    switch (type) {
      case "permissive":
        return "bg-green-100 text-green-800";
      case "copyleft":
        return "bg-blue-100 text-blue-800";
      case "weak_copyleft":
        return "bg-cyan-100 text-cyan-800";
      case "proprietary":
        return "bg-red-100 text-red-800";
      case "public_domain":
        return "bg-purple-100 text-purple-800";
      case "unknown":
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">License Management</h1>
          <p className="text-gray-600 mt-1">
            Create, list, and update software licenses
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Add License
        </Button>
      </div>

      <ModuleHelpPanel
        title="About License Management"
        summary={LICENSE_MANAGEMENT_HELP.summary}
        steps={LICENSE_MANAGEMENT_HELP.steps}
        bullets={LICENSE_MANAGEMENT_HELP.bullets}
        legend={LICENSE_MANAGEMENT_HELP.legend}
      />

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="p-6 border border-blue-200 bg-blue-50">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit License" : "Create New License"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="spdx_id" className="block text-sm font-medium text-gray-700 mb-1">
                  SPDX ID *
                </label>
                <input
                  id="spdx_id"
                  type="text"
                  value={formData.spdx_id}
                  onChange={(e) =>
                    setFormData({ ...formData, spdx_id: e.target.value })
                  }
                  required
                  disabled={!!editingId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="e.g., MIT"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  License Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., MIT License"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="License description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="license_type" className="block text-sm font-medium text-gray-700 mb-1">
                  License Type *
                </label>
                <select
                  id="license_type"
                  value={formData.license_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      license_type: e.target.value as LicenseType,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="permissive">Permissive</option>
                  <option value="copyleft">Copyleft</option>
                  <option value="weak_copyleft">Weak Copyleft</option>
                  <option value="proprietary">Proprietary</option>
                  <option value="public_domain">Public Domain</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label htmlFor="official_url" className="block text-sm font-medium text-gray-700 mb-1">
                  Official URL
                </label>
                <input
                  id="official_url"
                  type="url"
                  value={formData.official_url || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, official_url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/license"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_osi_approved || false}
                  onChange={(e) =>
                    setFormData({ ...formData, is_osi_approved: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  OSI Approved
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_fsf_approved || false}
                  onChange={(e) =>
                    setFormData({ ...formData, is_fsf_approved: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  FSF Approved
                </span>
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {editingId ? "Update License" : "Create License"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>

            {createMutation.error && (
              <p className="text-red-600 text-sm">
                Error: {createMutation.error instanceof Error ? createMutation.error.message : "Unknown error"}
              </p>
            )}
            {updateMutation.error && (
              <p className="text-red-600 text-sm">
                Error: {updateMutation.error instanceof Error ? updateMutation.error.message : "Unknown error"}
              </p>
            )}
          </form>
        </Card>
      )}

      {/* Licenses List */}
      <Card>
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">Loading licenses...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            Error loading licenses: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        ) : licenses.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No licenses found. Create one to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    SPDX ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Approvals
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((license) => (
                  <tr key={license.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      <div>
                        <p className="font-medium">{license.name}</p>
                        {license.description && (
                          <p className="text-gray-600 text-xs">{license.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 font-mono">
                      {license.spdx_id}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(
                          license.license_type
                        )}`}
                      >
                        {license.license_type
                          .split("_")
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm space-x-1">
                      {license.is_osi_approved && (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          OSI
                        </span>
                      )}
                      {license.is_fsf_approved && (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          FSF
                        </span>
                      )}
                      {license.is_deprecated && (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Deprecated
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(license)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(license.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-900 font-medium disabled:text-gray-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-gray-600 text-sm">Total Licenses</p>
          <p className="text-3xl font-bold text-gray-900">{licenses.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-gray-600 text-sm">OSI Approved</p>
          <p className="text-3xl font-bold text-green-600">
            {licenses.filter((l) => l.is_osi_approved).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-gray-600 text-sm">Deprecated</p>
          <p className="text-3xl font-bold text-red-600">
            {licenses.filter((l) => l.is_deprecated).length}
          </p>
        </Card>
      </div>
    </div>
  );
}
