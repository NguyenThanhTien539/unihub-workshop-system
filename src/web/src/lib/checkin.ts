"use client";

import { apiRequest } from "./apiClient";

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

export type CheckinSyncEvent = {
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

export async function listCheckinSessions() {
  return apiRequest<CheckinSession[]>("/api/checkin/sessions", undefined, { auth: true });
}

export async function validateCheckin(payload: {
  sessionId: string;
  qrToken: string;
  scannedAt: string;
}) {
  return apiRequest<CheckinValidateResponse>(
    "/api/checkin/validate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { auth: true },
  );
}

export async function syncCheckins(events: CheckinSyncEvent[]) {
  return apiRequest<CheckinSyncResponse>(
    "/api/checkin/sync",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    },
    { auth: true },
  );
}
