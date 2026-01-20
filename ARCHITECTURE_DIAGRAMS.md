# Architecture & Flow Diagrams

## Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER LOGIN FLOW                                │
└─────────────────────────────────────────────────────────────────────┘

    1. User visits app
           ↓
    2. App checks AuthProvider
           ↓
    ┌─ Token in localStorage? ─┐
    │                          │
    YES                        NO
    │                          │
    ↓                          ↓
    Valid?                   Show /login
    │                          ↓
    ├─ YES → Use it        Enter credentials
    │                          ↓
    ├─ NO → Try refresh    POST /api/auth/login
    │       │               {
    │       ↓                 "username": "...",
    │   Success?              "password": "...",
    │   ├ YES → New token    "grant_type": "password",
    │   │       ↓            "client_id": "comply-lens-backend",
    │   │   Use new token    "client_secret": "your-client-secret"
    │   │                    }
    │   └ NO → /login           ↓
    │                       Backend validates
    ↓                            ↓
    ↓                       Return:
    ↓                       {
    ↓                         "access_token": "...",
    ↓                         "refresh_token": "...",
    ↓                         "token_type": "Bearer",
    ↓                         "expires_in": 3600
    ↓                       }
    ↓                            ↓
    ↓                       Store in localStorage:
    ↓                       comply_lens_access_token
    ↓                       comply_lens_refresh_token
    ↓                            ↓
    └────────────────────────────┘
                    ↓
            Set Auth State:
            - isAuthenticated: true
            - user: decoded from JWT
            - tokens: stored locally
                    ↓
            Redirect to /dashboard
                    ↓
        ✅ User logged in!
```

---

## API Request Cycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    API REQUEST CYCLE                                │
└─────────────────────────────────────────────────────────────────────┘

Frontend makes API call:
    apiClient.get('/api/documents')
            ↓
    Request Interceptor:
    ├ Get token from localStorage
    ├ Add header: Authorization: Bearer {token}
    └ Return config
            ↓
    Send HTTP request:
    GET /api/documents
    Authorization: Bearer eyJhbGc...
            ↓
    Backend receives request
    Validates token
            ↓
    ┌─ Token valid? ─┐
    │               │
    YES             NO (401)
    │               │
    ↓               ↓
    Return       Response Interceptor:
    response     ├ Check if we have refresh_token
    │            ├ If yes, POST /api/auth/refresh
    │            │  {
    │            │    "refresh_token": "...",
    │            │    "client_id": "comply-lens-backend",
    │            │    "client_secret": "your-client-secret",
    │            │    "grant_type": "refresh_token"
    │            │  }
    │            │
    │            ├ Receive new access_token
    │            ├ Store new token in localStorage
    │            ├ Add to queue: original request
    │            └ Retry with new token
    │               │
    │            Success?
    │            ├ YES → Return response
    │            └ NO → Redirect to /login
    ↓
    Return to caller
    ✅ Response received
```

---

## Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TOKEN LIFECYCLE                                │
└─────────────────────────────────────────────────────────────────────┘

LOGIN:
  User enters password
    ↓
  authService.login(username, password)
    ↓
  POST /api/auth/login + Keycloak credentials
    ↓
  Receive tokens
    ↓
  localStorage.setItem('comply_lens_access_token', token)
    ↓
  localStorage.setItem('comply_lens_refresh_token', token)
    ↓
  ✅ Tokens stored


USAGE:
  Every API request
    ↓
  Request Interceptor reads localStorage
    ↓
  Authorization: Bearer {access_token}
    ↓
  ✅ Token attached


REFRESH:
  Access token expires (401 response)
    ↓
  Response Interceptor triggered
    ↓
  POST /api/auth/refresh + refresh_token
    ↓
  Receive new access_token
    ↓
  localStorage.setItem('comply_lens_access_token', new_token)
    ↓
  Retry original request with new token
    ↓
  ✅ Request succeeds


LOGOUT:
  User clicks logout button
    ↓
  authService.logout(token) [optional]
    ↓
  localStorage.removeItem('comply_lens_access_token')
    ↓
  localStorage.removeItem('comply_lens_refresh_token')
    ↓
  Set authState.isAuthenticated = false
    ↓
  Redirect to /login
    ↓
  ✅ Logged out
