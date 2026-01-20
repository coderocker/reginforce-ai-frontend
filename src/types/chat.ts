/**
 * Chat types based on OpenAPI spec
 */

export interface ConversationPublic {
  id: number;
  title?: string;
  status: ConversationStatus;
  organization_id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  last_activity: string;
  message_count: number;
}

export type ConversationStatus = "ACTIVE" | "ARCHIVED" | "SUSPENDED";

export interface MessagePublic {
  id: number;
  conversation_id: number;
  role: MessageRole;
  content: string;
  sequence: number;
  intent?: string;
  entities?: Record<string, string[]>;
  confidence_score?: number;
  referenced_documents?: number[];
  created_at: string;
  feedback?: MessageFeedback;
}

export type MessageRole = "user" | "assistant" | "system";

export interface MessageFeedback {
  helpful?: boolean;
  feedback_text?: string;
  feedback_type?: "helpful" | "unhelpful" | "incorrect" | "other";
}

export interface MessageCreate {
  content: string;
  role?: MessageRole;
}

export interface ConversationCreate {
  title?: string;
}

export interface ConversationContextPublic {
  active_report_id?: number;
  active_gap_ids?: number[];
  active_document_ids?: number[];
  last_intent?: string;
  last_entities?: Record<string, string[]>;
}

export interface ConversationDetailPublic {
  conversation: ConversationPublic;
  messages?: MessagePublic[];
  context?: ConversationContextPublic;
}

export interface ConversationListResponse {
  conversations: ConversationPublic[];
  total: number;
  page: number;
  page_size: number;
}

export interface ConversationStats {
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  total_tokens_used?: number;
  average_response_time_ms?: number;
}
