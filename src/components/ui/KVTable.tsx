import React from 'react';

interface KVTableProps {
  data: Array<{
    key: string;
    value: string;
    description?: string;
    required?: boolean;
  }>;
  title?: string;
}

export function KVTable({ data, title }: KVTableProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h4>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200/60 dark:border-zinc-800/60">
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Key
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Value
              </th>
              {data.some(item => item.description) && (
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Description
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-zinc-900 dark:text-zinc-100">
                      {item.key}
                    </code>
                    {item.required && (
                      <span className="text-xs text-rose-500 font-medium">*</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="text-sm font-mono text-zinc-600 dark:text-zinc-400 break-all">
                    {item.value}
                  </code>
                </td>
                {data.some(item => item.description) && (
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {item.description || '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}