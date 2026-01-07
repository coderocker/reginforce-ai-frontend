import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ossService } from "../../services/ossService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import type { Project, ProjectCreate, ProjectUpdate } from "../../types/oss";

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
  const { data: sbomsData } = useQuery({
    queryKey: ["oss-sboms", project.id],
    queryFn: () => ossService.listSboms({ project_id: project.id }),
    staleTime: 30000,
  });

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
          <span className="flex items-center gap-1">
            📦 {sbomCount} SBOM{sbomCount !== 1 ? "s" : ""}
          </span>
          <span>
            Created {new Date(project.created_at).toLocaleDateString()}
          </span>
        </div>

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
    </Card>
  );
}

