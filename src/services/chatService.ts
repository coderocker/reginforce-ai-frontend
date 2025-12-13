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
