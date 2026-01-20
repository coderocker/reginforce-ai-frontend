# Comply Lens Frontend - OAuth2 Password Bearer Login Implementation

## ✅ Implementation Complete

Your OAuth2 Password Bearer login system has been fully implemented with:

### 1. **Login Page** (`src/pages/Login.tsx`)
- Professional login form with dark theme
- Username/email and password inputs
- Form validation
- Loading spinner during authentication
- Error message display
- Redirect to dashboard on success

### 2. **Authentication Service** (`src/services/authService.ts`)
Implements your exact API specification:
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string",
  "grant_type": "password",
  "client_id": "comply-lens-backend",
  "client_secret": "your-client-secret"
}
```

**Methods:**
- `login(username, password)` - POST to `/api/auth/login`
- `refreshToken(refreshToken)` - POST to `/api/auth/refresh`
- `verifyToken(token)` - GET to `/api/auth/verify`
- `getCurrentUser(token)` - GET to `/api/auth/me`
- `decodeToken(token)` - Client-side JWT parsing
- `logout(token)` - POST to `/api/auth/logout`

### 3. **Auth Provider** (`src/providers/AuthProvider.tsx`)
- React Context for auth state management
- `useAuth()` hook for accessing auth in components
- Token persistence in localStorage
- Auto-initialization on app load
- Token refresh on mount if expired
- Methods: `login()`, `logout()`, `clearError()`

### 4. **API Client** (`src/api/client.ts`)
- Axios instance with auth interceptors
- **Request Interceptor**: Automatically adds `Authorization: Bearer {token}` header
- **Response Interceptor**: Handles 401 errors with automatic token refresh
- Queue system: Prevents multiple simultaneous refresh attempts
- Redirects to login on refresh failure

### 5. **Protected Routes** (`src/components/ProtectedRoute.tsx`)
- Route guard wrapper
- Shows loading spinner while checking auth
- Redirects unauthenticated users to `/login`

### 6. **App Routing** (`src/App.tsx`)
```
/login                 - Public login page
/dashboard            - Protected dashboard (default route)
/documents            - Protected documents page
/reports              - Protected reports page
/package-vetting      - Protected OSS vetting
/remediation          - Protected remediation plans
/settings             - Protected settings page
```

---

## 🚀 Quick Start

### 1. Environment Setup

Create `.env` file:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Run Development Server

```bash
npm run dev
# or
pnpm dev
```

Server will be available at: `http://localhost:5173`

### 4. Test Login

1. Navigate to http://localhost:5173/login
2. Enter credentials:
   ```
   Username: john.doe@acme-corp.com
   Password: password123
   ```
3. Click "Sign In"
4. Should redirect to dashboard
5. Open DevTools → Application → LocalStorage
6. Verify tokens stored:
   - `comply_lens_access_token`
   - `comply_lens_refresh_token`

---

## 📋 Test Users

Use any of these credentials for testing:

| Email | Password |
|-------|----------|
| john.doe@acme-corp.com | password123 |
| jane.smith@acme-corp.com | password123 |
| alice.johnson@techstart.io | password123 |
| bob.wilson@techstart.io | password123 |

---

## 🔐 Authentication Flow

### Login
```
User enters credentials
        ↓
POST /api/auth/login (with client_id, client_secret, grant_type)
        ↓
Backend validates and returns tokens
        ↓
Frontend stores tokens in localStorage
        ↓
Frontend redirects to /dashboard
```

### Making API Requests
```
Frontend makes API request
        ↓
Request Interceptor adds Authorization header
        ↓
Backend receives request with Bearer token
        ↓
Response is returned
```

### Token Refresh
```
Access token expires
        ↓
Response returns 401 Unauthorized
        ↓
Response Interceptor catches 401
        ↓
POST /api/auth/refresh (with refresh_token)
        ↓
Backend returns new access_token
        ↓
Frontend stores new token
        ↓
Original request is retried with new token
```

### Logout
```
User clicks logout
        ↓
Clear tokens from localStorage
        ↓
Redirect to /login
```

---

## 📁 Project Structure

