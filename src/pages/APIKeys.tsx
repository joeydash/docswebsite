import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Key, Plus, CheckCircle2, AlertCircle, X, Download, AlertTriangle, Save, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { GET_API_TOKEN_QUERY, GENERATE_API_TOKEN_MUTATION, executeGraphQLQuery } from '../services/graphql';
import { Navbar } from '../components/Navbar';
import { SkeletonCard } from '../components/ui/SkeletonLoader';

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
  const { userId, tokenData, isAuthenticated } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [savedKeys, setSavedKeys] = useState<{ clientId: string; clientSecret: string }[]>([]);

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
    if (!isAuthenticated) {
      onBack();
    }
  }, [isAuthenticated, onBack]);

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
    handleCloseModal();
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/50">
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">Back</span>
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
          <div className="max-w-5xl mx-auto px-6 py-5">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
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
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Left Side - Back Button and Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
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

            {/* Browser Storage Warning */}
            {savedKeys.length > 0 && (
              <div className="rounded-xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-yellow-900 dark:text-yellow-100 mb-1">
                      WARNING!
                    </h3>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200/90 leading-relaxed">
                     API credentials are stored in your browser. 
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete all ${savedKeys.length} saved credential${savedKeys.length > 1 ? 's' : ''} from your browser?`)) {
                        setSavedKeys([]);
                        localStorage.removeItem('savedAPIKeys');
                      }
                    }}
                    className="flex-shrink-0 p-1.5 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 transition-colors"
                    title="Delete all saved credentials"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
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