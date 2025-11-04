import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Home,
  Copy,
  Key,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  AlertTriangle,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { GET_API_TOKEN_QUERY, GENERATE_API_TOKEN_MUTATION, executeGraphQLQuery } from '../services/graphql';
import { Navbar } from '../components/Navbar';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { SavedKeysWarningSide } from '../components/SavedKeysWarningSide';

interface APIKeyData {
  id: string;
}

interface APIKeysResponse {
  whatsub_b2b_client: APIKeyData[];
}

interface GenerateKeyResponse {
  newB2BClient: {
    affected_rows: number;
    clientId: string;
    clientSecret: string;
  };
}

async function fetchAPIKeys(userId: string, authToken: string): Promise<APIKeysResponse> {
  return executeGraphQLQuery<APIKeysResponse>(
    GET_API_TOKEN_QUERY,
    { user_id: userId },
    authToken
  );
}

async function generateAPIKey(userId: string, authToken: string): Promise<GenerateKeyResponse> {
  return executeGraphQLQuery<GenerateKeyResponse>(
    GENERATE_API_TOKEN_MUTATION,
    { user_id: userId },
    authToken
  );
}

interface APIKeysProps {
  onBack: () => void;
}

export function APIKeys({ onBack }: APIKeysProps) {
  const { userId, tokenData, isAuthenticated ,isAuthLoading} = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [savedKeys, setSavedKeys] = useState<{ clientId: string; clientSecret: string }[]>([]);
  const [showTestAPITips, setShowTestAPITips] = useState(false); // <-- toggles collapse

  useEffect(() => {
    const stored = localStorage.getItem('savedAPIKeys');
    if (stored) {
      try {
        setSavedKeys(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse saved keys:', e);
      }
    }
  }, []);



useEffect(() => {
  if (!isAuthLoading && isAuthenticated === false) {
    onBack();
  }
}, [isAuthLoading, isAuthenticated, onBack]);


  const { data, error, isLoading, mutate } = useSWR<APIKeysResponse>(
    userId && tokenData?.auth_token ? ['api-keys', userId, tokenData.auth_token] : null,
    () => fetchAPIKeys(userId!, tokenData!.auth_token)
  );

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleGenerateNewKey = async () => {
    if (!userId || !tokenData?.auth_token || isGenerating) return;

    setIsGenerating(true);
    try {
      const result = await generateAPIKey(userId, tokenData.auth_token);
      setNewKeyData({
        clientId: result.newB2BClient.clientId,
        clientSecret: result.newB2BClient.clientSecret,
      });
      setShowNewKeyModal(true);
      mutate();
    } catch (err) {
      console.error('Failed to generate new key:', err);
      alert('Failed to generate new API key. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseModal = () => {
    setShowNewKeyModal(false);
    setNewKeyData(null);
  };

  const handleDownloadCSV = () => {
    if (!newKeyData) return;

    const csv = `Client ID,Client Secret\n${newKeyData.clientId},${newKeyData.clientSecret}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api-credentials.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleSaveToBrowser = () => {
    if (!newKeyData) return;

    const updatedKeys = [...savedKeys, newKeyData];
    setSavedKeys(updatedKeys);
    localStorage.setItem('savedAPIKeys', JSON.stringify(updatedKeys));
    
    // Dispatch custom event to notify SavedKeysWarningSide
    window.dispatchEvent(new Event('savedAPIKeys-updated'));
    
    handleCloseModal();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/50">
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <Home className="w-5 h-5" />
                </button>
                <div className="border-l border-zinc-300 dark:border-zinc-700 h-8" />
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    API Keys
                  </h1>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Use these keys to authenticate your API requests
                  </p>
                </div>
              </div>
              <Navbar />
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/50">
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Error loading API keys
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Please try again later.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const apiKeys = data?.whatsub_b2b_client || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Left Side - Back Button and Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <Home className="w-5 h-5" />
              </button>

              <div className="border-l border-zinc-300 dark:border-zinc-700 h-8" />

              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  API Keys
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Use these keys to authenticate your API requests
                </p>
              </div>
            </div>

            {/* Right Side - Navbar Component (Theme Toggle + Login) */}
            <Navbar />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              No API Keys Found
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Generate your first API key to get started
            </p>
            <button
              onClick={handleGenerateNewKey}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-colors shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span className="font-semibold">Generating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span className="font-semibold">Generate New Key</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Generate New Key Button - Above API Keys List */}
            <div className="flex justify-end">
              <button
                onClick={handleGenerateNewKey}
                disabled={isGenerating}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-colors shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span className="font-semibold">Generating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">Generate New Key</span>
                  </>
                )}
              </button>
            </div>

            {/* Collapsible Notice for Testing APIs - Only show if no saved keys */}
            {savedKeys.length === 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 p-0 shadow-sm overflow-hidden">
                {/* Header (clickable) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowTestAPITips((s) => !s)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowTestAPITips((s) => !s); }}
                  className="flex items-center justify-between gap-4 p-4 cursor-pointer"
                  aria-expanded={showTestAPITips}
                  aria-controls="test-api-tips"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50">
                      <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-0.5">
                        Want to Test APIs?
                      </h3>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Save your API credentials to use the "Try It Out" feature.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-700 dark:text-blue-200 hidden md:inline">
                      {showTestAPITips ? 'Hide details' : 'Show details'}
                    </span>
                    {showTestAPITips ? <ChevronUp className="w-5 h-5 text-blue-700" /> : <ChevronDown className="w-5 h-5 text-blue-700" />}
                  </div>
                </div>

                {/* Collapsible content */}
                <div
                  id="test-api-tips"
                  className="px-6 pb-6 transition-[max-height,opacity] duration-300 ease-in-out"
                  style={{
                    maxHeight: showTestAPITips ? 800 : 0,
                    opacity: showTestAPITips ? 1 : 0,
                  }}
                >
                  <div className="bg-white/60 dark:bg-zinc-900/40 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50">
                    <p className="text-blue-800 dark:text-blue-200 leading-relaxed mb-4">
                      To use the "Try It Out" feature and test API endpoints directly in your browser, you need to save your API credentials. Client secrets are only shown once during key generation.
                    </p>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      📝 How to get started:
                    </p>
                    <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                        <span>Click "Generate New Key" button above</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                        <span>When the modal appears, click "Save in Browser" to store your credentials locally</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                        <span>Your credentials will be saved securely in your browser and auto-filled when testing APIs</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* API Keys List */}
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-900/30">
                      <Key className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Client ID
                    </h3>
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                      <code className="flex-1 text-sm font-mono text-zinc-900 dark:text-zinc-100 break-all">
                        {apiKey.id}
                      </code>
                      <button
                        onClick={() => handleCopy(apiKey.id, apiKey.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        {copiedId === apiKey.id ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              Copied
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span className="text-sm font-medium">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Security Notice */}
            <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 p-6">
              <h3 className="text-lg font-semibold text-sky-900 dark:text-sky-100 mb-3">
                Security Notice
              </h3>
              <p className="text-sky-800 dark:text-sky-200 leading-relaxed">
                Keep your API keys secure and never share them publicly. Rotate your keys regularly and use environment variables to store them in your applications.
              </p>
            </div>
            
            <SavedKeysWarningSide position="right" vertical="bottom" />
          </div>
        )}
      </div>

      {/* New Key Modal */}
      {showNewKeyModal && newKeyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                New API Key Generated
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Important Notice */}
              <div className="flex gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    Important Notice
                  </h3>
                  <p className="text-amber-800 dark:text-amber-200 text-sm leading-relaxed">
                    This is the only time you'll see the secret key. Please save it somewhere secure. You won't be able to retrieve it later.
                  </p>
                </div>
              </div>

              {/* Client ID */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Client ID
                </label>
                <div className="flex items-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                  <code className="flex-1 text-sm font-mono text-zinc-900 dark:text-zinc-100 break-all">
                    {newKeyData.clientId}
                  </code>
                  <button
                    onClick={() => handleCopy(newKeyData.clientId, 'modal-client-id')}
                    className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
                    title="Copy to clipboard"
                  >
                    {copiedId === 'modal-client-id' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Client Secret */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Client Secret
                </label>
                <div className="flex items-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                  <code className="flex-1 text-sm font-mono text-zinc-900 dark:text-zinc-100 break-all">
                    {newKeyData.clientSecret}
                  </code>
                  <button
                    onClick={() => handleCopy(newKeyData.clientSecret, 'modal-client-secret')}
                    className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
                    title="Copy to clipboard"
                  >
                    {copiedId === 'modal-client-secret' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition-colors border border-zinc-200 dark:border-zinc-700"
                >
                  <Download className="w-5 h-5" />
                  <span className="font-semibold">Download CSV</span>
                </button>

                <button
                  onClick={handleSaveToBrowser}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-lg shadow-emerald-500/30"
                >
                  <Save className="w-5 h-5" />
                  <span className="font-semibold">Save in Browser</span>
                </button>
              </div>

              {/* Confirmation Button */}
              <button
                onClick={handleCloseModal}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition-colors shadow-lg shadow-sky-500/30"
              >
                <span className="font-semibold">I've Saved My Secret Key</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
