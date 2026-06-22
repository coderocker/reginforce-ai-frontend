import { apiClient } from "../api/client";
import type {
  LiveCVECheckResponse,
  LiveLicenseCheckResponse,
  LiveCompatibilityCheckResponse,
  PackageVetResponse,
  VulnerabilityStatistics,
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectList,
  Sbom,
  SbomList,
  SbomIngestionResult,
  SbomDeleteResult,
  SbomComponent,
  SbomComponentList,
  ComponentFilter,
  ComponentReviewRequest,
  ComponentBulkReviewRequest,
  ComponentBulkReviewResult,
  ComplianceStatistics,
  LinkingTypeOverrideRequest,
  LinkingTypeReviewResponse,
  SbomDiff,
  ReleaseGateEvaluation,
  DecisionQueue,
  DecisionEvent,
  OssWatchAlert,
  OssWatchSummary,
  OssWatchScanResult,
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

  /**
   * Delete an SBOM and all its components
   * DELETE /api/oss/sboms/{id}
   * Also removes components from RAG index
   */
  async deleteSbom(id: number): Promise<SbomDeleteResult> {
    const response = await apiClient.delete<SbomDeleteResult>(`/api/oss/sboms/${id}`);
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
  // Linking Type Review
  // =====================

  /**
   * Confirm the computed linking type is correct
   * POST /api/oss/components/{id}/linking-type/confirm
   */
  async confirmLinkingType(componentId: number): Promise<LinkingTypeReviewResponse> {
    const response = await apiClient.post<LinkingTypeReviewResponse>(
      `/api/oss/components/${componentId}/linking-type/confirm`
    );
    return response.data;
  }

  /**
   * Override the computed linking type with a user-specified value
   * POST /api/oss/components/{id}/linking-type/override
   */
  async overrideLinkingType(
    componentId: number,
    data: LinkingTypeOverrideRequest
  ): Promise<LinkingTypeReviewResponse> {
    const response = await apiClient.post<LinkingTypeReviewResponse>(
      `/api/oss/components/${componentId}/linking-type/override`,
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
   * Unified package vetting (NIST + registry + org SBOM + RAG + LLM)
   * POST /api/oss/packages/vet
   */
  async vetPackage(packageName: string, version?: string, projectId?: number) {
    try {
      const response = await apiClient.post<PackageVetResponse>("/api/oss/packages/vet", {
        package_name: packageName,
        version: version || undefined,
        project_id: projectId,
        include_llm_summary: true,
      });

      const vet = response.data;
      const cveData: LiveCVECheckResponse = {
        package: vet.package_name,
        version: vet.version,
        vulnerabilities: vet.security.cves.map((c) => ({
          cve_id: c.cve_id || "",
          severity: (c.severity || "Low") as LiveCVECheckResponse["vulnerabilities"][0]["severity"],
          cvss: c.cvss || 0,
          description: c.description || "",
          published: "",
          references: [],
          remediation: "",
        })),
        status: (vet.security.status || "safe") as LiveCVECheckResponse["status"],
        summary: {
          total: vet.security.cve_count,
          critical: vet.security.critical_count,
          high: vet.security.high_count,
          medium: vet.security.medium_count,
          low: vet.security.low_count,
        },
        license: vet.license.spdx_id || vet.license.name || "Unknown",
        license_source: vet.license.source || "unknown",
        source: vet.sources.find((s) => s.includes("NIST")) || "NIST NVD",
        last_checked: vet.generated_at,
      };

      const licenseData: LiveLicenseCheckResponse = {
        package: vet.package_name,
        version: vet.version,
        license: vet.license.name,
        verified: vet.license.verified,
        spdx_id: vet.license.spdx_id || vet.license.name,
        message: vet.recommendation.developer_summary,
        source: vet.license.source || "registry",
        home_page: "",
        project_urls: {},
        last_checked: vet.generated_at,
      };

      const actionLabels: Record<string, string> = {
        APPROVE: "✅ Approved per current signals",
        REVIEW: "⚠️ Review before use",
        LEGAL_REVIEW: "⚠️ Legal review recommended",
        ADD_TO_SBOM: "📋 Add to SBOM and assign compliance status",
        BLOCK: "🚫 Not recommended",
      };

      return {
        package_name: vet.package_name,
        cve_data: cveData,
        license_data: licenseData,
        overall_risk: vet.overall_risk as "SAFE" | "CAUTION" | "CRITICAL",
        recommendation:
          actionLabels[vet.recommendation.action] ||
          vet.recommendation.business_summary,
        developer_summary: vet.recommendation.developer_summary,
        business_summary: vet.recommendation.business_summary,
        org_sbom: vet.org_sbom,
        policy_context: vet.policy_context,
        ecosystem: vet.ecosystem,
        warnings: vet.warnings,
        sources: vet.sources,
        vet,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      throw new Error(err.response?.data?.detail || "Failed to vet package");
    }
  }

  // =====================
  // USP: Release Gate + Evidence Pack
  // =====================

  async compareReleases(targetSbomId: number, baselineSbomId: number): Promise<SbomDiff> {
    const response = await apiClient.post<SbomDiff>("/api/oss/releases/compare", {
      target_sbom_id: targetSbomId,
      baseline_sbom_id: baselineSbomId,
    });
    return response.data;
  }

  async runReleaseGate(
    sbomId: number,
    baselineSbomId?: number,
    includeLlm = false
  ): Promise<ReleaseGateEvaluation> {
    const response = await apiClient.post<ReleaseGateEvaluation>(
      `/api/oss/releases/${sbomId}/gate`,
      { baseline_sbom_id: baselineSbomId ?? null, include_llm_summary: includeLlm }
    );
    return response.data;
  }

  async getLatestGate(sbomId: number): Promise<ReleaseGateEvaluation> {
    const response = await apiClient.get<ReleaseGateEvaluation>(`/api/oss/releases/${sbomId}/gate`);
    return response.data;
  }

  getEvidencePackJsonUrl(sbomId: number): string {
    const base = apiClient.defaults.baseURL || "";
    return `${base}/api/oss/releases/${sbomId}/evidence?format=json`;
  }

  getEvidencePackHtmlUrl(sbomId: number): string {
    const base = apiClient.defaults.baseURL || "";
    return `${base}/api/oss/releases/${sbomId}/evidence?format=html`;
  }

  // =====================
  // USP: Decision Workflow
  // =====================

  async getDecisionQueue(limit = 50): Promise<DecisionQueue> {
    const response = await apiClient.get<DecisionQueue>("/api/oss/decisions/queue", {
      params: { limit },
    });
    return response.data;
  }

  async assignDecision(
    componentId: number,
    assigneeId: string,
    comment?: string
  ): Promise<DecisionEvent> {
    const response = await apiClient.post<DecisionEvent>(
      `/api/oss/decisions/${componentId}/assign`,
      { assignee_id: assigneeId, comment }
    );
    return response.data;
  }

  async decisionAction(
    componentId: number,
    action: "approved" | "rejected" | "deferred" | "commented",
    comment?: string
  ): Promise<SbomComponent> {
    const response = await apiClient.post<SbomComponent>(
      `/api/oss/decisions/${componentId}/action`,
      { action, comment }
    );
    return response.data;
  }

  async getDecisionHistory(componentId: number): Promise<DecisionEvent[]> {
    const response = await apiClient.get<DecisionEvent[]>(
      `/api/oss/decisions/${componentId}/history`
    );
    return response.data;
  }

  // =====================
  // USP: OSS Watch
  // =====================

  async runOssWatch(limit = 100): Promise<OssWatchScanResult> {
    const response = await apiClient.post<OssWatchScanResult>("/api/oss/watch/run", null, {
      params: { limit },
    });
    return response.data;
  }

  async getOssWatchAlerts(acknowledged = false): Promise<OssWatchAlert[]> {
    const response = await apiClient.get<OssWatchAlert[]>("/api/oss/watch/alerts", {
      params: { acknowledged },
    });
    return response.data;
  }

  async getOssWatchSummary(): Promise<OssWatchSummary> {
    const response = await apiClient.get<OssWatchSummary>("/api/oss/watch/summary");
    return response.data;
  }

  async acknowledgeWatchAlert(alertId: number): Promise<OssWatchAlert> {
    const response = await apiClient.patch<OssWatchAlert>(
      `/api/oss/watch/alerts/${alertId}/acknowledge`
    );
    return response.data;
  }
}

export const ossService = new OSSService();
