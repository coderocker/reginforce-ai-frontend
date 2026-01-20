# Frontend API Compliance Checklist

## Quick Reference for Frontend Developers

### ✅ What Works (No Changes Needed)

#### 1. Creating a Conversation
```typescript
import { chatService } from "../../services/chatService";

const conversation = await chatService.createConversation({
  title: "My Compliance Review"
});
```

#### 2. Sending a Message
```typescript
const message = await chatService.sendMessage(conversationId, {
  content: "What are the GDPR requirements?",
  role: "user"
});

// Backend automatically generates AI response
// Frontend polls for messages to get the AI response
```

#### 3. Adding Document Context
```typescript
// ✅ CORRECT - Using plural `/contexts` endpoint
await chatService.addConversationContext(conversationId, {
  document_id: 123,
  context_type: "REGULATION"  // or "POLICY" or "ANALYSIS_REPORT"
});
```

#### 4. Listing Messages
```typescript
const messages = await chatService.getMessages(conversationId, limit);
```

---

### ❌ What NOT to Do

#### ❌ DON'T Call `generate_completion` Directly
```typescript
// ❌ WRONG - Don't do this
await apiClient.post('/api/chat/generate-completion', {
  prompt: "Some text",
  system_prompt: "You are an AI...",  // ❌ REMOVED
  temperature: 0.7,                    // ❌ REMOVED
  max_tokens: 500,                     // ❌ REMOVED
  conversation_history: [...]          // ❌ REMOVED
});
```

**Why?** The backend handles all model parameters internally now.

#### ❌ DON'T Use Singular `/context` Endpoint
```typescript
// ❌ WRONG - Singular form
await apiClient.post(`/api/chat/conversations/${id}/context`, {...});

// ✅ CORRECT - Plural form
await apiClient.post(`/api/chat/conversations/${id}/contexts`, {...});
```

#### ❌ DON'T Configure AI Provider in Frontend
```typescript
// ❌ WRONG - Frontend doesn't control this
const provider = "openai";  // ❌ Not a frontend concern
```

**Why?** The backend reads `AI_PROVIDER` and `VECTOR_STORE_BACKEND` from environment variables.

---

## Current Implementation Status

### ✅ All Chat Service Methods

| Method | Endpoint | Status |
|--------|----------|--------|
| `createConversation()` | `POST /api/chat/conversations` | ✅ Working |
| `listConversations()` | `GET /api/chat/conversations` | ✅ Working |
| `getConversation()` | `GET /api/chat/conversations/{id}` | ✅ Working |
| `deleteConversation()` | `DELETE /api/chat/conversations/{id}` | ✅ Working |
| `sendMessage()` | `POST /api/chat/conversations/{id}/messages` | ✅ Working |
| `getMessages()` | `GET /api/chat/conversations/{id}/messages` | ✅ Working |
| `addConversationContext()` | `POST /api/chat/conversations/{id}/contexts` | ✅ Working |
| `getStatistics()` | `GET /api/chat/statistics` | ✅ Working |

**File:** `src/services/chatService.ts`

---

## How AI Response Works Now

### Step 1: Send Message
```typescript
await chatService.sendMessage(conversationId, {
  content: "What is GDPR?",
  role: "user"
});
// ✅ Sent to backend
```

### Step 2: Backend Generates Response (Automatic)
- Backend receives the message
- Backend injects document context automatically
- Backend calls the AI provider (OpenAI, Anthropic, etc.)
- **Frontend doesn't need to know which provider!**

### Step 3: Frontend Polls for Response
```typescript
// Poll for messages - AI response will appear automatically
const messages = await chatService.getMessages(conversationId, 100);
// Response from AI will be in messages with role: "assistant"
```

---

## Configuration Notes

### Backend Configuration (Not Frontend Concern)
```bash
# Backend .env file (frontend developers don't need to worry about this)
AI_PROVIDER=openai              # or anthropic, ollama, etc.
VECTOR_STORE_BACKEND=pinecone   # or milvus, weaviate, etc.
```

### Frontend Configuration (Minimal)
```typescript
// Frontend just needs API base URL (handled by apiClient)
// No model parameters, no provider selection needed
```

---

## Testing the API

### Test Context Addition
```bash
# ✅ Should work (plural form)
curl -X POST http://localhost:8000/api/chat/conversations/1/contexts \
  -H "Content-Type: application/json" \
  -d '{"document_id": 123, "context_type": "REGULATION"}'

# ❌ Should NOT work (singular form)
curl -X POST http://localhost:8000/api/chat/conversations/1/context \
  -H "Content-Type: application/json" \
  -d '{"document_id": 123}'
```

### Test Message Sending
```bash
# ✅ Should work
curl -X POST http://localhost:8000/api/chat/conversations/1/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello", "role": "user"}'

# Response will have role: "user"
# AI response will appear in next message with role: "assistant"
```

---

## Files to Reference

| File | Purpose |
|------|---------|
| `src/services/chatService.ts` | All chat API methods |
| `src/components/chat/ComplianceAssistant.tsx` | Chat UI using correct APIs |
| `src/types/chat.ts` | Chat type definitions |
| `openapi.json` | Full API specification |

---

## Common Patterns

### Pattern 1: Create Conversation and Add Context
```typescript
const conversation = await chatService.createConversation({
  title: "GDPR Document Review"
});

// Add document context
await chatService.addConversationContext(conversation.id, {
  document_id: 456,
  context_type: "REGULATION"
});

// Now send messages - context is already available to AI
```

### Pattern 2: Fetch All Messages After Sending
```typescript
// Send user message
const userMsg = await chatService.sendMessage(conversationId, {
  content: "What are the key requirements?",
  role: "user"
});

// Wait a moment for AI to generate response
setTimeout(async () => {
  const allMessages = await chatService.getMessages(conversationId, 100);
  // allMessages will include both user and AI responses
}, 1000);
```

---

## Troubleshooting

### Issue: "404 Not Found" on context endpoint
- ❌ Check if you're using `/context` (singular)
- ✅ Change to `/contexts` (plural)

### Issue: AI isn't responding
- ✅ Check backend logs for provider configuration
- ✅ Ensure document context is added before asking questions
- ✅ Poll `/messages` endpoint to fetch AI response

### Issue: "Invalid parameters" error
- ❌ Check if you're sending `system_prompt`, `temperature`, `max_tokens`
- ✅ These are now backend-only, remove from frontend calls

---

## Summary

✅ **Frontend is fully compliant with backend API updates**

Key points:
1. **Use plural `/contexts`** endpoint
2. **Don't call `generate_completion`** directly
3. **Don't send model parameters** (temperature, max_tokens, etc.)
4. **Backend handles provider selection** automatically
5. **Poll for AI responses** instead of waiting synchronously

**All chat functionality works exactly as before from a frontend perspective.**
