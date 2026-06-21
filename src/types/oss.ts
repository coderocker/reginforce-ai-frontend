/**
 * OSS Compliance Types based on OpenAPI spec
 */

// === Enums ===

export enum LinkingType {
  DYNAMICALLY_LINKED = "dynamically_linked",
  STATICALLY_LINKED = "statically_linked",
  SEPARATE_WORK = "separate_work",
  MERELY_AGGREGATED = "merely_aggregated",
  PREREQUISITE = "prerequisite",
  DEV_TOOL_EXCLUDED = "dev_tool_excluded",
  UNKNOWN = "unknown"
}

export enum LinkingTypeReviewStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  OVERRIDDEN = "overridden"
}

export enum DependencySource {
  BASE_IMAGE = "base_image",
  APP_DEPENDENCY = "app_dependency",
  UNKNOWN = "unknown"
}

export enum ComplianceStatus {
  ALLOWED = "allowed",
  NOT_ALLOWED = "not_allowed",
  CHECK_WITH_LEGAL = "check_with_legal",
  PENDING_REVIEW = "pending_review"
}

// === Projects ===

export interface Project {
  id: number;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface ProjectList {
  items: Project[];
  total: number;
}

// === SBOMs ===

export interface Sbom {
  id: number;
  organization_id: string;
  project_id: number;
  name: string;
  release_version: string;
  total_components: number;
  components_allowed: number;
  components_not_allowed: number;
  components_pending: number;
  processed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SbomIngestionResult {
  sbom_id: number;
  sbom_name: string;
  release_version: string;
  project_id: number;
  successful: number;
  failed: number;
  auto_classified: {
    allowed: number;
    not_allowed: number;
    check_with_legal: number;
    pending_review: number;
  };
  errors: Array<{
    package_name: string;
    package_version?: string;
    error: string;
  }>;
  message: string;
}

export interface SbomList {
  items: Sbom[];
  total: number;
}

export interface SbomDeleteResult {
  sbom_id: number;
  sbom_name: string;
  components_deleted: number;
  rag_entries_deleted: number;
  rag_errors: string | null;
}

// === Components ===

export interface SbomComponent {
  id: number;
  organization_id: string;
  sbom_id: number;
  package_name: string;
  package_version: string;
  package_ecosystem: string;
  license_spdx: string;
  linking_type: LinkingType;
  status: ComplianceStatus;
  review_notes: string | null;
  rag_indexed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // New linking type inference fields
  linking_type_confidence: number; // 0-100
  linking_type_reasons: string; // JSON array string - parse with JSON.parse()
  linking_type_review_status: LinkingTypeReviewStatus;
  linking_type_user_override: LinkingType | null;
  linking_type_confirmed_at: string | null;
  linking_type_confirmed_by: string | null;
  dependency_source: DependencySource;
}

export interface SbomComponentList {
  items: SbomComponent[];
  total: number;
  limit: number;
  offset: number;
}

export interface ComponentFilter {
  project_id?: number;
  sbom_id?: number;
  package_name?: string;
  license_spdx?: string;
  status?: ComplianceStatus;
  linking_type?: LinkingType;
  linking_type_review_status?: LinkingTypeReviewStatus;
  confidence_max?: number; // Filter components with confidence <= this value
  rag_indexed?: boolean;
  limit?: number;
  offset?: number;
}

export interface ComponentReviewRequest {
  linking_type: LinkingType;
  status: ComplianceStatus;
  review_notes?: string;
}

export interface ComponentBulkReviewRequest {
  component_ids: number[];
  linking_type: LinkingType;
  status: ComplianceStatus;
  review_notes?: string;
}

export interface ComponentBulkReviewResult {
  updated: number;
  failed: number;
  errors: Array<{
    component_id: number;
    error: string;
  }>;
}

// === Linking Type Review Workflow ===

export interface LinkingTypeOverrideRequest {
  override_linking_type: LinkingType;
  override_reason?: string;
}

export interface LinkingTypeReviewResponse {
  component_id: number;
  previous_linking_type: LinkingType;
  final_linking_type: LinkingType;
  review_status: LinkingTypeReviewStatus;
  confidence: number;
  reasons: string[];
  confirmed_at: string;
  confirmed_by: string;
}

// === Existing CVE/License Types ===

export interface CVEVulnerability {
  cve_id: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  cvss: number;
  description: string;
  published: string;
  references: string[];
  remediation: string;
}

export interface CVESummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface LiveCVECheckResponse {
  package: string;
  version: string;
  vulnerabilities: CVEVulnerability[];
  status: "safe" | "low_risk" | "medium_risk" | "high_risk" | "critical";
  summary: CVESummary;
  license: string;
  license_source: string;
  source: string;
  last_checked: string;
}

export interface ProjectURL {
  Homepage?: string;
  Repository?: string;
  Documentation?: string;
  [key: string]: string | undefined;
}

export interface LiveLicenseCheckResponse {
  package: string;
  version: string;
  license: string;
  verified: boolean;
  spdx_id: string;
  message: string;
  source: string;
  home_page?: string;
  project_urls?: ProjectURL;
  last_checked: string;
}

export interface LicenseInfo {
  spdx_id: string;
  name: string;
  url?: string;
  risk_level: "SAFE" | "WARNING" | "CRITICAL";
}

export interface LiveCompatibilityCheckResponse {
  project_license: string;
  dependencies: CompatibilityResult[];
  overall_compatibility: "COMPATIBLE" | "WARNING" | "INCOMPATIBLE";
  conflicts: LicenseConflict[];
  recommendation: string;
}

export interface CompatibilityResult {
  package_name: string;
  license: string;
  compatible: boolean;
  notes?: string;
}

export interface LicenseConflict {
  license_1: string;
  license_2: string;
  conflict_type: string;
  recommendation: string;
}

export interface VulnerabilityStatistics {
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  unpatched_count: number;
  patched_count: number;
  last_scan_date: string;
}

export interface PackageVetResponse {
  package_name: string;
  version: string;
  ecosystem: string;
  ecosystem_detection: string;
  org_sbom: {
    found: boolean;
    compliance_status?: string | null;
    project_name?: string | null;
    linking_type?: string | null;
    license_spdx?: string | null;
  };
  security: {
    risk_level: string;
    status: string;
    cve_count: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    cves: Array<{
      cve_id?: string;
      severity?: string;
      cvss?: number;
      description?: string;
    }>;
  };
  license: {
    name: string;
    spdx_id?: string | null;
    verified: boolean;
    source?: string | null;
  };
  policy_context: Array<{
    excerpt: string;
    document: string;
    score: number;
  }>;
  overall_risk: string;
  recommendation: {
    action: string;
    developer_summary: string;
    business_summary: string;
  };
  sources: string[];
  warnings: string[];
  generated_at: string;
}

export interface PackageVettingResult {
  package_name: string;
  cve_data: LiveCVECheckResponse;
  license_data: LiveLicenseCheckResponse;
  overall_risk: "SAFE" | "CAUTION" | "CRITICAL";
  recommendation: string;
  developer_summary?: string;
  business_summary?: string;
  org_sbom?: PackageVetResponse["org_sbom"];
  policy_context?: PackageVetResponse["policy_context"];
  ecosystem?: string;
  warnings?: string[];
  sources?: string[];
  vet?: PackageVetResponse;
}

// === Compliance Statistics ===

export interface ComplianceStatistics {
  total_projects: number;
  total_sboms: number;
  total_components: number;
  components_allowed: number;
  components_not_allowed: number;
  components_check_with_legal: number;
  components_pending_review: number;
}

// === UI Helper Types ===

export const LINKING_TYPE_LABELS: Record<LinkingType, string> = {
  [LinkingType.DYNAMICALLY_LINKED]: "Dynamically Linked",
  [LinkingType.STATICALLY_LINKED]: "Statically Linked",
  [LinkingType.SEPARATE_WORK]: "Separate Work",
  [LinkingType.MERELY_AGGREGATED]: "Merely Aggregated",
  [LinkingType.PREREQUISITE]: "Prerequisite",
  [LinkingType.DEV_TOOL_EXCLUDED]: "Dev Tool (Excluded)",
  [LinkingType.UNKNOWN]: "Unknown",
};

export const LINKING_TYPE_ICONS: Record<LinkingType, string> = {
  [LinkingType.DYNAMICALLY_LINKED]: "🔗",
  [LinkingType.STATICALLY_LINKED]: "📦",
  [LinkingType.SEPARATE_WORK]: "🔀",
  [LinkingType.MERELY_AGGREGATED]: "📁",
  [LinkingType.PREREQUISITE]: "⬇️",
  [LinkingType.DEV_TOOL_EXCLUDED]: "🔧",
  [LinkingType.UNKNOWN]: "❓",
};

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  [ComplianceStatus.ALLOWED]: "Allowed",
  [ComplianceStatus.NOT_ALLOWED]: "Not Allowed",
  [ComplianceStatus.CHECK_WITH_LEGAL]: "Check with Legal",
  [ComplianceStatus.PENDING_REVIEW]: "Pending Review",
};

export const COMPLIANCE_STATUS_ICONS: Record<ComplianceStatus, string> = {
  [ComplianceStatus.ALLOWED]: "✅",
  [ComplianceStatus.NOT_ALLOWED]: "❌",
  [ComplianceStatus.CHECK_WITH_LEGAL]: "⚠️",
  [ComplianceStatus.PENDING_REVIEW]: "🔍",
};

export const COMPLIANCE_STATUS_COLORS: Record<ComplianceStatus, { bg: string; text: string; border: string }> = {
  [ComplianceStatus.ALLOWED]: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  [ComplianceStatus.NOT_ALLOWED]: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  [ComplianceStatus.CHECK_WITH_LEGAL]: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  [ComplianceStatus.PENDING_REVIEW]: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

// === Linking Type Review Status UI Helpers ===

export const LINKING_TYPE_REVIEW_STATUS_LABELS: Record<LinkingTypeReviewStatus, string> = {
  [LinkingTypeReviewStatus.PENDING]: "Pending Review",
  [LinkingTypeReviewStatus.CONFIRMED]: "Confirmed",
  [LinkingTypeReviewStatus.OVERRIDDEN]: "Overridden",
};

export const LINKING_TYPE_REVIEW_STATUS_ICONS: Record<LinkingTypeReviewStatus, string> = {
  [LinkingTypeReviewStatus.PENDING]: "⏳",
  [LinkingTypeReviewStatus.CONFIRMED]: "✅",
  [LinkingTypeReviewStatus.OVERRIDDEN]: "✏️",
};

export const LINKING_TYPE_REVIEW_STATUS_COLORS: Record<LinkingTypeReviewStatus, { bg: string; text: string; border: string }> = {
  [LinkingTypeReviewStatus.PENDING]: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  [LinkingTypeReviewStatus.CONFIRMED]: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  [LinkingTypeReviewStatus.OVERRIDDEN]: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

// === Dependency Source UI Helpers ===

export const DEPENDENCY_SOURCE_LABELS: Record<DependencySource, string> = {
  [DependencySource.BASE_IMAGE]: "Base Image",
  [DependencySource.APP_DEPENDENCY]: "App Dependency",
  [DependencySource.UNKNOWN]: "Unknown",
};

export const DEPENDENCY_SOURCE_ICONS: Record<DependencySource, string> = {
  [DependencySource.BASE_IMAGE]: "🐳",
  [DependencySource.APP_DEPENDENCY]: "📦",
  [DependencySource.UNKNOWN]: "❓",
};

// === Confidence Helper Functions ===

export function getConfidenceColor(confidence: number): { bg: string; text: string; border: string } {
  if (confidence >= 80) {
    return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" };
  } else if (confidence >= 50) {
    return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
  } else {
    return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
  }
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return "High";
  if (confidence >= 50) return "Medium";
  return "Low";
}

// === Helper to get final linking type considering overrides ===

export function getFinalLinkingType(component: SbomComponent): LinkingType {
  if (component.linking_type_review_status === LinkingTypeReviewStatus.OVERRIDDEN && component.linking_type_user_override) {
    return component.linking_type_user_override;
  }
  return component.linking_type;
}

// === Helper to parse linking type reasons ===

export function parseLinkingTypeReasons(reasonsJson: string | null | undefined): string[] {
  if (!reasonsJson) return [];
  try {
    const parsed = JSON.parse(reasonsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
