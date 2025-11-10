import React, { useState, useEffect, useMemo } from 'react';
import { sendOTP } from '../services/auth';
import {
  Search,
  Moon,
  Sun,
  ChevronDown,
  Menu,
  X,
  ArrowUp,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Home
} from 'lucide-react';
import { useTheme } from '../hooks/useDarkMode';
import { useEnvironment } from '../hooks/useEnvironment';
import { resolveTemplate, extractEnvData, getEnvironmentNames } from '../utils/template';
import { generateCodeSamples } from '../utils/codeSamples';
import { normalizeInsomniaYaml, slugify } from '../utils/yaml';
import { MethodBadge } from '../components/ui/MethodBadge';
import { CodeBlock } from '../components/ui/CodeBlock';
import { KVTable } from '../components/ui/KVTable';
import { EndpointCard } from '../components/ui/EndpointCard';
import { EnvironmentCard } from '../components/ui/EnvironmentCard';
import { TryItOutModal } from '../components/TryItOutModal';
import { Documentation } from '../types';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { LoginModal } from '../components/LoginModal';
import { SkeletonEndpoint, SkeletonBox } from '../components/ui/SkeletonLoader';

interface DocsReaderProps {
  doc: Documentation;
  onBack: () => void;
  onNavigateToAPIKeys?: () => void;
}

interface EndpointData {
  id: string;
  title: string;
  method: string;
  url: string;
  headers?: any;
  parameters?: any;
  pathParameters?: any;
  body?: any;
}

interface NavItem {
  id: string;
  title: string;
  method?: string;
  children?: NavItem[];
}

