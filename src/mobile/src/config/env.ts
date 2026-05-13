declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

const env = typeof process === "undefined" ? undefined : process.env;

export const ENV = {
  API_BASE_URL: env?.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080",
  API_TIMEOUT_MS: Number(env?.EXPO_PUBLIC_API_TIMEOUT_MS ?? 10000),
  DEVICE_ID_KEY: "unihub_device_id",
  TOKEN_ACCESS_KEY: "unihub_access_token",
  TOKEN_REFRESH_KEY: "unihub_refresh_token",
};
