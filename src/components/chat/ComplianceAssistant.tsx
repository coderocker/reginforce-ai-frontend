import { useEffect, useState, useRef } from "react";
import { chatService } from "../../services/chatService";
import type { ConversationPublic, MessagePublic } from "../../types/chat";
import { useAuth } from "../../providers";

interface ComplianceAssistantProps {
  readonly isOpen: boolean;
  readonly documentId?: number;
  readonly documentName?: string;
  readonly documentThumbnail?: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Default avatars
  const AI_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=ai";
  const USER_AVATAR = authState.user?.id
    ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${authState.user.id}`
    : "https://api.dicebear.com/7.x/avataaars/svg?seed=user";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Create conversation on first open
  useEffect(() => {
    if (isOpen && !activeConversation) {
      handleNewConversation();
    }
  }, [isOpen]);

  // Add document context when conversation created
  useEffect(() => {
    if (activeConversation && documentId) {
      addDocumentContext();
    }
  }, [activeConversation, documentId]);

  const handleNewConversation = async () => {
    try {
      const conversation = await chatService.createConversation({
        title: `${documentName || "Compliance Review"} - ${new Date().toLocaleDateString()}`,
      });
      setActiveConversation(conversation);
      setMessages([]);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConversation) return;

    const userMessage = inputMessage;
    setInputMessage("");
    setLoading(true);

    try {
      // Send user message
      console.log("Sending message:", { conversationId: activeConversation.id, content: userMessage });
      const sentMessage = await chatService.sendMessage(
        activeConversation.id,
        { content: userMessage, role: "user" }
      );

      console.log("Message sent successfully:", sentMessage);

      // Add user message to UI
      setMessages((prev) => [...prev, sentMessage]);

      // Start polling for AI response
      pollForAIResponse(activeConversation.id);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Check browser console for details.");
    } finally {
      setLoading(false);
    }
  };

  const pollForAIResponse = (conversationId: number) => {
    let retries = 0;
    const maxRetries = 20; // Poll for up to 20 seconds (AI takes 1-5 seconds typically)

    const attemptFetch = async () => {
      try {
        console.log("Polling for AI response (attempt", retries + 1, "/", maxRetries, ")");
        const updatedMessages = await chatService.getMessages(
          conversationId,
          100
        );
        console.log("Fetched messages:", updatedMessages);

        // Update messages with new responses
        const hasNewMessages = updateMessagesWithNewResponses(updatedMessages);
        
        // Stop polling if we found new messages (AI response received)
        if (hasNewMessages) {
          console.log("AI response received, stopping poll");
          return;
        }
        
        // Continue polling
        if (retries < maxRetries) {
          retries++;
          setTimeout(attemptFetch, 1000);
        } else {
          console.warn("Polling timeout: AI response not received after 20 seconds");
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        if (retries < maxRetries) {
          retries++;
          setTimeout(attemptFetch, 1000);
        }
      }
    };

    // Wait 1-2 seconds before first poll (AI takes time to generate)
    setTimeout(attemptFetch, 1500);
  };

  const updateMessagesWithNewResponses = (updatedMessages: MessagePublic[]): boolean => {
    // Check if there are new messages BEFORE updating state
    setMessages((prevMessages) => {
      const existingIds = new Set(prevMessages.map((m) => m.id));
      const newMessages = updatedMessages.filter(
        (msg) => !existingIds.has(msg.id)
      );
      
      if (newMessages.length > 0) {
        console.log("Found new AI response messages:", newMessages);
      }
      
      return newMessages.length > 0 ? [...prevMessages, ...newMessages] : prevMessages;
    });
    
    // Return based on whether we found new messages in the updatedMessages array
    const existingIds = new Set(messages.map((m) => m.id));
    const newMessages = updatedMessages.filter(
      (msg) => !existingIds.has(msg.id)
    );
    
    return newMessages.length > 0;
  };

  if (!isOpen) return null;

  return (
    // Right sidebar layout - exactly as per stitch design
    <div className="w-[360px] bg-white border-l border-[#dedfe3] flex flex-col h-screen">
      {/* Header */}
      <div className="px-4 pb-3 pt-5">
        <h2 className="text-[#131416] text-[22px] font-bold leading-tight tracking-[-0.015em]">
          Compliance Assistant
        </h2>
        <p className="text-[#6b7180] text-sm font-normal leading-normal pb-3 pt-1">
          Analyzing: {documentName}
        </p>
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
                  <img
                    src={AI_AVATAR}
                    alt="AI Avatar"
                    className="w-10 h-10 rounded-full shrink-0"
                  />
                )}

                <div
                  className={`flex flex-col ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <p className="text-[#6b7180] text-[13px] font-normal leading-normal mb-1">
                    {message.role === "assistant" ? "AI Assistant" : "User"}
                  </p>
                  <p
                    className={`text-base font-normal leading-normal flex max-w-[280px] rounded-lg px-4 py-3 ${
                      message.role === "user"
                        ? "bg-[#0f1729] text-white"
                        : "bg-[#f1f2f3] text-[#131416]"
                    }`}
                  >
                    {message.content}
                  </p>
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
                  <img
                    src={USER_AVATAR}
                    alt="User Avatar"
                    className="w-10 h-10 rounded-full shrink-0"
                  />
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Document Context Card - as per stitch design */}
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

      {/* Input Area - integrated as per design */}
      <div className="border-t border-[#dedfe3] p-4">
        <form onSubmit={handleSendMessage} className="flex items-stretch gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading}
            placeholder="Ask about a specific regulation or gap..."
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