```
src/
├── api/
│   └── client.ts              # Axios client with auth interceptors
├── components/
│   ├── ProtectedRoute.tsx      # Route guard
│   └── layouts/
│       └── MainLayout.tsx      # Main app layout
├── pages/
│   ├── Login.tsx               # Login page
│   ├── Dashboard.tsx           # Dashboard
│   ├── Documents.tsx           # Documents page
│   ├── Reports.tsx             # Reports page
│   └── oss/
│       └── PackageVetting.tsx  # OSS vetting page
├── providers/
│   ├── AuthProvider.tsx        # Auth context
│   └── ReactQueryProvider.tsx  # React Query setup
├── services/
│   ├── authService.ts          # Auth API service
│   ├── ossService.ts           # OSS API service
│   └── chatService.ts          # Chat API service
├── types/
│   ├── auth.ts                 # Auth types
│   ├── oss.ts                  # OSS types
│   └── chat.ts                 # Chat types
└── App.tsx                     # Main app with routing
```

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/verify` | Verify token validity |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/logout` | Logout |

### Other Protected Endpoints

All other API calls automatically include the Authorization header:
```
Authorization: Bearer {access_token}
```

---

## 🧪 Testing with cURL

### Login
```bash
curl -X 'POST' \
  'http://localhost:8000/api/auth/login' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "username": "john.doe@acme-corp.com",
  "password": "password123",
  "grant_type": "password",
  "client_id": "comply-lens-backend",
  "client_secret": "your-client-secret"
}'
```

### Use Token in API Call
```bash
curl -X 'GET' \
  'http://localhost:8000/api/documents' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer {access_token}'
```

---

## 🔒 Keycloak Configuration

```
Client ID: comply-lens-backend
Client Secret: your-client-secret
Grant Type: password (Resource Owner Password Credentials)
```

These are configured in `src/services/authService.ts`:
```typescript
const KEYCLOAK_CLIENT_ID = "comply-lens-backend";
const KEYCLOAK_CLIENT_SECRET = "your-client-secret";
```

---

## ⚠️ Important Notes

### Token Storage
Currently using localStorage:
```javascript
localStorage.setItem("comply_lens_access_token", token);
localStorage.setItem("comply_lens_refresh_token", token);
```

In production, consider using httpOnly cookies for better security.

### HTTPS
Always use HTTPS in production to protect tokens.

### Client Secret Exposure
Currently embedded in frontend. For production, consider:
1. Moving OAuth2 flow to backend
2. Backend validates credentials
3. Frontend only receives tokens

---

## 🐛 Troubleshooting

### Login Fails with "Invalid username or password"
- Verify credentials are correct
- Check Keycloak realm has users
- Verify backend is running

### CORS Errors
- Configure CORS on backend
- Allow origin: `http://localhost:5173` (dev)
- Allow headers: `Authorization, Content-Type`

### Tokens Not Storing
- Check localStorage is enabled in browser
- Check DevTools → Application → LocalStorage
- Verify no browser privacy mode restrictions

### 401 Errors on API Calls
- Verify token hasn't expired
- Check Authorization header in DevTools Network tab
- Verify backend accepts Bearer tokens

### Page Redirects to Login Unexpectedly
- Token may have expired
- Refresh token may be invalid
- Try logging in again

---

## 📚 Related Documentation

- [OAuth2 Setup Guide](OAUTH2_SETUP_GUIDE.md) - Detailed authentication flow explanation
- [Login Implementation Verification](LOGIN_IMPLEMENTATION_VERIFICATION.md) - API specification verification
- [Implementation Guide](IMPLEMENTATION_GUIDE.md) - Complete feature implementation details

---

## ✨ Features

✅ OAuth2 Password Bearer authentication  
✅ Keycloak integration  
✅ JWT token management  
✅ Automatic token refresh  
✅ Protected routes with loading states  
✅ Professional login UI  
✅ Error handling  
✅ Token persistence  
✅ Automatic session restoration  
✅ Axios interceptors for auth  

---

## 🚢 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

---

## 📝 License

Proprietary - Comply Lens Platform

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for errors
3. Check network tab in DevTools
4. Review API endpoint in OpenAPI spec
5. Verify backend is running and accessible

