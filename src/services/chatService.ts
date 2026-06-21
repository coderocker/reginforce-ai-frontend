import { apiClient } from "../api/client";
import type {
  ConversationPublic,
  ConversationDetailPublic,
  ConversationListResponse,
  MessagePublic,
  MessageCreate,
  ConversationCreate,
  ConversationStats,
  ChatMessageMetadata,
  ChatSource,
} from "../types/chat";

export interface StreamChatHandlers {
  onStart?: (data: { conversation_id: number; user_message_id: number }) => void;
  onStatus?: (message: string) => void;
  onText?: (chunk: string) => void;
  onDone?: (data: {
    message_id: number | null;
    timings?: Record<string, number>;
    is_rag_augmented?: boolean;
    sources?: ChatSource[];
    follow_up_suggestions?: string[];
  }) => void;
  onError?: (message: string, usePollFallback?: boolean) => void;
}

function parseMessageMetadata(raw?: string): ChatMessageMetadata | undefined {
  if (!raw) return undefined;
  try {
    const data = JSON.parse(raw) as ChatMessageMetadata;
    if (data?.sources || data?.follow_up_suggestions) return data;
  } catch {
    return undefined;
  }
  return undefined;
}

function enrichMessage(msg: MessagePublic): MessagePublic {
  const metadata = parseMessageMetadata(msg.referenced_analyses);
  return metadata ? { ...msg, chat_metadata: metadata } : msg;
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
    return enrichMessage(response.data);
  }

  private async consumeSseStream(
    response: Response,
    handlers: StreamChatHandlers
  ): Promise<void> {
    if (!response.body) {
      throw new Error("Stream response body missing");
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
            case "status":
              handlers.onStatus?.(String(payload.data.message || ""));
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
                  sources?: ChatSource[];
                  follow_up_suggestions?: string[];
                }
              );
              break;
            case "error":
              handlers.onError?.(
                String(payload.data.message || "Stream error"),
                payload.data.fallback === "poll" || payload.data.fallback === true
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
   * Send a message and stream the assistant response (SSE).
   * POST /api/chat/conversations/{conversation_id}/messages/stream
   */
  async streamMessage(
    conversationId: number,
    message: MessageCreate,
    accessToken: string,
    handlers: StreamChatHandlers,
    signal?: AbortSignal
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
        signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Stream request failed (${response.status})`);
    }

    await this.consumeSseStream(response, handlers);
  }

  /**
   * Regenerate and stream assistant reply for an existing user message.
   * POST /api/chat/conversations/{conversation_id}/messages/{user_message_id}/regenerate/stream
   */
  async regenerateStreamMessage(
    conversationId: number,
    userMessageId: number,
    accessToken: string,
    handlers: StreamChatHandlers,
    signal?: AbortSignal
  ): Promise<void> {
    const baseURL = apiClient.defaults.baseURL || "http://localhost:8000";
    const response = await fetch(
      `${baseURL}/api/chat/conversations/${conversationId}/messages/${userMessageId}/regenerate/stream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Regenerate stream failed (${response.status})`);
    }

    await this.consumeSseStream(response, handlers);
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
    return response.data.items.map(enrichMessage);
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
    return enrichMessage(response.data);
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
