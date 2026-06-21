import { useEffect, useState, useRef } from "react";
import { chatService } from "../../services/chatService";
import type { ConversationPublic, MessagePublic } from "../../types/chat";
import { useAuth } from "../../providers";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ComplianceAssistantProps {
  readonly isOpen: boolean;
  readonly documentId?: number;
  readonly documentName?: string;
  readonly documentThumbnail?: string;
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
  const [currentConversationKey, setCurrentConversationKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdsRef = useRef<Set<number>>(new Set());
  const activePollingConversationRef = useRef<number | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, streamingContent]);

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
    setInputMessage("");
    setFileUpload(null);
    setLoading(true);
    setIsThinking(true);

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

      setStreamingContent("");
      setIsThinking(true);

      const accessToken = authState.accessToken;
      if (accessToken) {
        try {
          let accumulated = "";
          await chatService.streamMessage(
            conversationToUse.id,
            { content: userMessage, role: "user" },
            accessToken,
            {
              onStart: async () => {
                const updatedMessages = await chatService.getMessages(
                  conversationToUse.id,
                  100
                );
                const sorted = [...updatedMessages].sort((a, b) => a.id - b.id);
                sorted.forEach((msg) => lastMessageIdsRef.current.add(msg.id));
                setMessages(sorted);
              },
              onText: (chunk) => {
                accumulated += chunk;
                setStreamingContent(accumulated);
              },
              onDone: async () => {
                setStreamingContent("");
                setIsThinking(false);
                const updatedMessages = await chatService.getMessages(
                  conversationToUse.id,
                  100
                );
                const sorted = [...updatedMessages].sort((a, b) => a.id - b.id);
                sorted.forEach((msg) => lastMessageIdsRef.current.add(msg.id));
                setMessages(sorted);
              },
              onError: (errMsg) => {
                console.warn("Stream error:", errMsg);
                setStreamingContent("");
                setIsThinking(false);
              },
            }
          );
          return;
        } catch (streamError) {
          console.warn("Stream unavailable, using send + poll:", streamError);
          setStreamingContent("");
        }
      }

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

  if (!isOpen) return null;

  const handleNewChat = () => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    activePollingConversationRef.current = null;
    
    setMessages([]);
    setIsThinking(false);
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

  return (
    <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col h-screen shadow-xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
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
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {messages.length === 0 && !isThinking ? (
          <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 8V4H8"></path>
                      <rect x="8" y="8" width="8" height="8" rx="1"></rect>
                      <path d="M4 12H2"></path>
                      <path d="M22 12h-2"></path>
                      <path d="M12 2v2"></path>
                      <path d="M12 22v-2"></path>
                      <path d="M20 20l-1.5-1.5"></path>
                      <path d="M4 4l1.5 1.5"></path>
                      <path d="M20 4l-1.5 1.5"></path>
                      <path d="M4 20l1.5-1.5"></path>
                    </svg>
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
                  <span className={`text-[10px] mt-1 px-1 ${
                    message.role === "user" ? "text-gray-400" : "text-gray-400"
                  }`}>
                    {message.created_at ? formatTime(message.created_at) : ''}
                  </span>
                </div>
              </div>
            ))}

            {(isThinking || streamingContent) && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8V4H8"></path>
                    <rect x="8" y="8" width="8" height="8" rx="1"></rect>
                  </svg>
                </div>
                <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100 max-w-[280px]">
                  {streamingContent ? (
                    <MarkdownRenderer content={streamingContent} />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></span>
                      </div>
                      <span className="text-xs text-gray-500">Analyzing...</span>
                    </div>
                  )}
                </div>
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
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="p-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
          >
            {loading ? (
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
