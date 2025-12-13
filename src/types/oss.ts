/**
 * OSS Compliance Types based on OpenAPI spec
 */

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

export interface PackageVettingResult {
  package_name: string;
  cve_data: LiveCVECheckResponse;
  license_data: LiveLicenseCheckResponse;
  overall_risk: "SAFE" | "CAUTION" | "CRITICAL";
  recommendation: string;
}
