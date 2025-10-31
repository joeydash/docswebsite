import React from 'react';

interface MethodBadgeProps {
  method: string;
  className?: string;
}

const methodColors = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  POST: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PATCH: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  DELETE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  HEAD: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  OPTIONS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export function MethodBadge({ method, className = '' }: MethodBadgeProps) {
  const upperMethod = method.toUpperCase() as keyof typeof methodColors;
  const colorClass = methodColors[upperMethod] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {upperMethod}
    </span>
  );
}