# OAuth2 Password Bearer Authentication Setup

## Overview

This guide explains the OAuth2 Password Bearer authentication implementation using Keycloak credentials.

## Keycloak Credentials

```
Client ID: comply-lens-backend
Client Secret: your-client-secret
Grant Type: password (Resource Owner Password Credentials)
```

## Authentication Flow

### 1. User Login

The user enters their credentials in the Login page:

```
Username: john.doe@acme-corp.com
Password: password123
```

### 2. Frontend Request

The frontend sends a POST request to `/api/auth/login` with:

```typescript
{
  username: "john.doe@acme-corp.com",
  password: "password123",
  client_id: "comply-lens-backend",
  client_secret: "your-client-secret",
  grant_type: "password"
}
```

### 3. Backend Response

The backend returns:

```typescript
{
  access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  refresh_token: "refresh_token_value",
  token_type: "Bearer",
  expires_in: 3600
}
```

### 4. Token Storage

Tokens are stored in browser localStorage:

```
Key: comply_lens_access_token
Key: comply_lens_refresh_token
```

### 5. API Requests

All subsequent API requests include the Bearer token:

```
Authorization: Bearer {access_token}
```

### 6. Token Refresh

When the access token expires:
1. The response interceptor catches the 401 error
2. Sends refresh token to `/api/auth/refresh`
3. Receives new access token
4. Retries the original request

### 7. Logout

On logout:
1. Tokens cleared from localStorage
2. Optional: Call `/api/auth/logout` endpoint
3. Redirect to `/login`

## Implementation Files

### 1. Authentication Types (`src/types/auth.ts`)
- `LoginRequest`: Login form data
- `TokenResponse`: Token response from backend
- `AuthUser`: Decoded user information
- `AuthState`: Current auth state
- `AuthContextType`: Auth context interface

### 2. Authentication Service (`src/services/authService.ts`)
- `login()`: POST `/api/auth/login`
- `refreshToken()`: POST `/api/auth/refresh`
- `verifyToken()`: GET `/api/auth/verify`
- `getCurrentUser()`: GET `/api/auth/me`
- `decodeToken()`: Client-side JWT decoding
- `logout()`: POST `/api/auth/logout`

### 3. Auth Provider (`src/providers/AuthProvider.tsx`)
- React Context for auth state management
- `useAuth()` hook for accessing auth
- Token persistence to localStorage
- Auto-initialization on app load
- Token refresh on mount if expired

### 4. Login Page (`src/pages/Login.tsx`)
- Professional login form UI
- Username/password input fields
- Error display
- Loading spinner during login
- Redirect to dashboard on success

### 5. Protected Route (`src/components/ProtectedRoute.tsx`)
- Wraps protected routes
- Shows loading spinner while checking auth
- Redirects to login if not authenticated

### 6. API Client (`src/api/client.ts`)
- Axios instance with auth interceptors
- Request interceptor: Injects Authorization header
- Response interceptor: Handles 401 with token refresh
- Queue system: Prevents multiple simultaneous refresh attempts

## Test Users

These credentials are available for testing:

```
Email: john.doe@acme-corp.com
Password: password123

Email: jane.smith@acme-corp.com
Password: password123

Email: alice.johnson@techstart.io
Password: password123

Email: bob.wilson@techstart.io
Password: password123
```

## Environment Configuration

### Development

```env
VITE_API_BASE_URL=http://localhost:8000
```

### Production

```env
VITE_API_BASE_URL=https://api.comply-lens.com
```

