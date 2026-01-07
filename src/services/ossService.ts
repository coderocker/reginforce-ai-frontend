import { apiClient } from "../api/client";
import type {
  LiveCVECheckResponse,
  LiveLicenseCheckResponse,
  LiveCompatibilityCheckResponse,
  VulnerabilityStatistics,
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectList,
  Sbom,
  SbomList,
  SbomIngestionResult,
  SbomComponent,
  SbomComponentList,
  ComponentFilter,
  ComponentReviewRequest,
  ComponentBulkReviewRequest,
  ComponentBulkReviewResult,
  ComplianceStatistics,
} from "../types/oss";

class OSSService {
  // =====================
  // Projects
  // =====================

  /**
   * Create a new project
   * POST /api/oss/projects
   */
  async createProject(data: ProjectCreate): Promise<Project> {
    const response = await apiClient.post<Project>("/api/oss/projects", data);
    return response.data;
  }

  /**
   * List all projects
   * GET /api/oss/projects
   */
  async listProjects(params?: { is_active?: boolean }): Promise<ProjectList> {
    const response = await apiClient.get<ProjectList>("/api/oss/projects", { params });
    return response.data;
  }

  /**
   * Get a single project
   * GET /api/oss/projects/{id}
   */
  async getProject(id: number): Promise<Project> {
    const response = await apiClient.get<Project>(`/api/oss/projects/${id}`);
    return response.data;
  }

  /**
   * Update a project
   * PATCH /api/oss/projects/{id}
   */
  async updateProject(id: number, data: ProjectUpdate): Promise<Project> {
    const response = await apiClient.patch<Project>(`/api/oss/projects/${id}`, data);
    return response.data;
  }

  // =====================
  // SBOMs
  // =====================

  /**
   * Upload SBOM file
   * POST /api/oss/sbom/upload
   */
  async uploadSbom(
    file: File,
    projectId: number,
    sbomName: string,
    releaseVersion: string
  ): Promise<SbomIngestionResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("project_id", projectId.toString());
    formData.append("sbom_name", sbomName);
    formData.append("release_version", releaseVersion);

    const response = await apiClient.post<SbomIngestionResult>(
      "/api/oss/sbom/upload",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  }

  /**
   * List SBOMs
   * GET /api/oss/sboms
   */
  async listSboms(params?: { project_id?: number }): Promise<SbomList> {
    const response = await apiClient.get<SbomList>("/api/oss/sboms", { params });
    return response.data;
  }

  /**
   * Get a single SBOM
   * GET /api/oss/sboms/{id}
   */
  async getSbom(id: number): Promise<Sbom> {
    const response = await apiClient.get<Sbom>(`/api/oss/sboms/${id}`);
    return response.data;
  }

  // =====================
  // Components
  // =====================

  /**
   * List components with filtering
   * GET /api/oss/components
   */
  async listComponents(params: ComponentFilter): Promise<SbomComponentList> {
    const response = await apiClient.get<SbomComponentList>("/api/oss/components", { params });
    return response.data;
  }

  /**
   * Get a single component
   * GET /api/oss/components/{id}
   */
  async getComponent(id: number): Promise<SbomComponent> {
    const response = await apiClient.get<SbomComponent>(`/api/oss/components/${id}`);
    return response.data;
  }

