import { apiClient } from "./client";
import type {
  DocumentPublic,
  AnalysisRequest,
  ReportPublic,
  TrendData,
  ComparisonResult,
  PolicyDiffPublic,
  RemediationPlanPublic,
  DependencyGraph,
  ConversationListResponse,
  MessagePublic,
  SendMessageRequest,
  SendMessageResponse,
} from "../types/api";

// === Documents ===
export const getDocuments = async (): Promise<DocumentPublic[]> => {
  const response = await apiClient.get<DocumentPublic[]>("/documents/");
  return response.data;
};

export const getDocument = async (id: number): Promise<DocumentPublic> => {
  const response = await apiClient.get<DocumentPublic>(`/documents/${id}`);
  return response.data;
};

export const uploadDocument = async (
  file: File,
  doc_type: "regulation" | "policy"
): Promise<DocumentPublic> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("doc_type", doc_type);

  const response = await apiClient.post<DocumentPublic>(
    "/documents/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

// === Analysis ===
export const runAnalysis = async (
  request: AnalysisRequest
): Promise<ReportPublic> => {
  const response = await apiClient.post<ReportPublic>("/analysis/run", request);
  return response.data;
};

export const getReport = async (reportId: number): Promise<ReportPublic> => {
  const response = await apiClient.get<ReportPublic>(`/analysis/${reportId}`);
  return response.data;
};

export const getReportTrends = async (reportId: number): Promise<TrendData> => {
  const response = await apiClient.get<TrendData>(
    `/analysis/${reportId}/trends`
  );
  return response.data;
};

export const getReportHistory = async (
  reportId: number
): Promise<ComparisonResult> => {
  const response = await apiClient.get<ComparisonResult>(
    `/analysis/${reportId}/history`
  );
  return response.data;
};

export const compareReports = async (
  currentReportId: number,
  previousReportId: number
): Promise<ComparisonResult> => {
  const response = await apiClient.post<ComparisonResult>(
    `/analysis/${currentReportId}/compare`,
    { previous_report_id: previousReportId }
  );
  return response.data;
};

// === Policy Diff ===
export const getPolicyDiff = async (
  oldId: number,
  newId: number,
  format: string = "json"
): Promise<PolicyDiffPublic> => {
  const response = await apiClient.get<PolicyDiffPublic>(
    `/policies/${oldId}/diff/${newId}`,
    {
      params: { format },
    }
  );
  return response.data;
};

// === Remediation ===
export const getRemediationPlanForReport = async (
  reportId: number
): Promise<RemediationPlanPublic> => {
  const response = await apiClient.get<RemediationPlanPublic>(
    `/remediation/reports/${reportId}`
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
  const response = await apiClient.post<RemediationPlanPublic>(
    `/remediation/reports/${reportId}/generate`,
    options || {}
  );
  return response.data;
};

export const getRemediationPlan = async (
  planId: number
): Promise<RemediationPlanPublic> => {
  const response = await apiClient.get<RemediationPlanPublic>(
    `/remediation/plans/${planId}`
  );
  return response.data;
};

export const getDependencyGraph = async (
  planId: number
): Promise<DependencyGraph> => {
  const response = await apiClient.get<DependencyGraph>(
    `/remediation/plans/${planId}/dependencies`
  );
  return response.data;
};

export const updateRemediationStepStatus = async (
  stepId: number,
  status: string
): Promise<void> => {
  await apiClient.patch(`/remediation/steps/${stepId}/status`, { status });
};

export const exportRemediationPlan = async (
  planId: number,
  format: string = "json"
): Promise<Blob> => {
  const response = await apiClient.get(
    `/remediation/plans/${planId}/export`,
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
    "/chat/conversations",
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
    `/chat/conversations/${conversationId}/messages`
  );
  return response.data;
};

export const sendMessage = async (
  request: SendMessageRequest
): Promise<SendMessageResponse> => {
  const response = await apiClient.post<SendMessageResponse>(
    "/chat/send",
    request
  );
  return response.data;
};
