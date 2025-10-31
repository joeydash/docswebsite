import { DocumentationResponse } from '../types';

const HASURA_ENDPOINT = 'https://db.vocallabs.ai/v1/graphql';

export async function fetchAllDocumentation(): Promise<DocumentationResponse> {
  const query = `
    query MyQuery {
      vocallabs_documentation {
        path
        id
        name
        image_url
        created_at
        updated_at
      }
    }
  `;

  try {
    const response = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
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
      vocallabs_documentation(where: {path: {_eq: $path}}) {
        created_at
        docs
        path
        name
        image_url
        updated_at
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