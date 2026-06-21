import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getReport, getReportTrends, deleteReport, getRemediationPlanForReport } from "../api";
import type { GapPublic } from "../types/api";
import { getGapRiskPercent, getGapSeverity } from "../utils/gapUtils";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { RiskBadge } from "../components/ui/RiskBadge";
import { StatusPill } from "../components/ui/StatusPill";

interface GapCluster {
  category: string;
  gaps: GapPublic[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

// Helper to get description from either 'description' (backend) or 'gap_description' (legacy)
const getGapDescription = (gap: GapPublic): string => {
  return gap.description || gap.gap_description || 'No description';
};

export function Reports() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const numericReportId = reportId ? parseInt(reportId, 10) : 0;
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(new Set());
  const [showAllClusters, setShowAllClusters] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Toast helper
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteReport(numericReportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['analysis-stats'] });
      showToast("Report deleted successfully", "success");
      // Navigate to reports list after short delay
      setTimeout(() => navigate('/reports'), 1500);
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to delete report", "error");
      setShowDeleteConfirm(false);
    },
  });

  console.log('Reports page loaded with reportId:', reportId, 'numeric:', numericReportId);

  const {
    data: report,
    isLoading,
    error,
    status,
    fetchStatus,
  } = useQuery({
    queryKey: ["report", numericReportId],
    queryFn: async () => {
      console.log('Fetching report for ID:', numericReportId);
      try {
        const result = await getReport(numericReportId);
        console.log('Report fetch successful:', result);
        return result;
      } catch (err: unknown) {
        const error = err as { response?: { status?: number; data?: unknown }; message?: string };
        console.error('Report fetch error:', error.response?.status, error.response?.data, error.message);
        throw err;
      }
    },
    enabled: !!numericReportId && !isNaN(numericReportId),
    retry: 1,
    // Poll every 3 seconds when analysis is in progress
    refetchInterval: (query) => {
      const reportData = query?.state?.data;
      const isStillProcessing = reportData?.status === 'processing' || reportData?.status === 'pending';
      return isStillProcessing ? 3000 : false;
    },
    refetchIntervalInBackground: false,
  });

  console.log('Query state:', {
    isLoading,
    status,
    fetchStatus,
    error: error?.message,
    errorStatus: (error as { response?: { status?: number } })?.response?.status,
    report: report ? { 
      id: report.id, 
      status: report.status, 
      gapsLength: report.gaps?.length,
      gapsData: report.gaps,
      allReportKeys: Object.keys(report)
    } : null
  });

  useQuery({
    queryKey: ["report-trends"],
    queryFn: () => getReportTrends(),
    enabled: !!numericReportId,
  });

  // Check if remediation plan exists for this report
  const { data: existingRemediationPlan } = useQuery({
    queryKey: ["remediation-plan-check", numericReportId],
    queryFn: () => getRemediationPlanForReport(numericReportId),
    enabled: !!numericReportId,
  });

  const hasRemediationPlan = !!existingRemediationPlan;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analysis report #{numericReportId}...</p>
          <p className="mt-2 text-sm text-gray-500">Fetching from: /api/analysis/{numericReportId}</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    console.error('Report loading error:', error);
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Report Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            {error ?
              `Error: ${error.message}` :
              `Report ID ${numericReportId} could not be loaded. It may still be processing or doesn't exist.`
            }
          </p>
          <div className="flex gap-2 justify-center">
            <Link to="/">
              <Button variant="primary">Return to Dashboard</Button>
            </Link>
            <Link to="/reports">
              <Button variant="secondary">All Reports</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Cluster gaps by category using cluster_summaries or fallback grouping
  const clusters: GapCluster[] = [];

  console.log('Clustering debug:', {
    hasClusterSummaries: !!report.cluster_summaries,
    gapsCount: report.gaps?.length,
    firstGap: report.gaps?.[0],
    clusterSummaries: report.cluster_summaries
  });

  // Always ensure we have gaps displayed, regardless of clustering
  if (report.gaps && report.gaps.length > 0) {
    if (report.cluster_summaries && Object.keys(report.cluster_summaries).length > 0) {
      // Use AI-generated cluster summaries
      console.log('Using AI cluster summaries');
      Object.entries(report.cluster_summaries).forEach(([category]) => {
        const categoryGaps = report.gaps.filter((gap) =>
          gap.gap_type?.toLowerCase().includes(category.toLowerCase()) ||
          gap.gap_description?.toLowerCase().includes(category.toLowerCase())
        );

        console.log(`Cluster ${category}:`, { categoryGaps: categoryGaps.length });

        if (categoryGaps.length > 0) {
          clusters.push({
            category: category,
            gaps: categoryGaps,
            criticalCount: categoryGaps.filter(g => getGapSeverity(g)?.toLowerCase() === 'critical').length,
            highCount: categoryGaps.filter(g => getGapSeverity(g)?.toLowerCase() === 'high').length,
            mediumCount: categoryGaps.filter(g => getGapSeverity(g)?.toLowerCase() === 'medium').length,
            lowCount: categoryGaps.filter(g => getGapSeverity(g)?.toLowerCase() === 'low').length,
          });
        }
      });
    }

    // If no clusters were created from AI summaries, use fallback grouping
    if (clusters.length === 0) {
      console.log('Using fallback clustering - grouping by gap_type');
      const categoryGroups = report.gaps.reduce((acc, gap) => {
        const category = gap.gap_type || 'Compliance Gaps';
        if (!acc[category]) acc[category] = [];
        acc[category].push(gap);
        return acc;
      }, {} as Record<string, GapPublic[]>);

      console.log('Category groups:', categoryGroups);
      console.log('First gap structure:', report.gaps[0]);

      Object.entries(categoryGroups).forEach(([category, gaps]) => {
        // Debug: Log actual gap properties
        if (gaps.length > 0) {
          console.log(`Gap properties for ${category}:`, {
            firstGap: gaps[0],
            hasSeverity: 'severity' in gaps[0],
            severityValue: gaps[0].severity,
            hasRiskScore: 'risk_score' in gaps[0],
            riskScoreValue: gaps[0].risk_score,
          });
        }

        clusters.push({
          category,
          gaps,
          criticalCount: gaps.filter((g: GapPublic) => getGapSeverity(g)?.toLowerCase() === 'critical').length,
          highCount: gaps.filter((g: GapPublic) => getGapSeverity(g)?.toLowerCase() === 'high').length,
          mediumCount: gaps.filter((g: GapPublic) => getGapSeverity(g)?.toLowerCase() === 'medium').length,
          lowCount: gaps.filter((g: GapPublic) => getGapSeverity(g)?.toLowerCase() === 'low').length,
        });
      });
    }

    // Last resort: if still no clusters, create one big cluster with all gaps
    if (clusters.length === 0) {
      console.log('Creating single cluster with all gaps');
      clusters.push({
        category: 'All Compliance Gaps',
        gaps: report.gaps,
        criticalCount: report.gaps.filter(g => getGapSeverity(g)?.toLowerCase() === 'critical').length,
        highCount: report.gaps.filter(g => getGapSeverity(g)?.toLowerCase() === 'high').length,
        mediumCount: report.gaps.filter(g => getGapSeverity(g)?.toLowerCase() === 'medium').length,
        lowCount: report.gaps.filter(g => getGapSeverity(g)?.toLowerCase() === 'low').length,
      });
    }
  }

  console.log('Final clusters:', clusters.length, clusters);

  const isProcessingComplete = report?.status === 'processed';
  const isProcessing = report?.status === 'processing' || report?.status === 'pending';
  const hasReport = !!report;

  console.log('Render conditions:', { hasReport, isProcessingComplete, isProcessing, reportStatus: report?.status });

  return (
    <div className="space-y-6">
      {/* Header with KPIs */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Compliance Analysis Report
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Report ID: {report.id}</span>
              <span>Created: {new Date(report.created_at).toLocaleDateString()}</span>
              <StatusPill status={report.status} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              Export PDF
            </Button>
            <Link to={`/remediation/${report.id}`}>
              <Button variant="primary" size="sm">
                {hasRemediationPlan ? '📋 View Remediation Plan' : '🚀 Create Remediation Plan'}
              </Button>
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={report.status === 'processing'}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                report.status === 'processing'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}
              title={report.status === 'processing' ? 'Cannot delete while processing' : 'Delete report'}
            >
              🗑️ Delete
            </button>
          </div>
        </div>

        {/* KPI Summary */}
        {isProcessingComplete && (
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {report.gaps?.filter(g => {
                  // Check both 'severity' (backend) and 'severity_level' (legacy)
                  const sev = g.severity || (g as any).severity_level;
                  return sev === 'critical' || sev === 'CRITICAL';
                }).length || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Critical Gaps</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {report.gaps?.filter(g => {
                  const sev = g.severity || (g as any).severity_level;
                  return sev === 'high' || sev === 'HIGH';
                }).length || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">High Risk</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {report.gaps?.filter(g => {
                  const sev = g.severity || (g as any).severity_level;
                  return sev === 'medium' || sev === 'MEDIUM';
                }).length || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Medium Risk</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {report.gaps?.filter(g => {
                  const sev = g.severity || (g as any).severity_level;
                  return sev === 'low' || sev === 'LOW';
                }).length || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Low Risk</div>
            </div>
          </div>
        )}
      </div>

      {/* Processing Status */}
      {hasReport && isProcessing && (
        <Card>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Analysis in Progress
            </h3>
            <p className="text-gray-600">
              Your compliance analysis is being processed. This may take several minutes.
            </p>
            <div className="mt-4">
              <StatusPill status={report.status} />
            </div>
          </div>
        </Card>
      )}

      {/* Report not loaded yet but no error */}
      {!hasReport && !isLoading && !error && (
        <Card>
          <div className="text-center py-8">
            <div className="text-yellow-500 text-6xl mb-4">⏳</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Report Not Available
            </h3>
            <p className="text-gray-600">
              This report may still be processing or may not exist.
            </p>
            <div className="mt-4 flex gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh
              </button>
              <Link to="/reports">
                <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                  View All Reports
                </button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Debug: Show gaps status */}
      {hasReport && (
        <Card>
          <div className="p-4 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Debug Info:</p>
            <ul className="text-xs text-gray-600 mt-2 space-y-1">
              <li>Report Status: <span className="font-mono">{report.status}</span></li>
              <li>Has Gaps Data: <span className="font-mono">{report.gaps ? 'Yes' : 'No'}</span></li>
              <li>Gaps Count: <span className="font-mono">{report.gaps?.length || 0}</span></li>
              <li>Clusters Built: <span className="font-mono">{clusters.length}</span></li>
              <li>isProcessingComplete: <span className="font-mono">{isProcessingComplete.toString()}</span></li>
            </ul>
          </div>
        </Card>
      )}

      {/* Gap Clusters - Always show if gaps exist */}
      {hasReport && (report.gaps?.length ?? 0) > 0 && clusters.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Compliance Gaps by Category
          </h2>

          {clusters.map((cluster, index) => (
            <Card key={index}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {cluster.category}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-red-600">
                        {cluster.criticalCount} Critical
                      </span>
                      <span className="text-orange-600">
                        {cluster.highCount} High
                      </span>
                      <span className="text-yellow-600">
                        {cluster.mediumCount} Medium
                      </span>
                      <span className="text-green-600">
                        {cluster.lowCount} Low
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setExpandedClusters(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(index)) {
                          newSet.delete(index);
                        } else {
                          newSet.add(index);
                        }
                        return newSet;
                      });
                    }}
                  >
                    {expandedClusters.has(index) ? 'Hide Details' : 'View Details'}
                  </Button>
                </div>

                {/* Gap Details */}
                {expandedClusters.has(index) && (
                  <div className="space-y-3 mt-4">
                    {cluster.gaps.slice(0, showAllClusters.has(index) ? cluster.gaps.length : 3).map((gap) => {
                      return (
                        <div
                          key={gap.id}
                          className="flex justify-between items-start p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <RiskBadge
                                score={getGapRiskPercent(gap)}
                                severity={getGapSeverity(gap) as any}
                              />
                              {gap.gap_type && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {gap.gap_type}
                                </span>
                              )}
                            </div>
                            {gap.title && (
                              <p className="text-gray-900 font-semibold mb-1">
                                {gap.title}
                              </p>
                            )}
                            <p className="text-gray-700 mb-1">
                              {getGapDescription(gap)}
                            </p>
                            {gap.policy_section && (
                              <p className="text-gray-600 text-sm">
                                Policy: {gap.policy_section}
                              </p>
                            )}
                            {gap.regulation_section && (
                              <p className="text-gray-600 text-sm">
                                Regulation: {gap.regulation_section}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {cluster.gaps.length > 3 && (
                      <div className="text-center pt-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            console.log('View All button clicked for cluster:', index, 'gaps:', cluster.gaps.length);
                            setShowAllClusters(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(index)) {
                                newSet.delete(index);
                              } else {
                                newSet.add(index);
                              }
                              console.log('New showAll clusters:', newSet);
                              return newSet;
                            });
                          }}
                        >
                          {showAllClusters.has(index) ? 'Show Less' : `View All ${cluster.gaps.length} Gaps`}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {hasReport && isProcessingComplete && clusters.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <div className="text-green-500 text-6xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Compliance Gaps Found
            </h3>
            <p className="text-gray-600">
              Great news! Your analysis didn't identify any compliance gaps.
            </p>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Analysis Report
                </h3>
              </div>
            </div>

            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <strong>Report #{numericReportId}</strong>?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ Warning:</strong> This will also delete all associated compliance gaps 
                  and cannot be undone.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                  deleteMutation.isPending
                    ? 'bg-red-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {deleteMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Deleting...
                  </span>
                ) : (
                  'Delete Report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 transition-all ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-80"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
