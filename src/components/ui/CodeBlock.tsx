import React, { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language = 'text', className = '' }: CodeBlockProps) {
  return (
    <div className={`relative rounded-2xl bg-zinc-950 dark:bg-zinc-900/90 border border-zinc-800/60 ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <span className="text-sm text-zinc-400 font-medium" role="status" aria-live="polite">
          {language}
        </span>
      </div>
      <div className="p-4 overflow-x-auto" role="region" aria-label={`${language} code example`}>
        <pre className="text-sm text-zinc-100 font-mono leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}