```

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPONENT HIERARCHY                              │
└─────────────────────────────────────────────────────────────────────┘

<App>
│
├─ <ReactQueryProvider>
│  │
│  └─ <AuthProvider>  ← Auth Context
│     │
│     └─ <BrowserRouter>
│        │
│        ├─ <Route path="/login">
│        │  │
│        │  └─ <Login>  ← User enters credentials
│        │             │
│        │             └─ useAuth() hook
│        │                │
│        │                └─ authService.login()
│        │                   └─ POST /api/auth/login
│        │
│        └─ <Route path="/*">
│           │
│           └─ <ProtectedRoute>  ← Auth guard
│              │
│              └─ <MainLayout>  ← Navigation + Logout
│                 │
│                 ├─ <Route path="/dashboard">
│                 │  └─ <Dashboard>
│                 │
│                 ├─ <Route path="/documents">
│                 │  └─ <Documents>
│                 │
│                 └─ <Route path="/package-vetting">
│                    └─ <PackageVetting>


DEPENDENCIES:

Login.tsx
  ├─ uses: useAuth() hook
  │       ├─ login(username, password)
  │       ├─ authState.error
  │       └─ authState.loading
  │
  └─ calls: authService.login()
           └─ POST /api/auth/login


AuthProvider.tsx
  ├─ manages: authState
  ├─ provides: useAuth() hook
  └─ calls:
      ├─ authService.login()
      ├─ authService.refreshToken()
      ├─ authService.verifyToken()
      └─ localStorage


ProtectedRoute.tsx
  ├─ checks: authState.isAuthenticated
  └─ redirects: to /login if not authenticated


MainLayout.tsx
  ├─ uses: useAuth() hook
  │       └─ logout()
  │
  └─ calls: authService.logout()


api/client.ts (Axios)
  ├─ Request Interceptor
  │  └─ Reads localStorage for token
  │     └─ Adds Authorization header
  │
  └─ Response Interceptor
     ├─ Checks for 401 status
     └─ Triggers token refresh
        ├─ authService.refreshToken()
        ├─ Updates localStorage
        └─ Retries request
```

---

## State Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      REACT STATE FLOW                               │
└─────────────────────────────────────────────────────────────────────┘

AuthProvider (Context):
{
  authState: {
    isAuthenticated: boolean,    ← Checked by ProtectedRoute
    accessToken: string | null,  ← Used in API calls
    refreshToken: string | null, ← Used for refresh
    user: {                       ← Displayed in UI
      id: string,
      username: string,
      email: string,
      roles: string[]
    },
    loading: boolean,            ← Shows spinner
    error: string | null         ← Shows error messages
  },
  
  login: (username, password) => Promise<void>,    ← Called by Login page
  logout: () => Promise<void>,                     ← Called by MainLayout
  clearError: () => void                           ← Clears error message
}


Login Component State:
{
  username: string,              ← Form input
  password: string,              ← Form input
  error: string | null,          ← Display error
  isLoading: boolean             ← Disable button during submit
}
        ↓
        uses useAuth().login()
        ↓
        authState updates
        ↓
        Redirect to /dashboard
        ↓
        ProtectedRoute renders children
        ↓
        MainLayout renders with user info
```

---

## Data Flow During Login

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA FLOW: LOGIN                                 │
└─────────────────────────────────────────────────────────────────────┘

1. USER INPUT
   ┌─────────────────────┐
   │ Login Form          │
   │ username: "john..." │
   │ password: "abc..."  │
   └─────────────────────┘
           ↓
2. CALL AUTH HOOK
   const { login } = useAuth()
   await login(username, password)
           ↓
3. CALL AUTH SERVICE
   authService.login({ username, password })
           ↓
4. BUILD REQUEST
   POST /api/auth/login
   {
     "username": "john.doe@acme-corp.com",
     "password": "password123",
     "grant_type": "password",
     "client_id": "comply-lens-backend",
     "client_secret": "your-client-secret"
   }
           ↓
5. SEND TO BACKEND
   Axios sends HTTP POST
           ↓
6. BACKEND VALIDATES
   Keycloak validates credentials
           ↓
7. RESPONSE
   {
     "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
     "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
     "token_type": "Bearer",
     "expires_in": 3600
   }
           ↓
8. STORE TOKENS
   localStorage.setItem('comply_lens_access_token', token)
   localStorage.setItem('comply_lens_refresh_token', token)
           ↓
9. DECODE JWT
   Extract user info from token:
   {
     id: "user-123",
     username: "john.doe@acme-corp.com",
     email: "john.doe@acme-corp.com",
     roles: ["user", "admin"]
   }
           ↓
10. UPDATE STATE
    authState = {
      isAuthenticated: true,
      accessToken: "...",
      refreshToken: "...",
      user: {...},
      loading: false,
      error: null
    }
           ↓
11. REDIRECT
    navigate("/dashboard")
           ↓
12. RENDER
    ProtectedRoute allows access
    MainLayout displays user info
    Dashboard loads and shows data
```

---

## Interceptor Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                AXIOS INTERCEPTOR FLOW                               │
└─────────────────────────────────────────────────────────────────────┘

REQUEST INTERCEPTOR:
─────────────────