  /**
   * Update a component (partial update)
   * PATCH /api/oss/components/{id}
   */
  async updateComponent(
    id: number,
    data: Partial<ComponentReviewRequest>
  ): Promise<SbomComponent> {
    const response = await apiClient.patch<SbomComponent>(
      `/api/oss/components/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Review a component (formal review with required fields)
   * POST /api/oss/components/{id}/review
   */
  async reviewComponent(id: number, data: ComponentReviewRequest): Promise<SbomComponent> {
    const response = await apiClient.post<SbomComponent>(
      `/api/oss/components/${id}/review`,
      data
    );
    return response.data;
  }

  /**
   * Bulk review multiple components
   * POST /api/oss/components/bulk-review
   */
  async bulkReviewComponents(data: ComponentBulkReviewRequest): Promise<ComponentBulkReviewResult> {
    const response = await apiClient.post<ComponentBulkReviewResult>(
      "/api/oss/components/bulk-review",
      data
    );
    return response.data;
  }

  // =====================
  // Statistics
  // =====================

  /**
   * Get compliance statistics across all projects
   */
  async getComplianceStatistics(): Promise<ComplianceStatistics> {
    try {
      // Aggregate stats from projects and components
      const [projectsResponse, componentsResponse] = await Promise.all([
        this.listProjects({ is_active: true }),
        this.listComponents({ limit: 1 }), // Just to get totals
      ]);

      const projects = projectsResponse.items;
      const sbomResponses = await Promise.all(
        projects.slice(0, 5).map((p) => this.listSboms({ project_id: p.id }).catch(() => ({ items: [], total: 0 })))
      );

      const totalSboms = sbomResponses.reduce((sum, r) => sum + r.total, 0);
      
      // Calculate component counts by status
      const [allowed, notAllowed, checkLegal, pending] = await Promise.all([
        this.listComponents({ status: "allowed" as any, limit: 1 }).catch(() => ({ total: 0 })),
        this.listComponents({ status: "not_allowed" as any, limit: 1 }).catch(() => ({ total: 0 })),
        this.listComponents({ status: "check_with_legal" as any, limit: 1 }).catch(() => ({ total: 0 })),
        this.listComponents({ status: "pending_review" as any, limit: 1 }).catch(() => ({ total: 0 })),
      ]);

      return {
        total_projects: projectsResponse.total,
        total_sboms: totalSboms,
        total_components: componentsResponse.total,
        components_allowed: allowed.total,
        components_not_allowed: notAllowed.total,
        components_check_with_legal: checkLegal.total,
        components_pending_review: pending.total,
      };
    } catch (error) {
      // Return empty stats if API is not available
      return {
        total_projects: 0,
        total_sboms: 0,
        total_components: 0,
        components_allowed: 0,
        components_not_allowed: 0,
        components_check_with_legal: 0,
        components_pending_review: 0,
      };
    }
  }

  // =====================
  // Existing Tools Endpoints
  // =====================

  /**
   * Check package for CVE vulnerabilities using NIST NVD (live)
   * GET /api/oss/tools/cve/{package_name}?version={version}
   */
  async checkPackageCVE(packageName: string, version?: string): Promise<LiveCVECheckResponse> {
    const encodedPackage = encodeURIComponent(packageName);
    const versionParam = version ? `?version=${encodeURIComponent(version)}` : "";
    const url = `/api/oss/tools/cve/${encodedPackage}${versionParam}`;
    const response = await apiClient.get<LiveCVECheckResponse>(url);
    return response.data;
  }

  /**
   * Get license information for a package (live)
   * GET /api/oss/tools/license/{package_name}?version={version}
   */
  async checkPackageLicense(
    packageName: string,
    version?: string
  ): Promise<LiveLicenseCheckResponse> {
    const encodedPackage = encodeURIComponent(packageName);
    const versionParam = version ? `?version=${encodeURIComponent(version)}` : "";
    const url = `/api/oss/tools/license/${encodedPackage}${versionParam}`;
    const response = await apiClient.get<LiveLicenseCheckResponse>(url);
    return response.data;
  }

  /**
   * Check license compatibility between project and dependencies (live)
   * GET /api/oss/tools/compatibility
   */
  async checkLicenseCompatibility(
    projectLicense: string,
    dependencyLicenses: string[]
  ): Promise<LiveCompatibilityCheckResponse> {
    const params = new URLSearchParams({
      project_license: projectLicense,
      dependency_licenses: dependencyLicenses.join(","),
    });

    const response = await apiClient.get<LiveCompatibilityCheckResponse>(
      `/api/oss/tools/compatibility?${params}`
    );
    return response.data;
  }

  /**
   * Get vulnerability statistics for organization
   * GET /api/oss/vulnerabilities/statistics
   */
  async getVulnerabilityStatistics(): Promise<VulnerabilityStatistics> {
    const response = await apiClient.get<VulnerabilityStatistics>(
      `/api/oss/vulnerabilities/statistics`
    );
    return response.data;
  }

  /**
   * Check a package for both CVE and license info in parallel
   * Falls back to CVE license data if license endpoint fails (404)
   */
  async vetPackage(packageName: string, version?: string) {
    try {
      // Try to get CVE data (required)
      const cveData = await this.checkPackageCVE(packageName, version);

      // Try to get license data separately (optional, falls back to CVE license)
      let licenseData: LiveLicenseCheckResponse | null = null;
      try {
        licenseData = await this.checkPackageLicense(packageName, version);
      } catch (licenseError: any) {
        // If license endpoint fails (404), create fallback from CVE data
        if (licenseError.response?.status === 404 && cveData.license) {
          console.warn(`License lookup failed for ${packageName}, using CVE license data`);
          licenseData = {
            package: packageName,
            version: version || cveData.version || "any",
            license: cveData.license,
            verified: false,
            spdx_id: cveData.license,
            message: `License info extracted from NIST CVE data (from ${cveData.license_source})`,
            source: cveData.license_source || "NIST NVD",
            last_checked: cveData.last_checked,
          };
        } else {
          // If it's a different error or CVE doesn't have license, re-throw
          throw licenseError;
        }
      }

      // Determine overall risk based on license verification and CVE presence
      // Map API status to risk level
      const statusRiskMap: Record<string, "SAFE" | "CAUTION" | "CRITICAL"> = {
        safe: "SAFE",
        low_risk: "CAUTION",
        medium_risk: "CAUTION",
        high_risk: "CRITICAL",
        critical: "CRITICAL",
      };

      let overallRisk = statusRiskMap[cveData.status] || "SAFE";

      if (licenseData && !licenseData.verified && overallRisk === "SAFE") {
        overallRisk = "CAUTION";
      }

      let recommendation = "✅ Safe to use";
      if (overallRisk === "CAUTION") {
        recommendation = "⚠️ Review before use";
      } else if (overallRisk === "CRITICAL") {
        recommendation = "🚫 Not recommended";
      }

      return {
        package_name: packageName,
        cve_data: cveData,
        license_data: licenseData || {
          package: packageName,
          version: version || cveData.version || "any",
          license: cveData.license || "Unknown",
          verified: false,
          spdx_id: cveData.license || "Unknown",
          message: "License information not available",
          source: cveData.license_source || "NIST NVD",
          last_checked: cveData.last_checked,
        },
        overall_risk: overallRisk,
        recommendation,
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.detail || "Failed to vet package"
      );
    }
  }
}

export const ossService = new OSSService();
