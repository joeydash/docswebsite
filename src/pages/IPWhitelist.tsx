import React, { useState, useEffect } from 'react';
import {  Shield, Plus, Trash2, AlertCircle, CheckCircle2, X, Key ,Home} from 'lucide-react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { GET_API_TOKEN_QUERY, GET_WHITELISTED_IPS_QUERY, UPDATE_WHITELISTED_IPS_MUTATION, executeGraphQLQuery } from '../services/graphql';
import { formatDistanceToNow } from 'date-fns';
import { Navbar } from '../components/Navbar';
import { SkeletonTable, SkeletonBox } from '../components/ui/SkeletonLoader';

interface WhitelistedIPsData {
  ips: string[] | null;
  created_at: string;
  updated_at: string;
}

interface WhitelistedIPsResponse {
  whatsub_b2b_client: WhitelistedIPsData[];
}

interface UpdateIPsResponse {
  update_whatsub_b2b_client: {
    affected_rows: number;
  };
}

type ToastType = 'success' | 'error';

async function fetchWhitelistedIPs(
  userId: string,
  authToken: string
): Promise<WhitelistedIPsResponse> {
  return executeGraphQLQuery<WhitelistedIPsResponse>(
    GET_WHITELISTED_IPS_QUERY,
    { user_id: userId },
    authToken
  );
}

async function updateWhitelistedIPs(
  userId: string,
  ips: string[],
  authToken: string
): Promise<UpdateIPsResponse> {
  return executeGraphQLQuery<UpdateIPsResponse>(
    UPDATE_WHITELISTED_IPS_MUTATION,
    { user_id: userId, ips },
    authToken
  );
}

function validateIPAddress(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{0,4}:){2,7}(?:[0-9a-fA-F]{0,4})?$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
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

interface IPWhitelistProps {
  onBack: () => void;
  onNavigateToAPIKeys?: () => void;
}

export function IPWhitelist({ onBack, onNavigateToAPIKeys }: IPWhitelistProps) {
  const { userId, tokenData, isAuthenticated } = useAuth();
  const [newIP, setNewIP] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      onBack();
    }
  }, [isAuthenticated, onBack]);

  const { data: apiTokenCheck, isLoading: isCheckingToken } = useSWR<APITokenCheckResponse>(
    userId && tokenData?.auth_token ? ['api-token-check', userId, tokenData.auth_token] : null,
    () => checkAPIToken(userId!, tokenData!.auth_token)
  );

  const { data, error, isLoading, mutate } = useSWR<WhitelistedIPsResponse>(
    userId && tokenData?.auth_token ? ['whitelisted-ips', userId, tokenData.auth_token] : null,
    () => fetchWhitelistedIPs(userId!, tokenData!.auth_token)
  );

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddIP = async () => {
    if (!userId || !tokenData?.auth_token || !newIP.trim() || isAdding) return;

    const ipToAdd = newIP.trim();

    if (!validateIPAddress(ipToAdd)) {
      showToast('error', 'Invalid IP address format');
      return;
    }

    const clientData = data?.whatsub_b2b_client[0];
    const currentIPs = clientData?.ips || [];

    if (currentIPs.includes(ipToAdd)) {
      showToast('error', 'IP address already whitelisted');
      return;
    }

    setIsAdding(true);
    try {
      const updatedIPs = [...currentIPs, ipToAdd];
      await updateWhitelistedIPs(userId, updatedIPs, tokenData.auth_token);
      showToast('success', 'IP address added successfully');
      setNewIP('');
      mutate();
    } catch (err) {
      console.error('Error adding IP:', err);
      showToast('error', 'Failed to add IP address');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveIP = async (ip: string) => {
    if (!userId || !tokenData?.auth_token || isRemoving) return;

    setIsRemoving(ip);
    try {
      const clientData = data?.whatsub_b2b_client[0];
      const currentIPs = clientData?.ips || [];
      const updatedIPs = currentIPs.filter(existingIP => existingIP !== ip);

      await updateWhitelistedIPs(userId, updatedIPs, tokenData.auth_token);
      showToast('success', 'IP address removed successfully');
      mutate();
    } catch (err) {
      console.error('Error removing IP:', err);
      showToast('error', 'Failed to remove IP address');
    } finally {
      setIsRemoving(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddIP();
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
                    IP Whitelist
                  </h1>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Manage allowed IP addresses for API access
                  </p>
                </div>
              </div>
              <Navbar />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur overflow-hidden p-6">
              <SkeletonBox className="h-6 w-32 mb-4" />
              <div className="flex gap-2">
                <SkeletonBox className="h-12 flex-1 rounded-xl" />
                <SkeletonBox className="h-12 w-24 rounded-lg" />
              </div>
            </div>
            <SkeletonTable />
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
                    Whitelisted IP Addresses
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
                You need to generate an API key before configuring IP whitelist. Please generate an API key first.
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
          <div className="max-w-7xl mx-auto px-6 py-3 my-0">
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
                Error loading IP whitelist
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

  const clientData = data?.whatsub_b2b_client[0];
  const ips = clientData?.ips || [];
  const updatedAt = clientData?.updated_at;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/50">
      {/* Header */}
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
            Whitelisted IP Addresses
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Restrict API access to specific IP addresses
          </p>
        </div>
      </div>

      <Navbar />
    </div>
  </div>
</div>


     

      {/* Content */}

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Add IP Form */}
          <div>
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              IP Address
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter IP address"
                  disabled={isAdding}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <button
                onClick={handleAddIP}
                disabled={isAdding || !newIP.trim()}
                className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Whitelisted IPs List */}
          <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur overflow-hidden">
            <div className="p-6 border-b border-zinc-200/60 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Whitelisted IP Addresses ({ips.length})
                  </h2>
                </div>
                {updatedAt && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Last updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>

            <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {ips.length === 0 ? (
                <div className="p-12 text-center">
                  <Shield className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-600 dark:text-zinc-400">
                    No IP addresses whitelisted yet
                  </p>
                </div>
              ) : (
                ips.map((ip) => (
                  <div
                    key={ip}
                    className="flex items-center justify-between p-6 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <code className="text-lg font-mono text-zinc-900 dark:text-zinc-100">
                      {ip}
                    </code>
                    <button
                      onClick={() => handleRemoveIP(ip)}
                      disabled={isRemoving === ip}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove IP"
                    >
                      {isRemoving === ip ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600 dark:border-red-400" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* IP Whitelist Information */}
          <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-6">
            <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-4">
              IP Whitelist Information
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-2 flex-shrink-0" />
                <p className="text-indigo-800 dark:text-indigo-200 leading-relaxed">
                  Only requests from whitelisted IPs will be allowed
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-2 flex-shrink-0" />
                <p className="text-indigo-800 dark:text-indigo-200 leading-relaxed">
                  You can add multiple IP addresses to the whitelist
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-2 flex-shrink-0" />
                <p className="text-indigo-800 dark:text-indigo-200 leading-relaxed">
                  Duplicate IP addresses will not be added
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-2 flex-shrink-0" />
                <p className="text-indigo-800 dark:text-indigo-200 leading-relaxed">
                  Changes may take up to 5 minutes to propagate
                </p>
              </li>
            </ul>
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
