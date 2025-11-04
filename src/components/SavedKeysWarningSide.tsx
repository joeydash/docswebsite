// components/SavedKeysWarningSide.tsx
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

type Position = 'left' | 'right';
type Vertical = 'center' | 'bottom';

export function SavedKeysWarningSide({
  position = 'right',
  vertical = 'center' // 'center' or 'bottom'
}: {
  position?: Position;
  vertical?: Vertical;
}) {
  const [open, setOpen] = useState(true);
  const [count, setCount] = useState(0);

  const readCount = () => {
    try {
      const raw = localStorage.getItem('savedAPIKeys');
      const arr = raw ? JSON.parse(raw) : [];
      setCount(Array.isArray(arr) ? arr.length : 0);
    } catch {
      setCount(0);
    }
  };

  useEffect(() => {
    readCount();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'savedAPIKeys') readCount();
    };
    const onCustom = () => readCount();

    window.addEventListener('storage', onStorage);
    window.addEventListener('savedAPIKeys-updated', onCustom as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('savedAPIKeys-updated', onCustom as EventListener);
    };
  }, []);

  if (!open || count === 0) return null;

  // horizontal placement
  const sideClass = position === 'left' ? 'left-4 lg:left-6' : 'right-4 lg:right-6';

  // vertical placement: center (middle) or bottom (lower on the page)
  const verticalClass = vertical === 'center'
    ? 'top-1/2 -translate-y-1/2'      // original: vertically centered
    : 'bottom-8 translate-y-0';      // bottom with a small offset

  // small-screen handling: hide on very small widths to avoid blocking content
  // (you can remove 'hidden sm:block' if you want it visible on phones)
  return (
    <div
      className={`
        fixed ${sideClass} ${verticalClass} z-[60] w-[350px] max-w-[90vw]
        rounded-2xl border border-yellow-300/70 bg-yellow-50/95 dark:bg-yellow-950/40
        dark:border-yellow-800/60 shadow-xl backdrop-blur p-4
        hidden sm:block
      `}
      role="region"
      aria-label="Saved API keys warning"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5 text-yellow-700 dark:text-yellow-400 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-yellow-900 dark:text-yellow-100">Warning</h4>
          <p className="text-sm text-yellow-800 dark:text-yellow-200/90 mt-1">
             API credential{count > 1 ? 's' : ''} stored in this browser.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm(`Delete all ${count} saved credential${count > 1 ? 's' : ''}?`)) {
                  localStorage.removeItem('savedAPIKeys');
                  localStorage.removeItem('apiKey')
                  window.dispatchEvent(new Event('savedAPIKeys-updated'));
                  readCount();
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-100 hover:bg-yellow-200
              dark:bg-yellow-900/40 dark:hover:bg-yellow-900 border border-yellow-300/70 dark:border-yellow-800/60
              text-yellow-900 dark:text-yellow-100 text-xs font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete 
            </button>

            <button
              onClick={() => setOpen(false)}
              className="ml-auto text-xs text-yellow-900/80 dark:text-yellow-200/80 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={() => setOpen(false)}
          className="p-1 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
