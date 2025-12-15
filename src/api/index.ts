import { apiClient } from "./client";
import type {
  DocumentPublic,
  DocumentType,
  DocumentVersion,
  DocumentVersionsResponse,
  AnalysisRequest,
  ReportPublic,
  TrendData,
  PolicyDiffPublic,
  RemediationPlanPublic,
  DependencyGraph,
  ConversationListResponse,
  MessagePublic,
  SendMessageRequest,
  SendMessageResponse,
  AnalysisStats,
} from "../types/api.js";

// === Documents ===
export const getDocuments = async (latest: boolean = true, limit?: number): Promise<DocumentPublic[]> => {
  const params = new URLSearchParams();
  params.append("latest", latest.toString());
  if (limit) {
    params.append("limit", limit.toString());
  }
  const response = await apiClient.get<DocumentPublic[]>(`/api/documents/?${params}`);
  return response.data;
};

export const getDocument = async (id: number): Promise<DocumentPublic> => {
  const response = await apiClient.get<DocumentPublic>(`/api/documents/${id}`);
  return response.data;
};

export const uploadDocument = async (
  file: File,
  doc_type: DocumentType
): Promise<DocumentPublic> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("doc_type", String(doc_type));

  const response = await apiClient.post<DocumentPublic>(
    "/api/documents/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const uploadNewVersion = async (
  documentId: number,
  file: File
): Promise<DocumentPublic> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<DocumentPublic>(
    `/api/documents/${documentId}/new-version`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const getDocumentVersions = async (documentId: number): Promise<DocumentVersion[]> => {
  const response = await apiClient.get<DocumentVersionsResponse>(`/api/documents/${documentId}/versions`);
  return response.data.versions; // Extract the versions array from the response
};

export const getDocumentContent = async (documentId: number): Promise<string> => {
  const response = await apiClient.get<{ content: string }>(`/api/documents/${documentId}/content`);
  return response.data.content;
};

// === Analysis ===
export const runAnalysis = async (
  request: AnalysisRequest
): Promise<ReportPublic> => {
  const response = await apiClient.post<ReportPublic>("/api/analysis/reports", request);
  return response.data;
};

export const getReports = async (): Promise<ReportPublic[]> => {
  const response = await apiClient.get<{ items: ReportPublic[] }>("/api/analysis/reports");
  return response.data.items;
};

interface ReportWithGaps {
  report: ReportPublic;
  gaps: any[];
  statistics?: any;
}

export const getReport = async (reportId: number): Promise<ReportPublic> => {
  const response = await apiClient.get<ReportWithGaps>(
    `/api/analysis/reports/${reportId}?include_statistics=true`
  );
  
  // Handle two possible response formats:
  // Format 1: { report: {...}, gaps: [...] }
  // Format 2: { id, status, gaps: [...] } (flat structure)
  const data = response.data as any;
  
  if (data.report) {
    // Format 1: nested structure
    const { report, gaps } = data;
    return {
      ...report,
      gaps: gaps || [],
    };
  } else {
    // Format 2: flat structure (gaps already in data)
    return {
      ...data,
      gaps: data.gaps || [],
    };
  }
};

export const pollReportStatus = async (
  reportId: number,
  maxWaitMs: number = 120000, // 2 minutes max
  intervalMs: number = 1500 // Poll every 1.5 seconds
): Promise<ReportPublic> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const report = await getReport(reportId);
    
    // Report is ready when it's no longer pending or processing
    if (report.status !== 'pending' && report.status !== 'processing') {
      return report;
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  // Timeout reached, return current state
  return getReport(reportId);
};

export const getAnalysisStats = async (): Promise<AnalysisStats> => {
  console.log('Fetching analysis stats from /analysis/reports/statistics');
  try {
    const response = await apiClient.get<AnalysisStats>("/api/analysis/reports/statistics");
    console.log('Analysis stats response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching analysis stats:', error);
    throw error;
  }
};

export const getReportTrends = async (): Promise<TrendData> => {
  const response = await apiClient.get<TrendData>(
    `/api/analysis/temporal-trends`
  );
  return response.data;
};

export const getGapHistory = async (
  gapId: number
): Promise<any> => {
  const response = await apiClient.get(
    `/api/analysis/gaps/${gapId}/history`
  );
  return response.data;
};

// === Document Comparison ===
export const compareDocuments = async (
  oldId: number,
  newId: number
): Promise<PolicyDiffPublic> => {
  const response = await apiClient.get<PolicyDiffPublic>(
    `/api/documents/${oldId}/compare/${newId}`
  );
  return response.data;
};

// Legacy alias for backward compatibility
export const getPolicyDiff = async (
  oldId: number,
  newId: number
): Promise<PolicyDiffPublic> => {
  return compareDocuments(oldId, newId);
};

// === Remediation ===
export const getRemediationPlansForReport = async (
  reportId: number
): Promise<RemediationPlanPublic[]> => {
  const response = await apiClient.get<RemediationPlanPublic[]>(
    `/api/remediation/reports/${reportId}/plans`
  );
  return response.data;
};

// Legacy alias - returns first plan or null
export const getRemediationPlanForReport = async (
  reportId: number
): Promise<RemediationPlanPublic | null> => {
  const plans = await getRemediationPlansForReport(reportId);
  return plans?.[0] || null;
};

export const createRemediationPlan = async (
  reportId: number,
  options?: {
    organization_size?: string;
    industry?: string;
    target_completion_days?: number;
  }
): Promise<RemediationPlanPublic> => {
  const response = await apiClient.post<RemediationPlanPublic>(
    `/api/remediation/plans`,
    {
      analysis_report_id: reportId,
      ...options
    }
  );
  return response.data;
};

export const generateRemediationPlan = async (
  reportId: number,
  options?: {
    organization_size?: string;
    industry?: string;
    target_completion_days?: number;
  }
): Promise<RemediationPlanPublic> => {
  return createRemediationPlan(reportId, options);
};

export const getRemediationPlan = async (
  planId: number
): Promise<RemediationPlanPublic> => {
  const response = await apiClient.get<RemediationPlanPublic>(
    `/api/remediation/plans/${planId}`
  );
  return response.data;
};

// Build dependency graph from plan steps
export const getDependencyGraph = async (
  planId: number
): Promise<DependencyGraph> => {
  const plan = await getRemediationPlan(planId);
  // Transform plan.steps into a dependency graph format
  return {
    plan_id: plan.id,
    nodes: plan.steps.map(step => ({
      step_id: step.id,
      gap_id: step.gap_id,
      title: step.title,
      effort_hours: step.effort_hours,
      priority: step.priority,
      status: step.status,
      depends_on: step.dependencies || [],
      blocks: []
    })),
    critical_path: [],
    critical_path_hours: 0
  };
};

export const updateRemediationStepStatus = async (
  stepId: number,
  status: string
): Promise<void> => {
  await apiClient.patch(`/api/remediation/steps/${stepId}/status`, { status });
};

export const exportRemediationPlan = async (
  planId: number,
  format: string = "json"
): Promise<Blob> => {
  const response = await apiClient.get(
    `/api/remediation/plans/${planId}/export`,
    {
      params: { format },
      responseType: "blob",
    }
  );
  return response.data;
};

// === Chat ===
export const getConversations = async (
  page: number = 1,
  pageSize: number = 20
): Promise<ConversationListResponse> => {
  const response = await apiClient.get<ConversationListResponse>(
    "/api/chat/conversations",
    {
      params: { page, page_size: pageSize },
    }
  );
  return response.data;
};

export const getConversationMessages = async (
  conversationId: number
): Promise<MessagePublic[]> => {
  const response = await apiClient.get<MessagePublic[]>(
    `/api/chat/conversations/${conversationId}/messages`
  );
  return response.data;
};

export const sendMessage = async (
  request: SendMessageRequest
): Promise<SendMessageResponse> => {
  const response = await apiClient.post<SendMessageResponse>(
    "/api/chat/send",
    request
  );
  return response.data;
};
