import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { APP_NAME } from '../constants/branding';
import { getDocuments, getReports, getAnalysisStats } from '../api';
import { getGapSeverity } from '../utils/gapUtils';
import { ossService } from '../services/ossService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import NewAnalysisModal from '../components/NewAnalysisModal';

export function Dashboard() {
  const [showNewAnalysis, setShowNewAnalysis] = useState(false);

  // Fetch dashboard data
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => getDocuments(),
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['analysis-stats'],
    queryFn: getAnalysisStats,
  });

  // Fetch OSS compliance stats
  const { data: ossStats, isLoading: ossLoading } = useQuery({
    queryKey: ['oss-compliance-stats'],
    queryFn: () => ossService.getComplianceStatistics(),
    staleTime: 60000, // 1 minute
  });

  // Calculate dashboard metrics from stats API with fallback to reports data
  const totalDocuments = stats?.total_documents || documents.length;
  const totalReports = stats?.total_analyses || reports.length;
  const completedReports = reports.filter(r => r.status === 'processed' || r.status === 'completed');
  
  // Calculate gaps from reports if stats doesn't provide them
  const calculatedGaps = reports.reduce((acc, r) => acc + (r.gaps?.length || 0), 0);
  const calculatedCritical = reports.reduce((acc, r) => 
    acc + (r.gaps?.filter(g => getGapSeverity(g)?.toLowerCase() === 'critical').length || 0), 0);
  const calculatedHigh = reports.reduce((acc, r) => 
    acc + (r.gaps?.filter(g => getGapSeverity(g)?.toLowerCase() === 'high').length || 0), 0);
  
  const totalGaps = stats?.total_gaps || calculatedGaps;
  const totalCritical = stats?.total_critical || calculatedCritical;
  const totalHigh = stats?.total_high || calculatedHigh;
  const totalHighRiskGaps = totalCritical + totalHigh;

  // Recent activity
  const recentReports = reports
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentDocuments = documents
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  const isLoading = documentsLoading || reportsLoading || statsLoading;

  return (
    <>
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f1f2f3] px-10 py-3">
        <div className="flex items-center gap-4 text-[#131416]">
          <h2 className="text-[#131416] text-lg font-bold leading-tight tracking-[-0.015em]">
            Dashboard
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setShowNewAnalysis(true)}
          >
            New Analysis
          </Button>
          <Link to="/documents">
            <Button variant="secondary">Upload Documents</Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-col p-6 gap-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Total Documents</h3>
                  <p className="text-3xl font-bold mt-2 text-gray-900">
                    {isLoading ? '...' : totalDocuments}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats?.total_regulations || documents.filter(d => d.doc_type === 'regulation').length} regulations, {' '}
                    {stats?.total_policies || documents.filter(d => d.doc_type === 'policy').length} policies
                  </p>
                </div>
                <div className="text-3xl">📄</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Total Reports</h3>
                  <p className="text-3xl font-bold mt-2 text-gray-900">
                    {isLoading ? '...' : totalReports}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {completedReports.length} completed
                  </p>
                </div>
                <div className="text-3xl">📊</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Total Gaps</h3>
                  <p className="text-3xl font-bold mt-2 text-gray-900">
                    {isLoading ? '...' : totalGaps}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Across all completed reports
                  </p>
                </div>
                <div className="text-3xl">⚠️</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">High Risk Gaps</h3>
                  <div className="mt-2 flex items-baseline gap-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-red-600">
                        {isLoading ? '...' : totalCritical}
                      </span>
                      <span className="text-xs text-red-500 font-medium">Critical</span>
                    </div>
                    <div className="text-gray-300">+</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-orange-600">
                        {isLoading ? '...' : totalHigh}
                      </span>
                      <span className="text-xs text-orange-500 font-medium">High</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Total: <span className="font-semibold">{isLoading ? '...' : totalHighRiskGaps}</span> requiring immediate attention
                  </p>
                </div>
                <div className="text-3xl">🚨</div>
              </div>
            </div>
          </Card>
        </div>

        {/* OSS Compliance Overview */}
        <Card className="border-2 border-emerald-100">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                📊 License Compliance Overview
              </h3>
              <Link to="/oss/components">
                <Button variant="secondary" size="sm">View All Components</Button>
              </Link>
            </div>
            
            {ossLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : ossStats && ossStats.total_components > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-3xl font-bold text-green-600">
                      {ossStats.components_allowed}
                    </p>
                    <p className="text-sm text-green-700 mt-1 flex items-center justify-center gap-1">
                      ✅ Allowed
                    </p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-3xl font-bold text-red-600">
                      {ossStats.components_not_allowed}
                    </p>
                    <p className="text-sm text-red-700 mt-1 flex items-center justify-center gap-1">
                      ❌ Blocked
                    </p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-3xl font-bold text-amber-600">
                      {ossStats.components_check_with_legal}
                    </p>
                    <p className="text-sm text-amber-700 mt-1 flex items-center justify-center gap-1">
                      ⚠️ Legal Review
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-3xl font-bold text-gray-600">
                      {ossStats.components_pending_review}
                    </p>
                    <p className="text-sm text-gray-700 mt-1 flex items-center justify-center gap-1">
                      🔍 Pending
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-6">
                    <span>📁 {ossStats.total_projects} Projects</span>
                    <span>📦 {ossStats.total_sboms} SBOMs</span>
                    <span>🧩 {ossStats.total_components} Total Components</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to="/oss/sbom/upload" className="text-emerald-600 hover:text-emerald-700 font-medium">
                      Upload SBOM
                    </Link>
                    <Link to="/oss/projects" className="text-blue-600 hover:text-blue-700 font-medium">
                      Manage Projects
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📦</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No SBOM Data Yet</h4>
                <p className="text-gray-600 mb-4">
                  Upload your first SBOM to start tracking license compliance
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link to="/oss/projects">
                    <Button variant="secondary">Create Project</Button>
                  </Link>
                  <Link to="/oss/sbom/upload">
                    <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700">
                      Upload SBOM
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Risk Breakdown */}
        {totalGaps > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 text-gray-900">Risk Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{totalCritical}</div>
                  <div className="text-sm text-red-600 mt-1">Critical</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{totalHigh}</div>
                  <div className="text-sm text-orange-600 mt-1">High</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats?.total_medium || reports.reduce((acc, r) => 
                      acc + (r.gaps?.filter(g => getGapSeverity(g)?.toLowerCase() === 'medium').length || 0), 0)}
                  </div>
                  <div className="text-sm text-yellow-600 mt-1">Medium</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.total_low || reports.reduce((acc, r) => 
                      acc + (r.gaps?.filter(g => getGapSeverity(g)?.toLowerCase() === 'low').length || 0), 0)}
                  </div>
                  <div className="text-sm text-green-600 mt-1">Low</div>
                </div>
              </div>
              <div className="mt-4 text-center text-sm text-gray-600">
                Average Risk Score: <span className="font-semibold">{stats?.average_risk_score?.toFixed(3) || 'N/A'}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button
                onClick={() => setShowNewAnalysis(true)}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="text-2xl">🔍</div>
                <div>
                  <h4 className="font-medium text-gray-900">Start New Analysis</h4>
                  <p className="text-sm text-gray-600">Compare policy against regulation</p>
                </div>
              </button>

              <Link
                to="/documents"
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="text-2xl">📤</div>
                <div>
                  <h4 className="font-medium text-gray-900">Upload Documents</h4>
                  <p className="text-sm text-gray-600">Add new regulations or policies</p>
                </div>
              </Link>

              <Link
                to="/oss/sbom/upload"
                className="flex items-center gap-3 p-4 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors text-left"
              >
                <div className="text-2xl">📦</div>
                <div>
                  <h4 className="font-medium text-gray-900">Upload SBOM</h4>
                  <p className="text-sm text-gray-600">Track OSS license compliance</p>
                </div>
              </Link>

              <Link
                to="/reports"
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="text-2xl">📋</div>
                <div>
                  <h4 className="font-medium text-gray-900">View All Reports</h4>
                  <p className="text-sm text-gray-600">Browse analysis history</p>
                </div>
              </Link>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Recent Reports</h3>
                <Link to="/reports">
                  <Button variant="secondary" size="sm">View All</Button>
                </Link>
              </div>

              {recentReports.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📊</div>
                  <p className="text-gray-600">No reports yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Start your first analysis to see reports here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentReports.map((report) => (
                    <Link
                      key={report.id}
                      to={`/reports/${report.id}`}
                      className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Analysis #{report.id}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {(report.total_high || 0) > 0 && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              {report.total_high} High Risk
                            </span>
                          )}
                          <StatusPill status={report.status} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Recent Documents */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Recent Documents</h3>
                <Link to="/documents">
                  <Button variant="secondary" size="sm">Upload More</Button>
                </Link>
              </div>

              {recentDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📄</div>
                  <p className="text-gray-600">No documents yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Upload regulations and policies to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate" title={doc.filename}>
                          {doc.filename}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${doc.doc_type === 'regulation'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {doc.doc_type}
                        </span>
                        <StatusPill status={doc.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Getting Started */}
        {totalDocuments === 0 && (
          <Card>
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Welcome to {APP_NAME}</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Get started by uploading your regulation and policy documents.
                Our AI will analyze them to identify compliance gaps and help you maintain regulatory adherence.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link to="/upload">
                  <Button variant="primary" size="lg">
                    Upload Your First Document
                  </Button>
                </Link>
                <Button variant="secondary" size="lg">
                  Learn More
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      <NewAnalysisModal
        isOpen={showNewAnalysis}
        onClose={() => setShowNewAnalysis(false)}
      />
    </>
  );
}