Frontend code:
  apiClient.get('/api/documents')
                ↓
           Request Interceptor
                ↓
    1. Get token: localStorage.getItem('comply_lens_access_token')
                ↓
    2. Token exists?
       YES → Add header
       ├─ config.headers.Authorization = `Bearer ${token}`
       └─ Return config
                ↓
       NO → Return config as is
                ↓
    3. Send to backend with Authorization header


RESPONSE INTERCEPTOR:
──────────────────

Backend returns response
                ↓
       Status 200? → Return response to caller
                ↓
       Status 401 Unauthorized?
                ↓
           isRefreshing?
        YES → Add to queue, wait for refresh
        NO → Start refresh process
                ↓
        Get refresh_token from localStorage
                ↓
        POST /api/auth/refresh
        {
          "refresh_token": "...",
          "client_id": "comply-lens-backend",
          "client_secret": "your-client-secret",
          "grant_type": "refresh_token"
        }
                ↓
        Success?
        YES → Store new token
        │     Retry original request with new token
        │     Return retry response
        │
        NO  → Clear localStorage tokens
              Redirect to /login
              Throw error
                ↓
    Other status → Return error
```

---

## Security Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SECURITY MEASURES                              │
└─────────────────────────────────────────────────────────────────────┘

INPUT VALIDATION:
  User enters password → Form validation → Only send if valid

CREDENTIAL TRANSMISSION:
  HTTPS only (in production)
  └─ Never send over HTTP
  POST body (not in URL)
  └─ Never log credentials

TOKEN STORAGE:
  localStorage (tokens only, not passwords)
  └─ Never store password

TOKEN USAGE:
  Every API request
  Authorization: Bearer {token}
  └─ Backend validates token before responding

TOKEN EXPIRATION:
  Access token: Short-lived (3600 seconds)
  Refresh token: Longer-lived (7 days typical)
  └─ Limits damage from token leak

TOKEN REFRESH:
  On 401: Automatic refresh attempt
  └─ User doesn't need to re-login during session

SESSION INVALIDATION:
  Logout: Clear tokens from localStorage
  └─ Prevents unauthorized access

XSS PROTECTION:
  React sanitizes by default
  localStorage not accessible via XSS (mostly)
  └─ Consider httpOnly cookies for production

CORS:
  Backend should restrict to trusted origins
  └─ Prevents cross-origin token theft
```

---

## File Dependencies

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FILE DEPENDENCIES                                │
└─────────────────────────────────────────────────────────────────────┘

src/App.tsx
├─ imports: AuthProvider
├─ imports: ProtectedRoute
├─ imports: Login, Dashboard, etc.
└─ imports: React Router

src/pages/Login.tsx
├─ imports: useAuth() from AuthProvider
└─ imports: useNavigate() from React Router

src/providers/AuthProvider.tsx
├─ imports: authService
├─ exports: AuthContext, useAuth()
└─ uses: localStorage

src/services/authService.ts
├─ imports: axios
└─ calls: POST /api/auth/login, /api/auth/refresh, etc.

src/api/client.ts
├─ imports: axios, authService
├─ exports: apiClient (Axios instance)
├─ uses: localStorage
└─ interceptors: authService methods

src/components/ProtectedRoute.tsx
├─ imports: useAuth() from AuthProvider
└─ uses: React Router Navigate

src/types/auth.ts
├─ exports: LoginRequest, TokenResponse, AuthUser, etc.
└─ used by: authService, AuthProvider, Login

All protected pages (Dashboard, Documents, etc.)
├─ import: apiClient for API calls
└─ useAuth() optional (if need user info)
```

---

## Request/Response Examples

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REQUEST/RESPONSE EXAMPLES                        │
└─────────────────────────────────────────────────────────────────────┘

1. LOGIN REQUEST
──────────────
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "username": "john.doe@acme-corp.com",
  "password": "password123",
  "grant_type": "password",
  "client_id": "comply-lens-backend",
  "client_secret": "your-client-secret"
}


2. LOGIN RESPONSE (Success)
──────────────────────────
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}


3. PROTECTED API REQUEST
────────────────────────
GET /api/documents HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
Content-Type: application/json


4. PROTECTED API RESPONSE
─────────────────────────
HTTP/1.1 200 OK
Content-Type: application/json

{
  "documents": [
    {
      "id": "doc-1",
      "title": "Q4 Compliance Report",
      "status": "completed"
    },
    ...
  ]
}


5. TOKEN REFRESH REQUEST
────────────────────────
POST /api/auth/refresh HTTP/1.1
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "client_id": "comply-lens-backend",
  "client_secret": "your-client-secret",
  "grant_type": "refresh_token"
}


6. TOKEN REFRESH RESPONSE
─────────────────────────
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW_TOKEN...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}


7. INVALID CREDENTIALS (401)
───────────────────────────
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "detail": "Invalid username or password"
}
```

---

This covers the complete architecture and flow of the OAuth2 Password Bearer login system!

