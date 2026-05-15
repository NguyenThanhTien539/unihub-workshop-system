import { Account, Role } from "../models/types";
import { apiRequest, setAuthTokens } from "./apiClient";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: MeResponse;
};

type MeResponse = {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  studentProfile?: {
    studentId: string;
    studentCode: string;
    status: string;
  } | null;
};

export async function login(email: string, password: string): Promise<Account> {
  setAuthTokens({});
  const auth = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { email: email.trim(), password },
    authenticated: false,
    skipAuthRefresh: true,
  });
  setAuthTokens(auth);

  const me = await getCurrentUser(auth.accessToken);
  const role = toKnownRole(auth.user.roles[0] || me.roles[0]);

  return {
    id: me.id,
    name: me.fullName,
    email: me.email,
    password: "",
    role,
    label: roleLabel(role),
    studentId: me.studentProfile?.studentCode || me.studentProfile?.studentId,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
  };
}

export async function getCurrentUser(token?: string): Promise<MeResponse> {
  return apiRequest<MeResponse>("/api/auth/me", { token });
}

export async function logout(refreshToken?: string | null) {
  if (refreshToken) {
    await apiRequest<void>("/api/auth/logout", {
      method: "POST",
      body: { refreshToken },
    });
  }
  setAuthTokens({});
}

export async function verifyRoleAccess(role: Role) {
  if (role === "ORGANIZER") {
    await apiRequest<string>("/api/admin/auth-test");
    return;
  }
  if (role === "CHECKIN_STAFF") {
    await apiRequest<string>("/api/checkin/auth-test");
    return;
  }
  await apiRequest<MeResponse>("/api/auth/me");
}

function roleLabel(role: Role) {
  if (role === "CHECKIN_STAFF") {
    return "Check-in Staff";
  }
  if (role === "ORGANIZER") {
    return "Organizer";
  }
  return "Student";
}

function toKnownRole(role: string | undefined): Role {
  const normalized = role?.trim().toUpperCase();
  if (normalized === "CHECKIN_STAFF" || normalized === "ORGANIZER") {
    return normalized;
  }
  return "STUDENT";
}
