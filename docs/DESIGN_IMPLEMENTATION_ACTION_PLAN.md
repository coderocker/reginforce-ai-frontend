# API & Design Verification - Action Plan

**Status:** ⚠️ ISSUES IDENTIFIED - Requires Action  
**Date:** December 12, 2025

---

## Summary of Issues Found

### Issue 1: ❌ Stitch Design NOT Implemented
**Severity:** HIGH  
**Impact:** UI/UX doesn't match approved design  
**Current State:** Modal dialog layout  
**Expected State:** Right sidebar layout (360px fixed width)

### Issue 2: ❌ Missing Avatar Images
**Severity:** MEDIUM  
**Impact:** Messages lack visual context  
**Current State:** No avatars displayed  
**Expected State:** User and AI avatars visible

### Issue 3: ❌ Missing Document Context Card
**Severity:** MEDIUM  
**Impact:** No way to see which document is being analyzed  
**Current State:** Not displayed  
**Expected State:** Card showing document name + thumbnail

### Issue 4: ⚠️ Mocked AI Responses
**Severity:** HIGH  
**Impact:** Chat doesn't work with real backend  
**Current State:** Hardcoded placeholder response  
**Expected State:** Real API calls to get AI responses

### Issue 5: ❌ Missing Context Addition Endpoint
**Severity:** LOW  
**Impact:** Can't add document context to conversations  
**Current State:** Not implemented  
**Expected State:** `POST /api/chat/conversations/{id}/contexts`

---

## Detailed Issue Breakdown

### Issue 1: Modal vs Sidebar Layout

**Current Code (WRONG):**
```tsx
// src/components/chat/ComplianceAssistant.tsx - Lines 130-135
return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="w-full max-w-2xl h-screen max-h-[80vh] bg-white rounded-lg shadow-xl">
      {/* Modal content */}
    </div>
  </div>
);
```

**Expected Code (FROM STITCH DESIGN):**
```tsx
// Should integrate as right sidebar in Dashboard layout
// Not as modal overlay
<div className="layout-content-container flex flex-col w-[360px]">
  <h2 className="text-[22px] font-bold">Compliance Assistant</h2>
  <p className="text-sm text-[#6b7180]">Analyzing: GDPR Policy v2</p>
  {/* Messages and input */}
</div>
```

**Files to Update:**
- `src/components/chat/ComplianceAssistant.tsx` - Refactor to sidebar component
- `src/pages/Dashboard.tsx` - Add sidebar integration
- `src/components/layouts/MainLayout.tsx` - Add chat sidebar

---

### Issue 2: Avatar Images Missing

**Current Code (INCOMPLETE):**
```tsx
// src/components/chat/ComplianceAssistant.tsx - Line 195
messages.map((message) => (
  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
    <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
      {/* NO AVATAR */}
      <p className="text-sm">{message.content}</p>
    </div>
  </div>
))
```

**Expected Code (FROM STITCH DESIGN):**
```tsx
<div className="flex items-end gap-3 p-4">
  <div
    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 shrink-0"
    style={{backgroundImage: `url("${userAvatar}")`}}
  />
  <div className="flex flex-1 flex-col gap-1">
    <p className="text-[13px] font-normal text-[#6b7180]">{message.role}</p>
    <p className="text-base font-normal px-4 py-3 rounded-lg bg-[#f1f2f3] text-[#131416]">
      {message.content}
    </p>
  </div>
</div>
```

**Required Changes:**
1. Add `user_avatar_url` to MessagePublic type
2. Fetch user avatar from auth context for current user
3. Display avatar in message bubble
4. Add AI avatar image

**Files to Update:**
- `src/types/chat.ts` - Add avatar fields
- `src/components/chat/ComplianceAssistant.tsx` - Add avatar display
- `src/services/chatService.ts` - Fetch user profile with avatar

---

### Issue 3: Document Context Card Missing

**Current Code (NOT IMPLEMENTED):**
```tsx
// src/components/chat/ComplianceAssistant.tsx - NO DOCUMENT CARD
// ... just messages and input
```

