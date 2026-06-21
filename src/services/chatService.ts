import { apiClient } from "../api/client";
import type {
  ConversationPublic,
  ConversationDetailPublic,
  ConversationListResponse,
  MessagePublic,
  MessageCreate,
  ConversationCreate,
  ConversationStats,
} from "../types/chat";

export interface StreamChatHandlers {
  onStart?: (data: { conversation_id: number; user_message_id: number }) => void;
  onText?: (chunk: string) => void;
  onDone?: (data: {
    message_id: number | null;
    timings?: Record<string, number>;
    is_rag_augmented?: boolean;
  }) => void;
  onError?: (message: string, usePollFallback?: boolean) => void;
}

class ChatService {

  /**
   * Create a new conversation
   * POST /api/chat/conversations
   */
  async createConversation(
    data?: ConversationCreate
  ): Promise<ConversationPublic> {
    const response = await apiClient.post<ConversationPublic>(
      `/api/chat/conversations`,
      data || {}
    );
    return response.data;
  }

  /**
   * List conversations for current organization
   * GET /api/chat/conversations
   */
  async listConversations(
    limit = 50,
    offset = 0,
    userId?: string
  ): Promise<ConversationListResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (userId) {
      params.append("user_id", userId);
    }

    const response = await apiClient.get<ConversationListResponse>(
      `/api/chat/conversations?${params}`
    );
    return response.data;
  }

  /**
   * Get detailed conversation information
   * GET /api/chat/conversations/{conversation_id}
   */
  async getConversation(
    conversationId: number
  ): Promise<ConversationDetailPublic> {
    const response = await apiClient.get<ConversationDetailPublic>(
      `/api/chat/conversations/${conversationId}`
    );
    return response.data;
  }

  /**
   * Update conversation
   * PATCH /api/chat/conversations/{conversation_id}
   */
  async updateConversation(
    conversationId: number,
    data: Partial<ConversationCreate>
  ): Promise<ConversationPublic> {
    const response = await apiClient.patch<ConversationPublic>(
      `/api/chat/conversations/${conversationId}`,
      data
    );
    return response.data;
  }

  /**
   * Archive conversation
   * DELETE /api/chat/conversations/{conversation_id}
   */
  async archiveConversation(conversationId: number): Promise<void> {
    await apiClient.delete(
      `/api/chat/conversations/${conversationId}`
    );
  }

  /**
   * Send a message in a conversation
   * POST /api/chat/conversations/{conversation_id}/messages
   */
  async sendMessage(
    conversationId: number,
    message: MessageCreate
  ): Promise<MessagePublic> {
    const response = await apiClient.post<MessagePublic>(
      `/api/chat/conversations/${conversationId}/messages`,
      message
    );
    return response.data;
  }

  /**
   * Send a message and stream the assistant response (SSE).
   * POST /api/chat/conversations/{conversation_id}/messages/stream
   */
  async streamMessage(
    conversationId: number,
    message: MessageCreate,
    accessToken: string,
    handlers: StreamChatHandlers
  ): Promise<void> {
    const baseURL = apiClient.defaults.baseURL || "http://localhost:8000";
    const response = await fetch(
      `${baseURL}/api/chat/conversations/${conversationId}/messages/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok || !response.body) {
      throw new Error(`Stream request failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        try {
          const payload = JSON.parse(line.slice(5).trim()) as {
            type: string;
            data: Record<string, unknown>;
          };
          switch (payload.type) {
            case "start":
              handlers.onStart?.(
                payload.data as { conversation_id: number; user_message_id: number }
              );
              break;
            case "text":
              handlers.onText?.(String(payload.data.content || ""));
              break;
            case "done":
              handlers.onDone?.(
                payload.data as {
                  message_id: number | null;
                  timings?: Record<string, number>;
                  is_rag_augmented?: boolean;
                }
              );
              break;
            case "error":
              handlers.onError?.(
                String(payload.data.message || "Stream error"),
                payload.data.fallback === "poll"
              );
              break;
            default:
              break;
          }
        } catch {
          // ignore malformed SSE chunks
        }
      }
    }
  }

  /**
   * Regenerate assistant reply for an existing user message (stream fallback).
   * POST /api/chat/conversations/{conversation_id}/messages/{user_message_id}/generate
   */
  async regenerateResponse(
    conversationId: number,
    userMessageId: number
  ): Promise<void> {
    await apiClient.post(
      `/api/chat/conversations/${conversationId}/messages/${userMessageId}/generate`
    );
  }

  /**
   * Get conversation messages
   * GET /api/chat/conversations/{conversation_id}/messages
   */
  async getMessages(
    conversationId: number,
    limit = 100
  ): Promise<MessagePublic[]> {
    const response = await apiClient.get<{
      items: MessagePublic[];
      total: number;
      conversation_id: number;
    }>(`/api/chat/conversations/${conversationId}/messages?limit=${limit}`);
    return response.data.items;
  }

  /**
   * Submit feedback for a message
   * PATCH /api/chat/messages/{message_id}/feedback
   */
  async submitMessageFeedback(
    messageId: number,
    feedback: {
      helpful?: boolean;
      feedback_text?: string;
      feedback_type?: string;
    }
  ): Promise<MessagePublic> {
    const response = await apiClient.patch<MessagePublic>(
      `/api/chat/messages/${messageId}/feedback`,
      feedback
    );
    return response.data;
  }

  /**
   * Get conversation statistics
   * GET /api/chat/conversations/{conversation_id}/stats
   */
  async getConversationStats(conversationId: number): Promise<ConversationStats> {
    const response = await apiClient.get<ConversationStats>(
      `/api/chat/conversations/${conversationId}/stats`
    );
    return response.data;
  }

  /**
   * Get overall conversation statistics
   * GET /api/chat/statistics
   */
  async getChatStatistics(): Promise<Record<string, unknown>> {
    const response = await apiClient.get<Record<string, unknown>>(
      `/api/chat/statistics`
    );
    return response.data;
  }

  /**
   * Add context to conversation (e.g., document reference)
   * POST /api/chat/conversations/{conversation_id}/contexts
   */
  async addConversationContext(
    conversationId: number,
    context: {
      document_id?: number;
      context_type?: "REGULATION" | "POLICY" | "ANALYSIS_REPORT";
      metadata?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    const response = await apiClient.post(
      `/api/chat/conversations/${conversationId}/contexts`,
      context
    );
    return response.data;
  }
}

export const chatService = new ChatService();
