// Type definitions for RegInforce AI API

// Enums
export type ProcessingStatus = "pending" | "processing" | "processed" | "error";
export type GapStatus = "new" | "existing" | "resolved" | "worsened";
export type DocumentType = "regulation" | "policy";
export type RemediationStatus = "draft" | "in_progress" | "completed" | "blocked";
export type EffortSize = "S" | "M" | "L" | "XL";
export type MessageRole = "user" | "assistant" | "system";
export type Platform = "web" | "slack" | "teams" | "api";

// Documents & Analysis
export interface DocumentPublic {
  id: number;
  filename: string;
  doc_type: DocumentType;
  status: ProcessingStatus;
  created_at: string;
  version_number?: number;
  is_latest?: boolean;
  parent_document_id?: number | null;
}

export interface DocumentVersion {
  id: number;
  filename: string;
  version_number: number;
  is_latest: boolean;
  status: ProcessingStatus;
  created_at: string;
  analysis_count?: number;
}

export interface DocumentVersionsResponse {
  document_family_id: number;
  total_versions: number;
  current_version: number;
  versions: DocumentVersion[];
}

export interface AnalysisRequest {
  regulation_doc_id: number;
  policy_doc_id: number;
}

export interface GapPublic {
  id: number;
  policy_section: string;
  regulation_section?: string | null;
  gap_description: string;
  risk_score: number;
  gap_type?: string | null;
  severity_level?: "low" | "medium" | "high" | "critical" | null;
  status?: GapStatus | null;
}

export interface ClusterSummary {
  count: number;
  average_risk: number;
  topics?: string[];
  severity_distribution?: Record<string, number>;
}

export interface ReportPublic {
  id: number;
  regulation_doc_id: number;
  policy_doc_id: number;
  status: ProcessingStatus;
  created_at: string;
  gaps: GapPublic[];
  cluster_summaries?: Record<string, ClusterSummary> | null;
  total_critical?: number | null;
  total_high?: number | null;
  total_medium?: number | null;
  total_low?: number | null;
}

// History & Trends
export interface HistoricalAnalysis {
  analysis_date: string;
  report_id: number;
  total_gaps: number;
  new_gaps: number;
  existing_gaps: number;
  worsened_gaps: number;
  average_risk_score: number;
  high_severity_count: number;
}

export interface TrendDataPoint {
  date: string;
  gap_count: number;
  risk_score: number;
}

export interface AnomalyAlertPublic {
  severity: string;
  metric: string;
  current_value: number;
  expected_value: number;
  message: string;
  detected_at: string;
}

export interface TrendData {
  report_id: number;
  total_analyses: number;
  trend: "improving" | "degrading" | "stable" | "no_data" | "insufficient_data";
  confidence: number;
  snapshots: TrendDataPoint[];
  anomalies?: AnomalyAlertPublic[] | null;
  has_anomalies: boolean;
  summary: string;
}

export interface AnalysisStats {
  total_analyses: number;
  total_completed: number;
  total_processing: number;
  total_pending: number;
  total_error: number;
  total_gaps: number;
  total_critical: number;
  total_high: number;
  total_medium: number;
  total_low: number;
  average_risk_score: number;
  total_documents: number;
  total_regulations: number;
  total_policies: number;
}

// Comparison & Diff
export interface GapComparisonItem {
  requirement_id: string;
  requirement_text: string;
  gap_description: string;
  severity: string;
}

export interface ComparisonResult {
  current_report_id: number;
  previous_report_id: number;
  comparison_date: string;
  gap_count_delta: number;
  risk_score_delta: number;
  new_gaps: GapComparisonItem[];
  resolved_gaps: GapComparisonItem[];
  persistent_gaps: GapComparisonItem[];
  improvement_summary: string;
}

export interface DiffSegmentPublic {
  change_type: "addition" | "deletion" | "modification" | "unchanged";
  old_text?: string | null;
  new_text?: string | null;
}

export interface PolicyDiffPublic {
  old_document_id: number;
  new_document_id: number;
  total_additions: number;
  total_deletions: number;
  total_modifications: number;
  similarity_ratio: number;
  segments: DiffSegmentPublic[];
}

// Remediation
export interface RemediationStepPublic {
  id: number;
  gap_id: number;
  title: string;
  strategy: string;
  implementation_steps?: string | null;
  effort_size: EffortSize;
  effort_hours: number;
  priority: number;
  dependencies?: number[] | null;
  status: RemediationStatus;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface RemediationPlanPublic {
  id: number;
  analysis_report_id: number;
  created_at: string;
  updated_at: string;
  total_effort_hours: number;
  status: RemediationStatus;
  steps: RemediationStepPublic[];
}

export interface DependencyNode {
  step_id: number;
  gap_id: number;
  title: string;
  effort_hours: number;
  priority: number;
  status: RemediationStatus;
  depends_on: number[];
  blocks: number[];
}

export interface DependencyGraph {
  plan_id: number;
  nodes: DependencyNode[];
  critical_path: number[];
  critical_path_hours: number;
  parallelizable_groups?: number[][];
}

// Chat
export interface MessagePublic {
  id: number;
  role: MessageRole;
  content: string;
  intent?: string | null;
  entities?: Record<string, string[]> | null;
  timestamp: string;
  was_blocked: boolean;
  block_reason?: string | null;
}

export interface ConversationContextPublic {
  active_report_id?: number | null;
  active_gap_ids: number[];
}

export interface ConversationPublic {
  id: number;
  user_id?: string | null;
  platform: Platform;
  started_at: string;
  message_count: number;
  last_activity: string;
  is_archived: boolean;
  is_suspended: boolean;
}

export interface ConversationListResponse {
  conversations: ConversationPublic[];
  total: number;
  page: number;
  page_size: number;
}

export interface SendMessageRequest {
  conversation_id?: number | null;
  message: string;
  user_id?: string | null;
  platform?: Platform;
}

export interface SendMessageResponse {
  conversation_id: number;
  message: MessagePublic;
  response: MessagePublic;
  context: ConversationContextPublic;
  follow_up_suggestions?: string[];
}