**Expected Code (FROM STITCH DESIGN):**
```tsx
<div className="p-4">
  <div className="flex items-stretch justify-between gap-4 rounded-lg">
    <div className="flex-[2_2_0px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-[#131416] text-base font-bold">GDPR Policy v2</p>
        <p className="text-[#6b7180] text-sm">View the full policy document</p>
      </div>
      <button className="bg-[#f1f2f3] px-4 py-2 rounded-lg">
        View
      </button>
    </div>
    <div
      className="w-full aspect-video bg-cover rounded-lg"
      style={{backgroundImage: `url("${documentThumbnail}")`}}
    />
  </div>
</div>
```

**Required Props:**
- `documentId` - Which document is being analyzed
- `documentName` - Display name
- `documentThumbnail` - Thumbnail image URL

**Files to Update:**
- `src/components/chat/ComplianceAssistant.tsx` - Add document context section
- Pass document info as props from parent component
- Add "View" button handler to navigate to document detail

---

### Issue 4: Mocked AI Responses

**Current Code (WRONG):**
```tsx
// src/components/chat/ComplianceAssistant.tsx - Lines 101-115
const handleSendMessage = async (e: React.FormEvent) => {
  // ... send user message
  const sentMessage = await chatService.sendMessage(
    activeConversation.id,
    { content: userMessage, role: "user" }
  );
  
  // ❌ MOCKED AI RESPONSE - NOT FROM BACKEND
  const aiMessage: MessagePublic = {
    id: sentMessage.id + 1,
    conversation_id: activeConversation.id,
    role: "assistant",
    content: "I'm processing your compliance question. This is a placeholder response.",
    sequence: sentMessage.sequence + 1,
    created_at: new Date().toISOString(),
  };
  
  setMessages((prev) => [...prev, aiMessage]);
};
```

**Expected Code (FROM BACKEND):**
```tsx
const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputMessage.trim() || !activeConversation) return;
  
  const userMessage = inputMessage;
  setInputMessage("");
  setLoading(true);
  
  try {
    // 1. Send user message
    const sentUserMessage = await chatService.sendMessage(
      activeConversation.id,
      { content: userMessage, role: "user" }
    );
    
    setMessages((prev) => [...prev, sentUserMessage]);
    
    // 2. Get AI response from backend (NOT MOCKED)
    const aiResponse = await chatService.sendMessage(
      activeConversation.id,
      { 
        content: userMessage, 
        role: "user"
        // Backend will process and return assistant response
      }
    );
    
    // 3. Display AI response
    if (aiResponse.role === "assistant") {
      setMessages((prev) => [...prev, aiResponse]);
    } else {
      // Poll for AI response or use WebSocket
      // Backend should return assistant message when ready
    }
  } catch (error) {
    console.error("Failed to send message:", error);
  } finally {
    setLoading(false);
  }
};
```

**Note:** This depends on backend implementation. Does backend:
- Return AI response immediately?
- Queue response and poll?
- Use WebSocket for streaming?

**Files to Update:**
- `src/components/chat/ComplianceAssistant.tsx` - Remove mocked response
- `src/services/chatService.ts` - Add polling or WebSocket support if needed

---

### Issue 5: Missing Context Addition Endpoint

**Current Implementation:** ❌ NOT IN chatService.ts

**Required Code:**
```typescript
// src/services/chatService.ts - Add this method
/**
 * Add context to conversation
 * POST /api/chat/conversations/{conversation_id}/contexts
 */
async addConversationContext(
  conversationId: number,
  context: ConversationContextCreate
): Promise<ConversationContextPublic> {
  const response = await axios.post<ConversationContextPublic>(
    `${this.baseURL}/chat/conversations/${conversationId}/contexts`,
    context,
    { headers: this.getAuthHeaders() }
  );
  return response.data;
}
```

**Type Definitions Needed:**
```typescript
// src/types/chat.ts
export interface ConversationContextCreate {
  document_id?: number;
  context_type?: "REGULATION" | "POLICY" | "ANALYSIS_REPORT";
  metadata?: Record<string, unknown>;
}

export interface ConversationContextPublic {
  id: number;
  conversation_id: number;
  document_id?: number;
  context_type?: string;
  created_at: string;
}
```

**Files to Update:**
- `src/services/chatService.ts` - Add method
- `src/types/chat.ts` - Add types

---

## Implementation Priority & Effort Estimation

