const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8080";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export class ApiClientError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code?: string | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code ?? null;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string | null,
) {
  const headers = new Headers(init.headers ?? {});
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
  });

  const body = await readEnvelope<T>(response);
  if (!response.ok || body.success === false) {
    throw new ApiClientError(
      body.error?.message ?? body.message ?? "Request failed.",
      response.status,
      body.error?.code,
    );
  }

  return body.data as T;
}

export function getFriendlyApiError(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof ApiClientError) {
    switch (error.code) {
      case "AUTH_FORBIDDEN":
        return "This account does not have permission for check-in.";
      case "AUTH_INVALID_CREDENTIALS":
        return "Invalid email or password.";
      case "CHECKIN_QR_EXPIRED":
        return "This QR code has expired.";
      case "CHECKIN_QR_REVOKED":
        return "This QR code has been revoked.";
      case "CHECKIN_SESSION_MISMATCH":
        return "This QR code belongs to another session.";
      case "CHECKIN_SESSION_NOT_OPEN":
        return "This session is not open for check-in yet.";
      case "CHECKIN_INVALID_QR":
      case "CHECKIN_QR_NOT_FOUND":
        return "The QR token could not be recognized.";
      default:
        return error.message || fallback;
    }
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  if (response.status === 204) {
    return { success: true };
  }

  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return {
      success: false,
      message: response.ok ? "Invalid server response." : "Server returned an unreadable error response.",
    };
  }
}
