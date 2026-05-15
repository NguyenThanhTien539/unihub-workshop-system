import { ENV } from "../config/env";
import { nowIso } from "../utils/date";
import { createId } from "../utils/uuid";
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
  if (ENV.CHECKIN_MOCK_MODE) {
    return getMockSessions();
  }

  const response = await apiClient.get<ApiEnvelope<CheckinSession[]>>("/api/checkin/sessions");
  return unwrapApiResponse(response.data).map((session) => ({
    ...session,
    source: "LIVE",
  }));
}

export async function validateQr(request: ValidateQrRequest): Promise<ValidateQrResponse> {
  if (ENV.CHECKIN_MOCK_MODE) {
    return mockValidateQr(request);
  }

  const response = await apiClient.post<ApiEnvelope<ValidateQrResponse>>(
    "/api/checkin/validate",
    request,
  );
  return unwrapApiResponse(response.data);
}

export async function syncOfflineEvents(
  request: SyncOfflineEventsRequest,
): Promise<SyncOfflineEventsResponse> {
  if (ENV.CHECKIN_MOCK_MODE) {
    return {
      results: request.events.map((event) => ({
        syncEventId: event.syncEventId,
        ...mockResultForToken(event.qrToken),
      })),
    };
  }

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
      workshopTitle: "Workshop kỹ năng nghề nghiệp",
      roomName: "A101",
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      checkinOpen: true,
      source: "MOCK",
    },
    {
      sessionId: "mock-session-202",
      workshopTitle: "AI cho đồ án sinh viên",
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
      studentName: "Sinh viên đã check-in",
      studentId: "23123456",
      studentCode: "23123456",
      previousCheckedInAt: nowIso(),
      message: "Sinh viên đã check-in trước đó.",
    };
  }

  if (normalized.includes("reject") || normalized.includes("invalid")) {
    return {
      result: "REJECTED",
      errorCode: "CHECKIN_INVALID_QR",
      message: "Mã QR không hợp lệ.",
    };
  }

  return {
    result: "ACCEPTED",
    registrationId: createId("reg"),
    studentName: "Sinh viên Một",
    studentId: "23123456",
    studentCode: "23123456",
    checkedInAt: nowIso(),
    message: "Check-in thành công.",
  };
}
