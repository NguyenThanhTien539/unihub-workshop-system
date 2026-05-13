import * as SecureStore from "expo-secure-store";
import { ENV } from "../config/env";
import { createId } from "../utils/uuid";

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(ENV.TOKEN_ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(ENV.TOKEN_REFRESH_KEY, refreshToken);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ENV.TOKEN_ACCESS_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(ENV.TOKEN_REFRESH_KEY);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ENV.TOKEN_ACCESS_KEY);
  await SecureStore.deleteItemAsync(ENV.TOKEN_REFRESH_KEY);
}

export async function getOrCreateDeviceId() {
  const existing = await SecureStore.getItemAsync(ENV.DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = createId("device");
  await SecureStore.setItemAsync(ENV.DEVICE_ID_KEY, deviceId);
  return deviceId;
}
