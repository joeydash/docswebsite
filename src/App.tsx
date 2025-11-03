import React, { useState, useEffect } from 'react';
import { fetchDocumentation, fetchAllDocumentation } from './lib/api';
import useSWR from 'swr';
import { DocsIndex } from './pages/DocsIndex';
import { DocsReader } from './pages/DocsReader';
import { APIKeys } from './pages/APIKeys';
import { IPWhitelist } from './pages/IPWhitelist';
import { Webhooks } from './pages/Webhooks';
import { DocumentationResponse } from './types';
import { AuthProvider } from './contexts/AuthContext';
import { SkeletonBox, SkeletonEndpoint } from './components/ui/SkeletonLoader';

type RouteType = 'index' | 'docs' | 'api-keys' | 'ip-whitelist' | 'webhooks';

function AppContent() {
  const [currentRoute, setCurrentRoute] = useState<RouteType>(() => {
    const path = window.location.pathname;
    if (path === '/api-keys') return 'api-keys';
    if (path === '/ip-whitelist') return 'ip-whitelist';
    if (path === '/webhooks') return 'webhooks';
    if (path === '/docs' || path === '/') return 'index';
    return 'docs';
  });

  const [currentPath, setCurrentPath] = useState(() =>
    window.location.pathname.startsWith('/docs/')
      ? window.location.pathname.replace('/docs/', '')
      : ''
  );

  // Handle navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/api-keys') {
        setCurrentRoute('api-keys');
      } else if (path === '/ip-whitelist') {
        setCurrentRoute('ip-whitelist');
      } else if (path === '/webhooks') {
        setCurrentRoute('webhooks');
      } else if (path === '/docs' || path === '/') {
        setCurrentRoute('index');
        setCurrentPath('');
      } else if (path.startsWith('/docs/')) {
        setCurrentRoute('docs');
        setCurrentPath(path.replace('/docs/', ''));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Fetch data with SWR
  const { data: allDocs, error: allDocsError } = useSWR<DocumentationResponse>(
    'documentation-all',
    fetchAllDocumentation
  );

  const { data: docData, error: docError } = useSWR<DocumentationResponse>(
    currentRoute === 'docs' && currentPath ? ['documentation', currentPath] : null,
    () => fetchDocumentation(currentPath)
  );

  const handleNavigate = (path: string) => {
    const newUrl = path ? `/docs/${path}` : '/docs';
    window.history.pushState({}, '', newUrl);
    setCurrentRoute(path ? 'docs' : 'index');
    setCurrentPath(path);
  };

  const handleNavigateToRoute = (route: RouteType) => {
    let url = '/docs';
    if (route === 'api-keys') url = '/api-keys';
    if (route === 'ip-whitelist') url = '/ip-whitelist';
    if (route === 'webhooks') url = '/webhooks';

    window.history.pushState({}, '', url);
    setCurrentRoute(route);
    setCurrentPath('');
  };

  const handleBack = () => {
    window.history.pushState({}, '', '/docs');
    setCurrentRoute('index');
    setCurrentPath('');
  };

  // Show API Keys page
  if (currentRoute === 'api-keys') {
    return <APIKeys onBack={handleBack} />;
  }

  // Show IP Whitelist page
  if (currentRoute === 'ip-whitelist') {
    return <IPWhitelist onBack={handleBack} onNavigateToAPIKeys={() => handleNavigateToRoute('api-keys')} />;
  }

  // Show Webhooks page
  if (currentRoute === 'webhooks') {
    return <Webhooks onBack={handleBack} onNavigateToAPIKeys={() => handleNavigateToRoute('api-keys')} />;
  }

  // Show index page
  if (currentRoute === 'index') {
    if (allDocsError) {
      return (
        <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Error loading documentation
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Please try again later.
            </p>
          </div>
        </div>
      );
    }

    if (!allDocs) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/50">
          <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <SkeletonBox className="h-9 w-48 mb-2" />
                  <SkeletonBox className="h-5 w-64" />
                </div>
                <div className="flex items-center gap-4">
                  <SkeletonBox className="h-12 w-80 rounded-xl" />
                  <SkeletonBox className="h-10 w-32 rounded-xl" />
                  <SkeletonBox className="h-10 w-32 rounded-xl" />
                  <SkeletonBox className="h-10 w-32 rounded-xl" />
                  <SkeletonBox className="h-10 w-24 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur overflow-hidden p-6">
                  <SkeletonBox className="h-6 w-3/4 mb-3" />
                  <SkeletonBox className="h-4 w-full mb-2" />
                  <SkeletonBox className="h-4 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <DocsIndex
        docs={allDocs.karlo_documentation}
        onNavigate={handleNavigate}
        onNavigateToRoute={handleNavigateToRoute}
      />
    );
  }

  // Show reader page
  if (docError) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Error loading documentation
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            The requested documentation could not be found.
          </p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            Back to docs
          </button>
        </div>
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/50">
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <SkeletonBox className="h-8 w-48" />
              <div className="flex items-center gap-4">
                <SkeletonBox className="h-10 w-64 rounded-xl" />
                <SkeletonBox className="h-10 w-10 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex gap-8">
            <aside className="w-80 flex-shrink-0">
              <div className="sticky top-24 space-y-3">
                <SkeletonBox className="h-10 w-full rounded-xl" />
                <SkeletonBox className="h-64 w-full rounded-2xl" />
              </div>
            </aside>
            <main className="flex-1 space-y-8">
              <SkeletonEndpoint />
              <SkeletonEndpoint />
              <SkeletonEndpoint />
            </main>
          </div>
        </div>
      </div>
    );
  }

  const doc = docData.karlo_documentation[0];
  if (!doc) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Documentation not found
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            The requested documentation does not exist.
          </p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            Back to docs
          </button>
        </div>
      </div>
    );
  }

  return (
    <DocsReader doc={doc} onBack={handleBack} />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;