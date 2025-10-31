import { useState, useEffect } from 'react';

export function useEnvironment(availableEnvironments: string[]) {
  const [selectedEnv, setSelectedEnv] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedEnvironment');
      if (stored && availableEnvironments.includes(stored)) {
        return stored;
      }
    }
    return availableEnvironments[0] || '';
  });

  useEffect(() => {
    if (selectedEnv) {
      localStorage.setItem('selectedEnvironment', selectedEnv);
    }
  }, [selectedEnv]);

  return [selectedEnv, setSelectedEnv] as const;
}