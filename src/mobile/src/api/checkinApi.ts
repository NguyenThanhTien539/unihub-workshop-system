import { apiClient, unwrapApiResponse } from "./apiClient";
import {
  ApiEnvelope,
  CheckinSession,
  SyncOfflineEventsRequest,
  SyncOfflineEventsResponse,
  ValidateQrRequest,
  ValidateQrResponse,
} from "./types";

export async function getCheckinSessions(): Promise<CheckinSession[]> {
  const response = await apiClient.get<ApiEnvelope<CheckinSession[]>>("/api/checkin/sessions");
  return unwrapApiResponse(response.data).map((session) => ({
    ...session,
    source: "LIVE",
  }));
}

export async function validateQr(request: ValidateQrRequest): Promise<ValidateQrResponse> {
  const response = await apiClient.post<ApiEnvelope<ValidateQrResponse>>(
    "/api/checkin/validate",
    request,
  );
  return unwrapApiResponse(response.data);
}

export async function syncOfflineEvents(
  request: SyncOfflineEventsRequest,
): Promise<SyncOfflineEventsResponse> {
  const response = await apiClient.post<ApiEnvelope<SyncOfflineEventsResponse>>(
    "/api/checkin/sync",
    request,
  );
  return unwrapApiResponse(response.data);
}

function getMockSessions(): CheckinSession[] {
  const today = new Date();
  const start = new Date(today);
  start.setHours(9, 0, 0, 0);
  const end = new Date(today);
  end.setHours(11, 0, 0, 0);

  return [
    {
      sessionId: "mock-session-101",
      workshopTitle: "Career Skills Workshop",
      roomName: "A101",
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      checkinOpen: true,
      source: "MOCK",
    },
    {
      sessionId: "mock-session-202",
      workshopTitle: "AI for Student Projects",
      roomName: "B204",
      startAt: new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(end.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      checkinOpen: false,
      source: "MOCK",
    },
  ];
}

async function mockValidateQr(request: ValidateQrRequest): Promise<ValidateQrResponse> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  return {
    ...mockResultForToken(request.qrToken),
    checkedInAt: nowIso(),
  };
}

function mockResultForToken(qrToken: string): ValidateQrResponse {
  const normalized = qrToken.trim().toLowerCase();

  if (normalized.includes("duplicate")) {
    return {
      result: "DUPLICATE",
      registrationId: createId("reg"),
      studentName: "Student Duplicate",
      studentId: "23123456",
      studentCode: "23123456",
      previousCheckedInAt: nowIso(),
      message: "Sinh vien da check-in truoc do.",
    };
  }

  if (normalized.includes("reject") || normalized.includes("invalid")) {
    return {
      result: "REJECTED",
      errorCode: "CHECKIN_INVALID_QR",
      message: "Ma QR khong hop le.",
    };
  }

  return {
    result: "ACCEPTED",
    registrationId: createId("reg"),
    studentName: "Student One",
    studentId: "23123456",
    studentCode: "23123456",
    checkedInAt: nowIso(),
    message: "Check-in thanh cong.",
  };
}
