"use client";

import { apiFetch } from "./api";
import { getAccessToken, requestWithStoredAuth } from "./auth";

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
  retryAfter: number | null;

  constructor(message: string, status: number, code?: string | null, retryAfter?: number | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code ?? null;
    this.retryAfter = retryAfter ?? null;
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  options: { auth?: boolean | "optional" } = {},
) {
  const { auth = false } = options;
  let response: Response;

  if (auth === true) {
    response = await requestWithStoredAuth(path, init);
  } else if (auth === "optional" && getAccessToken()) {
    response = await requestWithStoredAuth(path, init);
  } else {
    response = await apiFetch(path, init);
  }

  const envelope = await readEnvelope<T>(response);
  const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));

  if (!response.ok || envelope.success === false) {
    throw new ApiClientError(
      envelope.error?.message ?? envelope.message ?? "Yêu cầu thất bại.",
      response.status,
      envelope.error?.code,
      retryAfter,
    );
  }

  return envelope.data as T;
}

export function getFriendlyErrorMessage(error: unknown, fallback = "Đã xảy ra lỗi. Vui lòng thử lại.") {
  if (error instanceof ApiClientError) {
    if (error.status === 429 || error.code === "RATE_LIMIT_EXCEEDED") {
      return "Bạn thao tác quá nhanh. Vui lòng thử lại sau.";
    }

    switch (error.code) {
      case "AUTH_FORBIDDEN":
        return "Bạn không có quyền thực hiện thao tác này.";
      case "AUTH_TOKEN_MISSING":
      case "AUTH_TOKEN_INVALID":
      case "AUTH_TOKEN_EXPIRED":
        return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      case "REG_ALREADY_EXISTS":
        return "Bạn đã đăng ký buổi này rồi.";
      case "REG_SESSION_FULL":
        return "Buổi này đã hết chỗ.";
      case "REG_SESSION_NOT_REGISTERABLE":
      case "REG_SESSION_CANCELED":
        return "Buổi này hiện không mở đăng ký.";
      case "REG_QR_NOT_AVAILABLE":
        return "Mã QR chưa sẵn sàng cho đăng ký này.";
      case "CHECKIN_QR_EXPIRED":
        return "Mã QR này đã hết hạn.";
      case "CHECKIN_QR_REVOKED":
        return "Mã QR này đã bị thu hồi.";
      case "CHECKIN_SESSION_MISMATCH":
        return "Mã QR không thuộc buổi đang chọn.";
      case "CHECKIN_SESSION_NOT_OPEN":
        return "Buổi này chưa mở check-in.";
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

export function getRetryAfterSeconds(error: unknown) {
  return error instanceof ApiClientError ? error.retryAfter : null;
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

function parseRetryAfter(headerValue: string | null) {
  if (!headerValue) return null;

  const seconds = Number(headerValue);
  if (Number.isFinite(seconds)) {
    return seconds;
  }

  const timestamp = Date.parse(headerValue);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  const diff = Math.ceil((timestamp - Date.now()) / 1000);
  return diff > 0 ? diff : null;
}
