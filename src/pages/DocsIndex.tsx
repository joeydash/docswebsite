import React, { useState, useRef } from 'react';
import { ChevronRight, Clock, Search, Shield, Key, Webhook } from 'lucide-react';
import { format } from 'date-fns';
import { Documentation } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Navbar, NavbarRef } from '../components/Navbar';

interface DocsIndexProps {
  docs: Documentation[];
  onNavigate: (path: string) => void;
  onNavigateToRoute: (route: 'api-keys' | 'ip-whitelist' | 'webhooks') => void;
}

export function DocsIndex({ docs, onNavigate, onNavigateToRoute }: DocsIndexProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { isAuthenticated } = useAuth();
  const navbarRef = useRef<NavbarRef>(null);

  const handleManagementClick = (route: 'api-keys' | 'ip-whitelist' | 'webhooks') => {
    if (!isAuthenticated) {
      navbarRef.current?.openLoginModal();
      return;
    }
    onNavigateToRoute(route);
  };

  const filteredDocs = docs.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/50">
      {/* Header */}
<div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-6 py-5">

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Documentation
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Explore our API documentation and guides
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>

              {/* Management Buttons - Always visible */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur">
                <button
                  onClick={() => handleManagementClick('ip-whitelist')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors group"
                  title="IP Whitelist"
                >
                  <Shield className="w-4 h-4 group-hover:text-sky-500 transition-colors" />
                  <span className="font-medium text-sm">IP Whitelist</span>
                </button>

                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />

                <button
                  onClick={() => handleManagementClick('api-keys')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors group"
                  title="API Keys"
                >
                  <Key className="w-4 h-4 group-hover:text-sky-500 transition-colors" />
                  <span className="font-medium text-sm">API Keys</span>
                </button>

                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />

                <button
                  onClick={() => handleManagementClick('webhooks')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors group"
                  title="Webhooks"
                >
                  <Webhook className="w-4 h-4 group-hover:text-sky-500 transition-colors" />
                  <span className="font-medium text-sm">Webhooks</span>
                </button>
              </div>

              {/* Navbar Component (Theme Toggle + Login/Logout) */}
              <Navbar ref={navbarRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-zinc-400 dark:text-zinc-600 text-lg">
              {searchTerm ? 'No documentation found matching your search.' : 'No documentation available.'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onNavigate(doc.path)}
                className="group cursor-pointer rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur shadow-sm hover:shadow-xl hover:shadow-zinc-200/20 dark:hover:shadow-zinc-900/20 hover:border-zinc-300/60 dark:hover:border-zinc-700/60 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
              >
                {doc.image_url && (
                  <div className="aspect-[2/1] overflow-hidden">
                    <img
                      src={doc.image_url}
                      alt={doc.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2">
                        {doc.name}
                      </h3>
                      
                      <div className="flex items-center gap-1 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                        <Clock className="w-4 h-4" />
                        <span>Updated {format(new Date(doc.updated_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}