| Issue | Priority | Effort | Timeline | Files |
|-------|----------|--------|----------|-------|
| Mocked AI Response | 🔴 CRITICAL | 2-4 hours | Today | ComplianceAssistant.tsx |
| Modal to Sidebar | 🔴 CRITICAL | 4-6 hours | Tomorrow | ComplianceAssistant.tsx, Dashboard.tsx, MainLayout.tsx |
| Avatar Images | 🟡 HIGH | 2-3 hours | Tomorrow | ComplianceAssistant.tsx, types/chat.ts |
| Document Context Card | 🟡 HIGH | 2-3 hours | This week | ComplianceAssistant.tsx |
| Context Addition Endpoint | 🟢 LOW | 30 min | This week | chatService.ts, types/chat.ts |

**Total Estimated Effort:** 10.5 - 16.5 hours

---

## Step-by-Step Implementation Guide

### Step 1: Fix Mocked AI Response (URGENT)

**Location:** `src/components/chat/ComplianceAssistant.tsx`

**Changes:**
1. Remove hardcoded aiMessage creation
2. Implement proper backend call
3. Add loading indicator for AI response
4. Handle streaming or polling based on backend

**Code Change:**
```tsx
// BEFORE (Lines 100-120)
try {
  const sentMessage = await chatService.sendMessage(
    activeConversation.id,
    { content: userMessage, role: "user" }
  );
  setMessages((prev) => [...prev, sentMessage]);
  
  // ❌ REMOVE THIS MOCKED CODE
  const aiMessage: MessagePublic = {
    id: sentMessage.id + 1,
    conversation_id: activeConversation.id,
    role: "assistant",
    content: "I'm processing your compliance question. This is a placeholder response.",
    sequence: sentMessage.sequence + 1,
    created_at: new Date().toISOString(),
  };
  setMessages((prev) => [...prev, aiMessage]);
}

// AFTER
try {
  setMessages((prev) => [
    ...prev,
    {
      id: Date.now(),
      conversation_id: activeConversation.id,
      role: "user",
      content: userMessage,
      sequence: messages.length,
      created_at: new Date().toISOString(),
    }
  ]);
  
  // Poll for AI response or wait for backend
  // Backend should send message with role="assistant"
  const response = await chatService.getMessages(
    activeConversation.id,
    messages.length + 1
  );
  
  const newMessages = response.filter(
    msg => !messages.find(m => m.id === msg.id)
  );
  
  setMessages((prev) => [...prev, ...newMessages]);
}
```

---

### Step 2: Convert Modal to Sidebar

**Location:** `src/components/chat/ComplianceAssistant.tsx`

**Current:** Opens as modal dialog  
**Expected:** Renders as sidebar component

**Changes:**
1. Remove `fixed inset-0` modal styling
2. Change to sidebar dimensions (w-[360px])
3. Remove close button (integrate into main layout)
4. Pass document context as props

**New Component Structure:**
```tsx
// Change from modal to sidebar component
export function ComplianceAssistant({ 
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly documentId?: number;
  readonly documentName?: string;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="w-[360px] bg-white border-l border-[#dedfe3] flex flex-col">
      {/* Sidebar content */}
    </div>
  );
}
```

**Integration Point:**
```tsx
// src/pages/Dashboard.tsx
import { ComplianceAssistant } from "../components/chat/ComplianceAssistant";

export function Dashboard() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  return (
    <div className="flex gap-1">
      {/* Main dashboard content */}
      <div className="flex-1">...</div>
      
      {/* Chat sidebar */}
      {isChatOpen && (
        <ComplianceAssistant
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          documentId={selectedDocId}
          documentName={selectedDocName}
        />
      )}
    </div>
  );
}
```

---

### Step 3: Add Avatar Display

**Location:** `src/components/chat/ComplianceAssistant.tsx`

**Changes:**
1. Get current user from auth context
2. Display user avatar for user messages
3. Use default AI avatar
4. Match design styling

