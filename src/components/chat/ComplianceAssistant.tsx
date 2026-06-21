import { useEffect, useState, useRef, useCallback } from "react";
import { chatService } from "../../services/chatService";
import { uploadDocument } from "../../api";
import type { ConversationPublic, MessagePublic, ChatSource } from "../../types/chat";
import { useAuth } from "../../providers";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ComplianceAssistantProps {
  readonly isOpen: boolean;
  readonly onOpen?: () => void;
  readonly onClose?: () => void;
  readonly documentId?: number;
  readonly documentName?: string;
  readonly documentThumbnail?: string;
}

function getValidChatSources(sources?: ChatSource[]): ChatSource[] {
  return (sources || []).filter(
    (src) => typeof src.document_id === "number" && src.document_id > 0 && Boolean(src.document_name)
  );
}

function AssistantChatIcon({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const STORAGE_KEY = "complianceAssistantConversations";

// Helper to get stored conversations
const getStoredConversations = (): Record<string, { id: number; messages: MessagePublic[]; createdAt?: string }> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Helper to save conversations
const saveConversations = (conversations: Record<string, { id: number; messages: MessagePublic[]; createdAt?: string }>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.warn("Failed to save conversations to localStorage:", error);
  }
};

interface StoredConversation {
  key: string;
  id: number;
  title: string;
  createdAt: string;
  messageCount: number;
}

// Quick action suggestions
const QUICK_ACTIONS = [
  { label: "Summarize this document", icon: "📋" },
  { label: "What are the key requirements?", icon: "📌" },
  { label: "List compliance gaps", icon: "⚠️" },
  { label: "Explain the main risks", icon: "🔍" },
];

export function ComplianceAssistant({
  isOpen,
  onOpen,
  onClose,
  documentId,
  documentName = "General Chat",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  documentThumbnail,
}: ComplianceAssistantProps) {
  const { authState } = useAuth();
  const [activeConversation, setActiveConversation] =
    useState<ConversationPublic | null>(null);
  const [messages, setMessages] = useState<MessagePublic[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [conversationHistory, setConversationHistory] = useState<StoredConversation[]>([]);
  const [showConversationList, setShowConversationList] = useState(false);
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConversationKey, setCurrentConversationKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const streamAbortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdsRef = useRef<Set<number>>(new Set());
  const activePollingConversationRef = useRef<number | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = (force = false) => {
    if (force || shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Load conversation history for current document
  useEffect(() => {
    const loadConversationHistory = () => {
      const stored = getStoredConversations();
      const history: StoredConversation[] = [];
      
      Object.entries(stored).forEach(([key, data]) => {
        const isCurrentDocConv = documentId && key.includes(`_${documentId}`);
        const isGeneralConv = !documentId && key.includes('_general');
        
        if (isCurrentDocConv || isGeneralConv) {
          history.push({
            key,
            id: data.id,
            title: `Chat ${data.id} - ${new Date(data.createdAt || Date.now()).toLocaleDateString()}`,
            createdAt: data.createdAt || new Date().toISOString(),
            messageCount: data.messages.length,
          });
        }
      });
      
      history.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setConversationHistory(history);
    };
    
    loadConversationHistory();
  }, [documentId, isOpen]);

  // Restore conversation from localStorage on mount
  useEffect(() => {
    const initializeConversation = async () => {
      if (!isOpen) return;
      if (isNewChatMode) return;
      
      const stored = getStoredConversations();
      
      const conversationEntries = Object.entries(stored)
        .filter(([key]) => {
          const isCurrentDocConv = documentId && key.includes(`_${documentId}`);
          const isGeneralConv = !documentId && key.includes('_general');
          return isCurrentDocConv || isGeneralConv;
        })
        .sort(([, a], [, b]) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

      if (conversationEntries.length > 0) {
        const [conversationKey, mostRecentConversation] = conversationEntries[0];
        lastMessageIdsRef.current.clear();
        mostRecentConversation.messages.forEach((m: MessagePublic) => lastMessageIdsRef.current.add(m.id));
        setMessages(mostRecentConversation.messages);
        setCurrentConversationKey(conversationKey);
        setActiveConversation({
          id: mostRecentConversation.id,
          title: `${documentName} - Saved`,
          status: "ACTIVE",
          organization_id: "",
          user_id: authState.user?.id,
          created_at: mostRecentConversation.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          message_count: mostRecentConversation.messages.length,
        });
      } else {
        setActiveConversation(null);
        setMessages([]);
        setCurrentConversationKey(null);
        lastMessageIdsRef.current.clear();
      }
    };

    initializeConversation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, documentId, authState.user?.id, documentName]);

  // Save conversation to localStorage whenever messages change
  useEffect(() => {
    if (activeConversation && currentConversationKey) {
      const stored = getStoredConversations();
      const existingConv = stored[currentConversationKey];
      stored[currentConversationKey] = {
        id: activeConversation.id,
        messages,
        createdAt: existingConv?.createdAt || new Date().toISOString(),
      };
      saveConversations(stored);
    }
  }, [messages, activeConversation, currentConversationKey]);

  // Add document context when conversation created
  useEffect(() => {
    if (activeConversation && documentId) {
      addDocumentContext();
    }
  }, [activeConversation, documentId]);

  const addDocumentContext = async () => {
    if (!activeConversation || !documentId) return;
    try {
      await chatService.addConversationContext(activeConversation.id, {
        document_id: documentId,
        context_type: "REGULATION",
      });
    } catch (error) {
      console.error("Failed to add document context:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileUpload(file);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage;
    const attachedFile = fileUpload;
    setInputMessage("");
    setFileUpload(null);
    setLoading(true);
    setIsThinking(true);
    setStatusMessage("Sending…");
    setStreamingContent("");
    setFollowUpSuggestions([]);

    const optimisticUserMessage: MessagePublic = {
      id: -Date.now(),
      organization_id: "",
      conversation_id: activeConversation?.id ?? 0,
      role: "user",
      content: userMessage,
      sequence_number: messages.length + 1,
      created_at: new Date().toISOString(),
      created_by: authState.user?.id ?? "",
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);
    shouldAutoScrollRef.current = true;

    try {
      let conversationToUse = activeConversation;
      
      if (!conversationToUse) {
        const newConversation = await chatService.createConversation({
          title: `${documentName || "Compliance Review"} - ${new Date().toLocaleDateString()}`,
        });
        
        const conversationKey = `conv_${newConversation.id}_${documentId || 'general'}`;
        setCurrentConversationKey(conversationKey);
        setActiveConversation(newConversation);
        conversationToUse = newConversation;
        
        const stored = getStoredConversations();
        stored[conversationKey] = {
          id: newConversation.id,
          messages: [],
          createdAt: new Date().toISOString(),
        };
        saveConversations(stored);
        
        setConversationHistory(prev => [{
          key: conversationKey,
          id: newConversation.id,
          title: `Chat ${newConversation.id} - ${new Date().toLocaleDateString()}`,
          createdAt: new Date().toISOString(),
          messageCount: 0,
        }, ...prev]);
        
        if (documentId) {
          try {
            await chatService.addConversationContext(newConversation.id, {
              document_id: documentId,
              context_type: "REGULATION",
            });
          } catch (error) {
            console.warn("Failed to add document context:", error);
          }
        }
      }

      if (attachedFile && conversationToUse) {
        try {
          setStatusMessage("Uploading document…");
          const docType = documentId ? "regulation" : "policy";
          const uploaded = await uploadDocument(attachedFile, docType);
          await chatService.addConversationContext(conversationToUse.id, {
            document_id: uploaded.id,
            context_type: documentId ? "REGULATION" : "POLICY",
          });
        } catch (uploadError) {
          console.error("Failed to upload attachment:", uploadError);
          alert("Could not upload the attached file. Sending message without it.");
        }
      }

      setStreamingContent("");
      setIsThinking(true);
      setStatusMessage("Thinking…");

      const ok = await runStream(conversationToUse.id, (handlers, signal) =>
        chatService.streamMessage(
          conversationToUse.id,
          { content: userMessage, role: "user" },
          authState.accessToken!,
          handlers,
          signal
        )
      );
      if (ok) return;

      const sentMessage = await chatService.sendMessage(
        conversationToUse.id,
        { content: userMessage, role: "user" }
      );

      setMessages((prev) => [...prev, sentMessage]);
      lastMessageIdsRef.current.add(sentMessage.id);
      pollForAIResponse(conversationToUse.id, sentMessage.id);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInputMessage(action);
  };

  const stopStreaming = () => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setIsStreaming(false);
    setIsThinking(false);
    setStatusMessage("");
    setLoading(false);
  };

  const syncConversationMessages = useCallback(async (conversationId: number) => {
    const updatedMessages = await chatService.getMessages(conversationId, 100);
    const sorted = [...updatedMessages].sort((a, b) => a.id - b.id);
    sorted.forEach((msg) => lastMessageIdsRef.current.add(msg.id));
    setMessages(sorted);
    return sorted;
  }, []);

  const runStream = async (
    conversationId: number,
    streamFn: (
      handlers: Parameters<typeof chatService.streamMessage>[3],
      signal: AbortSignal
    ) => Promise<void>
  ) => {
    const accessToken = authState.accessToken;
    if (!accessToken) return false;

    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;
    setIsStreaming(true);
    setFollowUpSuggestions([]);

    let accumulated = "";
    let streamUserMessageId: number | null = null;
    try {
      await streamFn(
        {
          onStart: async (data) => {
            streamUserMessageId = data.user_message_id;
            setStatusMessage("Reading your message…");
            await syncConversationMessages(conversationId);
          },
          onStatus: (msg) => {
            if (msg) setStatusMessage(msg);
          },
          onText: (chunk) => {
            accumulated += chunk;
            setStreamingContent(accumulated);
            setStatusMessage("");
          },
          onDone: async (data) => {
            setStreamingContent("");
            setStatusMessage("");
            setIsThinking(false);
            setIsStreaming(false);
            setFollowUpSuggestions(data.follow_up_suggestions || []);
            await syncConversationMessages(conversationId);
            scrollToBottom(true);
          },
          onError: async (errMsg, usePollFallback) => {
            console.warn("Stream error:", errMsg);
            setStreamingContent("");
            setStatusMessage("");
            setIsStreaming(false);
            if (controller.signal.aborted) {
              setIsThinking(false);
              return;
            }
            if (usePollFallback && streamUserMessageId) {
              setIsThinking(true);
              try {
                await chatService.regenerateResponse(conversationId, streamUserMessageId);
                pollForAIResponse(conversationId, streamUserMessageId);
              } catch (regenError) {
                console.error("Regenerate fallback failed:", regenError);
                setIsThinking(false);
              }
            } else {
              setIsThinking(false);
            }
          },
        },
        controller.signal
      );
      return true;
    } catch (error) {
      if (controller.signal.aborted) {
        setIsThinking(false);
        return true;
      }
      console.warn("Stream unavailable:", error);
      setIsStreaming(false);
      return false;
    } finally {
      streamAbortRef.current = null;
    }
  };

  const handleRegenerate = async () => {
    if (!activeConversation || isStreaming) return;
    const userMessages = messages.filter((m) => m.role === "user" && m.id > 0);
    const lastUser = userMessages[userMessages.length - 1];
    if (!lastUser) return;

    setMessages((prev) =>
      prev.filter((m) => !(m.role === "assistant" && m.id > lastUser.id))
    );
    setLoading(true);
    setIsThinking(true);
    setStreamingContent("");
    setStatusMessage("Regenerating…");

    const ok = await runStream(activeConversation.id, (handlers, signal) =>
      chatService.regenerateStreamMessage(
        activeConversation.id,
        lastUser.id,
        authState.accessToken!,
        handlers,
        signal
      )
    );

    if (!ok) {
      try {
        await chatService.regenerateResponse(activeConversation.id, lastUser.id);
        pollForAIResponse(activeConversation.id, lastUser.id);
      } catch (error) {
        console.error("Regenerate failed:", error);
        setIsThinking(false);
      }
    }
    setLoading(false);
  };

  const handleFollowUpClick = (suggestion: string) => {
    setInputMessage(suggestion);
    setFollowUpSuggestions([]);
  };

  const isFailedAssistantMessage = (content: string) =>
    /unable to process your request|error:\s*client error/i.test(content);

  const pollForAIResponse = (conversationId: number, userMessageId: number) => {
    let retries = 0;
    // RAG + Gemini can take 30–60s; previous 20s limit stopped before the reply was saved
    const maxRetries = 90;
    const pollIntervalMs = 1000;

    activePollingConversationRef.current = conversationId;

    const syncMessages = (updatedMessages: MessagePublic[]) => {
      const sorted = [...updatedMessages].sort((a, b) => a.id - b.id);
      sorted.forEach((msg) => lastMessageIdsRef.current.add(msg.id));
      setMessages(sorted);
    };

    const attemptFetch = async () => {
      if (activePollingConversationRef.current !== conversationId) return;

      try {
        const updatedMessages = await chatService.getMessages(conversationId, 100);

        if (activePollingConversationRef.current !== conversationId) return;

        const assistantReply = updatedMessages.find(
          (msg) =>
            msg.role === "assistant" &&
            msg.id > userMessageId &&
            msg.content &&
            !isFailedAssistantMessage(msg.content)
        );

        if (assistantReply) {
          syncMessages(updatedMessages);
          const meta = assistantReply.chat_metadata;
          if (meta?.follow_up_suggestions?.length) {
            setFollowUpSuggestions(meta.follow_up_suggestions);
          }
          setIsThinking(false);
          activePollingConversationRef.current = null;
          return;
        }

        if (retries < maxRetries) {
          retries++;
          const timeoutId = setTimeout(attemptFetch, pollIntervalMs);
          pollingTimeoutRef.current = timeoutId;
        } else {
          // Final sync so a late backend reply still appears if it landed during the last poll
          syncMessages(updatedMessages);
          setIsThinking(false);
          activePollingConversationRef.current = null;
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        if (retries < maxRetries) {
          retries++;
          const timeoutId = setTimeout(attemptFetch, pollIntervalMs);
          pollingTimeoutRef.current = timeoutId;
        } else {
          setIsThinking(false);
          activePollingConversationRef.current = null;
        }
      }
    };

    const timeoutId = setTimeout(attemptFetch, 1500);
    pollingTimeoutRef.current = timeoutId;
  };

  const handleClosePanel = () => {
    onClose?.();
  };

  const handleNewChat = () => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    activePollingConversationRef.current = null;

    if (isStreaming) {
      stopStreaming();
    }

    setMessages([]);
    setIsThinking(false);
    setIsStreaming(false);
    setFollowUpSuggestions([]);
    lastMessageIdsRef.current.clear();
    setShowConversationList(false);
    setActiveConversation(null);
    setCurrentConversationKey(null);
    setIsNewChatMode(false);
  };

  const handleLoadConversation = (convKey: string) => {
    const stored = getStoredConversations();
    const conversation = stored[convKey];
    
    if (conversation) {
      setIsThinking(false);
      
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      activePollingConversationRef.current = null;
      
      const uniqueMessages = conversation.messages;
      setMessages([...uniqueMessages]);
      
      lastMessageIdsRef.current.clear();
      uniqueMessages.forEach(msg => lastMessageIdsRef.current.add(msg.id));
      
      setCurrentConversationKey(convKey);
      
      setActiveConversation({
        id: conversation.id,
        title: `${documentName} - Loaded`,
        status: "ACTIVE",
        organization_id: "",
        user_id: authState.user?.id,
        created_at: conversation.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        message_count: conversation.messages.length,
      });
      setShowConversationList(false);
      setIsNewChatMode(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isGenerating = isStreaming || isThinking;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen?.()}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg hover:from-slate-700 hover:to-slate-800 transition-all"
        title="Open Compliance Assistant"
        aria-label="Open Compliance Assistant"
      >
        <AssistantChatIcon size={24} />
        {isGenerating && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-400 border-2 border-white" />
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col h-screen shadow-xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <AssistantChatIcon size={22} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Compliance Assistant</h2>
              <p className="text-xs text-white/70 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {conversationHistory.length > 0 && (
              <button
                onClick={() => setShowConversationList(!showConversationList)}
                className={`p-2 rounded-lg transition-colors ${
                  showConversationList ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
                title="Chat history"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </button>
            )}
            <button
              onClick={handleNewChat}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="New conversation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button
              onClick={handleClosePanel}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Close chat"
              aria-label="Close chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Context indicator */}
        {documentName && documentName !== "General Chat" && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span className="text-xs text-white/90 truncate">{documentName}</span>
          </div>
        )}
      </div>

      {/* Conversation History Dropdown */}
      {showConversationList && conversationHistory.length > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Recent Conversations
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {conversationHistory.map((conv) => (
              <button
                key={conv.key}
                onClick={() => handleLoadConversation(conv.key)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{conv.title}</span>
                  <span className="text-xs text-gray-400">{conv.messageCount} msgs</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto bg-gray-50"
      >
        {messages.length === 0 && !isThinking ? (
          <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
              <AssistantChatIcon size={32} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">How can I help?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Ask me anything about compliance, policies, or regulations.
            </p>
            
            {/* Quick Actions */}
            <div className="w-full space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">
                Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action.label)}
                    className="flex items-center gap-2 px-3 py-2.5 text-left text-sm bg-white rounded-lg border border-gray-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                  >
                    <span className="text-base">{action.icon}</span>
                    <span className="text-gray-600 group-hover:text-gray-800 line-clamp-1">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    message.role === "assistant"
                      ? "bg-gradient-to-br from-slate-700 to-slate-900 text-white"
                      : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <AssistantChatIcon size={16} />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex flex-col max-w-[280px] ${message.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-md"
                        : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-md"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                  </div>
                  {(() => {
                    const validSources =
                      message.role === "assistant"
                        ? getValidChatSources(message.chat_metadata?.sources)
                        : [];
                    if (!validSources.length) return null;
                    return (
                    <div className="mt-1 px-1 space-y-1">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Sources</p>
                      {validSources.map((src) => (
                        <a
                          key={`${message.id}-${src.document_id}-${src.document_name}`}
                          href={`/documents/${src.document_id}`}
                          className="block text-[11px] text-blue-600 hover:underline truncate"
                        >
                          {src.document_name}
                        </a>
                      ))}
                    </div>
                    );
                  })()}
                  <div className={`flex items-center gap-2 mt-1 px-1 ${message.role === "user" ? "justify-end" : ""}`}>
                    <span className="text-[10px] text-gray-400">
                      {message.created_at ? formatTime(message.created_at) : ""}
                    </span>
                    {message.role === "assistant" &&
                      message.id === messages.filter((m) => m.role === "assistant" && m.id > 0).at(-1)?.id &&
                      !isStreaming && (
                        <button
                          type="button"
                          onClick={handleRegenerate}
                          className="text-[10px] text-slate-500 hover:text-slate-800 underline"
                        >
                          Regenerate
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))}

            {(isThinking || streamingContent) && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shrink-0">
                  <AssistantChatIcon size={16} />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100 max-w-[280px] min-w-[120px]">
                  {streamingContent ? (
                    <MarkdownRenderer content={streamingContent} />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {statusMessage || "Thinking…"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {followUpSuggestions.length > 0 && !isStreaming && (
              <div className="flex flex-wrap gap-2 pt-1">
                {followUpSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleFollowUpClick(suggestion)}
                    className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-colors text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        {fileUpload && (
          <div className="mb-3 p-2.5 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
              <span className="truncate max-w-[200px]">{fileUpload.name}</span>
            </div>
            <button
              onClick={() => setFileUpload(null)}
              className="p-1 hover:bg-blue-100 rounded transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.txt,.doc,.docx"
            className="hidden"
            aria-label="Upload document"
          />
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading}
              placeholder="Type your message..."
              className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 disabled:opacity-50 transition-all"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Attach file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </button>
          </div>
          
          <button
            type={isStreaming ? "button" : "submit"}
            onClick={isStreaming ? stopStreaming : undefined}
            disabled={!isStreaming && (loading || !inputMessage.trim())}
            className="p-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
          >
            {isStreaming ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1"></rect>
              </svg>
            ) : loading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </form>
        
        {/* Powered by text */}
        <p className="text-center text-[10px] text-gray-400 mt-3">
          Powered by AI • Responses may require verification
        </p>
      </div>
    </div>
  );
}
