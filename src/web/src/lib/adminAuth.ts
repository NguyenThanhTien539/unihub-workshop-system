import { apiFetch, apiUrl } from "./api";

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminAccessToken');
}

export function setTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('adminAccessToken', accessToken);
    if (refreshToken) localStorage.setItem('adminRefreshToken', refreshToken);
    // diagnostic log to verify storage happened in the browser
    // eslint-disable-next-line no-console
    console.log('adminAuth: setTokens', { accessToken: accessToken?.slice?.(0,8) + '...', hasRefresh: !!refreshToken });
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('adminAuth: setTokens failed', e);
    return false;
  }
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('adminAccessToken');
  localStorage.removeItem('adminRefreshToken');
}

export async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
  const token = getAccessToken();
  const headers = new Headers(init?.headers ?? {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  // resolve relative /api paths to configured API URL
  let req: RequestInfo = input;
  if (typeof input === 'string' && input.startsWith('/')) {
    req = apiUrl(input);
  }
  const res = await apiFetch(req, { ...init, headers, credentials: 'same-origin' });
  return res;
}

export async function ensureAdminAuth(): Promise<boolean> {
  const token = getAccessToken();
  if (!token) return false;
  try {
    const res = await fetchWithAuth('/api/auth/me');
    if (!res.ok) return false;
    const json = await res.json();
    const roles = json?.data?.user?.roles ?? json?.data?.roles ?? [];
    return roles.includes('organizer');
  } catch (e) {
    return false;
  }
}
