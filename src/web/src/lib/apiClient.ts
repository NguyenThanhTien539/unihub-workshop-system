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
      envelope.error?.message ?? envelope.message ?? "Yêu cầu chưa thực hiện được.",
      response.status,
      envelope.error?.code,
      retryAfter,
    );
  }

  return envelope.data as T;
}

export function getFriendlyErrorMessage(error: unknown, fallback = "Không thể xử lý yêu cầu. Vui lòng thử lại.") {
  if (error instanceof ApiClientError) {
    if (error.status === 429 || error.code === "RATE_LIMIT_EXCEEDED") {
      return "Bạn thao tác quá nhanh. Vui lòng thử lại sau.";
    }

    switch (error.code) {
      case "NOTIFY_ACCESS_DENIED":
        return "Bạn không có quyền xem thông báo này.";
      case "NOTIFY_NOT_FOUND":
        return "Không tìm thấy thông báo.";
      case "AUTH_FORBIDDEN":
        return "Bạn không có quyền thực hiện thao tác này.";
      case "AUTH_TOKEN_INVALID":
        return "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.";
      case "AUTH_TOKEN_MISSING":
      case "AUTH_TOKEN_EXPIRED":
        return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      case "PAYMENT_GATEWAY_UNAVAILABLE":
      case "PAYMENT_PROVIDER_UNAVAILABLE":
      case "PAYMENT_PROVIDER_DISABLED":
        return "Cổng thanh toán hiện không khả dụng. Vui lòng thử lại sau.";
      case "PAYMENT_TIMEOUT":
        return "Cổng thanh toán phản hồi quá lâu. Vui lòng thử lại sau.";
      case "PAYMENT_PROVIDER_ERROR":
      case "PAYMENT_PROVIDER_REJECTED":
        return "Không thể tạo yêu cầu thanh toán. Vui lòng thử lại sau.";
      case "PAYMENT_IDEMPOTENCY_CONFLICT":
      case "PAYMENT_IDEMPOTENCY_KEY_CONFLICT":
        return "Yêu cầu thanh toán này đã được xử lý. Vui lòng kiểm tra lại trạng thái.";
      case "WORKSHOP_NOT_FOUND":
        return "Không tìm thấy workshop.";
      case "WORKSHOP_SESSION_NOT_FOUND":
        return "Không tìm thấy buổi workshop.";
      case "WORKSHOP_ROOM_CONFLICT":
        return "Phòng đã có lịch trong thời gian này.";
      case "WORKSHOP_CAPACITY_BELOW_CONFIRMED":
        return "Sức chứa mới không được nhỏ hơn số sinh viên đã đăng ký.";
      case "AI_FILE_REQUIRED":
        return "Vui lòng chọn file PDF.";
      case "AI_FILE_TYPE_INVALID":
        return "File phải là PDF.";
      case "AI_FILE_TOO_LARGE":
        return "File PDF quá lớn. Vui lòng chọn file nhỏ hơn.";
      case "AI_STORAGE_UNAVAILABLE":
        return "Không thể lưu file PDF. Vui lòng thử lại sau.";
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
        return error.status >= 500 ? fallback : error.message || fallback;
    }
  }

  if (error instanceof Error) {
    if (error.name === "TypeError") {
      return "Không thể kết nối đến hệ thống. Vui lòng kiểm tra kết nối và thử lại.";
    }
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
      message: response.ok ? "Phản hồi chưa hợp lệ." : "Không thể đọc phản hồi từ hệ thống.",
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
