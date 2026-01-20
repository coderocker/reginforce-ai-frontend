# 🚨 Authentication & Token Management Issues

## Current State

### ✅ What's Working
1. **Token Storage** - Tokens ARE being stored in localStorage
   - `comply_lens_access_token` 
   - `comply_lens_refresh_token`
2. **Token Refresh Flow** - Interceptors are set up to handle 401s and refresh tokens
3. **Auth Provider** - Initializes auth state on app mount

### ❌ Issues Found

#### Issue 1: Missing /api Prefix in AuthService
**Location:** `src/services/authService.ts`

```typescript
// WRONG - these endpoints don't have /api prefix
async login(request: LoginRequest): Promise<TokenResponse> {
  const response = await axios.post<TokenResponse>(`${API_BASE_URL}/api/auth/login`, {
    // ... code
  });
}

async refreshToken(refreshToken: string): Promise<TokenResponse> {
  const response = await axios.post<TokenResponse>(`${API_BASE_URL}/api/auth/refresh`, {
    // ... code
  });
}
```

**Problem:** The authService doesn't use apiClient (which has interceptors), it uses raw axios. This means:
- Token refresh might work, but without proper error handling
- May not retry on 401 responses

#### Issue 2: Token Verification Might Fail on First Load
**Location:** `src/providers/AuthProvider.tsx` - Line 31

```typescript
const isValid = await authService.verifyToken(storedAccessToken);
```

**Problem:** If `verifyToken()` endpoint doesn't exist or returns 404, the auth state gets cleared even if token is valid.

#### Issue 3: No Token Expiration Handling
**Problem:** There's no mechanism to refresh tokens BEFORE they expire. Currently, tokens are only refreshed when:
- A 401 response is received
- User navigates and makes a request

This can cause "stale" tokens if:
- User leaves browser idle for a while
- Token expires between requests
- User navigates quickly between pages

#### Issue 4: localStorage Dependency
**Problem:** If user clears cache/storage manually, session is lost without warning.

#### Issue 5: No Session Validation on Page Refresh
**Problem:** On page refresh, auth state is initialized but doesn't check if refresh token itself might be expired.

---

## Recommended Fixes

### Fix 1: Use apiClient in authService
```typescript
// Instead of raw axios, use apiClient which has interceptors
import { apiClient } from "../api/client";

async login(request: LoginRequest): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>("/api/auth/login", {
    username: request.username,
    password: request.password,
  });
  return response.data;
}

async refreshToken(refreshToken: string): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>("/api/auth/refresh", {
    refresh_token: refreshToken,
  });
  return response.data;
}
```

### Fix 2: Add Token Expiration Check
```typescript
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    const decoded = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const expiryTime = decoded.exp * 1000; // exp is in seconds
    return Date.now() >= expiryTime;
  } catch {
    return true; // Assume expired if can't decode
  }
}
```

### Fix 3: Add Pre-emptive Token Refresh
```typescript
// In AuthProvider - setup interval to refresh token before expiration
useEffect(() => {
  if (!authState.accessToken) return;
  
  if (isTokenExpired(authState.accessToken)) {
    // Refresh immediately
    refreshTokenIfNeeded();
  }
  
  // Check every 5 minutes
  const interval = setInterval(() => {
    refreshTokenIfNeeded();
  }, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, [authState.accessToken]);
```

### Fix 4: Add Session Persistence Warning
```typescript
// Show warning when storage is cleared
window.addEventListener('storage', (e) => {
  if (e.key === 'comply_lens_access_token' && e.newValue === null) {
    console.warn('Session cleared - redirecting to login');
    // Redirect to login
  }
});
```

---

## Token Storage Architecture

### Current Flow:
```
Login Page
    ↓
authService.login() → raw axios POST /api/auth/login
    ↓
localStorage.setItem(ACCESS_TOKEN, response)
    ↓
apiClient (with interceptors) uses localStorage token
    ↓
If 401 → handleTokenRefresh() → localStorage.setItem() again
```

### Issues with this Flow:
- **Two separate token stores**: localStorage + AuthProvider state
- **No sync** between them if one is cleared
- **Manual token management** in apiClient interceptor
- **No automatic refresh** - only reactive (when 401 happens)

### Better Flow:
```
Login Page
    ↓
authService.login() → apiClient POST /api/auth/login (has interceptors)
    ↓
Token stored in localStorage
    ↓
AuthProvider monitors token expiration
    ↓
Proactively refresh token BEFORE expiration (every request checks expiry)
    ↓
apiClient interceptor handles any remaining 401s as fallback
```

---

## Testing Token Stability

### Test 1: Session Persistence
```bash
1. Login successfully
2. Refresh page (F5)
3. Check: Should stay logged in without re-authenticating
4. Check localStorage: Both tokens should exist
```

### Test 2: Token Refresh
```bash
1. Login successfully
2. Wait for token to be close to expiration (or manually set old timestamp in localStorage)
3. Make an API call
4. Check Network tab: Should see refresh token call before/after main request
```

### Test 3: Idle Logout
```bash
1. Login successfully
2. Wait for token expiration time
3. Try to make API call
4. Should be gracefully redirected to login (not error page)
```

### Test 4: Multiple Tabs
```bash
1. Open two tabs
2. Login in one tab
3. Use the app in tab 1
4. Switch to tab 2
5. Check: Tab 2 should also be authenticated (via localStorage)
```

---

## Debugging Steps

### Check if Token is Valid:
```javascript
// In browser console
localStorage.getItem('comply_lens_access_token')
// Should return a JWT starting with "eyJ..."
```

### Check if Token is Expired:
```javascript
const token = localStorage.getItem('comply_lens_access_token');
const parts = token.split('.');
const decoded = JSON.parse(atob(parts[1]));
const expiryTime = new Date(decoded.exp * 1000);
console.log('Token expires at:', expiryTime);
console.log('Is expired?', Date.now() > expiryTime * 1000);
```

### Check API Calls:
```
1. Open DevTools (F12)
2. Go to Network tab
3. Filter for "auth" calls
4. Look for: POST /api/auth/login, POST /api/auth/refresh
5. Check response status: 200 = success, 401 = unauthorized
```

### Check localStorage:
```
1. DevTools → Application tab
2. Click "Local Storage"
3. Click your domain
4. Look for: comply_lens_access_token, comply_lens_refresh_token
5. If missing = tokens not stored properly
```

---

## Quick Stability Improvements (Priority Order)

1. **HIGH**: Use apiClient in authService (Fix 1) - Ensures consistent interceptor handling
2. **HIGH**: Add token expiration check (Fix 2) - Prevent using expired tokens
3. **MEDIUM**: Pre-emptive refresh (Fix 3) - Avoid 401 errors entirely
4. **MEDIUM**: Add RefreshToken endpoint validation (Fix Issue 2) - Ensure backend endpoint exists
5. **LOW**: Storage monitoring (Fix 4) - User-friendly session loss handling

---

## Summary

| Issue | Impact | Severity | Fix Complexity |
|-------|--------|----------|-----------------|
| Missing /api in authService | Token refresh might fail | HIGH | 🟢 Low |
| No token expiration check | Stale tokens, 401 errors | HIGH | 🟢 Low |
| No pre-emptive refresh | Users get logged out mid-session | HIGH | 🟡 Medium |
| verifyToken() unknown | Auth init might fail | MEDIUM | 🟢 Low |
| No session storage monitoring | Silent logout | LOW | 🟡 Medium |

**Status: FIXABLE** - All issues have straightforward solutions!
