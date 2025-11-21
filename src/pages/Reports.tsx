import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getReport, getReportTrends } from "../api";
import type { GapPublic } from "../types/api";
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

export function Reports() {
  const { reportId } = useParams<{ reportId: string }>();
  const numericReportId = reportId ? parseInt(reportId, 10) : 0;
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(new Set());
  const [showAllClusters, setShowAllClusters] = useState<Set<number>>(new Set());

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
    report: report ? { id: report.id, status: report.status, gaps: report.gaps?.length } : null
  });

  useQuery({
    queryKey: ["report-trends", numericReportId],
    queryFn: () => getReportTrends(numericReportId),
    enabled: !!numericReportId,
  });

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
            criticalCount: categoryGaps.filter(g => g.severity_level === 'critical').length,
            highCount: categoryGaps.filter(g => g.severity_level === 'high').length,
            mediumCount: categoryGaps.filter(g => g.severity_level === 'medium').length,
            lowCount: categoryGaps.filter(g => g.severity_level === 'low').length,
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

      Object.entries(categoryGroups).forEach(([category, gaps]) => {
        // Debug risk scores
        console.log(`Risk scores for ${category}:`, gaps.map(g => ({ risk_score: g.risk_score, type: typeof g.risk_score })));

        clusters.push({
          category,
          gaps,
          criticalCount: gaps.filter((g: GapPublic) => g.severity_level === 'critical').length,
          highCount: gaps.filter((g: GapPublic) => g.severity_level === 'high').length,
          mediumCount: gaps.filter((g: GapPublic) => g.severity_level === 'medium').length,
          lowCount: gaps.filter((g: GapPublic) => g.severity_level === 'low').length,
        });
      });
    }

    // Last resort: if still no clusters, create one big cluster with all gaps
    if (clusters.length === 0) {
      console.log('Creating single cluster with all gaps');
      clusters.push({
        category: 'All Compliance Gaps',
        gaps: report.gaps,
        criticalCount: report.gaps.filter(g => g.severity_level === 'critical').length,
        highCount: report.gaps.filter(g => g.severity_level === 'high').length,
        mediumCount: report.gaps.filter(g => g.severity_level === 'medium').length,
        lowCount: report.gaps.filter(g => g.severity_level === 'low').length,
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
                Create Remediation Plan
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Summary */}
        {isProcessingComplete && (
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {report.gaps?.filter(g => g.severity_level === 'critical').length || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Critical Gaps</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {report.gaps?.filter(g => g.severity_level === 'high').length || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">High Risk</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {report.gaps?.filter(g => g.severity_level === 'medium').length || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Medium Risk</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {report.gaps?.filter(g => g.severity_level === 'low').length || 0}
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

      {/* Gap Clusters */}
      {hasReport && isProcessingComplete && clusters.length > 0 && (
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
                                score={Math.round((Number(gap.risk_score) || 0) * 100)}
                                severity={gap.severity_level}
                              />
                              {gap.gap_type && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {gap.gap_type}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-900 font-medium mb-1">
                              {gap.gap_description}
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
    </div>
  );
}
