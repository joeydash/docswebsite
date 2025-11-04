import React, { useState, useEffect } from 'react';
import { Home, Webhook, CheckCircle2, AlertCircle, X, Key } from 'lucide-react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { GET_API_TOKEN_QUERY, GET_WEBHOOK_CONFIG_QUERY, UPDATE_WEBHOOK_CONFIG_MUTATION, executeGraphQLQuery } from '../services/graphql';
import { Navbar } from '../components/Navbar';
import { SkeletonCard, SkeletonBox } from '../components/ui/SkeletonLoader';

interface WebhookConfigData {
  webhook: string | null;
  webhook_active: boolean | null;
}

interface WebhookConfigResponse {
  whatsub_b2b_client: WebhookConfigData[];
}

interface UpdateWebhookResponse {
  update_whatsub_b2b_client: {
    affected_rows: number;
  };
}

type ToastType = 'success' | 'error';

async function fetchWebhookConfig(
  userId: string,
  authToken: string
): Promise<WebhookConfigResponse> {
  return executeGraphQLQuery<WebhookConfigResponse>(
    GET_WEBHOOK_CONFIG_QUERY,
    { user_id: userId },
    authToken
  );
}

async function updateWebhookConfig(
  userId: string,
  webhook: string,
  webhookActive: boolean,
  authToken: string
): Promise<UpdateWebhookResponse> {
  return executeGraphQLQuery<UpdateWebhookResponse>(
    UPDATE_WEBHOOK_CONFIG_MUTATION,
    { user_id: userId, webhook, webhook_active: webhookActive },
    authToken
  );
}

interface APITokenCheckResponse {
  whatsub_b2b_client: { id: string }[];
}

async function checkAPIToken(
  userId: string,
  authToken: string
): Promise<APITokenCheckResponse> {
  return executeGraphQLQuery<APITokenCheckResponse>(
    GET_API_TOKEN_QUERY,
    { user_id: userId },
    authToken
  );
}

interface WebhooksProps {
  onBack: () => void;
  onNavigateToAPIKeys?: () => void;
}

export function Webhooks({ onBack, onNavigateToAPIKeys }: WebhooksProps) {
  const { userId, tokenData, isAuthenticated,isAuthLoading } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);



useEffect(() => {
  if (!isAuthLoading && isAuthenticated === false) {
    onBack();
  }
}, [isAuthLoading, isAuthenticated, onBack]);


  const { data: apiTokenCheck, isLoading: isCheckingToken } = useSWR<APITokenCheckResponse>(
    userId && tokenData?.auth_token ? ['api-token-check', userId, tokenData.auth_token] : null,
    () => checkAPIToken(userId!, tokenData!.auth_token)
  );

  const { data, error, isLoading, mutate } = useSWR<WebhookConfigResponse>(
    userId && tokenData?.auth_token ? ['webhook-config', userId, tokenData.auth_token] : null,
    () => fetchWebhookConfig(userId!, tokenData!.auth_token)
  );

  useEffect(() => {
    if (data?.whatsub_b2b_client[0]) {
      const config = data.whatsub_b2b_client[0];
      setWebhookUrl(config.webhook || '');
      setIsEnabled(config.webhook_active || false);
    }
  }, [data]);

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUrlChange = (value: string) => {
    setWebhookUrl(value);
    setHasChanges(true);
  };

  const handleEnabledChange = (checked: boolean) => {
    setIsEnabled(checked);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!userId || !tokenData?.auth_token || isSaving) return;

    if (!webhookUrl.trim()) {
      showToast('error', 'Webhook URL is required');
      return;
    }

    try {
      new URL(webhookUrl);
    } catch {
      showToast('error', 'Invalid webhook URL format');
      return;
    }

    setIsSaving(true);
    try {
      await updateWebhookConfig(userId, webhookUrl, isEnabled, tokenData.auth_token);
      showToast('success', 'Webhook configuration updated successfully');
      setHasChanges(false);
      mutate();
    } catch (err) {
      console.error('Error updating webhook config:', err);
      showToast('error', 'Failed to update webhook configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isCheckingToken) {
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
                    Webhooks
                  </h1>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Configure webhook endpoints to receive real-time updates
                  </p>
                </div>
              </div>
              <Navbar />
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur overflow-hidden p-6">
              <div className="space-y-6">
                <SkeletonBox className="h-6 w-32" />
                <SkeletonBox className="h-12 w-full rounded-xl" />
                <div className="flex items-center justify-between">
                  <SkeletonBox className="h-6 w-40" />
                  <SkeletonBox className="h-6 w-12 rounded-full" />
                </div>
                <SkeletonBox className="h-10 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasAPIKey = apiTokenCheck && apiTokenCheck.whatsub_b2b_client.length > 0;

  if (!hasAPIKey) {
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
                    Webhooks
                  </h1>
                </div>
              </div>
              <Navbar />
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-6">
                <Key className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                API Key Required
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                You need to generate an API key before configuring webhooks. Please generate an API key first.
              </p>
              <button
                onClick={() => {
                  if (onNavigateToAPIKeys) {
                    onNavigateToAPIKeys();
                  } else {
                    window.history.pushState({}, '', '/api-keys');
                    onBack();
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold transition-colors shadow-lg shadow-sky-500/30"
              >
                <Key className="w-5 h-5" />
                Go to API Keys
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/50">
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <Home className="w-5 h-5" />
     
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Error loading webhook configuration
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
                  Webhooks
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Configure webhook endpoints to receive real-time updates
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
        <div className="space-y-8">
          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://your-domain.com/webhook"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-colors"
            />
          </div>

          {/* Enable Webhook Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleEnabledChange(!isEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                isEnabled
                  ? 'bg-sky-500'
                  : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              Enable webhook
            </span>
          </div>

          {/* Available Events */}
          <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Webhook className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h3 className="text-lg font-semibold text-sky-900 dark:text-sky-100">
                Available Events
              </h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400 mt-2 flex-shrink-0" />
                <p className="text-sky-800 dark:text-sky-200 leading-relaxed">
                  <span className="font-semibold">call.started</span> - When a call begins
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400 mt-2 flex-shrink-0" />
                <p className="text-sky-800 dark:text-sky-200 leading-relaxed">
                  <span className="font-semibold">call.ended</span> - When a call completes
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400 mt-2 flex-shrink-0" />
                <p className="text-sky-800 dark:text-sky-200 leading-relaxed">
                  <span className="font-semibold">call.failed</span> - When a call fails
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400 mt-2 flex-shrink-0" />
                <p className="text-sky-800 dark:text-sky-200 leading-relaxed">
                  <span className="font-semibold">data.collected</span> - When data is collected during a call
                </p>
              </li>
            </ul>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="px-8 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold transition-colors shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border ${
            toast.type === 'success'
              ? 'bg-green-50 dark:bg-green-950/90 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-800'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <p className={`font-medium ${
              toast.type === 'success'
                ? 'text-green-900 dark:text-green-100'
                : 'text-red-900 dark:text-red-100'
            }`}>
              {toast.message}
            </p>
            <button
              onClick={() => setToast(null)}
              className={`p-1 rounded-lg transition-colors ${
                toast.type === 'success'
                  ? 'hover:bg-green-100 dark:hover:bg-green-900/50'
                  : 'hover:bg-red-100 dark:hover:bg-red-900/50'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}