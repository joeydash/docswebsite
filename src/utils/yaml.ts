import { parse } from 'yaml';

export interface ParsedEnvironment {
  name: string;
  data: Record<string, any>;
}

export interface NormalizedYaml {
  title: string;
  sections: any[];
  envs: ParsedEnvironment[];
  envRootName: string;
}

export function normalizeInsomniaYaml(yamlText: string): NormalizedYaml {
  try {
    const parsed = parse(yamlText);
    
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid YAML structure');
    }
    
    const title = typeof parsed.name === 'string' ? parsed.name : 'API Docs';
    const sections = Array.isArray(parsed.collection) ? parsed.collection : [];
    
    // SORT SECTIONS BY SORTKEY (most negative first)
    sections.sort((a, b) => {
      const sortKeyA = a?.meta?.sortKey || 0;
      const sortKeyB = b?.meta?.sortKey || 0;
      return sortKeyA - sortKeyB; // Ascending order
    });
    
    const envRootName = typeof parsed.environments?.name === 'string' 
      ? parsed.environments.name 
      : 'Base Environment';
    const envs = Array.isArray(parsed.environments?.subEnvironments) 
      ? parsed.environments.subEnvironments 
      : [];
    
    return { title, sections, envs, envRootName };
  } catch (error) {
    console.warn('YAML parsing failed:', error);
    return {
      title: 'API Docs',
      sections: [],
      envs: [],
      envRootName: 'Base Environment'
    };
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}