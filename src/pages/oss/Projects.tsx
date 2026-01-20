import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ossService } from "../../services/ossService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import type { Project, ProjectCreate, ProjectUpdate, Sbom, SbomDeleteResult } from "../../types/oss";

export function Projects() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectCreate>({
    name: "",
    description: "",
  });
  const queryClient = useQueryClient();

  // Fetch projects
  const {
    data: projectList,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["oss-projects"],
    queryFn: () => ossService.listProjects({ is_active: true }),
  });

  const projects = projectList?.items || [];

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: (data: ProjectCreate) => ossService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oss-projects"] });
      resetForm();
      setShowCreateForm(false);
    },
  });

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProjectUpdate }) =>
      ossService.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oss-projects"] });
      resetForm();
      setEditingProject(null);
    },
  });

  // Archive project mutation
  const archiveMutation = useMutation({
    mutationFn: (id: number) =>
      ossService.updateProject(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oss-projects"] });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }
    if (editingProject) {
      updateMutation.mutate({
        id: editingProject.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (project: Project) => {
    setFormData({
      name: project.name,
      description: project.description || "",
    });
    setEditingProject(project);
    setShowCreateForm(true);
  };

  const handleCancel = () => {
    resetForm();
    setEditingProject(null);
    setShowCreateForm(false);
  };

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f1f2f3] px-10 py-3">
        <div className="flex items-center gap-4 text-[#131416]">
          <h2 className="text-[#131416] text-lg font-bold leading-tight tracking-[-0.015em]">
            OSS Projects
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(true)}
            disabled={showCreateForm}
          >
            + New Project
          </Button>
          <Link to="/oss/sbom/upload">
            <Button variant="secondary">Upload SBOM</Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-col p-6 gap-6">
        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card className="border-2 border-emerald-200 bg-emerald-50/30">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {editingProject ? "Edit Project" : "Create New Project"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Project Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Backend API, Mobile App"
                    required
                    maxLength={255}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of the project..."
                    rows={3}
                    maxLength={2000}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    isLoading={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingProject ? "Update Project" : "Create Project"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>

                {(createMutation.error || updateMutation.error) && (
                  <p className="text-red-600 text-sm mt-2">
                    Error: {createMutation.error?.message || updateMutation.error?.message}
                  </p>
                )}
              </form>
            </div>
          </Card>
        )}

        {/* Projects List */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : error ? (
          <Card className="p-6 text-center">
            <p className="text-red-600">
              Error loading projects: {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </Card>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Projects Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first project to start tracking SBOM compliance.
            </p>
            {!showCreateForm && (
              <Button
                variant="primary"
                onClick={() => setShowCreateForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Create First Project
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEdit}
                onArchive={(id) => archiveMutation.mutate(id)}
                isArchiving={archiveMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Total Projects</p>
              <p className="text-3xl font-bold text-gray-900">{projects.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Active Projects</p>
              <p className="text-3xl font-bold text-emerald-600">
                {projects.filter((p) => p.is_active).length}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Created This Month</p>
              <p className="text-3xl font-bold text-blue-600">
                {projects.filter((p) => {
                  const created = new Date(p.created_at);
                  const now = new Date();
                  return (
                    created.getMonth() === now.getMonth() &&
                    created.getFullYear() === now.getFullYear()
                  );
                }).length}
              </p>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

// Project Card Component
interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onArchive: (id: number) => void;
  isArchiving: boolean;
}

function ProjectCard({ project, onEdit, onArchive, isArchiving }: ProjectCardProps) {
  const [showSboms, setShowSboms] = useState(false);
  const [deletingSbom, setDeletingSbom] = useState<Sbom | null>(null);
  const [deleteResult, setDeleteResult] = useState<SbomDeleteResult | null>(null);
  const queryClient = useQueryClient();

  const { data: sbomsData, isLoading: loadingSboms } = useQuery({
    queryKey: ["oss-sboms", project.id],
    queryFn: () => ossService.listSboms({ project_id: project.id }),
    staleTime: 30000,
  });

  const deleteSbomMutation = useMutation({
    mutationFn: (sbomId: number) => ossService.deleteSbom(sbomId),
    onSuccess: (result) => {
      console.log("✅ SBOM deleted:", result);
      setDeleteResult(result);
      queryClient.invalidateQueries({ queryKey: ["oss-sboms", project.id] });
      queryClient.invalidateQueries({ queryKey: ["oss-components"] });
      // Show result briefly then close
      setTimeout(() => {
        setDeletingSbom(null);
        setDeleteResult(null);
      }, 3000);
    },
    onError: (error: any) => {
      console.error("❌ Delete SBOM failed:", error);
      alert("Failed to delete SBOM: " + (error.response?.data?.detail || error.message));
    },
  });

  const sboms = sbomsData?.items || [];
  const sbomCount = sbomsData?.total || 0;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${
            project.is_active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-600"
          }`}>
            {project.is_active ? "Active" : "Archived"}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <button
            onClick={() => setShowSboms(!showSboms)}
            className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
          >
            📦 {sbomCount} SBOM{sbomCount !== 1 ? "s" : ""}
            <span className="text-xs">{showSboms ? "▼" : "▶"}</span>
          </button>
          <span>
            Created {new Date(project.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* SBOM List (expandable) */}
        {showSboms && (
          <div className="mb-4 bg-gray-50 rounded-lg p-3">
            {loadingSboms ? (
              <p className="text-sm text-gray-500">Loading SBOMs...</p>
            ) : sboms.length === 0 ? (
              <p className="text-sm text-gray-500">No SBOMs uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {sboms.map((sbom) => (
                  <div
                    key={sbom.id}
                    className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {sbom.name}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {sbom.release_version}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{sbom.total_components} components</span>
                        <span className="text-green-600">✓ {sbom.components_allowed}</span>
                        <span className="text-red-600">✗ {sbom.components_not_allowed}</span>
                        <span className="text-gray-400">⏳ {sbom.components_pending}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Link
                        to={`/oss/components?sbom=${sbom.id}`}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => setDeletingSbom(sbom)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50"
                        title="Delete SBOM"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <Link
            to={`/oss/sbom/upload?project=${project.id}`}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Upload SBOM
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            to={`/oss/components?project=${project.id}`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Components
          </Link>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => onEdit(project)}
            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
          >
            Edit
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => {
              if (confirm("Are you sure you want to archive this project?")) {
                onArchive(project.id);
              }
            }}
            disabled={isArchiving}
            className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
          >
            Archive
          </button>
        </div>
      </div>

      {/* Delete SBOM Confirmation Modal */}
      {deletingSbom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Delete SBOM</h3>
                  <p className="text-sm text-white/80">This cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {deleteResult ? (
                // Show delete results
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-lg font-semibold text-gray-900">SBOM Deleted</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">SBOM Name:</span>
                      <span className="font-medium">{deleteResult.sbom_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Components Deleted:</span>
                      <span className="font-medium text-red-600">{deleteResult.components_deleted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RAG Entries Removed:</span>
                      <span className="font-medium text-amber-600">{deleteResult.rag_entries_deleted}</span>
                    </div>
                    {deleteResult.rag_errors && (
                      <div className="text-xs text-red-600 mt-2">
                        RAG Errors: {deleteResult.rag_errors}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Show confirmation
                <>
                  <p className="text-gray-700 mb-4">
                    Are you sure you want to delete this SBOM? This will also delete:
                  </p>
                  <ul className="text-sm text-gray-600 mb-4 space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">•</span>
                      All {deletingSbom.total_components} components
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">•</span>
                      RAG index entries for indexed components
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">•</span>
                      All review history and notes
                    </li>
                  </ul>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">📦</div>
                      <div>
                        <p className="font-medium text-gray-900">{deletingSbom.name}</p>
                        <p className="text-sm text-gray-500">
                          Version: {deletingSbom.release_version} • {deletingSbom.total_components} components
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              {!deleteResult && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setDeletingSbom(null)}
                    disabled={deleteSbomMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <button
                    onClick={() => deleteSbomMutation.mutate(deletingSbom.id)}
                    disabled={deleteSbomMutation.isPending}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {deleteSbomMutation.isPending ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>🗑️ Delete SBOM</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

