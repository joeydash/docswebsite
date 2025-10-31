const GRAPHQL_ENDPOINT = 'https://db.subspace.money/v1/graphql';

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;
const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 60 * 1000;
const REFRESH_THRESHOLD_MS = TOKEN_LIFETIME_MS - REFRESH_BEFORE_EXPIRY_MS;

export interface TokenData {
  auth_token: string;
  refresh_token: string;
  user_id: string;
  token_timestamp: number;
}

export interface RefreshTokenResponse {
  refreshToken: {
    auth_token: string;
    refresh_token: string;
    status: string;
    id: string;
  };
}

export interface LogoutResponse {
  logout: {
    success: boolean;
    message: string;
  };
}

const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($refresh_token: String!, $user_id: uuid!) {
    refreshToken(request: {refresh_token: $refresh_token, user_id: $user_id}) {
      auth_token
      refresh_token
      status
      id
    }
  }
`;

const LOGOUT_MUTATION = `
  mutation Logout($refreshToken: String!) {
    logout(request: {refresh_token: $refreshToken}) {
      success
      message
    }
  }
`;

let refreshTimerId: NodeJS.Timeout | null = null;
let onTokenRefreshCallback: ((tokens: TokenData) => void) | null = null;
let onRefreshFailureCallback: (() => void) | null = null;

export function saveTokens(data: {
  auth_token: string;
  refresh_token: string;
  user_id: string;
}) {
  const tokenData: TokenData = {
    auth_token: data.auth_token,
    refresh_token: data.refresh_token,
    user_id: data.user_id,
    token_timestamp: Date.now(),
  };

  localStorage.setItem('auth_token', data.auth_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('user_id', data.user_id);
  localStorage.setItem('token_timestamp', tokenData.token_timestamp.toString());

  return tokenData;
}

export function getTokens(): TokenData | null {
  const auth_token = localStorage.getItem('auth_token');
  const refresh_token = localStorage.getItem('refresh_token');
  const user_id = localStorage.getItem('user_id');
  const token_timestamp = localStorage.getItem('token_timestamp');

  if (!auth_token || !refresh_token || !user_id || !token_timestamp) {
    return null;
  }

  return {
    auth_token,
    refresh_token,
    user_id,
    token_timestamp: parseInt(token_timestamp, 10),
  };
}

export function clearTokens() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('token_timestamp');

  clearRefreshTimer();
}

export function clearRefreshTimer() {
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

export async function refreshTokens(): Promise<TokenData | null> {
  const tokens = getTokens();
  if (!tokens) {
    return null;
  }

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: REFRESH_TOKEN_MUTATION,
        variables: {
          refresh_token: tokens.refresh_token,
          user_id: tokens.user_id,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data: { data: RefreshTokenResponse } = await response.json();
    const refreshedData = data.data.refreshToken;

    if (refreshedData.status !== 'success') {
      throw new Error('Token refresh failed');
    }

    const newTokenData = saveTokens({
      auth_token: refreshedData.auth_token,
      refresh_token: refreshedData.refresh_token,
      user_id: refreshedData.id,
    });

    if (onTokenRefreshCallback) {
      onTokenRefreshCallback(newTokenData);
    }

    scheduleTokenRefresh();

    return newTokenData;
  } catch (error) {
    console.error('Token refresh failed:', error);

    if (onRefreshFailureCallback) {
      onRefreshFailureCallback();
    }

    return null;
  }
}

export function getTokenAge(): number {
  const tokens = getTokens();
  if (!tokens) {
    return 0;
  }

  return Date.now() - tokens.token_timestamp;
}

export function getTimeUntilRefresh(): number {
  const tokenAge = getTokenAge();
  const timeUntilRefresh = REFRESH_THRESHOLD_MS - tokenAge;
  return Math.max(0, timeUntilRefresh);
}

export function shouldRefreshImmediately(): boolean {
  const tokenAge = getTokenAge();
  return tokenAge >= REFRESH_THRESHOLD_MS;
}

export function scheduleTokenRefresh() {
  clearRefreshTimer();

  const tokens = getTokens();
  if (!tokens) {
    return;
  }

  if (shouldRefreshImmediately()) {
    refreshTokens();
  } else {
    const timeUntilRefresh = getTimeUntilRefresh();

    refreshTimerId = setTimeout(() => {
      refreshTokens();
    }, timeUntilRefresh);
  }
}

export function initializeTokenRefresh(
  onRefresh?: (tokens: TokenData) => void,
  onFailure?: () => void
) {
  if (onRefresh) {
    onTokenRefreshCallback = onRefresh;
  }

  if (onFailure) {
    onRefreshFailureCallback = onFailure;
  }

  const tokens = getTokens();
  if (!tokens) {
    return;
  }

  scheduleTokenRefresh();
}

export async function logout(): Promise<boolean> {
  const tokens = getTokens();
  clearRefreshTimer();

  if (!tokens) {
    clearTokens();
    return true;
  }

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: LOGOUT_MUTATION,
        variables: {
          refreshToken: tokens.refresh_token,
        },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.errors) {
        console.warn('Logout API returned errors:', result.errors);
      }
    }
  } catch (error) {
    console.warn('Logout API call failed:', error);
  } finally {
    // ALWAYS clear tokens regardless of API success
    clearTokens();
  }

  return true;
}
export function isTokenValid(): boolean {
  const tokens = getTokens();
  if (!tokens) {
    return false;
  }

  const tokenAge = getTokenAge();
  return tokenAge < TOKEN_LIFETIME_MS;
}

export function getTokenExpiryTime(): Date | null {
  const tokens = getTokens();
  if (!tokens) {
    return null;
  }

  return new Date(tokens.token_timestamp + TOKEN_LIFETIME_MS);
}

export function getNextRefreshTime(): Date | null {
  const tokens = getTokens();
  if (!tokens) {
    return null;
  }

  return new Date(tokens.token_timestamp + REFRESH_THRESHOLD_MS);
}
