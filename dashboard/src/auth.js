const TOKEN_KEY = 'videoclipper_auth_token';

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

export const setAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const PUBLIC_API_PATHS = [
  '/api/auth/google',
  '/api/auth/signup',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/translate/languages',
];

const shouldAttachAuthHeader = (url) => {
  if (!url) return false;
  if (!url.includes('/api/')) return false;
  return !PUBLIC_API_PATHS.some((path) => url.includes(path));
};

let fetchInterceptorInstalled = false;

export const installAuthFetchInterceptor = () => {
  if (fetchInterceptorInstalled || typeof window === 'undefined') return;
  fetchInterceptorInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!shouldAttachAuthHeader(url)) {
      return nativeFetch(input, init);
    }

    const token = getAuthToken();
    if (!token) {
      return nativeFetch(input, init);
    }

    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (input instanceof Request) {
      const requestWithAuth = new Request(input, { ...init, headers });
      return nativeFetch(requestWithAuth);
    }

    return nativeFetch(input, { ...init, headers });
  };
};
