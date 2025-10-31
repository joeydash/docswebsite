import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, Play } from 'lucide-react';
import { slugify } from '../../utils/yaml';

interface EnvironmentCardProps {
  name: string;
  data: Record<string, any>;
  isActive: boolean;
  onSetActive: () => void;
  id: string;
}

export function EnvironmentCard({ name, data, isActive, onSetActive, id }: EnvironmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const dataEntries = Object.entries(data || {});

  return (
    <div 
      id={id}
      className="scroll-mt-24 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur shadow-sm"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              )}
            </button>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {name}
            </h3>
            {isActive && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Active
              </span>
            )}
          </div>
          
          <button
            onClick={onSetActive}
            disabled={isActive}
            className={`
              inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${isActive 
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                : 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 hover:bg-sky-200 dark:hover:bg-sky-900/50'
              }
            `}
          >
            <Play className="w-3 h-3" />
            {isActive ? 'Active' : 'Use as Active'}
          </button>
        </div>

        {dataEntries.length > 0 && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            {dataEntries.length} variable{dataEntries.length !== 1 ? 's' : ''}
          </div>
        )}

        {isExpanded && dataEntries.length > 0 && (
          <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200/60 dark:border-zinc-800/60">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Variable
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {dataEntries.map(([key, value]) => (
                    <tr key={key} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3">
                        <code className="text-sm font-mono text-zinc-900 dark:text-zinc-100">
                          {key}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-sm font-mono text-zinc-600 dark:text-zinc-400 break-all">
                          {String(value)}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleCopy(key, String(value))}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 rounded-lg transition-colors"
                        >
                          {copiedKey === key ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {dataEntries.length === 0 && isExpanded && (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            No variables defined in this environment
          </div>
        )}
      </div>
    </div>
  );
}