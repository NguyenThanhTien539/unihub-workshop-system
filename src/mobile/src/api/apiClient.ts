import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ENV } from "../config/env";
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "../auth/tokenStorage";
import { ApiEnvelope, TokenResponse } from "./types";
import { AppError } from "../utils/errors";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<TokenResponse> | null = null;
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.API_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  const accessToken = await getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? "";

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/refresh")
    ) {
      throw error;
    }

    originalRequest._retry = true;

    try {
      const tokenPair = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${tokenPair.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      await clearTokens();
      onUnauthorized?.();
      throw refreshError;
    }
  },
);

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        throw new AppError("AUTH_EXPIRED", "Can dang nhap lai.");
      }

      const response = await axios.post<ApiEnvelope<TokenResponse>>(
        `${ENV.API_BASE_URL}/api/auth/refresh`,
        { refreshToken },
        {
          timeout: ENV.API_TIMEOUT_MS,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.data.success) {
        throw new AppError(
          "AUTH_EXPIRED",
          response.data.error?.message ?? "Phien dang nhap da het han.",
        );
      }

      await saveTokens(response.data.data.accessToken, response.data.data.refreshToken);
      return response.data.data;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export function unwrapApiResponse<T>(envelope: ApiEnvelope<T>) {
  if (!envelope.success) {
    throw new AppError(
      "UNKNOWN_ERROR",
      envelope.error?.message ?? "Yeu cau khong thanh cong.",
      { backendCode: envelope.error?.code },
    );
  }

  return envelope.data;
}
