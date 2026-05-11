type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: {
    code?: string;
    message?: string;
  } | null;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  skipAuthRefresh?: boolean;
  authenticated?: boolean;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

let accessToken: string | null = null;
let refreshToken: string | null = null;

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function setAuthTokens(tokens: {
  accessToken?: string | null;
  refreshToken?: string | null;
}) {
  accessToken = tokens.accessToken || null;
  refreshToken = tokens.refreshToken || null;
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return sendRequest<T>(path, options, false);
}

async function sendRequest<T>(
  path: string,
  options: RequestOptions,
  didRefresh: boolean,
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(options.query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  let response: Response;
  const requestToken =
    options.authenticated === false ? null : options.token || accessToken;
  try {
    response = await fetch(url.toString(), {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Unable to reach the server. Check your connection and API URL.");
  }

  const text = await response.text();
  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;
  } catch {
    throw new ApiError(response.status, "The server returned an unexpected response.");
  }

  if (!response.ok || payload?.success === false) {
    if (
      response.status === 401 &&
      refreshToken &&
      !options.skipAuthRefresh &&
      !didRefresh
    ) {
      const refreshed = await refreshAuthToken();
      if (refreshed) {
        return sendRequest<T>(path, options, true);
      }
    }

    if (response.status === 401) {
      setAuthTokens({});
    }
    throw new ApiError(
      response.status,
      friendlyErrorMessage(response.status, payload?.error?.message),
      payload?.error?.code,
    );
  }

  return payload ? payload.data : (undefined as T);
}

async function refreshAuthToken() {
  if (!refreshToken) {
    return false;
  }

  try {
    const tokens = await sendRequest<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>(
      "/api/auth/refresh",
      {
        method: "POST",
        body: { refreshToken },
        skipAuthRefresh: true,
        authenticated: false,
      },
      true,
    );
    setAuthTokens(tokens);
    return true;
  } catch {
    setAuthTokens({});
    return false;
  }
}

export function friendlyErrorMessage(status: number, fallback?: string) {
  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (status === 404) {
    return "The requested item was not found.";
  }
  if (status === 409) {
    return fallback || "This change conflicts with the latest server data.";
  }
  if (status >= 500) {
    return "The server is unavailable. Please try again later.";
  }
  return fallback || "The request could not be completed.";
}