type ViewMode = 'section' | 'overview' | 'env';
export function DocsReader({ doc, onBack, onNavigateToAPIKeys }: DocsReaderProps) {
  const { theme, isDark, cycleTheme } = useTheme();
  const { isAuthenticated, login,logout } = useAuth();
  const { isAuthenticated: _unused } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [selectedCodeLanguage, setSelectedCodeLanguage] = useState('curl');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [globalCopied, setGlobalCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    return (view === 'env' || view === 'overview') ? view : 'section';
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showTryItOut, setShowTryItOut] = useState(false);
  const [selectedTryEndpoint, setSelectedTryEndpoint] = useState<EndpointData | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  // Auto OTP functionality
const [autoOtpSent, setAutoOtpSent] = useState(false);
const [autoOtpPhone, setAutoOtpPhone] = useState<string | null>(null);
const [showOtpToast, setShowOtpToast] = useState(false);
const [otpToastMessage, setOtpToastMessage] = useState('');
const [otpToastType, setOtpToastType] = useState<'success' | 'error' | 'info'>('success');

  // add near other useState declarations
const [localDocTab, setLocalDocTab] = useState<'docs' | 'api' | 'platform'>('docs');


  // Parse YAML content
  const [isParsingYaml, setIsParsingYaml] = useState(true);
  const normalizedYaml = useMemo(() => {
    try {
      const result = normalizeInsomniaYaml(doc.docs);
      setTimeout(() => setIsParsingYaml(false), 100);
      return result;
    } catch (e) {
      console.error('Failed to parse YAML:', e);
      setIsParsingYaml(false);
      return null;
    }
  }, [doc.docs]);

  // Legacy compatibility - keep yamlContent for existing code
  const yamlContent = useMemo(() => {
    if (!normalizedYaml) return null;
    return {
      name: normalizedYaml.title,
      collection: normalizedYaml.sections,
      environments: normalizedYaml.envs.length > 0 ? {
        name: normalizedYaml.envRootName,
        subEnvironments: normalizedYaml.envs
      } : undefined
    };
  }, [normalizedYaml]);
  // Get available environments
  const availableEnvs = useMemo(() => {
    if (!normalizedYaml?.envs) return [];
    return normalizedYaml.envs.map(env => env.name);
  }, [normalizedYaml]);

  const [selectedEnv, setSelectedEnv] = useEnvironment(availableEnvs);

  // Extract environment data
  const envData = useMemo(() => {
    if (!normalizedYaml?.envs) return {};
    const selectedEnvData = normalizedYaml.envs.find(env => env.name === selectedEnv);
    return selectedEnvData?.data || {};
  }, [normalizedYaml, selectedEnv]);

  const [envIndex, setEnvIndex] = useState(() => {
    return availableEnvs.findIndex(env => env === selectedEnv);
  });

  // Update URL when view mode changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (viewMode === 'section') {
      params.delete('view');
    } else {
      params.set('view', viewMode);
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}${window.location.hash}`;
    window.history.replaceState({}, '', newUrl);
  }, [viewMode]);

// Auto-send OTP if phone parameter exists in URL
useEffect(() => {
  const checkAndSendOTP = async () => {
  if (autoOtpSent) return;

  const params = new URLSearchParams(window.location.search);
  const phone = params.get('phone');

  if (!phone) return;

  try {
    // Clean phone number (remove non-digits for validation)
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      setOtpToastType('error');
      setOtpToastMessage('Invalid phone number format');
      setShowOtpToast(true);
      setTimeout(() => setShowOtpToast(false), 5000);
      return;
    }

    // NEW: Check if user is already logged in
    if (isAuthenticated) {
      const currentUserPhone = localStorage.getItem('user_phone');
      
      if (currentUserPhone === phone) {
       // Same number - already logged in, no need to send OTP
  setAutoOtpSent(true);
  
  // Remove phone parameter from URL
  const url = new URL(window.location.href);
  url.searchParams.delete('phone');
  window.history.replaceState({}, '', url.toString());
  return; // Simply return without showing any toast
      } else {
        // Different number - logout first
        await logout();
        setOtpToastType('info');
        setOtpToastMessage('Logging out from current session...');
        setShowOtpToast(true);
        setTimeout(() => setShowOtpToast(false), 2000);
      }
    }

    // Send OTP (either not authenticated or after logout)
    await sendOTP(cleanPhone);
    setAutoOtpSent(true);
    setAutoOtpPhone(phone);
    
    // OPEN THE LOGIN MODAL WITH PRE-FILLED PHONE AND OTP STEP
    setShowLoginModal(true);
    
    setOtpToastType('success');
    setOtpToastMessage(`OTP sent successfully to ${phone}`);
    setShowOtpToast(true);

    // Hide toast after 5 seconds
    setTimeout(() => setShowOtpToast(false), 5000);

    // Remove phone parameter from URL to prevent resending
    const url = new URL(window.location.href);
    url.searchParams.delete('phone');
    window.history.replaceState({}, '', url.toString());

  } catch (error) {
    setAutoOtpSent(true);
    setOtpToastType('error');
    setOtpToastMessage('Failed to send OTP. Please try again.');
    setShowOtpToast(true);
    setTimeout(() => setShowOtpToast(false), 5000);
  }
};

  checkAndSendOTP();
}, [autoOtpSent]);
  // Handle popstate for back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      setViewMode((view === 'env' || view === 'overview') ? view : 'section');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // Extract endpoints from collection
  const endpoints = useMemo(() => {
    if (!normalizedYaml?.sections) return [];
    
    const extractEndpoints = (obj: any, path: string = ''): EndpointData[] => {
      const results: EndpointData[] = [];
      
      if (obj.method && (obj.endpoint || obj.url)) {
        const id = `${path}-${obj.name || 'endpoint'}`.toLowerCase().replace(/\s+/g, '-');
        const url = resolveTemplate(obj.endpoint || obj.url, envData);
        
        results.push({
          id,
          title: obj.name || 'Unnamed Endpoint',
          method: obj.method,
          url,
          headers: obj.headers,
          parameters: obj.parameters,
          pathParameters: obj.pathParameters,
          body: obj.body,
        });
      }
      
      // Recursively search children
      if (obj.children) {
        Object.entries(obj.children).forEach(([key, child]: [string, any]) => {
          const childPath = path ? `${path}-${key}` : key;
          results.push(...extractEndpoints(child, childPath));
        });
      }
      
      // Search other object properties
      Object.entries(obj).forEach(([key, value]) => {
        if (key !== 'children' && value && typeof value === 'object') {
          const childPath = path ? `${path}-${key}` : key;
          results.push(...extractEndpoints(value, childPath));
        }
      });
      
      return results;
    };
    
    return extractEndpoints({ children: normalizedYaml.sections });
  }, [normalizedYaml, envData]);

  // Build navigation tree
  const navItems = useMemo(() => {
    const buildNav = (obj: any, path: string = '', parentName?: string): NavItem[] => {
      const items: NavItem[] = [];
      
      if (obj.method) {
        const id = `${path}-${obj.name || 'endpoint'}`.toLowerCase().replace(/\s+/g, '-');
        items.push({
          id,
          title: obj.name || 'Unnamed Endpoint',
          method: obj.method,
        });
      }
      
      if (obj.children) {
        Object.entries(obj.children).forEach(([key, child]: [string, any]) => {
          const childPath = path ? `${path}-${key}` : key;
          const childItems = buildNav(child, childPath, child.name || key);
          
          if (childItems.length > 0) {
            items.push({
              id: childPath,
              title: child.name || key,
              children: childItems,
            });
          }
        });
      }
      
      return items;
    };
    
    if (!normalizedYaml?.sections) return [];
    return buildNav({ children: normalizedYaml.sections });
  }, [normalizedYaml]);

  // Filter endpoints for main content based on search
  const searchFilteredEndpoints = useMemo(() => {
    if (viewMode === 'env') {
      if (!searchTerm) return normalizedYaml?.envs || [];
      
      return (normalizedYaml?.envs || []).filter(env => {
        const nameMatch = env.name.toLowerCase().includes(searchTerm.toLowerCase());
        const dataMatch = Object.keys(env.data || {}).some(key =>
          key.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return nameMatch || dataMatch;
      });
    } else {
      if (!searchTerm) return endpoints;
      
      return endpoints.filter(endpoint =>
        endpoint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }, [viewMode, searchTerm, normalizedYaml, endpoints, selectedEndpointId]);

  // Filter navigation items based on search
  const searchFilteredNavItems = useMemo(() => {
    if (!searchTerm) return navItems;
    
    const filterNavItems = (items: NavItem[]): NavItem[] => {
      return items.reduce((filtered: NavItem[], item) => {
        if (item.children) {
          const filteredChildren = filterNavItems(item.children);
          if (filteredChildren.length > 0) {
            filtered.push({
              ...item,
              children: filteredChildren
            });
          }
        } else {
          // This is an endpoint item
          if (item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.method?.toLowerCase().includes(searchTerm.toLowerCase())) {
            filtered.push(item);
          }
        }
        return filtered;
      }, []);
    };
    
    return filterNavItems(navItems);
  }, [navItems, searchTerm]);
  // Content to display - either single endpoint or filtered list
  const contentToDisplay = useMemo(() => {
    if (viewMode !== 'section') return searchFilteredEndpoints;
    
    if (selectedEndpointId) {
      const selectedEndpoint = endpoints.find(ep => ep.id === selectedEndpointId);
      return selectedEndpoint ? [selectedEndpoint] : [];
    }
    
    return searchFilteredEndpoints as EndpointData[];
  }, [viewMode, selectedEndpointId, endpoints, searchFilteredEndpoints]);

  // Clear selected endpoint when searching
  useEffect(() => {
    if (searchTerm && selectedEndpointId) {
      setSelectedEndpointId(null);
    }
  }, [searchTerm, selectedEndpointId]);
  // Intersection Observer for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -50% 0px' }
    );

    const sections = document.querySelectorAll('[id^="endpoint-"]');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [contentToDisplay]);

  // Handle sidebar endpoint click
  const handleEndpointClick = (endpointId: string) => {
    setSelectedEndpointId(endpointId);
    setViewMode('section');
    setSidebarOpen(false);
    // Scroll to top to show the selected endpoint
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Recursive function to render navigation items
  const renderNavItems = (items: NavItem[], level: number = 0): React.ReactNode => {
    return items.map((item) => {
      if (item.children) {
        const isExpanded = expandedSections.has(item.id);
        return (
          <div key={item.id}>
            <button
              onClick={() => toggleSection(item.id)}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-sm transition-colors
                ${level > 0 ? 'ml-4' : ''}
                hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300
              `}
            >
              <ChevronRight 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              />
              <span className="font-medium">{item.title}</span>
            </button>
            {isExpanded && (
              <div className="mt-1">
                {renderNavItems(item.children, level + 1)}
              </div>
            )}
          </div>
        );
      } else {
        // This is an endpoint item
        return (
          <button
            key={item.id}
            onClick={() => handleEndpointClick(item.id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg text-sm transition-colors
              ${level > 0 ? 'ml-6' : 'ml-2'}
              ${selectedEndpointId === item.id || activeSection === item.id
                ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60'
              }
            `}
          >
            {item.method && <MethodBadge method={item.method} className="text-xs" />}
            <span className="truncate">{item.title}</span>
          </button>
        );
      }
    });
  };

  // Set active environment
  const setActiveEnv = (name: string, data: Record<string, any>) => {
    const index = availableEnvs.findIndex(env => env === name);
    setEnvIndex(index);
    setSelectedEnv(name);
    localStorage.setItem('docsActiveEnv', name);
  };
  // Scroll listener for back to top
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!normalizedYaml) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Failed to parse documentation
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            The documentation format appears to be invalid.
          </p>
        </div>
      </div>
    );
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTryItOut = (endpoint: EndpointData) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      setSelectedTryEndpoint(endpoint);
      return;
    }
    setSelectedTryEndpoint(endpoint);
    setShowTryItOut(true);
  };

  const handleLoginSuccess = () => {
    login();
    setShowLoginModal(false);
    if (selectedTryEndpoint) {
      setShowTryItOut(true);
    }
  };

  useEffect(() => {
    if (isAuthenticated && showLoginModal) {
      setShowLoginModal(false);
    }
  }, [isAuthenticated, showLoginModal]);

  // Define available code languages for tabs
  const codeLanguages = [
    { key: 'curl', label: 'cURL', language: 'bash', icon: '💻' },
    { key: 'fetch', label: 'JavaScript', language: 'javascript', icon: '🟨' },
    { key: 'axios', label: 'JavaScript (Axios)', language: 'javascript', icon: '🟨' },
    { key: 'python', label: 'Python', language: 'python', icon: '🐍' },
    { key: 'csharp', label: 'C#', language: 'csharp', icon: '🟣' },
    { key: 'go', label: 'Go', language: 'go', icon: '🔵' },
    { key: 'java', label: 'Java', language: 'java', icon: '☕' },
    { key: 'php', label: 'PHP', language: 'php', icon: '🟪' },
    { key: 'ruby', label: 'Ruby', language: 'ruby', icon: '💎' },
    { key: 'swift', label: 'Swift', language: 'swift', icon: '🍎' },
    { key: 'typescript', label: 'TypeScript', language: 'typescript', icon: '🔷' },
  ];

  // Handle global copy
  const handleGlobalCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setGlobalCopied(true);
      setTimeout(() => setGlobalCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.code-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  if (isParsingYaml) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/50">
       <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-6 py-6">

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/50">
      {/* Header - replaced with IPWhitelist-style header for consistency */}
      
<div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
  <div className="max-w-7xl mx-auto px-6 py-6">
    <div className="grid grid-cols-3 items-center gap-8">
      {/* Left section - Home and Title */}
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
            {normalizedYaml.title || doc.name}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {normalizedYaml?.description || 'API documentation and code samples'}
          </p>
        </div>
      </div>

      {/* Center - Tab Navigation */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 backdrop-blur-sm">
          <button
            onClick={() => {
              setLocalDocTab('docs');
              setSidebarOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`
              relative px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${localDocTab === 'docs'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }
            `}
            aria-current={localDocTab === 'docs' ? 'page' : undefined}
          >
                        API Reference

          </button>

          <button
            onClick={() => setLocalDocTab('api')}
            className={`
              relative px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${localDocTab === 'api'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }
            `}
            aria-current={localDocTab === 'api' ? 'page' : undefined}
          >
            Docs
          </button>

          <button
            onClick={() => {
              console.log('Platform clicked');
              let url = (doc.platform || '').trim();

              if (!url) {
                setLocalDocTab('platform');
                return;
              }

              url = url.replace(/^["']|["']$/g, '').replace(/,$/, '').trim();

              if (!/^https?:\/\//i.test(url)) {
                url = `https://${url}`;
              }

              try {
                const href = encodeURI(url);
                window.open(href, '_blank', 'noopener,noreferrer');
              } catch (err) {
                console.error('Failed to open platform URL', url, err);
                setLocalDocTab('platform');
              }
            }}
            className={`
              relative px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${localDocTab === 'platform'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }
            `}
            aria-current={localDocTab === 'platform' ? 'page' : undefined}
          >
            Platform
          </button>
        </div>
      </div>

      {/* Right section - Environment Selector and Navbar */}
      <div className="flex items-center gap-4 justify-end">
        {/* Environment Selector */}
        {availableEnvs.length > 0 && (
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm text-zinc-900 dark:text-zinc-100"
          >
            {availableEnvs.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
        )}

        {/* Navbar Component */}
        <Navbar />
      </div>
    </div>
  </div>
</div>
  







      <div className="flex">
        
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-[73px] left-0 z-40 w-80 h-[calc(100vh-73px)] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-r border-zinc-200/60 dark:border-zinc-800/60 overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Navigation</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-2">
              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  id="search-input"
                  type="text"
                  placeholder={viewMode === 'env' ? "Search environments... (⌘K)" : "Search endpoints... (⌘K)"}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>

              {viewMode === 'section' && (
                <>
                  <button
                    onClick={() => {
                      setViewMode('overview');
                      setSidebarOpen(false);
                    }}
                    className="w-full text-left rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    Overview
                  </button>
                  
                  {renderNavItems(searchFilteredNavItems)}
                  
                  {normalizedYaml?.envs && normalizedYaml.envs.length > 0 && (
                    <>
                      <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 my-4" />
                      <button
                        onClick={() => {
                          setViewMode('env');
                          setSidebarOpen(false);
                        }}
                        aria-current={viewMode === 'env' ? 'page' : undefined}
                        className={`
                          w-full text-left rounded-lg px-3 py-2 text-sm transition-colors
                          ${viewMode === 'env'
                            ? 'bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-900 dark:text-zinc-100'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                          }
                        `}
                      >
                        {normalizedYaml.envRootName}
                      </button>
                    </>
                  )}
                </>
              )}
              
              {viewMode === 'env' && (
                <>
                  <button
                    onClick={() => {
                      setViewMode('section');
                      setSidebarOpen(false);
                    }}
                    className="w-full text-left rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    ← Back to Endpoints
                  </button>
                  
                  <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 my-4" />
                  
                  {(searchFilteredEndpoints as any[]).map((env) => (
                    <a
                      key={env.name}
                      href={`#env-${slugify(env.name)}`}
                      onClick={() => setSidebarOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      {env.name}
                    </a>
                  ))}
                </>
              )}
              
              {viewMode === 'overview' && (
                <button
                  onClick={() => {
                    setViewMode('section');
                    setSidebarOpen(false);
                  }}
                  className="w-full text-left rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  ← Back to Endpoints
                </button>
              )}
            </nav>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
  <div className='flex flex-col max-w-6xl mx-auto'>



        <main className="flex-1 lg:ml-0">
          <div className="max-w-5xl mx-auto px-6 py-12">
            {viewMode === 'env' ? (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                    Environments
                  </h1>
                  <h2 className="text-xl text-zinc-600 dark:text-zinc-400">
                    {normalizedYaml?.envRootName}
                  </h2>
                </div>
                
                {(searchFilteredEndpoints as any[]).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-zinc-400 dark:text-zinc-600 text-lg">
                      {searchTerm ? 'No environments found matching your search.' : 'No environments available.'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(searchFilteredEndpoints as any[]).map((env) => (
                      <EnvironmentCard
                        key={env.name}
                        id={`env-${slugify(env.name)}`}
                        name={env.name}
                        data={env.data}
                        isActive={env.name === selectedEnv}
                        onSetActive={() => setActiveEnv(env.name, env.data)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : viewMode === 'overview' ? (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                    API Overview
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Complete documentation for {normalizedYaml?.title}
                  </p>
                </div>
                
                <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Quick Stats
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                        {endpoints.length}
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        Endpoints
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {endpoints.filter(e => e.method === 'GET').length}
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        GET
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                        {endpoints.filter(e => e.method === 'POST').length}
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        POST
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {normalizedYaml?.envs?.length || 0}
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        Environments
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (contentToDisplay as EndpointData[]).length === 0 ? (
              <div className="text-center py-12"> 
                <div className="text-zinc-400 dark:text-zinc-600 text-lg">
                  {searchTerm ? 'No endpoints found matching your search.' : 'No endpoints available.'}
                </div>
              </div>
            ) : (
              <div className="space-y-16">
                {(contentToDisplay as EndpointData[]).map((endpoint) => (
                  <section key={endpoint.id} id={endpoint.id}>
                    <EndpointCard
                      id={endpoint.id}
                      title={endpoint.title}
                      method={endpoint.method}
                      url={endpoint.url}
                      onTryItOut={() => handleTryItOut(endpoint)}
                    />

                    <div className="space-y-8">
                      {/* Headers */}
                      {endpoint.headers && Object.keys(endpoint.headers).length > 0 && (
                        <div>
                          <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Headers</h4>
                          <KVTable
                            data={Object.entries(endpoint.headers).map(([key, value]: [string, any]) => ({
                              key: resolveTemplate(value.name || key, envData),
                              value: resolveTemplate(value.value || '', envData),
                              description: value.description,
                              required: value.required,
                            }))}
                          />
                        </div>
                      )}

                      {/* Query Parameters */}
                      {endpoint.parameters && Object.keys(endpoint.parameters).length > 0 && (
                        <div>
                          <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Query Parameters</h4>
                          <KVTable
                            data={Object.entries(endpoint.parameters).map(([key, value]: [string, any]) => ({
                              key: resolveTemplate(value.name || key, envData),
                              value: resolveTemplate(value.value || '', envData),
                              description: value.description,
                              required: value.required,
                            }))}
                          />
                        </div>
                      )}

                      {/* Path Parameters */}
                      {endpoint.pathParameters && Object.keys(endpoint.pathParameters).length > 0 && (
                        <div>
                          <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Path Parameters</h4>
                          <KVTable
                            data={Object.entries(endpoint.pathParameters).map(([key, value]: [string, any]) => ({
                              key: resolveTemplate(value.name || key, envData),
                              value: resolveTemplate(value.value || '', envData),
                              description: value.description,
                              required: value.required,
                            }))}
                          />
                        </div>
                      )}

                      {/* Request Body */}
                      {endpoint.body?.text && (
                        <div>
                          <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Request Body</h4>
                          <CodeBlock
                            code={resolveTemplate(endpoint.body.text, envData)}
                            language="json"
                          />
                        </div>
                      )}

                      {/* Code Samples */}
                      <div>
                        <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Code Examples</h4>
                        
                        {/* Dropdown and Copy Controls */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="relative code-dropdown">
                            <button
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                            >
                              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {codeLanguages.find(lang => lang.key === selectedCodeLanguage)?.label || 'Select Language'}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isDropdownOpen && (
                              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 py-1">
                                {codeLanguages.map((lang) => (
                                  <button
                                    key={lang.key}
                                    onClick={() => {
                                      setSelectedCodeLanguage(lang.key);
                                      setIsDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                                  >
                                    <span className="text-sm">{lang.icon}</span>
                                    <span className="text-sm text-zinc-900 dark:text-zinc-100">{lang.label}</span>
                                    {selectedCodeLanguage === lang.key && (
                                      <Check className="w-4 h-4 text-green-500 ml-auto" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Global Copy Button */}
                          <button
                            onClick={() => {
                              const headers = endpoint.headers ? 
                                Object.fromEntries(
                                  Object.entries(endpoint.headers).map(([key, value]: [string, any]) => [
                                    resolveTemplate(value.name || key, envData),
                                    resolveTemplate(value.value || '', envData)
                                  ])
                                ) : undefined;

                              const queryParams = endpoint.parameters ?
                                Object.fromEntries(
                                  Object.entries(endpoint.parameters).map(([key, value]: [string, any]) => [
                                    resolveTemplate(value.name || key, envData),
                                    resolveTemplate(value.value || '', envData)
                                  ])
                                ) : undefined;

                              const samples = generateCodeSamples({
                                method: endpoint.method,
                                url: endpoint.url,
                                headers,
                                body: endpoint.body?.text ? resolveTemplate(endpoint.body.text, envData) : undefined,
                                queryParams,
                              });

                              const codeToDisplay = samples[selectedCodeLanguage as keyof typeof samples];
                              handleGlobalCopy(codeToDisplay);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                            aria-label="Copy code to clipboard"
                          >
                            {globalCopied ? (
                              <>
                                <Check className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-green-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Code Block Display */}
                        <div>
                          {(() => {
                            const headers = endpoint.headers ? 
                              Object.fromEntries(
                                Object.entries(endpoint.headers).map(([key, value]: [string, any]) => [
                                  resolveTemplate(value.name || key, envData),
                                  resolveTemplate(value.value || '', envData)
                                ])
                              ) : undefined;

                            const queryParams = endpoint.parameters ?
                              Object.fromEntries(
                                Object.entries(endpoint.parameters).map(([key, value]: [string, any]) => [
                                  resolveTemplate(value.name || key, envData),
                                  resolveTemplate(value.value || '', envData)
                                ])
                              ) : undefined;

                            const samples = generateCodeSamples({
                              method: endpoint.method,
                              url: endpoint.url,
                              headers,
                              body: endpoint.body?.text ? resolveTemplate(endpoint.body.text, envData) : undefined,
                              queryParams,
                            });

                            const selectedLang = codeLanguages.find(lang => lang.key === selectedCodeLanguage);
                            const codeToDisplay = samples[selectedCodeLanguage as keyof typeof samples];
                            const languageForHighlight = selectedLang?.language || 'text';

                            return (
                              <CodeBlock 
                                code={codeToDisplay} 
                                language={languageForHighlight}
                              />
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Back to top link */}
                    <div className="pt-8 border-t border-zinc-200/60 dark:border-zinc-800/60">
                      <button
                        onClick={scrollToTop}
                        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      >
                        ↑ Back to top
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </main>

        </div>
      </div>

      

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 z-50"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setSelectedTryEndpoint(null);
        }}
        onLoginSuccess={handleLoginSuccess}
        initialPhone={autoOtpPhone || undefined}  // ADD THIS LINE
  initialStep={autoOtpSent ? 'otp' : 'phone'} 
      />

      {/* Try It Out Modal */}
      {selectedTryEndpoint && (
        <TryItOutModal
        onNavigateToAPIKeys={onNavigateToAPIKeys}
          isOpen={showTryItOut}
          onClose={() => {
            setShowTryItOut(false);
            setSelectedTryEndpoint(null);
          }}
          endpoint={{
            method: selectedTryEndpoint.method,
            url: selectedTryEndpoint.url,
            headers: selectedTryEndpoint.headers
              ? Object.fromEntries(
                  Object.entries(selectedTryEndpoint.headers).map(([key, value]: [string, any]) => [
                    resolveTemplate(value.name || key, envData),
                    resolveTemplate(value.value || '', envData),
                  ])
                )
              : undefined,
            body: selectedTryEndpoint.body?.text
              ? resolveTemplate(selectedTryEndpoint.body.text, envData)
              : undefined,
            parameters: selectedTryEndpoint.parameters
              ? Object.fromEntries(
                  Object.entries(selectedTryEndpoint.parameters).map(([key, value]: [string, any]) => [
                    resolveTemplate(value.name || key, envData),
                    resolveTemplate(value.value || '', envData),
                  ])
                )
              : undefined,
            pathParameters: selectedTryEndpoint.pathParameters
              ? Object.fromEntries(
                  Object.entries(selectedTryEndpoint.pathParameters).map(([key, value]: [string, any]) => [
                    resolveTemplate(value.name || key, envData),
                    resolveTemplate(value.value || '', envData),
                  ])
                )
              : undefined,
          }}
        />
      )}
      {/* Auto OTP Toast Notification */}
     {showOtpToast && (
  <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[10000] animate-in slide-in-from-bottom-5 fade-in duration-300">
    <div className={`
      flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border
      ${otpToastType === 'success'
        ? 'bg-emerald-50/95 dark:bg-emerald-900/95 border-emerald-200 dark:border-emerald-700'
        : otpToastType === 'error'
        ? 'bg-red-50/95 dark:bg-red-900/95 border-red-200 dark:border-red-700'
        : 'bg-blue-50/95 dark:bg-blue-900/95 border-blue-200 dark:border-blue-700'
      }
    `}>
      {otpToastType === 'success' ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      ) : otpToastType === 'error' ? (
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      ) : (
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      )}
      <div>
        <p className={`font-semibold text-sm ${
          otpToastType === 'success'
            ? 'text-emerald-900 dark:text-emerald-100'
            : otpToastType === 'error'
            ? 'text-red-900 dark:text-red-100'
            : 'text-blue-900 dark:text-blue-100'
        }`}>
          {otpToastType === 'success' ? 'OTP Sent!' : otpToastType === 'error' ? 'Error' : 'Info'}
        </p>
        <p className={`text-sm ${
          otpToastType === 'success'
            ? 'text-emerald-700 dark:text-emerald-300'
            : otpToastType === 'error'
            ? 'text-red-700 dark:text-red-300'
            : 'text-blue-700 dark:text-blue-300'
        }`}>
          {otpToastMessage}
        </p>
      </div>
      <button
        onClick={() => setShowOtpToast(false)}
        className={`p-1 rounded-lg transition-colors ${
          otpToastType === 'success'
            ? 'hover:bg-emerald-100 dark:hover:bg-emerald-800'
            : otpToastType === 'error'
            ? 'hover:bg-red-100 dark:hover:bg-red-800'
            : 'hover:bg-blue-100 dark:hover:bg-blue-800'
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
