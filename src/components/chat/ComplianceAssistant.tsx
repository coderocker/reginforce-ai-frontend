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

export function ComplianceAssistant({
  isOpen,
  documentId,
  documentName = "GDPR Policy v2",
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
  const [currentConversationKey, setCurrentConversationKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdsRef = useRef<Set<number>>(new Set());
  const activePollingConversationRef = useRef<number | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Better avatars using emoji
  const AI_AVATAR = "🤖";
  const USER_AVATAR = "👤";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Load conversation history for current document
  useEffect(() => {
    const loadConversationHistory = () => {
      const stored = getStoredConversations();
      const history: StoredConversation[] = [];
      
      Object.entries(stored).forEach(([key, data]) => {
        // Match conversations using the new key format: conv_{id}_{docId|general}
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
      console.log("Initializing conversation:", { isOpen, documentId, isNewChatMode });
      
      if (!isOpen) {
        console.log("Chat not open, skipping initialization");
        return;
      }
      
      // If in new chat mode, don't restore - handleNewChat will handle creation
      if (isNewChatMode) {
        console.log("New chat mode - skipping auto initialization");
        return;
      }
      
      // Use documentId if available, otherwise use "general" conversation
      const stored = getStoredConversations();
      
      // Find the most recent conversation for this document
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
        // Restore saved conversation
        console.log("Restoring saved conversation:", mostRecentConversation.id);
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
        // No existing conversation - don't create one yet
        // Will be created lazily when user sends first message
        console.log("No existing conversation found - will create on first message");
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
    console.log("Send button clicked", { 
      inputMessage: inputMessage.trim(), 
      activeConversation: activeConversation?.id,
      hasConversation: !!activeConversation 
    });
    
    if (!inputMessage.trim()) {
      console.warn("Empty message");
      return;
    }

    const userMessage = inputMessage;
    setInputMessage("");
    setFileUpload(null);
    setLoading(true);
    setIsThinking(true);

    try {
      let conversationToUse = activeConversation;
      
      // Create conversation in backend if not yet created (lazy creation)
      if (!conversationToUse) {
        console.log("Creating conversation on first message...");
        const newConversation = await chatService.createConversation({
          title: `${documentName || "Compliance Review"} - ${new Date().toLocaleDateString()}`,
        });
        console.log("Conversation created:", newConversation.id);
        
        // Set the conversation key for saving
        const conversationKey = `conv_${newConversation.id}_${documentId || 'general'}`;
        setCurrentConversationKey(conversationKey);
        setActiveConversation(newConversation);
        conversationToUse = newConversation;
        
        // Save to localStorage
        const stored = getStoredConversations();
        stored[conversationKey] = {
          id: newConversation.id,
          messages: [],
          createdAt: new Date().toISOString(),
        };
        saveConversations(stored);
        
        // Update conversation history
        setConversationHistory(prev => [{
          key: conversationKey,
          id: newConversation.id,
          title: `Chat ${newConversation.id} - ${new Date().toLocaleDateString()}`,
          createdAt: new Date().toISOString(),
          messageCount: 0,
        }, ...prev]);
        
        // Add document context if documentId is available
        if (documentId) {
          try {
            await chatService.addConversationContext(newConversation.id, {
              document_id: documentId,
              context_type: "REGULATION",
            });
            console.log("Document context added");
          } catch (error) {
            console.warn("Failed to add document context:", error);
          }
        }
      }

      // Send user message
      console.log("Sending message:", { conversationId: conversationToUse.id, content: userMessage });
      const sentMessage = await chatService.sendMessage(
        conversationToUse.id,
        { content: userMessage, role: "user" }
      );

      console.log("Message sent successfully:", sentMessage);

      // Add user message to UI and track its ID
      setMessages((prev) => [...prev, sentMessage]);
      lastMessageIdsRef.current.add(sentMessage.id);

      // Start polling for AI response with thinking indicator
      setIsThinking(true);
      pollForAIResponse(conversationToUse.id);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Check browser console for details.");
    } finally {
      setLoading(false);
    }
  };

  const pollForAIResponse = (conversationId: number) => {
    let retries = 0;
    const maxRetries = 20;
    
    // Set this as the active polling conversation
    activePollingConversationRef.current = conversationId;

    const attemptFetch = async () => {
      // Check if this polling session is still active
      if (activePollingConversationRef.current !== conversationId) {
        console.log("Polling cancelled: conversation ID mismatch");
        return;
      }

      try {
        console.log("Polling for AI response (attempt", retries + 1, "/", maxRetries, ")");
        const updatedMessages = await chatService.getMessages(
          conversationId,
          100
        );
        console.log("Fetched messages:", updatedMessages);

        // Double-check we're still polling for this conversation
        if (activePollingConversationRef.current !== conversationId) {
          console.log("Polling cancelled: conversation switched");
          return;
        }

        // Update messages with new responses - filter by comparing with previously seen IDs
        const newMessages = updatedMessages.filter(
          (msg) => !lastMessageIdsRef.current.has(msg.id)
        );
        
        if (newMessages.length > 0) {
          console.log("Found new messages:", newMessages.length);
          // Add new message IDs to our tracking set
          newMessages.forEach(msg => lastMessageIdsRef.current.add(msg.id));
          // Update state with only new messages
          setMessages((prev) => [...prev, ...newMessages]);
          setIsThinking(false);
          return;
        }
        
        // Continue polling
        if (retries < maxRetries) {
          retries++;
          const timeoutId = setTimeout(attemptFetch, 1000);
          pollingTimeoutRef.current = timeoutId;
        } else {
          console.warn("Polling timeout: AI response not received after 20 seconds");
          setIsThinking(false);
          activePollingConversationRef.current = null;
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        if (retries < maxRetries) {
          retries++;
          const timeoutId = setTimeout(attemptFetch, 1000);
          pollingTimeoutRef.current = timeoutId;
        } else {
          setIsThinking(false);
          activePollingConversationRef.current = null;
        }
      }
    };

    // Wait 1-2 seconds before first poll
    const timeoutId = setTimeout(attemptFetch, 1500);
    pollingTimeoutRef.current = timeoutId;
  };

  if (!isOpen) return null;

  const handleNewChat = () => {
    // Cancel any active polling
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    activePollingConversationRef.current = null;
    
    // Immediately clear everything for new chat
    // Don't create backend conversation yet - will be created on first message
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
      // Stop any ongoing polling by resetting thinking state
      setIsThinking(false);
      
      // Cancel any active polling
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      activePollingConversationRef.current = null;
      
      // Clear messages first and set new ones
      const uniqueMessages = conversation.messages;
      setMessages([...uniqueMessages]);
      
      // Update message ID tracking ref
      lastMessageIdsRef.current.clear();
      uniqueMessages.forEach(msg => lastMessageIdsRef.current.add(msg.id));
      
      // Set the current conversation key so save effect uses it
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

  return (
    // Right sidebar layout
    <div className="w-[360px] bg-white border-l border-[#dedfe3] flex flex-col h-screen">
      {/* Header */}
      <div className="px-4 pb-3 pt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[#131416] text-[22px] font-bold leading-tight tracking-[-0.015em]">
            Compliance Assistant
          </h2>
          <div className="flex gap-2">
            {conversationHistory.length > 0 && (
              <button
                onClick={() => setShowConversationList(!showConversationList)}
                className="px-3 py-1 text-xs font-medium text-[#525252] bg-[#f4f4f4] rounded hover:bg-[#e8e8e8] transition-colors"
                title="View conversation history"
              >
                📋 {conversationHistory.length}
              </button>
            )}
            <button
              onClick={handleNewChat}
              className="px-3 py-1 text-xs font-medium text-[#0f62fe] bg-[#f4f4f4] rounded hover:bg-[#e8e8e8] transition-colors"
              title="Start a new conversation"
            >
              ➕ New
            </button>
          </div>
        </div>
        <p className="text-[#6b7180] text-sm font-normal leading-normal pb-3 pt-1">
          Analyzing: {documentName}
        </p>
        
        {/* Conversation History List */}
        {showConversationList && conversationHistory.length > 0 && (
          <div className="border-t border-[#dedfe3] pt-2 mt-2">
            <p className="text-[#6b7180] text-xs font-medium mb-2 px-0">Previous Conversations:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {conversationHistory.map((conv) => (
                <button
                  key={conv.key}
                  onClick={() => handleLoadConversation(conv.key)}
                  className="w-full text-left px-2 py-2 text-xs rounded hover:bg-[#f0f0f0] transition-colors border border-[#e8e8e8]"
                >
                  <div className="font-medium text-[#131416] truncate">{conv.title}</div>
                  <div className="text-[#6b7180] text-xs">{conv.messageCount} messages</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-[#6b7180] text-sm text-center">
              Start the conversation by asking about this policy
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-3 p-4 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xl text-white font-bold shrink-0">
                    {AI_AVATAR}
                  </div>
                )}

                <div
                  className={`flex flex-col ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <p className="text-[#6b7180] text-[13px] font-normal leading-normal mb-1">
                    {message.role === "assistant" ? "AI Assistant" : "You"}
                  </p>
                  <div
                    className={`flex flex-col max-w-[300px] rounded-lg px-4 py-3 ${
                      message.role === "user"
                        ? "bg-[#0f1729] text-white"
                        : "bg-[#f1f2f3] text-[#131416]"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <p className="text-base font-normal leading-normal whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                  </div>
                  {message.referenced_documents &&
                    message.referenced_documents.length > 0 && (
                      <div className="mt-2 pt-2 space-y-1">
                        <p className="text-xs font-semibold opacity-70 px-4">
                          References:
                        </p>
                        {message.referenced_documents.map((docId) => (
                          <button
                            key={docId}
                            type="button"
                            onClick={() => console.log(`Viewing document ${docId}`)}
                            className="block text-xs hover:underline opacity-80 px-4 bg-none border-none cursor-pointer"
                          >
                            📄 Document {docId}
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                {message.role === "user" && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-xl font-bold shrink-0">
                    {USER_AVATAR}
                  </div>
                )}
              </div>
            ))}

            {/* Thinking Indicator */}
            {isThinking && (
              <div className="flex items-end gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xl text-white font-bold shrink-0">
                  {AI_AVATAR}
                </div>
                <div className="flex flex-col items-start">
                  <p className="text-[#6b7180] text-[13px] font-normal leading-normal mb-1">
                    AI Assistant
                  </p>
                  <div className="bg-[#f1f2f3] text-[#131416] rounded-lg px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></span>
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                    </div>
                    <span className="text-sm text-gray-600 ml-1">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Document Context Card */}
      {documentId && (
        <div className="p-4 border-t border-[#dedfe3]">
          <div className="flex items-stretch justify-between gap-4 rounded-lg border border-[#dedfe3] p-4">
            <div className="flex flex-col gap-4 flex-[2_2_0px]">
              <div className="flex flex-col gap-1">
                <p className="text-[#131416] text-base font-bold leading-tight">
                  {documentName}
                </p>
                <p className="text-[#6b7180] text-sm font-normal leading-normal">
                  View the full policy document
                </p>
              </div>
              <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#f1f2f3] text-[#131416] text-sm font-medium leading-normal w-fit hover:bg-[#e0e0e0] transition">
                <span className="truncate">View</span>
              </button>
            </div>
            {documentThumbnail && (
              <div
                className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg flex-1"
                style={{ backgroundImage: `url("${documentThumbnail}")` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Input Area with Document Upload */}
      <div className="border-t border-[#dedfe3] p-4">
        {fileUpload && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <span className="text-xs text-blue-900 flex items-center gap-2">
              📎 {fileUpload.name.substring(0, 20)}...
            </span>
            <button
              onClick={() => setFileUpload(null)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ✕
            </button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-stretch gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.txt,.doc,.docx"
            className="hidden"
            aria-label="Upload document"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex items-center justify-center px-3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50"
            title="Upload document for context"
          >
            📎
          </button>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading}
            placeholder="Ask about this policy..."
            className="flex-1 px-4 py-3 bg-[#f1f2f3] border-none rounded-lg text-[#131416] placeholder-[#6b7180] focus:outline-none focus:ring-2 focus:ring-[#0f1729] disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="flex items-center justify-center px-4 py-3 bg-[#0f1729] hover:bg-[#1a2341] text-white text-sm font-medium leading-normal rounded-lg transition disabled:opacity-50"
          >
            {loading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