Update the `VITE_API_BASE_URL` based on your backend URL.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  User navigates to app                                    │
│           ↓                                                │
│  Check AuthProvider initialization                        │
│           ↓                                                │
│  Token valid in localStorage?                             │
│      YES ↓ NO ↓                                            │
│      ✓ Use token → /dashboard    → /login                │
│           ↓                            ↓                  │
│      Has refresh token?             Enter credentials    │
│           ↓                            ↓                  │
│      Try refresh  →  New token →  POST /api/auth/login  │
│           ↓                            ↓                  │
│      Success? → Use new tokens    Receive tokens        │
│           ↓                            ↓                  │
│      ✓ → /dashboard              Store in localStorage  │
│      ✗ → /login                         ↓               │
│                                    → /dashboard         │
└─────────────────────────────────────────────────────────────┘
```

## API Request Flow

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Frontend makes API request                                │
│         ↓                                                   │
│  Request Interceptor:                                      │
│  - Get token from localStorage                             │
│  - Inject Authorization header                             │
│         ↓                                                   │
│  Send to backend                                           │
│         ↓                                                   │
│  Response received                                         │
│         ↓                                                   │
│  Status 401?                                               │
│      ↓ YES                            ↓ NO                │
│      Response Interceptor:            Return response    │
│      - Get refresh token              ✓                  │
│      - POST /api/auth/refresh                             │
│      - Get new access token                               │
│      - Store new token                                    │
│      - Retry original request with new token              │
│      ↓                                                     │
│  Success? → Return response                               │
│      ↓ YES                                                 │
│      ✓                                                     │
│      ↓ NO                                                  │
│      Redirect to /login                                   │
│      Clear tokens from localStorage                       │
└──────────────────────────────────────────────────────────────┘
```

## Security Considerations

### Token Storage
- **Current**: localStorage (suitable for SPAs)
- **Alternative**: httpOnly cookies (more secure, requires backend support)

### HTTPS
- Always use HTTPS in production
- Never send tokens over HTTP

### Token Expiration
- Access tokens should expire quickly (e.g., 15 minutes)
- Refresh tokens can have longer expiration (e.g., 7 days)
- Implement sliding window token refresh for better UX

### Secure Headers
- Implement CSRF protection
- Use Content-Security-Policy headers
- Set X-Content-Type-Options: nosniff

### Client Secret Storage
- **Current**: Embedded in frontend (less secure)
- **Recommended**: Backend should handle OAuth2 credentials
- Consider moving client_id and client_secret to backend

## Troubleshooting

### Login Not Working

**Problem**: Login page doesn't authenticate

**Solutions**:
1. Verify backend is running on `VITE_API_BASE_URL`
2. Check credentials in Keycloak realm
3. Verify CORS settings on backend
4. Check browser console for error messages
5. Check network tab in DevTools for request/response

### Token Refresh Failing

**Problem**: 401 errors after successful login

**Solutions**:
1. Verify refresh token is stored in localStorage
2. Check `/api/auth/refresh` endpoint exists
3. Verify refresh token hasn't expired
4. Check backend token refresh logic

### CORS Errors

**Problem**: "Access to XMLHttpRequest blocked by CORS policy"

**Solutions**:
1. Configure CORS on backend
2. Allow origin: `http://localhost:5173` (dev) or production URL
3. Allow headers: `Authorization, Content-Type`
4. Allow credentials if using cookies

### Token Expiration

**Problem**: Regular 401 errors on API calls

**Solutions**:
1. Extend token expiration time temporarily (for testing)
2. Implement client-side token refresh before expiry (sliding window)
3. Monitor token expiration and refresh preemptively

## Related Files

- Authentication: `src/types/auth.ts`, `src/services/authService.ts`
- Context: `src/providers/AuthProvider.tsx`
- UI: `src/pages/Login.tsx`, `src/components/ProtectedRoute.tsx`
- API: `src/api/client.ts`
- Main App: `src/App.tsx`

## Next Steps

1. **Run the application**:
   ```bash
   npm run dev
   ```

2. **Test login flow**:
   - Navigate to `http://localhost:5173/login`
   - Enter test credentials
   - Verify redirect to dashboard
   - Check localStorage for tokens

3. **Test API requests**:
   - Make an API call while logged in
   - Verify Authorization header in DevTools
   - Test 401 handling by clearing token and making request

4. **Test token refresh**:
   - Manually expire access token
   - Verify refresh token restores access
   - Check no user-visible interruption

## Support

For issues or questions:
1. Check browser console for errors
2. Review network tab in DevTools
3. Verify backend `/api/auth/*` endpoints
4. Check environment variables are set correctly
5. Review OpenAPI spec: `http://localhost:8000/openapi.json`
