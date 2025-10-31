const GRAPHQL_ENDPOINT = 'https://db.subspace.money/v1/graphql';

export const GET_API_TOKEN_QUERY = `
  query GetAPIToken($user_id: uuid!) {
    whatsub_b2b_client(where: {user_id: {_eq: $user_id}}) {
      id
    }
  }
`;

export const GENERATE_API_TOKEN_MUTATION = `
  mutation GenerateAPIToken($user_id: uuid!) {
    newB2BClient(request: {user_id: $user_id}) {
      affected_rows
      clientId
      clientSecret
    }
  }
`;

export const GET_WHITELISTED_IPS_QUERY = `
  query GetWhitelistedIPs($user_id: uuid!) {
    whatsub_b2b_client(where: {user_id: {_eq: $user_id}}) {
      ips
      created_at
      updated_at
    }
  }
`;

export const UPDATE_WHITELISTED_IPS_MUTATION = `
  mutation UpdateWhitelistedIPs($user_id: uuid!, $ips: [String!]!) {
    update_whatsub_b2b_client(
      where: { user_id: { _eq: $user_id } },
      _set: { ips: $ips }
    ) {
      affected_rows
    }
}
`;

export const GET_WEBHOOK_CONFIG_QUERY = `
  query GetWebhookConfig($user_id: uuid!) {
    whatsub_b2b_client(where: {user_id: {_eq: $user_id}}) {
      webhook
      webhook_active
    }
  }
`;

export const UPDATE_WEBHOOK_CONFIG_MUTATION = `
  mutation UpdateWebhookConfig($user_id: uuid!, $webhook: String!, $webhook_active: Boolean!) {
    update_whatsub_b2b_client(
      where: { user_id: { _eq: $user_id } },
      _set: { webhook: $webhook, webhook_active: $webhook_active }
    ) {
      affected_rows
    }
  }
`;

interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

export async function executeGraphQLQuery<T>(
  query: string,
  variables: Record<string, any>,
  authToken: string
): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}
