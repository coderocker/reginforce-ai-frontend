# Comply Lens Frontend - Implementation Guide

## Overview

This frontend implements the Comply Lens platform - a comprehensive Regulatory & OSS Compliance platform with the following key features:
- Authentication via Keycloak JWT
- Regulatory compliance gap analysis
- Open Source Software (OSS) package vetting
- Interactive compliance chatbot
- Real-time CVE and license checking

---

## Authentication System

### Architecture

The authentication system uses Keycloak JWT tokens with the OAuth2 Password Credentials flow.

#### Components

1. **AuthProvider** (`src/providers/AuthProvider.tsx`)
   - React Context providing authentication state and methods
   - Manages token storage and refresh
   - Automatically initializes auth state from localStorage on app load
   - Provides `useAuth()` hook for components

2. **AuthService** (`src/services/authService.ts`)
   - Service layer for auth API calls
   - Handles login, token refresh, token verification
   - JWT token decoding (client-side)

3. **Login Page** (`src/pages/Login.tsx`)
   - Clean, professional login form
   - POST `/api/auth/login` with username/password
   - Error handling for 401/422 responses
   - Dark professional theme matching Comply Lens branding

4. **Protected Routes** (`src/components/ProtectedRoute.tsx`)
   - Wraps protected routes requiring authentication
   - Redirects to login if not authenticated
   - Shows loading spinner during auth initialization

### Token Storage

Tokens are stored in localStorage:
- `comply_lens_access_token`: JWT access token
- `comply_lens_refresh_token`: Refresh token (if provided)

### API Interceptors

Axios interceptors in `src/api/client.ts`:
- **Request Interceptor**: Automatically injects `Authorization: Bearer <token>` header
- **Response Interceptor**: Handles 401 errors with token refresh attempt

### Test Users

From OpenAPI spec:
```
username: john.doe@acme-corp.com, password: password123
username: jane.smith@acme-corp.com, password: password123
username: alice.johnson@techstart.io, password: password123
username: bob.wilson@techstart.io, password: password123
```

---

## OSS Compliance Module

### Features

The Package Vetting system provides real-time vulnerability and license checking for open-source packages.

### Components

1. **PackageVetting Page** (`src/pages/oss/PackageVetting.tsx`)
   - Search interface for package names
   - Real-time parallel CVE and license checking
   - Comprehensive results dashboard
   - Risk assessment and recommendations

2. **OSSService** (`src/services/ossService.ts`)
   - `checkPackageCVE()`: CVE vulnerability check
   - `checkPackageLicense()`: License information and compatibility
   - `checkLicenseCompatibility()`: Project-to-dependency license analysis
   - `getVulnerabilityStatistics()`: Organization-wide vulnerability stats
   - `vetPackage()`: Combined check returning overall risk

3. **Types** (`src/types/oss.ts`)
   - `LiveCVECheckResponse`: CVE vulnerability data
   - `LiveLicenseCheckResponse`: License information
   - `VulnerabilityStatistics`: Aggregated security metrics

### API Endpoints

- `GET /api/oss/tools/cve/{package_name}` - CVE vulnerability check
- `GET /api/oss/tools/license/{package_name}` - License information
- `GET /api/oss/tools/compatibility` - License compatibility check
- `GET /api/oss/vulnerabilities/statistics` - Vulnerability statistics

### Risk Levels

- **SAFE** (Green): No critical vulnerabilities, compatible licenses
- **CAUTION** (Yellow): Some high-severity issues, license warnings
- **CRITICAL** (Red): Critical vulnerabilities or license incompatibilities

---

## Chat Interface

### Features

The Compliance Assistant provides interactive ChatOps for compliance-related queries.

### Components

1. **ComplianceAssistant** (`src/components/chat/ComplianceAssistant.tsx`)
   - Conversation sidebar with history
   - Real-time messaging interface
   - Message feedback system
   - Document reference rendering

2. **ChatService** (`src/services/chatService.ts`)
   - `createConversation()`: Start new chat
   - `listConversations()`: Retrieve conversation history
   - `getConversation()`: Get conversation details
   - `sendMessage()`: Send user message
   - `getMessages()`: Retrieve conversation messages
   - `submitMessageFeedback()`: Rate AI responses

3. **Types** (`src/types/chat.ts`)
   - `ConversationPublic`: Conversation metadata
   - `MessagePublic`: Individual message with role and content
   - `ConversationStatus`: ACTIVE, ARCHIVED, SUSPENDED

### API Endpoints

- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations` - List conversations
- `GET /api/chat/conversations/{id}` - Get conversation details
- `POST /api/chat/conversations/{id}/messages` - Send message
- `GET /api/chat/conversations/{id}/messages` - Get message history
- `PATCH /api/chat/messages/{id}/feedback` - Submit feedback

---

## Dashboard Updates

### New Widgets

The main dashboard now includes:

1. **OSS Vulnerability Statistics**
   - Pie chart breakdown by severity (Critical, High, Medium, Low)
   - Total vulnerability count
   - Unpatched vulnerabilities indicator
   - Source: `/api/oss/vulnerabilities/statistics`

2. **Compliance Chat Quick Access**
   - Launch Compliance Assistant from dashboard
   - Quick stats on active conversations

### Dashboard Routes

- `/` - Home/Dashboard
- `/dashboard` - Explicit dashboard access

---

## File Structure

```
src/
├── api/
│   ├── client.ts              # Axios client with interceptors
│   └── index.ts
├── auth/
│   └── AuthProvider.tsx        # Auth context provider (in providers/)
├── components/
│   ├── chat/
│   │   └── ComplianceAssistant.tsx    # Chat interface
│   ├── ProtectedRoute.tsx      # Route guard component
│   └── layouts/
│       └── MainLayout.tsx      # Main application layout
├── pages/
│   ├── Login.tsx               # Login page
│   ├── Dashboard.tsx           # Main dashboard
│   ├── Documents.tsx           # Document management
│   ├── Reports.tsx             # Analysis reports
│   ├── Remediation.tsx         # Remediation plans
│   └── oss/
│       └── PackageVetting.tsx  # OSS package vetting
├── providers/
│   ├── AuthProvider.tsx        # Auth context
│   └── ReactQueryProvider.tsx  # React Query setup
├── services/
│   ├── authService.ts          # Auth API service
│   ├── chatService.ts          # Chat API service
│   └── ossService.ts           # OSS API service
├── types/
│   ├── auth.ts                 # Authentication types
│   ├── chat.ts                 # Chat types
│   └── oss.ts                  # OSS types
└── App.tsx                     # Main app with routing
```

---

## Setup Instructions

### Prerequisites

```bash
npm install
# or
pnpm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000
```

For production, update to your backend URL.

### Running the Application

```bash
npm run dev
# or
pnpm dev
```

The app will be available at `http://localhost:5173` (or next available port)

### Building for Production

```bash
npm run build
npm run preview
```

---

## API Integration Details

### Base URL

All API calls use the base URL from environment:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
```

### Authentication Header

All authenticated requests include:
```
Authorization: Bearer <access_token>
```

### Error Handling

Common error responses:
- `401 Unauthorized`: Token invalid/expired → redirect to login
- `422 Validation Error`: Invalid input → display validation messages
- `404 Not Found`: Resource not found → show error message
- `500 Server Error`: Backend error → show generic error message

---

## Login Flow

1. User navigates to `/login`
2. Enters username and password
3. Frontend submits POST to `/api/auth/login`
4. Backend returns `access_token` and optional `refresh_token`
5. Tokens stored in localStorage
6. User redirected to `/dashboard`
7. On refresh, `AuthProvider` validates token and auto-restores session

---

## Next Steps / Future Enhancements

1. **Dashboard Metrics**
   - Add OSS risk pie chart widget
   - Display vulnerability statistics
   - Show remediation progress

2. **Chat Enhancements**
   - Implement actual AI responses
   - Add document context to responses
   - Implement message streaming

3. **OSS Features**
   - Add batch package checking
   - Create vulnerability alert system
   - Implement license compliance reporting

4. **Analytics**
   - Track API usage
   - Monitor compliance metrics
   - Generate trend reports

---

## Troubleshooting

### Login Not Working

1. Verify `VITE_API_BASE_URL` points to correct backend
2. Check backend is running on specified URL
3. Verify credentials in OpenAPI spec test users
4. Check browser console for CORS errors

### Package Vetting Errors

1. Ensure token is valid (not expired)
2. Check package name spelling
3. Verify NIST NVD API availability
4. Check network in browser DevTools

### Chat Not Loading

1. Verify authentication token is valid
2. Check `/api/chat/conversations` endpoint availability
3. Review network requests in DevTools
4. Check for backend errors in server logs

---

## Security Considerations

1. **Token Storage**: Currently using localStorage. Consider using httpOnly cookies for enhanced security
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Configure backend CORS policy appropriately
4. **Rate Limiting**: Implement client-side rate limiting for API calls
5. **XSS Protection**: Sanitize user inputs (already handled by React)

---

## Performance Optimization

1. **Code Splitting**: Routes are lazy-loaded
2. **Caching**: React Query handles API response caching
3. **Image Optimization**: Use optimized SVG icons
4. **Bundle Size**: Tree-shake unused dependencies

---

## Support

For issues or questions:
1. Check the OpenAPI specification: http://localhost:8000/openapi.json
2. Review browser console for error messages
3. Check network tab for API response details
4. Review component prop types (TypeScript)

