import { create } from "zustand";
import { getMeApi, loginApi, logoutApi } from "../api/authApi";
import { setUnauthorizedHandler } from "../api/apiClient";
import { CurrentUser } from "../api/types";
import { clearTokens, getAccessToken, saveTokens } from "./tokenStorage";
import { AppError, toAppError } from "../utils/errors";

type AuthState = {
  user: CurrentUser | null;
  roles: string[];
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  bootstrapError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: (options?: { remote?: boolean }) => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  finishBootstrap: () => void;
};

export function hasCheckinStaffRole(roles: string[]) {
  return roles.some((role) => role.trim().toLowerCase() === "checkin_staff");
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  roles: [],
  isAuthenticated: false,
  isBootstrapping: true,
  bootstrapError: null,

  login: async (email, password) => {
    const response = await loginApi(email, password);

    if (!hasCheckinStaffRole(response.user.roles)) {
      await clearTokens();
      throw new AppError("AUTH_FORBIDDEN", "Tài khoản không có quyền check-in.");
    }

    await saveTokens(response.accessToken, response.refreshToken);
    set({
      user: response.user,
      roles: response.user.roles,
      isAuthenticated: true,
      bootstrapError: null,
    });
  },

  logout: async (options) => {
    if (options?.remote !== false) {
      try {
        await logoutApi();
      } catch {
        // Local logout must still work if the server cannot be reached.
      }
    }

    await clearTokens();
    set({
      user: null,
      roles: [],
      isAuthenticated: false,
    });
  },

  loadCurrentUser: async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        set({ isBootstrapping: false, isAuthenticated: false, user: null, roles: [] });
        return;
      }

      const user = await getMeApi();
      if (!hasCheckinStaffRole(user.roles)) {
        await clearTokens();
        set({
          isBootstrapping: false,
          isAuthenticated: false,
          user: null,
          roles: [],
          bootstrapError: "Tài khoản không có quyền check-in.",
        });
        return;
      }

      set({
        user,
        roles: user.roles,
        isAuthenticated: true,
        isBootstrapping: false,
        bootstrapError: null,
      });
    } catch (error) {
      await clearTokens();
      set({
        user: null,
        roles: [],
        isAuthenticated: false,
        isBootstrapping: false,
        bootstrapError: toAppError(error).message,
      });
    }
  },

  finishBootstrap: () => set({ isBootstrapping: false }),
}));

setUnauthorizedHandler(() => {
  const state = useAuthStore.getState();
  state.logout({ remote: false });
});
