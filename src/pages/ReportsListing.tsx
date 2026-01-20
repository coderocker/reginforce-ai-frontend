import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getReports, getAnalysisStats, deleteReport } from "../api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatusPill } from "../components/ui/StatusPill";
import NewAnalysisModal from "../components/NewAnalysisModal";
import type { ReportPublic } from "../types/api";

export function ReportsListing() {
  const queryClient = useQueryClient();

  const {
    data: reports = [],
    isLoading: reportsLoading,
    error,
  } = useQuery({
    queryKey: ["reports"],
    queryFn: getReports,
  });

  // Get stats from API with unique query key for reports page
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["analysis-stats", "reports-listing"],
    queryFn: getAnalysisStats,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
    retry: 3,
  });

  const isLoading = reportsLoading || statsLoading;

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // New Analysis modal state
  const [showNewAnalysis, setShowNewAnalysis] = useState(false);
  // Delete confirmation state
  const [deleteConfirmReport, setDeleteConfirmReport] = useState<ReportPublic | null>(null);
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Toast helper
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (reportId: number) => deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['analysis-stats'] });
      setDeleteConfirmReport(null);
      showToast("Report deleted successfully", "success");
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to delete report", "error");
    },
  });

  const handleDeleteConfirm = () => {
    if (deleteConfirmReport) {
      deleteMutation.mutate(deleteConfirmReport.id);
    }
  };

  // Filter reports based on status
  const filteredReports = React.useMemo(() => {
    if (statusFilter === 'all') return reports;

    const statusMap = {
      'completed': 'processed',
      'processing': 'processing',
      'failed': 'error'
    };

    return reports.filter(report => report.status === statusMap[statusFilter as keyof typeof statusMap]);
  }, [reports, statusFilter]);

  // Enhanced debug logging
  console.log('=== ReportsListing Debug ===');
  console.log('Stats API Call Status:', {
    statsLoading,
    hasStatsData: !!stats,
    statsData: stats,
    statsError: statsError?.message || null,
    reportsCount: reports?.length || 0,
    reportsLoading
  });

  if (stats) {
    console.log('✅ Stats from API:', stats);
  } else if (statsError) {
    console.error('❌ Stats API Error:', statsError);
  } else if (statsLoading) {
    console.log('⏳ Stats API Loading...');
  } else {
    console.log('⚠️ No stats data available');
  }

  // Test direct fetch on mount
  React.useEffect(() => {
    const testDirectFetch = async () => {
      try {
        console.log('🔍 Testing direct fetch to /api/analysis/reports/statistics');
        const response = await fetch('/api/analysis/reports/statistics');
        console.log('Direct fetch status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Direct fetch data:', data);
        } else {
          const text = await response.text();
          console.log('Direct fetch error response:', text);
        }
      } catch (error) {
        console.error('Direct fetch failed:', error);
      }
    };
    testDirectFetch();
  }, []);







  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Reports loading error:', error);
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to Load Reports
          </h2>
          <p className="text-gray-600 mb-4">
            There was an error loading your analysis reports: {error.message}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Link to="/">
              <Button variant="secondary">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysis Reports</h1>
          <p className="text-gray-600 mt-1">
            View and manage your compliance analysis reports
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowNewAnalysis(true)}
        >
          New Analysis
        </Button>
      </div>

      {/* Summary Stats */}
      {(reports.length > 0 || stats) && (
        <div>
          {/* Show warning if stats API failed but we have reports */}
          {statsError && reports.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800">
                ⚠️ Stats API unavailable - showing calculated values from reports data.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.total_analyses || reports.length}
                </div>
                <div className="text-sm text-gray-600">Total Reports</div>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats?.total_completed || reports.filter(r => r.status === 'processed').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats?.total_processing || reports.filter(r => r.status === 'processing').length}
                </div>
                <div className="text-sm text-gray-600">Processing</div>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <div className="flex justify-center items-baseline gap-2 mb-2">
                  <div className="flex flex-col items-center">
                    <div className="text-xl font-bold text-red-600">
                      {stats?.total_critical || reports.reduce((acc, r) => acc + (r.gaps?.filter(g => (g.severity || g.severity_level)?.toLowerCase() === 'critical').length || 0), 0)}
                    </div>
                    <div className="text-xs text-red-500 font-medium">Critical</div>
                  </div>
                  <div className="text-gray-300 text-lg">+</div>
                  <div className="flex flex-col items-center">
                    <div className="text-xl font-bold text-orange-600">
                      {stats?.total_high || reports.reduce((acc, r) => acc + (r.gaps?.filter(g => (g.severity || g.severity_level)?.toLowerCase() === 'high').length || 0), 0)}
                    </div>
                    <div className="text-xs text-orange-500 font-medium">High</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">High Risk Issues</div>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats?.total_gaps || reports.reduce((acc, r) => acc + (r.gaps?.length || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Gaps</div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Reports Grid */}
      {reports.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Reports Yet
            </h3>
            <p className="text-gray-600 mb-4">
              Start by uploading documents and running your first compliance analysis.
            </p>
            <Link to="/documents">
              <Button variant="primary">
                Upload Documents
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div>
          {/* Filters and Sorting */}
          <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              <select
                aria-label="Filter reports by status"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredReports.length} of {reports.length} reports
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Reports Match Your Filter
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filter criteria or clear the filter to see all reports.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setStatusFilter('all')}
                >
                  Clear Filter
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredReports
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((report) => (
                  <Card key={report.id}>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Report #{report.id}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {new Date(report.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <StatusPill status={report.status} />
                      </div>

                      {/* Summary Stats */}
                      {report.status === "processed" && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="text-center p-2 bg-red-50 rounded">
                            <div className="text-lg font-semibold text-red-600">
                              {report.total_critical || 0}
                            </div>
                            <div className="text-xs text-red-600">Critical</div>
                          </div>
                          <div className="text-center p-2 bg-orange-50 rounded">
                            <div className="text-lg font-semibold text-orange-600">
                              {report.total_high || 0}
                            </div>
                            <div className="text-xs text-orange-600">High</div>
                          </div>
                          <div className="text-center p-2 bg-yellow-50 rounded">
                            <div className="text-lg font-semibold text-yellow-600">
                              {report.total_medium || 0}
                            </div>
                            <div className="text-xs text-yellow-600">Medium</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="text-lg font-semibold text-green-600">
                              {report.total_low || 0}
                            </div>
                            <div className="text-xs text-green-600">Low</div>
                          </div>
                        </div>
                      )}

                      {/* Processing State */}
                      {report.status === "processing" && (
                        <div className="mb-4 text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <div className="text-sm text-gray-600">Analysis in progress...</div>
                        </div>
                      )}

                      {/* Gap Count - Only for processed reports */}
                      {report.status === "processed" && (
                        <div className="mb-4 text-center text-sm text-gray-600 border-t pt-2">
                          {report.gaps.length} total gaps identified
                        </div>
                      )}                                          {/* Actions */}
                      <div className="flex gap-2 items-center">
                        <Link to={`/reports/${report.id}`} className="flex-1 min-w-0">
                          <Button variant="primary" size="sm" className="w-full">
                            View
                          </Button>
                        </Link>
                        <Link to={`/remediation/${report.id}`} className="flex-shrink-0">
                          <Button variant="secondary" size="sm">
                            Fix
                          </Button>
                        </Link>
                        <button
                          onClick={() => setDeleteConfirmReport(report)}
                          disabled={report.status === 'processing'}
                          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors ${
                            report.status === 'processing'
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                          }`}
                          title={report.status === 'processing' ? 'Cannot delete while processing' : 'Delete report'}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      <NewAnalysisModal
        isOpen={showNewAnalysis}
        onClose={() => setShowNewAnalysis(false)}
        onSuccess={() => {
          // Invalidate and refetch reports data
          queryClient.invalidateQueries({ queryKey: ['reports'] });
          queryClient.invalidateQueries({ queryKey: ['analysis-stats', 'reports-listing'] });
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmReport && (
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
                Are you sure you want to delete <strong>Report #{deleteConfirmReport.id}</strong>?
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
                onClick={() => setDeleteConfirmReport(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <button
                onClick={handleDeleteConfirm}
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
