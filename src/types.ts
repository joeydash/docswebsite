export interface Documentation {
  path: string;
  updated_at: string;
  id: string;
  docs: string;
  created_at: string;
  image_url?: string;
  name: string;
   platform?: string; 
}

export interface DocumentationResponse {
  karlo_documentation: Documentation[];
}