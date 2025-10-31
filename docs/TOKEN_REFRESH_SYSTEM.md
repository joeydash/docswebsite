# Token Refresh System Documentation

## Overview

This application implements an automatic token refresh system that keeps users authenticated by refreshing their tokens 1 hour before expiry (at the 23-hour mark of a 24-hour token lifetime).

## Architecture

### Components

1. **tokenManager.ts** - Core service handling token lifecycle
2. **AuthContext.tsx** - React context for global auth state management
3. **auth.ts** - Updated to integrate with token manager
4. **LoginModal.tsx** - Handles user login and saves tokens

## Token Lifecycle Flow

```
Sign-in → Store tokens + timestamp → Schedule refresh at 23hrs
                                            ↓
                                    Refresh successful?
                                    ↙              ↘
                            YES: Update tokens   NO: Logout user
                                 Schedule next
```

## Key Features

### 1. Automatic Token Refresh

- **Token Lifetime**: 24 hours
- **Refresh Timing**: 1 hour before expiry (at 23-hour mark)
- **Scheduling**: Uses `setTimeout` to schedule refresh automatically

### 2. Smart Initialization

When the app loads or user comes back online:

```typescript
if (token age >= 23 hours) {
  // Refresh immediately
  refreshTokens();
} else {
  // Calculate time remaining until 23-hour mark
  const timeUntilRefresh = 23 hours - token age;
  // Schedule refresh
  setTimeout(refreshTokens, timeUntilRefresh);
}
```

### 3. Background Refresh

- Tokens are refreshed automatically in the background
- User continues their session uninterrupted
- New tokens are stored with updated timestamp
- Next refresh is automatically scheduled

### 4. Failure Handling

If token refresh fails:
- User is automatically logged out
- All tokens are cleared from localStorage
- Refresh timers are cancelled
- User is redirected to login

### 5. Visibility Change Detection

When user returns to the app:
- Checks if tokens are still valid
- If expired while away, logs out user
- Prevents using expired tokens

## Storage Structure

```typescript
{
  auth_token: string;           // Current JWT
  refresh_token: string;        // Token for refreshing
  user_id: string;             // User UUID
  token_timestamp: number;      // Unix timestamp (token creation time)
}
```

## API Integration

### Refresh Token Mutation

```graphql
mutation RefreshToken($refresh_token: String!, $user_id: uuid!) {
  refreshToken(request: {refresh_token: $refresh_token, user_id: $user_id}) {
    auth_token
    refresh_token
    status
    id
  }
}
```

### Logout Mutation

```graphql
mutation Logout($refreshToken: String!) {
  logout(request: {refresh_token: $refreshToken}) {
    success
    message
  }
}
```

## Usage

### Initialize Token Refresh

The AuthContext automatically initializes token refresh when the app loads:

```typescript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, logout, login } = useAuth();

  // Use authentication state
  if (isAuthenticated) {
    return <div>Welcome back!</div>;
  }
}
```

### Manual Token Refresh

```typescript
import { refreshTokens } from './services/tokenManager';

const newTokens = await refreshTokens();
if (newTokens) {
  console.log('Tokens refreshed successfully');
} else {
  console.error('Refresh failed');
}
```

### Get Token Information

```typescript
import {
  getTokenAge,
  getTimeUntilRefresh,
  getTokenExpiryTime,
  getNextRefreshTime
} from './services/tokenManager';

// Check how old current token is
const age = getTokenAge(); // milliseconds

// Time until next refresh
const timeRemaining = getTimeUntilRefresh(); // milliseconds

// When token expires
const expiryTime = getTokenExpiryTime(); // Date object

// When next refresh will occur
const nextRefresh = getNextRefreshTime(); // Date object
```

## Security Considerations

1. **Tokens stored in localStorage** - Consider using httpOnly cookies for production
2. **Automatic cleanup** - All tokens removed on logout
3. **Expiry validation** - Tokens validated before use
4. **Refresh failure handling** - Auto-logout on refresh failure
5. **Timer cleanup** - All timers cleared on unmount/logout

## Testing Token Refresh

### Test Immediate Refresh

Modify token timestamp to be older:

```typescript
localStorage.setItem('token_timestamp', (Date.now() - 23 * 60 * 60 * 1000).toString());
// Reload page - should refresh immediately
```

### Test Scheduled Refresh

```typescript
// Set token to 22 hours old
localStorage.setItem('token_timestamp', (Date.now() - 22 * 60 * 60 * 1000).toString());
// Reload page - should schedule refresh in 1 hour
```

### Monitor Refresh Events

Open browser console to see refresh logs:

- `✅ Tokens refreshed successfully` - Successful refresh
- `❌ Token refresh failed - logging out` - Refresh failed
- `⚠️ Token expired while away - logging out` - Token expired

## Troubleshooting

### Tokens not refreshing

1. Check browser console for errors
2. Verify token_timestamp is stored correctly
3. Ensure network connection is available
4. Check API endpoint is accessible

### User logged out unexpectedly

1. Token may have expired (>24 hours old)
2. Refresh API call may have failed
3. Check network logs for failed requests

### Multiple refresh attempts

This shouldn't happen as timers are cleared before setting new ones. If it occurs:

1. Check for multiple AuthProvider instances
2. Verify clearRefreshTimer() is called properly
3. Look for race conditions in timer setup

## Future Enhancements

1. **Retry Logic** - Retry failed refreshes with exponential backoff
2. **Refresh Notifications** - Optional UI notifications on refresh
3. **Token Rotation** - Support for token rotation strategies
4. **Secure Storage** - Move to httpOnly cookies or secure storage
5. **Offline Support** - Handle offline scenarios gracefully
6. **Multiple Tabs** - Coordinate refresh across browser tabs
