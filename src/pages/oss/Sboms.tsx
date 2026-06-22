import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ossService } from "../../services/ossService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import type { Sbom, SbomDeleteResult, Project } from "../../types/oss";

export function Sboms() {
  const [searchParams] = useSearchParams();
  const projectIdParam = searchParams.get("project");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    projectIdParam ? parseInt(projectIdParam, 10) : null
  );
  const [deletingSbom, setDeletingSbom] = useState<Sbom | null>(null);
  const [deleteResult, setDeleteResult] = useState<SbomDeleteResult | null>(null);
  const queryClient = useQueryClient();

  // Fetch projects for filter dropdown
  const { data: projectList } = useQuery({
    queryKey: ["oss-projects"],
    queryFn: () => ossService.listProjects({ is_active: true }),
  });

  const projects = projectList?.items || [];

  // Fetch SBOMs
  const { data: sbomList, isLoading, error } = useQuery({
    queryKey: ["oss-sboms", selectedProjectId],
    queryFn: () =>
      ossService.listSboms(
        selectedProjectId ? { project_id: selectedProjectId } : undefined
      ),
  });

  const sboms = sbomList?.items || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (sbomId: number) => ossService.deleteSbom(sbomId),
    onSuccess: (result) => {
      console.log("✅ SBOM deleted:", result);
      setDeleteResult(result);
      queryClient.invalidateQueries({ queryKey: ["oss-sboms"] });
      queryClient.invalidateQueries({ queryKey: ["oss-components"] });
      setTimeout(() => {
        setDeletingSbom(null);
        setDeleteResult(null);
      }, 3000);
    },
    onError: (error: any) => {
      console.error("❌ Delete SBOM failed:", error);
      alert(
        "Failed to delete SBOM: " +
          (error.response?.data?.detail || error.message)
      );
    },
  });

  // Get project name by ID
  const getProjectName = (projectId: number): string => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || `Project ${projectId}`;
  };

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f1f2f3] px-10 py-3">
        <div className="flex items-center gap-4 text-[#131416]">
          <h2 className="text-[#131416] text-lg font-bold leading-tight tracking-[-0.015em]">
            📦 SBOMs
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/oss/sbom/upload">
            <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700">
              + Upload SBOM
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-col p-6 gap-6">
        {/* Filter Bar */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="project-filter" className="text-sm font-medium text-gray-700">
                Filter by Project:
              </label>
              <select
                id="project-filter"
                value={selectedProjectId || ""}
                onChange={(e) =>
                  setSelectedProjectId(
                    e.target.value ? parseInt(e.target.value, 10) : null
                  )
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500">
              {sboms.length} SBOM{sboms.length !== 1 ? "s" : ""} found
            </div>
          </div>
        </Card>

        {/* SBOM List */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : error ? (
          <Card className="p-6 text-center">
            <p className="text-red-600">
              Error loading SBOMs:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </Card>
        ) : sboms.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No SBOMs Found</h3>
            <p className="text-gray-600 mb-6">
              {selectedProjectId
                ? "No SBOMs uploaded for this project yet."
                : "Upload your first SBOM to start tracking components."}
            </p>
            <Link to="/oss/sbom/upload">
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Upload First SBOM
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    SBOM Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[180px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sboms.map((sbom) => (
                  <tr key={sbom.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📦</span>
                        <div>
                          <Link
                            to={`/oss/components?sbom=${sbom.id}`}
                            className="font-medium text-gray-900 hover:text-emerald-600 text-sm"
                          >
                            {sbom.name}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {sbom.total_components} components
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {getProjectName(sbom.project_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {sbom.release_version}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700"
                          title="Allowed"
                        >
                          ✓{sbom.components_allowed}
                        </span>
                        <span
                          className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700"
                          title="Not Allowed"
                        >
                          ✗{sbom.components_not_allowed}
                        </span>
                        <span
                          className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600"
                          title="Pending"
                        >
                          ⏳{sbom.components_pending}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {new Date(sbom.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/oss/components?sbom=${sbom.id}`}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 border border-blue-200"
                        >
                          View
                        </Link>
                        <Link
                          to={`/oss/releases/${sbom.id}`}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-medium px-2 py-1 rounded hover:bg-emerald-50 border border-emerald-200"
                        >
                          Gate
                        </Link>
                        <button
                          onClick={() => setDeletingSbom(sbom)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 border border-red-200"
                          title="Delete SBOM"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats Summary */}
        {sboms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Total SBOMs</p>
              <p className="text-3xl font-bold text-gray-900">{sboms.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Total Components</p>
              <p className="text-3xl font-bold text-emerald-600">
                {sboms.reduce((sum, s) => sum + s.total_components, 0)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Allowed</p>
              <p className="text-3xl font-bold text-green-600">
                {sboms.reduce((sum, s) => sum + s.components_allowed, 0)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Blocked</p>
              <p className="text-3xl font-bold text-red-600">
                {sboms.reduce((sum, s) => sum + s.components_not_allowed, 0)}
              </p>
            </Card>
          </div>
        )}
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
                    <p className="text-lg font-semibold text-gray-900">
                      SBOM Deleted
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">SBOM Name:</span>
                      <span className="font-medium">{deleteResult.sbom_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Components Deleted:</span>
                      <span className="font-medium text-red-600">
                        {deleteResult.components_deleted}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RAG Entries Removed:</span>
                      <span className="font-medium text-amber-600">
                        {deleteResult.rag_entries_deleted}
                      </span>
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
                    Are you sure you want to delete this SBOM? This will also
                    delete:
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
                        <p className="font-medium text-gray-900">
                          {deletingSbom.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Version: {deletingSbom.release_version} •{" "}
                          {deletingSbom.total_components} components
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
                    disabled={deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <button
                    onClick={() => deleteMutation.mutate(deletingSbom.id)}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
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
    </>
  );
}

