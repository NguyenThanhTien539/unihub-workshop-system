import { apiClient, unwrapApiResponse } from "./apiClient";
import { ApiEnvelope, AuthResponse, CurrentUser } from "./types";
import { getRefreshToken } from "../auth/tokenStorage";

export async function loginApi(email: string, password: string) {
  const response = await apiClient.post<ApiEnvelope<AuthResponse>>("/api/auth/login", {
    email,
    password,
  });

  return unwrapApiResponse(response.data);
}

export async function getMeApi() {
  const response = await apiClient.get<ApiEnvelope<CurrentUser>>("/api/auth/me");
  return unwrapApiResponse(response.data);
}

export async function logoutApi() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return;
  }

  await apiClient.post<ApiEnvelope<null>>("/api/auth/logout", { refreshToken });
}
