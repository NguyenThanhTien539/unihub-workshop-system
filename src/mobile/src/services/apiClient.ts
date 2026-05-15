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
      body.error?.message ?? body.message ?? "Yêu cầu thất bại.",
      response.status,
      body.error?.code,
    );
  }

  return body.data as T;
}

export function getFriendlyApiError(error: unknown, fallback = "Đã xảy ra lỗi.") {
  if (error instanceof ApiClientError) {
    switch (error.code) {
      case "AUTH_FORBIDDEN":
        return "Tài khoản này không có quyền check-in.";
      case "AUTH_INVALID_CREDENTIALS":
        return "Email hoặc mật khẩu không đúng.";
      case "CHECKIN_QR_EXPIRED":
        return "Mã QR này đã hết hạn.";
      case "CHECKIN_QR_REVOKED":
        return "Mã QR này đã bị thu hồi.";
      case "CHECKIN_SESSION_MISMATCH":
        return "Mã QR này thuộc buổi học khác.";
      case "CHECKIN_SESSION_NOT_OPEN":
        return "Buổi học này chưa mở check-in.";
      case "CHECKIN_INVALID_QR":
      case "CHECKIN_QR_NOT_FOUND":
        return "Không nhận diện được mã QR.";
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
      message: response.ok ? "Phản hồi từ máy chủ không hợp lệ." : "Không đọc được phản hồi lỗi từ máy chủ.",
    };
  }
}
