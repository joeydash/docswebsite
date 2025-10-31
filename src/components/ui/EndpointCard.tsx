import React from 'react';
import { MethodBadge } from './MethodBadge';
import { Copy, Check, Play } from 'lucide-react';
import { useState } from 'react';

interface EndpointCardProps {
  title: string;
  method: string;
  url: string;
  id: string;
  onTryItOut?: () => void;
}

export function EndpointCard({ title, method, url, id, onTryItOut }: EndpointCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div id={id} className="scroll-mt-24 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-8 last:border-b-0">
      <div className="flex items-center gap-4 mb-6">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <MethodBadge method={method} />
      </div>

      <div className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur mb-6">
        <code className="flex-1 text-sm font-mono text-zinc-700 dark:text-zinc-300 break-all">
          {url}
        </code>
        <div className="flex items-center gap-2">
          {onTryItOut && (
            <button
              onClick={onTryItOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors font-medium"
            >
              <Play className="w-3 h-3" />
              Try It Out
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 rounded-lg transition-colors"
          >
            {copied ? (
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
        </div>
      </div>
    </div>
  );
}