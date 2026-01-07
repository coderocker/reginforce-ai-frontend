import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ossService } from "../../services/ossService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import type { SbomIngestionResult, Project } from "../../types/oss";

type UploadStep = "select-project" | "upload-file" | "results";

export function SbomUpload() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedProjectId = searchParams.get("project");

  const [currentStep, setCurrentStep] = useState<UploadStep>(
    preselectedProjectId ? "upload-file" : "select-project"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    preselectedProjectId ? parseInt(preselectedProjectId, 10) : null
  );
  const [sbomName, setSbomName] = useState("");
  const [releaseVersion, setReleaseVersion] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadResult, setUploadResult] = useState<SbomIngestionResult | null>(null);

  // Fetch projects
  const { data: projectList, isLoading: loadingProjects } = useQuery({
    queryKey: ["oss-projects"],
    queryFn: () => ossService.listProjects({ is_active: true }),
  });

  const projects = projectList?.items || [];
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile || !selectedProjectId || !sbomName || !releaseVersion) {
        throw new Error("Missing required fields");
      }
      return ossService.uploadSbom(
        selectedFile,
        selectedProjectId,
        sbomName,
        releaseVersion
      );
    },
    onSuccess: (result) => {
      setUploadResult(result);
      setCurrentStep("results");
    },
  });

  // File handlers
  const handleFileSelect = useCallback((file: File) => {
    const validTypes = [".csv", ".json"];
    const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validTypes.includes(extension)) {
      alert("Please upload a CSV or JSON file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert("File size must be less than 50MB");
      return;
    }
    setSelectedFile(file);
    
    // Auto-fill sbom name from filename
    if (!sbomName) {
      const nameWithoutExt = file.name.replace(/\.(csv|json)$/i, "");
      setSbomName(nameWithoutExt);
    }
  }, [sbomName]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const canProceedToUpload = selectedProjectId !== null;
  const canUpload = selectedFile && sbomName.trim() && releaseVersion.trim();

  const resetUpload = () => {
    setCurrentStep("select-project");
    setSelectedProjectId(null);
    setSbomName("");
    setReleaseVersion("");
    setSelectedFile(null);
    setUploadResult(null);
  };

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f1f2f3] px-10 py-3">
        <div className="flex items-center gap-4 text-[#131416]">
          <Link to="/oss/projects" className="text-gray-500 hover:text-gray-700">
            ← Projects
          </Link>
          <h2 className="text-[#131416] text-lg font-bold leading-tight tracking-[-0.015em]">
            Upload SBOM
          </h2>
        </div>
      </header>

      <div className="flex flex-col p-6 gap-6 max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {[
            { step: "select-project", label: "1. Select Project", icon: "📁" },
            { step: "upload-file", label: "2. Upload File", icon: "📤" },
            { step: "results", label: "3. Results", icon: "✅" },
          ].map(({ step, label, icon }, idx) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  currentStep === step
                    ? "bg-emerald-100 text-emerald-700 font-semibold"
                    : idx <
                      ["select-project", "upload-file", "results"].indexOf(
                        currentStep
                      )
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <span>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {idx < 2 && (
                <div
                  className={`w-8 h-0.5 mx-2 ${
                    idx <
                    ["select-project", "upload-file", "results"].indexOf(
                      currentStep
                    )
                      ? "bg-emerald-400"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Project */}
        {currentStep === "select-project" && (
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Select Project
            </h3>
            <p className="text-gray-600 mb-6">
              Choose which project this SBOM belongs to, or create a new project.
            </p>

            {loadingProjects ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center p-8">
                <div className="text-4xl mb-4">📁</div>
                <p className="text-gray-600 mb-4">No projects found.</p>
                <Link to="/oss/projects">
                  <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700">
                    Create First Project
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        selectedProjectId === project.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedProjectId === project.id && (
                          <span className="text-emerald-600">✓</span>
                        )}
                        <span className="font-medium text-gray-900">
                          {project.name}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {project.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <Link
                    to="/oss/projects"
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    + Create new project
                  </Link>
                  <Button
                    variant="primary"
                    disabled={!canProceedToUpload}
                    onClick={() => setCurrentStep("upload-file")}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Next →
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        {/* Step 2: Upload File */}
        {currentStep === "upload-file" && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Upload SBOM File
              </h3>
              <span className="text-sm text-gray-500">
                Project: <strong>{selectedProject?.name}</strong>
              </span>
            </div>

            <div className="space-y-6">
              {/* SBOM Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="sbomName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    SBOM Name *
                  </label>
                  <input
                    id="sbomName"
                    type="text"
                    value={sbomName}
                    onChange={(e) => setSbomName(e.target.value)}
                    placeholder="e.g., backend-api"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="releaseVersion"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Release Version *
                  </label>
                  <input
                    id="releaseVersion"
                    type="text"
                    value={releaseVersion}
                    onChange={(e) => setReleaseVersion(e.target.value)}
                    placeholder="e.g., v1.2.3"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* File Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver
                    ? "border-emerald-500 bg-emerald-50"
                    : selectedFile
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-4xl">📄</div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-4">📤</div>
                    <p className="text-gray-700 mb-2">
                      Drag and drop your SBOM file here
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Supports CSV or JSON (CycloneDX, SPDX)
                    </p>
                    <label className="inline-block cursor-pointer">
                      <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        Browse Files
                      </span>
                      <input
                        type="file"
                        accept=".csv,.json"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* File Format Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">
                  📋 Expected CSV Format
                </h4>
                <code className="text-xs text-blue-700 block bg-blue-100 p-2 rounded">
                  package_name,package_version,license_spdx,ecosystem
                  <br />
                  lodash,4.17.21,MIT,npm
                  <br />
                  express,4.18.2,MIT,npm
                </code>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep("select-project")}
                >
                  ← Back
                </Button>
                <Button
                  variant="primary"
                  disabled={!canUpload}
                  isLoading={uploadMutation.isPending}
                  onClick={() => uploadMutation.mutate()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Upload SBOM
                </Button>
              </div>

              {uploadMutation.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">
                    Upload failed: {uploadMutation.error.message}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Step 3: Results */}
        {currentStep === "results" && uploadResult && (
          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload Complete!
              </h3>
              <p className="text-gray-600">{uploadResult.message}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {uploadResult.auto_classified.allowed}
                </p>
                <p className="text-sm text-green-700">✅ Allowed</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {uploadResult.auto_classified.not_allowed}
                </p>
                <p className="text-sm text-red-700">❌ Blocked</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">
                  {uploadResult.auto_classified.check_with_legal}
                </p>
                <p className="text-sm text-amber-700">⚠️ Legal Review</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-600">
                  {uploadResult.auto_classified.pending_review}
                </p>
                <p className="text-sm text-gray-700">🔍 Pending</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">SBOM Name:</span>
                  <span className="ml-2 font-medium">{uploadResult.sbom_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Version:</span>
                  <span className="ml-2 font-medium">{uploadResult.release_version}</span>
                </div>
                <div>
                  <span className="text-gray-500">Successful:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {uploadResult.successful}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Failed:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {uploadResult.failed}
                  </span>
                </div>
              </div>
            </div>

            {/* Errors */}
            {uploadResult.errors.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-red-800 mb-2">
                  ❌ Failed Components ({uploadResult.errors.length})
                </h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {uploadResult.errors.map((err, idx) => (
                    <div
                      key={idx}
                      className="text-sm text-red-700 py-1 border-b border-red-100 last:border-0"
                    >
                      <span className="font-mono">{err.package_name}</span>
                      {err.package_version && (
                        <span className="text-red-500">@{err.package_version}</span>
                      )}
                      : {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-200">
              <Link to={`/oss/components?sbom=${uploadResult.sbom_id}`}>
                <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700">
                  View Components
                </Button>
              </Link>
              <Button variant="secondary" onClick={resetUpload}>
                Upload Another
              </Button>
              <Link to="/oss/projects">
                <Button variant="secondary">Done</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

