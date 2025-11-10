import React, { useState } from 'react';
import { X, Play, Loader2, Key, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';

interface TryItOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAPIKeys?: () => void;
  endpoint: {
    method: string;
    url: string;
    headers?: Record<string, any>;
    body?: string;
    parameters?: Record<string, any>;
    pathParameters?: Record<string, any>;
  };
}

export function TryItOutModal({ isOpen, onClose, onNavigateToAPIKeys, endpoint }: TryItOutModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [responseError, setResponseError] = useState('');
  const [editableUrl, setEditableUrl] = useState(endpoint.url);
  const [editableHeaders, setEditableHeaders] = useState<Record<string, string>>(
    endpoint.headers || {}
  );
  const [editableQueryParams, setEditableQueryParams] = useState<Record<string, string>>(
    endpoint.parameters || {}
  );
  const [editablePathParams, setEditablePathParams] = useState<Record<string, string>>(
    endpoint.pathParameters || {}
  );
  const [editableBody, setEditableBody] = useState(endpoint.body || '');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isGettingToken, setIsGettingToken] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
const [authError, setAuthError] = useState<{ message: string; isIPError?: boolean } | null>(null);
const [isRetryingWithNewToken, setIsRetryingWithNewToken] = useState(false);
const [currentUserIP, setCurrentUserIP] = useState<string | null>(null);

  // --- ADD: resolveBodyWithCreds (must be before useEffect that uses it) ---
  const resolveBodyWithCreds = (body: string) => {
    if (!body) return body || '';

    const savedKeys = JSON.parse(localStorage.getItem('savedAPIKeys') || '[]');
    const lastSaved = savedKeys[savedKeys.length - 1] || {};
    const storedClientId = lastSaved.clientId || clientId || '';
    const storedClientSecret = lastSaved.clientSecret || clientSecret || '';

    // Try JSON merge first
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === 'object') {
        const mutated = { ...parsed };

        // correct JSON key checks (clientId / clientSecret)
        if ('clientId' in mutated && (!mutated.clientId || mutated.clientId === '{{clientId}}' || mutated.clientId === 'CLIENT_ID')) {
          if (storedClientId) mutated.clientId = storedClientId;
        }
        if ('clientSecret' in mutated && (!mutated.clientSecret || mutated.clientSecret === '{{clientSecret}}' || mutated.clientSecret === 'CLIENT_SECRET')) {
          if (storedClientSecret) mutated.clientSecret = storedClientSecret;
        }

        return JSON.stringify(mutated, null, 2);
      }
    } catch {
      // not JSON -> continue to placeholder replacement
    }

    // Placeholder / raw-text replacement (covers {{clientId}} and literal CLIENT_ID)
    let replaced = body;
    if (storedClientId) {
      replaced = replaced.replace(/{{\s*clientId\s*}}/g, storedClientId);
      replaced = replaced.replace(/\bCLIENT_ID\b/g, storedClientId);
    }
    if (storedClientSecret) {
      replaced = replaced.replace(/{{\s*clientSecret\s*}}/g, storedClientSecret);
      replaced = replaced.replace(/\bCLIENT_SECRET\b/g, storedClientSecret);
    }

    return replaced;
  };

  React.useEffect(() => {
    if (!showAuthModal) return;

    try {
      const savedKeys = JSON.parse(localStorage.getItem('savedAPIKeys') || '[]');
      const last = savedKeys[savedKeys.length - 1];
      if (last) {
        setClientId(last.clientId);
        setClientSecret(last.clientSecret);
      }

      const savedApiKey = localStorage.getItem('apiKey');
      if (savedApiKey) {
        setEditableHeaders(prev => ({
          ...prev,
          Authorization: `Bearer ${savedApiKey}`,
        }));
      }
    } catch (err) {
      console.error('Error reading saved keys:', err);
    }
  }, [showAuthModal]);

  React.useEffect(() => {
    if (!isOpen) return;

    try {
      const savedApiKey = localStorage.getItem('apiKey');
      const savedKeys = JSON.parse(localStorage.getItem('savedAPIKeys') || '[]');
      
      const hasApiKey = !!savedApiKey;
      const hasClientCredentials = savedKeys.length > 0 && savedKeys[savedKeys.length - 1]?.clientId;
      
      setHasCredentials(hasApiKey || hasClientCredentials);

      if (endpoint.headers && endpoint.headers['Authorization'] && savedApiKey) {
        setEditableHeaders(prev => ({
          ...prev,
          Authorization: `Bearer ${savedApiKey}`,
        }));
      }
    } catch (err) {
      console.error('Error reading saved API key:', err);
      setHasCredentials(false);
    }
  }, [isOpen]);

  // --- ADD: populate body when modal opens ---
  React.useEffect(() => {
    if (!isOpen) return;

    try {
      // prefer endpoint.body (the template) but fallback to current editableBody
      const template = endpoint.body ?? editableBody ?? '';
      const resolved = resolveBodyWithCreds(template);
      if (resolved && resolved !== editableBody) {
        setEditableBody(resolved);
      }
    } catch (err) {
      console.error('Error populating request body on open:', err);
    }
  }, [isOpen, endpoint.body]); // run when modal opens or endpoint template changes


  if (!isOpen) return null;

  // Helper function to get current IP
const fetchCurrentUserIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || null;
  } catch {
    try {
      const response = await fetch('https://api64.ipify.org?format=json');
      const data = await response.json();
      return data.ip || null;
    } catch {
      return null;
    }
  }
};

// Helper function to attempt token regeneration
const attemptTokenRegeneration = async (): Promise<string | null> => {
  try {
    const savedKeys = JSON.parse(localStorage.getItem('savedAPIKeys') || '[]');
    const lastSaved = savedKeys[savedKeys.length - 1] || {};
    const storedClientId = lastSaved.clientId || clientId || '';
    const storedClientSecret = lastSaved.clientSecret || clientSecret || '';

    if (!storedClientId || !storedClientSecret) {
      return null;
    }

    const response = await fetch('https://api.superflow.run/b2b/createAuthToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          clientId: storedClientId,
        clientSecret: storedClientSecret,
      }),
    });

    const data = await response.json();

    if (response.ok && data.authToken) {
      return data.authToken;
    }

    return null;
  } catch {
    return null;
  }
};

const handleExecute = async (retryWithNewToken = false) => {
    setIsExecuting(true);
    setResponse(null);
    setResponseError('');

    try {
      // Make sure we're using the latest headers (with new token if regenerated)
      const currentHeaders = { ...editableHeaders };
      
      const options: RequestInit = {
        method: endpoint.method,
        headers: currentHeaders,
      };

      if (endpoint.method !== 'GET' && endpoint.method !== 'HEAD' && editableBody) {
        options.body = editableBody;
      }

      let urlWithPathParams = editableUrl;
      Object.entries(editablePathParams).forEach(([key, value]) => {
        urlWithPathParams = urlWithPathParams.replace(`{${key}}`, encodeURIComponent(value));
      });

      const queryString = Object.entries(editableQueryParams)
        .filter(([_, value]) => value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      const finalUrl = queryString
        ? `${urlWithPathParams}${urlWithPathParams.includes('?') ? '&' : '?'}${queryString}`
        : urlWithPathParams;

      const startTime = Date.now();
      const res = await fetch(finalUrl, options);
      const duration = Date.now() - startTime;

      let responseData;
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = await res.json();
      } else {
        responseData = await res.text();
      }

      // Check for IP blocklisted error
      const isIPBlocklistedError = responseData && 
        typeof responseData === 'object' && 
        responseData.message &&
        (responseData.message.toLowerCase().includes('ip') && 
         (responseData.message.toLowerCase().includes('blocklisted') || 
          responseData.message.toLowerCase().includes('not whitelisted') ||
          responseData.message.toLowerCase().includes('blocked')));

      if (isIPBlocklistedError && !retryWithNewToken) {
        // STEP 1: Try to regenerate token
        setIsRetryingWithNewToken(true);
        const newToken = await attemptTokenRegeneration();

        if (newToken) {
          // Token regeneration succeeded - IP is whitelisted, token was the issue
          setIsRetryingWithNewToken(false);
          
          // IMPORTANT: Save new token to localStorage
          localStorage.setItem('apiKey', newToken);
          
          // Update headers with new token
          setEditableHeaders(prev => ({
            ...prev,
            Authorization: `Bearer ${newToken}`
          }));
          
          // Show success message
          setResponse({
            status: 200,
            statusText: 'Token Regenerated',
            headers: {},
            data: {
              message: 'Your token was tied to a different IP. New token generated successfully. Retrying...'
            },
            duration: 0,
            isTokenRegenerated: true,
          });

          // Wait a moment to show the message, then retry
          setTimeout(() => {
            handleExecute(true); // Retry with new token
          }, 1500);
          
          setIsExecuting(false);
          return;
        } else {
          // Token regeneration failed - IP is actually not whitelisted
          setIsRetryingWithNewToken(false);
          
          // Fetch current IP for display
          const userIP = await fetchCurrentUserIP();
          setCurrentUserIP(userIP);
          
          setResponse({
            status: res.status,
            statusText: res.statusText,
            headers: Object.fromEntries(res.headers.entries()),
            data: {
              message: 'Your IP address is not whitelisted in the dashboard.',
              originalError: responseData.message
            },
            duration,
            isIPError: true,
            currentIP: userIP,
          });
          
          setIsExecuting(false);
          return;
        }
      }

      // Normal response
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data: responseData,
        duration,
      });
    } catch (error: any) {
      setResponseError(error.message || 'Request failed');
    } finally {
      setIsExecuting(false);
      setIsRetryingWithNewToken(false);
    }
  };

  const handleAddHeader = () => {
    const newKey = `Header-${Object.keys(editableHeaders).length + 1}`;
    setEditableHeaders({ ...editableHeaders, [newKey]: '' });
  };

  const handleRemoveHeader = (key: string) => {
    const { [key]: _, ...rest } = editableHeaders;
    setEditableHeaders(rest);
  };

  const handleUpdateHeaderKey = (oldKey: string, newKey: string) => {
    if (newKey === oldKey) return;
    const value = editableHeaders[oldKey];
    const { [oldKey]: _, ...rest } = editableHeaders;
    setEditableHeaders({ ...rest, [newKey]: value });
  };

  const handleAddQueryParam = () => {
    const newKey = `param${Object.keys(editableQueryParams).length + 1}`;
    setEditableQueryParams({ ...editableQueryParams, [newKey]: '' });
  };

  const handleRemoveQueryParam = (key: string) => {
    const { [key]: _, ...rest } = editableQueryParams;
    setEditableQueryParams(rest);
  };

  const handleUpdateQueryParamKey = (oldKey: string, newKey: string) => {
    if (newKey === oldKey) return;
    const value = editableQueryParams[oldKey];
    const { [oldKey]: _, ...rest } = editableQueryParams;
    setEditableQueryParams({ ...rest, [newKey]: value });
  };

  const handleAddPathParam = () => {
    const newKey = `pathParam${Object.keys(editablePathParams).length + 1}`;
    setEditablePathParams({ ...editablePathParams, [newKey]: '' });
  };

  const handleRemovePathParam = (key: string) => {
    const { [key]: _, ...rest } = editablePathParams;
    setEditablePathParams(rest);
  };

  const handleUpdatePathParamKey = (oldKey: string, newKey: string) => {
    if (newKey === oldKey) return;
    const value = editablePathParams[oldKey];
    const { [oldKey]: _, ...rest } = editablePathParams;
    setEditablePathParams({ ...rest, [newKey]: value });
  };

  const handleGetAuthToken = async () => {
    if (!clientId || !clientSecret) {
      return;
    }

    setIsGettingToken(true);
    setAuthError(null);
    try {
      const response = await fetch('https://api.superflow.run/b2b/createAuthToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientId,
          clientSecret: clientSecret,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || data.error || 'Failed to get token';
        
        // Check if error is related to IP whitelist
        const isIPError = errorMessage.toLowerCase().includes('not whitelisted') || 
                         errorMessage.toLowerCase().includes('ip') && errorMessage.toLowerCase().includes('whitelist') ||
                         response.status === 403;
        
        // Extract a cleaner message if it's an IP error
        let displayMessage = errorMessage;
        if (isIPError) {
          // Extract just the main message without the URL
          displayMessage = errorMessage.split('.')[0] + '.';
        }
        
        setAuthError({
          message: displayMessage,
          isIPError: isIPError
        });
        return;
      }

      const token = data.authToken || data.token;

      if (!token) {
        setAuthError({
          message: 'No token received from server',
          isIPError: false
        });
        return;
      }

      localStorage.setItem('apiKey', token);

      setEditableHeaders({
        ...editableHeaders,
        Authorization: `Bearer ${token}`,
      });

      setShowAuthModal(false);
      setClientId('');
      setClientSecret('');
      setAuthError(null);
    } catch (error: any) {
      setAuthError({
        message: error.message || 'Failed to connect to authentication server',
        isIPError: false
      });
    } finally {
      setIsGettingToken(false);
    }
  };

  const handleNavigateToCredentials = () => {
    if (onNavigateToAPIKeys) {
      onNavigateToAPIKeys();
    }
  };

  const handleNavigateToIPWhitelist = () => {
    setShowAuthModal(false);
    onClose();
    window.history.pushState({}, '', '/ip-whitelist');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Try It Out</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {endpoint.method} {endpoint.url}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* ---------- UPDATED: show credentials banner whenever hasCredentials is false ---------- */}
          {!hasCredentials && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                    API Credentials Required
                  </div>
                  <div className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    This endpoint may require authentication. Get your API credentials first to test this endpoint.
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleNavigateToCredentials}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                    >
                      <Key className="w-4 h-4" />
                      Get API Credentials
                    </button>
                   {/* <button
                      onClick={() => setShowAuthModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-zinc-800 text-amber-700 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors text-sm"
                    >
                      <Key className="w-4 h-4" />
                      Enter Credentials
                    </button> */}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Request URL
            </label>
            <input
              type="text"
              value={editableUrl}
              onChange={(e) => setEditableUrl(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm"
            />
          </div>

          {Object.keys(editablePathParams).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Path Parameters
                </label>
                <button
                  onClick={handleAddPathParam}
                  className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium"
                >
                  + Add Parameter
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(editablePathParams).map(([key, value]) => (
                  <div key={key} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => handleUpdatePathParamKey(key, e.target.value)}
                      placeholder="Parameter name"
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setEditablePathParams({ ...editablePathParams, [key]: e.target.value })
                      }
                      placeholder="Parameter value"
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      onClick={() => handleRemovePathParam(key)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                      title="Remove parameter"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Query Parameters
              </label>
              <button
                onClick={handleAddQueryParam}
                className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium"
              >
                + Add Parameter
              </button>
            </div>
            <div className="space-y-2">
              {Object.keys(editableQueryParams).length === 0 ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400 italic py-2">
                  No query parameters. Click "Add Parameter" to add one.
                </div>
              ) : (
                Object.entries(editableQueryParams).map(([key, value]) => (
                  <div key={key} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => handleUpdateQueryParamKey(key, e.target.value)}
                      placeholder="Parameter name"
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setEditableQueryParams({ ...editableQueryParams, [key]: e.target.value })
                      }
                      placeholder="Parameter value"
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      onClick={() => handleRemoveQueryParam(key)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                      title="Remove parameter"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Headers
              </label>
              <div className="flex items-center gap-2">
                {editableHeaders['Authorization'] && hasCredentials && (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Get Auth Token
                  </button>
                )}
                <button
                  onClick={handleAddHeader}
                  className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium"
                >
                  + Add Header
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {Object.keys(editableHeaders).length === 0 ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400 italic py-2">
                  No headers. Click "Add Header" to add one.
                </div>
              ) : (
                Object.entries(editableHeaders).map(([key, value]) => (
                  <div key={key} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => handleUpdateHeaderKey(key, e.target.value)}
                      placeholder="Header name"
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setEditableHeaders({ ...editableHeaders, [key]: e.target.value })
                      }
                      placeholder="Header value"
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      onClick={() => handleRemoveHeader(key)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                      title="Remove header"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {endpoint.method !== 'GET' && endpoint.method !== 'HEAD' && (
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Request Body
              </label>
              <textarea
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                rows={10}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
                placeholder='{"key": "value"}'
              />
            </div>
          )}

          <button
            onClick={() => handleExecute(false)}
            disabled={isExecuting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-zinc-400 text-white rounded-lg transition-colors font-medium"
          >
          {isExecuting ? (
  <>
    <Loader2 className="w-5 h-5 animate-spin" />
    {isRetryingWithNewToken ? 'Checking IP & Regenerating Token...' : 'Executing...'}
  </>
) : (
  <>
    <Play className="w-5 h-5" />
    Execute Request
  </>
)}
          </button>

          {responseError && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                Error
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">{responseError}</div>
            </div>
          )}

          {response && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Response
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {response.duration}ms
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      response.status >= 200 && response.status < 300
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : response.status >= 400
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {response.status} {response.statusText}
                  </span>
                </div>
              </div>

            {/* Token Regenerated Success Banner */}
{response.isTokenRegenerated && (
  <div className="rounded-xl p-4 border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
    <div className="flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
      <div className="flex-1">
        <div className="text-sm font-medium mb-1 text-green-900 dark:text-green-100">
          Token Updated Successfully
        </div>
        <div className="text-sm text-green-700 dark:text-green-300">
          {response.data?.message || 'Your token was tied to a different IP. New token generated successfully. Retrying...'}
        </div>
      </div>
    </div>
  </div>
)}

{/* IP Whitelist Error Banner */}
{response.isIPError && (
  <div className="rounded-xl p-4 border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
      <div className="flex-1">
        <div className="text-sm font-medium mb-1 text-amber-900 dark:text-amber-100">
          IP Address Not Whitelisted
        </div>
        <div className="text-sm mb-2 text-amber-700 dark:text-amber-300">
          {response.data?.message || 'Your IP address is not whitelisted.'}
        </div>

        <div className="text-xs mb-3 text-amber-600 dark:text-amber-400">
          Please add your IP to the whitelist in the dashboard, then try again.
        </div>
        <button
          onClick={handleNavigateToIPWhitelist}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Shield className="w-4 h-4" />
          Go to IP Whitelist
        </button>
      </div>
    </div>
  </div>
)}
              <div>
                <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Response Body
                </h4>
                <pre className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 overflow-x-auto text-sm border border-zinc-200 dark:border-zinc-700 whitespace-pre-wrap">
                  <code className="text-zinc-900 dark:text-zinc-100">
                    {typeof response.data === 'string'
                      ? (() => {
                          try {
                            const parsed = JSON.parse(response.data);
                            return JSON.stringify(parsed, null, 2);
                          } catch {
                            return response.data;
                          }
                        })()
                      : JSON.stringify(response.data, null, 2)}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800">
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Get Auth Token</h3>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setClientId('');
                  setClientSecret('');
                  setAuthError(null);
                }}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {authError && (
                <div className={`rounded-xl p-4 border ${
                  authError.isIPError
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                    : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      authError.isIPError
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                    }`} />
                    <div className="flex-1">
                      <div className={`text-sm font-medium mb-1 ${
                        authError.isIPError
                          ? 'text-amber-900 dark:text-amber-100'
                          : 'text-red-900 dark:text-red-100'
                      }`}>
                        {authError.isIPError ? 'IP Address Not Whitelisted' : 'Authentication Error'}
                      </div>
                      <div className={`text-sm mb-3 ${
                        authError.isIPError
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                      
                        {authError.isIPError && (
                          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                            You need to whitelist your IP address to access the API.
                          </div>
                        )}
                      </div>
                      {authError.isIPError && (
                        <button
                          onClick={handleNavigateToIPWhitelist}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                        >
                          <Shield className="w-4 h-4" />
                          Go to IP Whitelist
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Enter client ID"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Enter client secret"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAuthModal(false);
                    setClientId('');
                    setClientSecret('');
                    setAuthError(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGetAuthToken}
                  disabled={!clientId || !clientSecret || isGettingToken}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-400 text-white rounded-lg transition-colors font-medium"
                >
                  {isGettingToken ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Getting Token...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      Get Token
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
