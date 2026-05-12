import { apiFetch, apiUrl } from "./api";

const ACCESS_TOKEN_KEY = "adminAccessToken";
const REFRESH_TOKEN_KEY = "adminRefreshToken";
const ACCESS_TOKEN_EXPIRES_AT_KEY = "adminAccessTokenExpiresAt";

type ApiResponse<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export type StudentProfile = {
  studentId: string;
  studentCode: string;
  faculty: string;
  major: string;
  className: string;
  status: string;
};

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  accountStatus: string;
  roles: string[];
  studentProfile: StudentProfile | null;
};

type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: AuthUser;
};

type TokenPayload = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

let refreshPromise: Promise<string | null> | null = null;

function storageAvailable() {
  return typeof window !== "undefined";
}

function normalizeRoles(roles: string[] | undefined) {
  return (roles ?? []).map((role) => role.trim().toLowerCase());
}

function tokenExpiresAt(expiresIn?: number) {
  if (!expiresIn || Number.isNaN(expiresIn)) return "";
  return String(Date.now() + expiresIn * 1000);
}

function getStoredRefreshToken() {
  if (!storageAvailable()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function getAccessTokenExpiresAt() {
  if (!storageAvailable()) return 0;
  const raw = localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  return raw ? Number(raw) : 0;
}

function accessTokenIsExpiring() {
  const expiresAt = getAccessTokenExpiresAt();
  return Boolean(expiresAt && expiresAt - Date.now() < 30_000);
}

function getApiError(json: unknown, fallback: string) {
  const body = json as ApiResponse<unknown> | undefined;
  return body?.error?.message ?? body?.message ?? fallback;
}

async function readJson<T>(res: Response): Promise<ApiResponse<T>> {
  if (res.status === 204) return {};
  return (await res.json()) as ApiResponse<T>;
}

export function getAccessToken() {
  if (!storageAvailable()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string, expiresIn?: number) {
  if (!storageAvailable()) return false;

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

  const expiresAt = tokenExpiresAt(expiresIn);
  if (expiresAt) {
    localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, expiresAt);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  }

  return true;
}

export function clearTokens() {
  if (!storageAvailable()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
}

export async function login(email: string, password: string) {
  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await readJson<AuthPayload>(res);

  if (!res.ok || !json.data?.accessToken || !json.data?.refreshToken) {
    throw new Error(getApiError(json, "Login failed"));
  }

  setTokens(json.data.accessToken, json.data.refreshToken, json.data.expiresIn);
  return json.data;
}

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return null;
    }

    try {
      const res = await apiFetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const json = await readJson<TokenPayload>(res);

      if (!res.ok || !json.data?.accessToken || !json.data?.refreshToken) {
        clearTokens();
        return null;
      }

      setTokens(json.data.accessToken, json.data.refreshToken, json.data.expiresIn);
      return json.data.accessToken;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit) {
  if (accessTokenIsExpiring()) {
    await refreshAccessToken();
  }

  const firstResponse = await fetchOnceWithAccessToken(input, init);
  if (firstResponse.status !== 401) return firstResponse;

  const refreshedAccessToken = await refreshAccessToken();
  if (!refreshedAccessToken) return firstResponse;

  return fetchOnceWithAccessToken(input, init);
}

export async function getCurrentUser() {
  const res = await fetchWithAuth("/api/auth/me");
  const json = await readJson<AuthUser>(res);

  if (!res.ok || !json.data) {
    throw new Error(getApiError(json, "Unable to load current user"));
  }

  return json.data;
}

export async function ensureAdminAuth(): Promise<boolean> {
  if (!getAccessToken() && !getStoredRefreshToken()) return false;

  try {
    const user = await getCurrentUser();
    return normalizeRoles(user.roles).includes("organizer");
  } catch {
    return false;
  }
}

export async function logout() {
  try {
    if (getStoredRefreshToken() && (!getAccessToken() || accessTokenIsExpiring())) {
      await refreshAccessToken();
    }

    let refreshToken = getStoredRefreshToken();
    if (!refreshToken) return;

    let res = await postLogout(refreshToken);
    if (res.status === 401) {
      await refreshAccessToken();
      refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        res = await postLogout(refreshToken);
      }
    }
  } finally {
    clearTokens();
  }
}

async function postLogout(refreshToken: string) {
  return fetchOnceWithAccessToken("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}

async function fetchOnceWithAccessToken(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let req: RequestInfo | URL = input;
  if (typeof input === "string" && input.startsWith("/")) {
    req = apiUrl(input);
  }

  return apiFetch(req, { ...init, headers });
}
