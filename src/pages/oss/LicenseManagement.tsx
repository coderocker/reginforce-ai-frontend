import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

interface License {
  id: number;
  name: string;
  identifier: string;
  description?: string;
  category: "permissive" | "copyleft" | "proprietary" | "other";
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateLicenseRequest {
  name: string;
  identifier: string;
  description?: string;
  category: "permissive" | "copyleft" | "proprietary" | "other";
  is_approved: boolean;
}

export function LicenseManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateLicenseRequest>({
    name: "",
    identifier: "",
    description: "",
    category: "other",
    is_approved: false,
  });
  const queryClient = useQueryClient();

  // Fetch licenses
  const {
    data: licenses = [],
    isLoading,
    error,
  } = useQuery<License[]>({
    queryKey: ["licenses"],
    queryFn: async () => {
      const response = await apiClient.get<License[]>("/api/licenses");
      return response.data;
    },
  });

  // Create license mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateLicenseRequest) => {
      const response = await apiClient.post<License>("/api/licenses", data);
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
    mutationFn: async (data: CreateLicenseRequest) => {
      const response = await apiClient.put<License>(
        `/api/licenses/${editingId}`,
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
      await apiClient.delete(`/api/licenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      identifier: "",
      description: "",
      category: "other",
      is_approved: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (license: License) => {
    setFormData({
      name: license.name,
      identifier: license.identifier,
      description: license.description,
      category: license.category,
      is_approved: license.is_approved,
    });
    setEditingId(license.id);
    setShowCreateForm(true);
  };

  const handleCancel = () => {
    resetForm();
    setEditingId(null);
    setShowCreateForm(false);
  };

  const getCategoryBadgeColor = (
    category: "permissive" | "copyleft" | "proprietary" | "other"
  ) => {
    switch (category) {
      case "permissive":
        return "bg-green-100 text-green-800";
      case "copyleft":
        return "bg-blue-100 text-blue-800";
      case "proprietary":
        return "bg-red-100 text-red-800";
      case "other":
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

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="p-6 border border-blue-200 bg-blue-50">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit License" : "Create New License"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Name *
                </label>
                <input
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identifier *
                </label>
                <input
                  type="text"
                  value={formData.identifier}
                  onChange={(e) =>
                    setFormData({ ...formData, identifier: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., MIT"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as
                        | "permissive"
                        | "copyleft"
                        | "proprietary"
                        | "other",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="permissive">Permissive</option>
                  <option value="copyleft">Copyleft</option>
                  <option value="proprietary">Proprietary</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_approved}
                    onChange={(e) =>
                      setFormData({ ...formData, is_approved: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Approved
                  </span>
                </label>
              </div>
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
                    Identifier
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
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
                      {license.identifier}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(
                          license.category
                        )}`}
                      >
                        {license.category.charAt(0).toUpperCase() +
                          license.category.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          license.is_approved
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {license.is_approved ? "Approved" : "Pending"}
                      </span>
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
          <p className="text-gray-600 text-sm">Approved</p>
          <p className="text-3xl font-bold text-green-600">
            {licenses.filter((l) => l.is_approved).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-gray-600 text-sm">Pending Review</p>
          <p className="text-3xl font-bold text-yellow-600">
            {licenses.filter((l) => !l.is_approved).length}
          </p>
        </Card>
      </div>
    </div>
  );
}
