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
  CHECKIN_QR_NOT_FOUND: "Không tìm thấy mã QR check-in.",
  CHECKIN_QR_REVOKED: "Mã QR này đã bị thu hồi.",
  CHECKIN_QR_EXPIRED: "Mã QR đã hết hạn.",
  CHECKIN_REGISTRATION_NOT_CONFIRMED: "Sinh viên chưa đăng ký thành công.",
  CHECKIN_SESSION_MISMATCH: "Mã QR không thuộc buổi học này.",
  CHECKIN_SESSION_NOT_OPEN: "Buổi học chưa mở check-in.",
  CHECKIN_DUPLICATE: "Sinh viên đã check-in trước đó.",
  AUTH_FORBIDDEN: "Tài khoản không có quyền thực hiện check-in.",
  AUTH_TOKEN_INVALID: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  AUTH_TOKEN_MISSING: "Bạn cần đăng nhập để tiếp tục.",
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
    return new AppError(
      "UNKNOWN_ERROR",
      "Co loi khong xac dinh. Vui long thu lai.",
    );
  }

  const axiosError = error as AxiosError<ApiErrorBody>;
  if (!axiosError.response) {
    return new AppError(
      "NETWORK_ERROR",
      "Khong ket noi duoc server. Du lieu se duoc luu offline neu co the.",
    );
  }

  const status = axiosError.response.status;
  const body = axiosError.response.data;
  const backendCode = body?.error?.code;
  const fallbackMessage =
    body?.error?.message ?? body?.message ?? "Yeu cau khong thanh cong.";
  const message = backendCode
    ? (backendMessage[backendCode] ?? fallbackMessage)
    : fallbackMessage;

  if (status === 401) {
    return new AppError("AUTH_EXPIRED", message, { status, backendCode });
  }

  if (status === 403) {
    return new AppError("AUTH_FORBIDDEN", backendMessage.AUTH_FORBIDDEN, {
      status,
      backendCode,
    });
  }

  if (status === 404 && !backendCode) {
    return new AppError(
      "API_NOT_IMPLEMENTED",
      "Backend chua co API check-in nay.",
      {
        status,
        backendCode,
      },
    );
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
