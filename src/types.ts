export interface Documentation {
  path: string;
  updated_at: string;
  id: string;
  docs: string;
  created_at: string;
  image_url?: string;
  name: string;
}

export interface DocumentationResponse {
  vocallabs_documentation: Documentation[];
}