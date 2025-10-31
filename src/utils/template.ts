/**
 * Resolves template variables in strings using environment data
 */
export function resolveTemplate(str: string, envData: Record<string, any>): string {
  if (typeof str !== 'string') return str;
  
  return str.replace(/\{\{\s*_\.([^}]+)\s*\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    return envData[trimmedKey] !== undefined ? String(envData[trimmedKey]) : match;
  });
}

/**
 * Extracts environment data from the environments object
 */
export function extractEnvData(environments: any): Record<string, any> {
  if (!environments || typeof environments !== 'object') {
    return {};
  }

  const envData: Record<string, any> = {};
  
  const extractData = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    if (obj.data && typeof obj.data === 'object') {
      Object.assign(envData, obj.data);
    }
    
    Object.values(obj).forEach(val => {
      if (val && typeof val === 'object') {
        extractData(val);
      }
    });
  };
  
  extractData(environments);
  return envData;
}

/**
 * Gets available environment names from the environments object
 */
export function getEnvironmentNames(environments: any): string[] {
  if (!environments || typeof environments !== 'object') {
    return [];
  }

  const names: string[] = [];
  
  const extractNames = (obj: any, path: string = '') => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        const currentPath = path ? `${path}.${key}` : key;
        if (value.name) {
          names.push(value.name);
        } else if (key !== 'data') {
          names.push(currentPath);
        }
        extractNames(value, currentPath);
      }
    });
  };
  
  extractNames(environments);
  return [...new Set(names)];
}