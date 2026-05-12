import { apiRequest } from "./apiClient";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  accountStatus: string;
  roles: string[];
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
};

export type CheckinSession = {
  sessionId: string;
  workshopTitle: string;
  roomName: string;
  building: string;
  startAt: string;
  endAt: string;
  checkinOpen: boolean;
};

export type CheckinValidateResponse = {
  result: "ACCEPTED" | "DUPLICATE";
  registrationId: string;
  studentName: string;
  studentId: string;
  checkedInAt: string | null;
  previousCheckedInAt: string | null;
};

export type CheckinSyncEventPayload = {
  syncEventId: string;
  sessionId: string;
  qrToken: string;
  scannedAt: string;
  deviceId?: string;
};

export type CheckinSyncItemResponse = {
  syncEventId: string;
  result: "ACCEPTED" | "DUPLICATE" | "REJECTED" | "ALREADY_SYNCED";
  registrationId: string | null;
  studentId: string | null;
  checkedInAt: string | null;
  errorCode: string | null;
};

export type CheckinSyncResponse = {
  results: CheckinSyncItemResponse[];
};

export async function loginCheckin(email: string, password: string) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
    authenticated: false,
    skipAuthRefresh: true,
  });
}

export async function getCurrentUser(accessToken: string) {
  return apiRequest<AuthUser>("/api/auth/me", { token: accessToken });
}

export async function listCheckinSessions(accessToken: string) {
  return apiRequest<CheckinSession[]>("/api/checkin/sessions", { token: accessToken });
}

export async function validateCheckin(
  accessToken: string,
  payload: { sessionId: string; qrToken: string; scannedAt: string },
) {
  return apiRequest<CheckinValidateResponse>(
    "/api/checkin/validate",
    {
      method: "POST",
      body: payload,
      token: accessToken,
    },
  );
}

export async function syncCheckins(accessToken: string, events: CheckinSyncEventPayload[]) {
  return apiRequest<CheckinSyncResponse>(
    "/api/checkin/sync",
    {
      method: "POST",
      body: { events },
      token: accessToken,
    },
  );
}
