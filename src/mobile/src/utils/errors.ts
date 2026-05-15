import axios, { AxiosError } from "axios";

export type AppErrorCode =
  | "NETWORK_ERROR"
  | "AUTH_EXPIRED"
  | "AUTH_FORBIDDEN"
  | "CHECKIN_INVALID_QR"
  | "CHECKIN_DUPLICATE"
  | "CHECKIN_REJECTED"
  | "SYNC_FAILED"
  | "API_NOT_IMPLEMENTED"
  | "UNKNOWN_ERROR";

type ApiErrorBody = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
  } | null;
  message?: string;
};

const backendMessage: Record<string, string> = {
  CHECKIN_INVALID_QR: "Mã QR không hợp lệ.",
  CHECKIN_QR_NOT_FOUND: "Không tìm thấy vé QR.",
  CHECKIN_QR_REVOKED: "Vé QR đã bị thu hồi.",
  CHECKIN_QR_EXPIRED: "Vé QR đã hết hạn.",
  CHECKIN_REGISTRATION_NOT_CONFIRMED: "Sinh viên chưa đăng ký thành công.",
  CHECKIN_SESSION_MISMATCH: "QR không thuộc buổi học này.",
  CHECKIN_SESSION_NOT_OPEN: "Buổi học chưa mở check-in.",
  CHECKIN_DUPLICATE: "Sinh viên đã check-in trước đó.",
  AUTH_FORBIDDEN: "Tài khoản không có quyền check-in.",
  AUTH_TOKEN_INVALID: "Phiên đăng nhập đã hết hạn.",
  AUTH_TOKEN_MISSING: "Cần đăng nhập lại.",
};

export class AppError extends Error {
  code: AppErrorCode;
  status?: number;
  backendCode?: string;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { status?: number; backendCode?: string },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = options?.status;
    this.backendCode = options?.backendCode;
  }
}

export function isNetworkError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return error instanceof AppError && error.code === "NETWORK_ERROR";
  }

  return !error.response;
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    return new AppError("UNKNOWN_ERROR", "Có lỗi không xác định. Vui lòng thử lại.");
  }

  const axiosError = error as AxiosError<ApiErrorBody>;
  if (!axiosError.response) {
    return new AppError("NETWORK_ERROR", "Không kết nối được server. Dữ liệu sẽ được lưu offline nếu có thể.");
  }

  const status = axiosError.response.status;
  const body = axiosError.response.data;
  const backendCode = body?.error?.code;
  const fallbackMessage = body?.error?.message ?? body?.message ?? "Yêu cầu không thành công.";
  const message = backendCode ? backendMessage[backendCode] ?? fallbackMessage : fallbackMessage;

  if (status === 401) {
    return new AppError("AUTH_EXPIRED", message, { status, backendCode });
  }

  if (status === 403) {
    return new AppError("AUTH_FORBIDDEN", backendMessage.AUTH_FORBIDDEN, { status, backendCode });
  }

  if (status === 404 && !backendCode) {
    return new AppError("API_NOT_IMPLEMENTED", "Backend chưa có API check-in này.", {
      status,
      backendCode,
    });
  }

  if (backendCode === "CHECKIN_DUPLICATE") {
    return new AppError("CHECKIN_DUPLICATE", message, { status, backendCode });
  }

  if (backendCode?.startsWith("CHECKIN_")) {
    return new AppError("CHECKIN_REJECTED", message, { status, backendCode });
  }

  return new AppError("UNKNOWN_ERROR", message, { status, backendCode });
}

export function getFriendlyErrorMessage(error: unknown) {
  return toAppError(error).message;
}
