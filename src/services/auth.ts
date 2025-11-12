const GRAPHQL_ENDPOINT = 'https://db.vocallabs.ai/v1/graphql';
const AUTH_ENDPOINT = "https://db.vocallabs.ai/v1/graphql"
const RECAPTCHA_SITE_KEY = "6LeqQQAsAAAAAImTxeR-8ZzFxbMzkrXF3vUVS8vZ";

export interface CountryCode {
  country_code: string;
  phone_code: string;
  country_name: string;
}

export interface CountryCodesResponse {
  vocallabs_exchange_rate: CountryCode[];
}

export interface RegisterResponse {
  registerWithoutPasswordV3: {
    request_id: string;
    status: string;
  };
}

export interface VerifyOTPResponse {
  verifyOTPV3: {
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
  mutation RegisterV3($phone: String!, $recaptcha_token: String!) {
    registerWithoutPasswordV3(credentials: {phone: $phone, recaptcha_token: $recaptcha_token}) {
      request_id
      status
    }
  }
`;

const VERIFY_OTP_MUTATION = `
  mutation VerifyOTPV3($phone1: String!, $otp1: String!) {
    verifyOTPV3(request: {otp: $otp1, phone: $phone1}) {
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

export async function sendOTP(phone: string, recaptchaToken: string): Promise<{ request_id: string; status: string }> {
  // Ensure phone starts with + and remove any whitespace
  const cleanedPhone = phone.trim();
  const phoneNumber = cleanedPhone.startsWith('+') ? cleanedPhone : `+${cleanedPhone}`;
  
  const response = await fetch(AUTH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: REGISTER_MUTATION,
      variables: { phone: phoneNumber, recaptcha_token: recaptchaToken },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send OTP');
  }

  const data: { data: RegisterResponse } = await response.json();
  return data.data.registerWithoutPasswordV3;
}

export async function verifyOTP(phone: string, otp: string): Promise<VerifyOTPResponse['verifyOTPV3']> {
  // Ensure phone starts with + and remove any whitespace
  const cleanedPhone = phone.trim();
  const phoneNumber = cleanedPhone.startsWith('+') ? cleanedPhone : `+${cleanedPhone}`;
  
  const response = await fetch(AUTH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: VERIFY_OTP_MUTATION,
      variables: { phone1: phoneNumber, otp1: otp },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to verify OTP');
  }

  const data: { data: VerifyOTPResponse } = await response.json();
  return data.data.verifyOTPV3;
}

export function getRecaptchaSiteKey(): string {
  return RECAPTCHA_SITE_KEY;
}

export function saveAuthData(data: VerifyOTPResponse['verifyOTPV3'], phone?: string) {
  localStorage.setItem('auth_token', data.auth_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('user_id', data.id);
  localStorage.setItem('token_timestamp', Date.now().toString());
  
  // Store phone number if provided
  if (phone) {
    localStorage.setItem('user_phone', phone);
  }
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
  localStorage.removeItem('user_phone');  // ADD THIS LINE
  localStorage.removeItem('savedAPIKeys');
  localStorage.removeItem('organizationDetails')
  localStorage.removeItem('apiKey')
   window.dispatchEvent(new Event('savedAPIKeys-updated'));
}

export function isAuthenticated(): boolean {
  const authToken = localStorage.getItem('auth_token');
  return !!authToken;
}
