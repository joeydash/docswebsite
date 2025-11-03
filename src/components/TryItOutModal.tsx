import React, { useState } from 'react';
import { X, Play, Loader2, Key } from 'lucide-react';

interface TryItOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint: {
    method: string;
    url: string;
    headers?: Record<string, any>;
    body?: string;
    parameters?: Record<string, any>;
    pathParameters?: Record<string, any>;
  };
}

export function TryItOutModal({ isOpen, onClose, endpoint }: TryItOutModalProps) {
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

React.useEffect(() => {
  if (!showAuthModal) return;

  try {
    const savedKeys = JSON.parse(localStorage.getItem('savedAPIKeys') || '[]');
    const last = savedKeys[savedKeys.length - 1];
    if (last) {
      setClientId(last.clientId);
      setClientSecret(last.clientSecret);
    }

    // Also check if an API key (token) is already saved
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


// Add this new useEffect to prefill Authorization header when modal opens
React.useEffect(() => {
  if (!isOpen) return;

  try {
    // Only prefill if Authorization header already exists in the endpoint
    if (endpoint.headers && endpoint.headers['Authorization']) {
      const savedApiKey = localStorage.getItem('apiKey');
      if (savedApiKey) {
        setEditableHeaders(prev => ({
          ...prev,
          Authorization: `Bearer ${savedApiKey}`,
        }));
      }
    }
  } catch (err) {
    console.error('Error reading saved API key:', err);
  }
}, [isOpen]);



  

  if (!isOpen) return null;

  const handleExecute = async () => {
    setIsExecuting(true);
    setResponse(null);
    setResponseError('');

    try {
      const options: RequestInit = {
        method: endpoint.method,
        headers: editableHeaders,
      };

      if (endpoint.method !== 'GET' && endpoint.method !== 'HEAD' && editableBody) {
        options.body = editableBody;
      }

      // Replace path parameters in URL
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
    try {
      // TODO: Replace with actual token endpoint
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

      if (!response.ok) {
        throw new Error('Failed to get token');
      }

      const data = await response.json();
      const token = data.authToken || data.token;

      localStorage.setItem('apiKey', token);

      // Update Authorization header with the new token
      setEditableHeaders({
        ...editableHeaders,
        Authorization: `Bearer ${token}`,
      });

      setShowAuthModal(false);
      setClientId('');
      setClientSecret('');
    } catch (error: any) {
      alert(error.message || 'Failed to get auth token');
    } finally {
      setIsGettingToken(false);
    }
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
                {editableHeaders['Authorization'] && (
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
            onClick={handleExecute}
            disabled={isExecuting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-zinc-400 text-white rounded-lg transition-colors font-medium"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Executing...
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

             <div>
  <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
    Response Body
  </h4>
  <pre className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 overflow-x-auto text-sm border border-zinc-200 dark:border-zinc-700 whitespace-pre-wrap">
    <code className="text-zinc-900 dark:text-zinc-100">
      {typeof response.data === 'string'
        ? (() => {
            try {
              // Try to parse and format if it's a JSON string
              const parsed = JSON.parse(response.data);
              return JSON.stringify(parsed, null, 2);
            } catch {
              // If not JSON, return as is
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
                }}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
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
