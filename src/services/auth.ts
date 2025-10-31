const GRAPHQL_ENDPOINT = 'https://db.vocallabs.ai/v1/graphql';

export interface CountryCode {
  country_code: string;
  phone_code: string;
  country_name: string;
}

export interface CountryCodesResponse {
  vocallabs_exchange_rate: CountryCode[];
}

export interface RegisterResponse {
  registerWithoutPasswordV2: {
    request_id: string;
    status: string;
  };
}

export interface VerifyOTPResponse {
  verifyOTPV2: {
    auth_token: string;
    refresh_token: string;
    id: string;
    status: string;
    deviceInfoSaved: boolean;
  };
}

const GET_COUNTRY_CODES = `
  query GetExchangeRate {
    vocallabs_exchange_rate {
      country_code
      phone_code
      country_name
    }
  }
`;

const REGISTER_MUTATION = `
  mutation Register($phone: String!) {
    registerWithoutPasswordV2(credentials: {phone: $phone}) {
      request_id
      status
    }
  }
`;

const VERIFY_OTP_MUTATION = `
  mutation VerifyOTP($phone1: String!, $otp1: String!) {
    verifyOTPV2(request: {otp: $otp1, phone: $phone1}) {
      auth_token
      refresh_token
      id
      status
      deviceInfoSaved
    }
  }
`;

export async function getCountryCodes(): Promise<CountryCode[]> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: GET_COUNTRY_CODES,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch country codes');
  }

  const data: { data: CountryCodesResponse } = await response.json();
  return data.data.vocallabs_exchange_rate;
}

export async function sendOTP(phone: string): Promise<{ request_id: string; status: string }> {
  const phoneNumber =  `+${phone}`
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: REGISTER_MUTATION,
      variables: {phone: phoneNumber} ,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send OTP');
  }

  const data: { data: RegisterResponse } = await response.json();
  return data.data.registerWithoutPasswordV2;
}

export async function verifyOTP(phone: string, otp: string): Promise<VerifyOTPResponse['verifyOTPV2']> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: VERIFY_OTP_MUTATION,
      variables: { phone1: phone, otp1: otp },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to verify OTP');
  }

  const data: { data: VerifyOTPResponse } = await response.json();
  return data.data.verifyOTPV2;
}

export function saveAuthData(data: VerifyOTPResponse['verifyOTPV2']) {
  localStorage.setItem('auth_token', data.auth_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('user_id', data.id);
  localStorage.setItem('token_timestamp', Date.now().toString());
}

export function getAuthData() {
  return {
    client_id: localStorage.getItem('user_id'),
    authToken: localStorage.getItem('auth_token'),
    refreshToken: localStorage.getItem('refresh_token'),
  };
}

export function clearAuthData() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('token_timestamp');
}

export function isAuthenticated(): boolean {
  const authToken = localStorage.getItem('auth_token');
  return !!authToken;
}
