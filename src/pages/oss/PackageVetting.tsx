import { useState } from "react";
import { ossService } from "../../services/ossService";
import type { LiveCVECheckResponse, LiveLicenseCheckResponse } from "../../types/oss";

interface VettingResult {
  package_name: string;
  cve_data: LiveCVECheckResponse;
  license_data: LiveLicenseCheckResponse;
  overall_risk: "SAFE" | "CAUTION" | "CRITICAL";
  recommendation: string;
}

export function PackageVetting() {
  const [packageName, setPackageName] = useState("");
  const [packageVersion, setPackageVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VettingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!packageName.trim()) {
      setError("Please enter a package name");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const vettingResult = await ossService.vetPackage(
        packageName.trim(),
        packageVersion.trim() || undefined
      );
      setResult(vettingResult as unknown as VettingResult);
    } catch (err: any) {
      let message = err instanceof Error ? err.message : "Failed to vet package";

      // Enhanced error handling for specific status codes
      if (err.response?.status === 404) {
        message = "Package or version not found in database";
      } else if (err.response?.status === 503) {
        message = "External API is currently unavailable. Please try again later.";
      } else if (err.response?.status === 400) {
        message = "Invalid package name or version format";
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (
    risk: "SAFE" | "CAUTION" | "CRITICAL"
  ): string => {
    switch (risk) {
      case "SAFE":
        return "bg-green-100 border-green-300 text-green-800";
      case "CAUTION":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "CRITICAL":
        return "bg-red-100 border-red-300 text-red-800";
    }
  };

  const getStatusColor = (
    status: "safe" | "low_risk" | "medium_risk" | "high_risk" | "critical"
  ): string => {
    switch (status) {
      case "safe":
        return "bg-green-50 border-green-300 text-green-800";
      case "low_risk":
        return "bg-blue-50 border-blue-300 text-blue-800";
      case "medium_risk":
        return "bg-yellow-50 border-yellow-300 text-yellow-800";
      case "high_risk":
        return "bg-orange-50 border-orange-300 text-orange-800";
      case "critical":
        return "bg-red-50 border-red-300 text-red-800";
    }
  };

  const getStatusIcon = (
    status: "safe" | "low_risk" | "medium_risk" | "high_risk" | "critical"
  ): string => {
    switch (status) {
      case "safe":
        return "🟢";
      case "low_risk":
        return "🔵";
      case "medium_risk":
        return "🟡";
      case "high_risk":
        return "🟠";
      case "critical":
        return "🔴";
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-[#e0e0e0]">
        <h1 className="text-[#131416] text-2xl font-bold leading-tight">
          Package Vetting
        </h1>
        <p className="text-[#5a5f66] text-sm mt-2">
          Check open-source packages for vulnerabilities and license compliance before use
        </p>
      </div>

      {/* Search Section */}
      <div className="p-6 border-b border-[#e0e0e0] bg-[#f9f9f9]">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              disabled={loading}
              placeholder="Package name (e.g., react, django, express)..."
              className="flex-1 px-4 py-3 bg-white border border-[#d0d0d0] rounded-lg text-[#131416] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <input
              type="text"
              value={packageVersion}
              onChange={(e) => setPackageVersion(e.target.value)}
              disabled={loading}
              placeholder="Version (optional, e.g., 4.1.0)..."
              className="w-32 px-4 py-3 bg-white border border-[#d0d0d0] rounded-lg text-[#131416] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {loading ? "Checking..." : "Check Package"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="p-6 space-y-6">
          {/* Header with package info */}
          <div className="border-b border-[#e0e0e0] pb-4">
            <h2 className="text-[#131416] text-xl font-bold">
              {result.package_name}
              {result.cve_data.version && (
                <span className="text-[#5a5f66] text-sm font-normal ml-2">v{result.cve_data.version}</span>
              )}
            </h2>
            <p className="text-[#5a5f66] text-sm mt-2">{result.recommendation}</p>
          </div>

          {/* Overall Risk Card */}
          {(() => {
            let riskIcon = "✅";
            if (result.overall_risk === "CAUTION") {
              riskIcon = "⚠️";
            } else if (result.overall_risk === "CRITICAL") {
              riskIcon = "🚫";
            }
            return (
              <div
                className={`p-6 rounded-lg border-2 ${getRiskColor(result.overall_risk)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-75">Overall Risk Assessment</p>
                    <p className="text-2xl font-bold mt-2">{result.overall_risk}</p>
                  </div>
                  <div className="text-4xl">{riskIcon}</div>
                </div>
              </div>
            );
          })()}

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-6">
            {/* Security/CVE Card */}
            <div className="border border-[#e0e0e0] rounded-lg p-6">
              <h3 className="text-[#131416] font-semibold mb-4">🔒 Security Vulnerabilities</h3>

              {/* Vulnerability Summary */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div className="bg-red-50 p-2 rounded text-center">
                    <p className="font-bold text-red-700">{result.cve_data.summary.critical}</p>
                    <p className="text-red-600">Critical</p>
                  </div>
                  <div className="bg-orange-50 p-2 rounded text-center">
                    <p className="font-bold text-orange-700">{result.cve_data.summary.high}</p>
                    <p className="text-orange-600">High</p>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded text-center">
                    <p className="font-bold text-yellow-700">{result.cve_data.summary.medium}</p>
                    <p className="text-yellow-600">Medium</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-center">
                    <p className="font-bold text-blue-700">{result.cve_data.summary.low}</p>
                    <p className="text-blue-600">Low</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <p className="font-bold text-gray-700">{result.cve_data.summary.total}</p>
                    <p className="text-gray-600">Total</p>
                  </div>
                </div>
              </div>

              {/* Vulnerabilities List */}
              {result.cve_data.vulnerabilities && result.cve_data.vulnerabilities.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.cve_data.vulnerabilities.map((vuln) => {
                    const severityColor: Record<string, string> = {
                      Critical: "bg-red-50 border-red-200 text-red-700",
                      High: "bg-orange-50 border-orange-200 text-orange-700",
                      Medium: "bg-yellow-50 border-yellow-200 text-yellow-700",
                      Low: "bg-blue-50 border-blue-200 text-blue-700",
                    };
                    return (
                      <div key={vuln.cve_id} className={`p-3 border rounded text-sm ${severityColor[vuln.severity] || ""}`}>
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-semibold">{vuln.cve_id}</p>
                          <span className="font-bold">{vuln.severity}</span>
                        </div>
                        <p className="text-xs opacity-75 mb-1">{vuln.description.substring(0, 100)}...</p>
                        <p className="text-xs opacity-75">CVSS: {vuln.cvss.toFixed(1)} | Published: {new Date(vuln.published).toLocaleDateString()}</p>
                        {vuln.remediation && (
                          <p className="text-xs mt-1 font-semibold">Action: {vuln.remediation}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm font-semibold text-green-700">✅ No vulnerabilities found</p>
                </div>
              )}

              {/* CVE Status */}
              <div className={`mt-4 p-3 border rounded ${getStatusColor(result.cve_data.status)}`}>
                <p className="text-sm font-semibold">
                  {getStatusIcon(result.cve_data.status)} Status: {result.cve_data.status.toUpperCase().replaceAll("_", " ")}
                </p>
              </div>

              {/* License from CVE data */}
              {result.cve_data.license && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-600 font-semibold">
                    📦 License ({result.cve_data.license_source}): {result.cve_data.license}
                  </p>
                </div>
              )}

              <p className="text-xs text-[#5a5f66] mt-4 pt-3 border-t border-[#e0e0e0]">
                Source: {result.cve_data.source} | Last checked: {new Date(result.cve_data.last_checked).toLocaleString()}
              </p>
            </div>

            {/* License Card */}
            <div className="border border-[#e0e0e0] rounded-lg p-6">
              <h3 className="text-[#131416] font-semibold mb-4">⚖️ License Information</h3>

              <div className="space-y-3">
                {/* License Badge */}
                <div>
                  <p className="text-[#5a5f66] text-sm mb-2">License Type</p>
                  <div
                    className={`px-4 py-2 rounded-lg font-semibold text-white w-fit ${
                      result.license_data.verified ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  >
                    {result.license_data.license}
                  </div>
                </div>

                {/* SPDX ID */}
                {result.license_data.spdx_id && (
                  <div>
                    <p className="text-[#5a5f66] text-sm mb-2">SPDX ID</p>
                    <p className="text-sm text-[#131416] font-mono bg-[#f5f5f5] p-2 rounded">
                      {result.license_data.spdx_id}
                    </p>
                  </div>
                )}

                {/* Verification Status */}
                <div className={`p-3 rounded-lg border ${
                  result.license_data.verified 
                    ? "bg-green-50 border-green-200" 
                    : "bg-yellow-50 border-yellow-200"
                }`}>
                  <p className={`text-xs font-semibold ${
                    result.license_data.verified 
                      ? "text-green-700" 
                      : "text-yellow-700"
                  }`}>
                    {result.license_data.verified
                      ? "✅ Verified from official source"
                      : "⚠️ License extracted from CVE database"}
                  </p>
                  {!result.license_data.verified && result.license_data.message && (
                    <p className="text-xs mt-1 opacity-75">{result.license_data.message}</p>
                  )}
                </div>

                {/* Project URLs */}
                {result.license_data.project_urls && Object.keys(result.license_data.project_urls).length > 0 && (
                  <div>
                    <p className="text-[#5a5f66] text-sm font-semibold mb-2">🔗 Project Links</p>
                    <div className="space-y-1 text-xs">
                      {result.license_data.project_urls.Homepage && (
                        <a
                          href={result.license_data.project_urls.Homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline truncate"
                          title={result.license_data.project_urls.Homepage}
                        >
                          📄 Homepage
                        </a>
                      )}
                      {result.license_data.project_urls.Repository && (
                        <a
                          href={result.license_data.project_urls.Repository}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline truncate"
                          title={result.license_data.project_urls.Repository}
                        >
                          🔗 Repository
                        </a>
                      )}
                      {result.license_data.project_urls.Documentation && (
                        <a
                          href={result.license_data.project_urls.Documentation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline truncate"
                          title={result.license_data.project_urls.Documentation}
                        >
                          📚 Documentation
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-[#5a5f66] mt-4 pt-3 border-t border-[#e0e0e0]">
                Source: {result.license_data.source} | Last checked: {new Date(result.license_data.last_checked).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Check Another Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => {
                setPackageName("");
                setPackageVersion("");
                setResult(null);
                setError(null);
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Check Another Package
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-[#d0d0d0] mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-[#5a5f66] text-lg">
            Enter a package name to start vetting
          </p>
        </div>
      )}
    </div>
  );
}
