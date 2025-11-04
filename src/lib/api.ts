import { DocumentationResponse } from '../types';

const HASURA_ENDPOINT = 'https://db.subspace.money/v1/graphql';

export async function fetchAllDocumentation(): Promise<DocumentationResponse> {
  const currentDomain =
    typeof window !== 'undefined' ? window.location.hostname : '';

  // 🔥 GraphQL query with dynamic _ilike filter
  const query = `
    query MyQuery($pattern: String!) {
      karlo_documentation(
        where: { allowed_urls: { _ilike: $pattern } }
      ) {
        path
        id
        name
        image_url
        created_at
        updated_at
        allowed_urls
        platform
      }
    }
  `;

  // Match even if domain is surrounded by spaces or commas
  const pattern = `%${currentDomain}%`;

  try {
    const response = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'// optional
      },
      body: JSON.stringify({
        query,
        variables: { pattern },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching documentation:', error);
    throw error;
  }
}


export async function fetchDocumentation(path: string): Promise<DocumentationResponse> {
  const query = `
    query MyQuery($path: String = "") {
      karlo_documentation(where: {path: {_eq: $path}}) {
        created_at
        docs
        path
        name
        image_url
        updated_at
        platform
      }
    }
  `;

  try {
    const response = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          path
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(data.errors[0].message);
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching documentation:', error);
    throw error;
  }
}