import React from 'react';

export function SkeletonBox({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur overflow-hidden p-6">
      <div className="flex items-center gap-3 mb-4">
        <SkeletonBox className="w-10 h-10 rounded-lg" />
        <SkeletonBox className="h-6 w-32" />
      </div>
      <SkeletonBox className="h-16 w-full rounded-xl" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur overflow-hidden">
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <SkeletonBox className="h-5 w-1/3" />
            <SkeletonBox className="h-5 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonEndpoint() {
  return (
    <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur overflow-hidden">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <SkeletonBox className="h-6 w-16 rounded-lg" />
          <SkeletonBox className="h-6 flex-1" />
        </div>
        <SkeletonBox className="h-4 w-3/4" />
        <SkeletonBox className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <SkeletonBox className="h-9 w-24 rounded-lg" />
          <SkeletonBox className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}