**Code:**
```tsx
import { useAuth } from "../../providers/AuthProvider";

export function ComplianceAssistant({ isOpen, onClose, documentId, documentName }) {
  const { authState } = useAuth();
  const [messages, setMessages] = useState<MessagePublic[]>([]);
  
  const AI_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=ai";
  const USER_AVATAR = authState.user?.avatar_url || 
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${authState.user?.id}`;
  
  return (
    <div className="messages">
      {messages.map((message) => (
        <div className={`flex items-end gap-3 p-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {message.role === "assistant" && (
            <img
              src={AI_AVATAR}
              alt="AI Avatar"
              className="w-10 h-10 rounded-full shrink-0"
            />
          )}
          
          <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
            <p className="text-[13px] text-[#6b7180] mb-1">
              {message.role === "assistant" ? "AI Assistant" : "You"}
            </p>
            <p className={`max-w-xs px-4 py-3 rounded-lg text-base ${
              message.role === "user"
                ? "bg-[#0f1729] text-white"
                : "bg-[#f1f2f3] text-[#131416]"
            }`}>
              {message.content}
            </p>
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
    </div>
  );
}
```

---

### Step 4: Add Document Context Card

**Location:** `src/components/chat/ComplianceAssistant.tsx`

**Changes:**
1. Add document card section above input
2. Show document name and thumbnail
3. Add "View" button to navigate
4. Receive document props from parent

**Code:**
```tsx
export function ComplianceAssistant({ 
  isOpen, 
  onClose, 
  documentId, 
  documentName,
  documentThumbnail,
  onViewDocument
}) {
  return (
    <div className="w-[360px] flex flex-col">
      {/* ... messages ... */}
      
      {/* Document Context Card - NEW */}
      {documentId && (
        <div className="p-4 border-t border-[#dedfe3]">
          <div className="flex items-stretch justify-between gap-4 rounded-lg border border-[#dedfe3] p-4">
            <div className="flex flex-col gap-4 flex-[2_2_0px]">
              <div className="flex flex-col gap-1">
                <p className="text-[#131416] text-base font-bold">
                  {documentName || "Document"}
                </p>
                <p className="text-[#6b7180] text-sm font-normal">
                  View the full policy document
                </p>
              </div>
              <button
                onClick={() => onViewDocument?.(documentId)}
                className="w-fit px-4 py-2 bg-[#f1f2f3] text-[#131416] text-sm font-medium rounded-lg hover:bg-[#e0e0e0] transition"
              >
                View
              </button>
            </div>
            {documentThumbnail && (
              <div
                className="w-24 aspect-video bg-cover rounded-lg flex-shrink-0"
                style={{ backgroundImage: `url("${documentThumbnail}")` }}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="border-t border-[#dedfe3] p-4">
        {/* ... input form ... */}
      </div>
    </div>
  );
}
```

---

### Step 5: Add Context Addition

**Location:** `src/services/chatService.ts`

**Add Method:**
```typescript
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
  const response = await axios.post(
    `${this.baseURL}/chat/conversations/${conversationId}/contexts`,
    context,
    { headers: this.getAuthHeaders() }
  );
  return response.data;
}
```

**Usage in Component:**
```tsx
// When opening chat with a document
useEffect(() => {
  if (activeConversation && documentId) {
    chatService.addConversationContext(activeConversation.id, {
      document_id: documentId,
      context_type: "REGULATION"
    }).catch(err => console.error("Failed to add context:", err));
  }
}, [activeConversation, documentId]);
```

---

## Verification Checklist

After implementation, verify:

- [ ] Chat renders as sidebar (not modal)
- [ ] Avatars visible for user and AI messages
- [ ] Document context card shows with image and button
- [ ] AI responses are from backend (not mocked)
- [ ] "View" button navigates to document
- [ ] Messages styled according to design
- [ ] Input styled according to design
- [ ] Send button integrated into input area
- [ ] Context addition endpoint called when document selected
- [ ] No TypeScript errors or console warnings
- [ ] Responsive on mobile (sidebar hides if needed)
- [ ] All API calls match OpenAPI spec

---

## Testing Commands

```bash
# Test adding context
curl -X POST http://localhost:8000/api/chat/conversations/1/contexts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"document_id": 1, "context_type": "REGULATION"}'

# Test getting messages
curl -X GET "http://localhost:8000/api/chat/conversations/1/messages?limit=100" \
  -H "Authorization: Bearer $TOKEN"

# Should see real AI responses, not mocked
```

---

## Notes

- All changes should maintain API compliance
- Follow existing code style and patterns
- Use TypeScript strict mode
- Test with actual backend before deploying
- Update unit tests if any exist
- Update storybook if UI components are documented
