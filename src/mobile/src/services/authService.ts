import { Account, Role } from "../models/types";
import { apiRequest, setAuthTokens } from "./apiClient";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  roles: string[];
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
  const auth = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { email: email.trim(), password },
  });
  setAuthTokens(auth);

  const me = await getCurrentUser(auth.accessToken);
  const role = toKnownRole(auth.roles[0] || me.roles[0]);

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
  await apiRequest<string>("/api/registrations/auth-test");
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
  if (role === "CHECKIN_STAFF" || role === "ORGANIZER") {
    return role;
  }
  return "STUDENT";
}
