import { apiClient } from "../api/client";
import type {
  LiveCVECheckResponse,
  LiveLicenseCheckResponse,
  LiveCompatibilityCheckResponse,
  VulnerabilityStatistics,
} from "../types/oss";

class OSSService {

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
