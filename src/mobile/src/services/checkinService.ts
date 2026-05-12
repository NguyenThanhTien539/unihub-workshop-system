import {
  CheckinHistoryItem,
  CheckinResult,
  OfflineQueueItem,
} from "../models/types";
import { apiRequest } from "./apiClient";
import {
  CheckinSession,
  CheckinSyncItemResponse,
  CheckinValidateResponse,
} from "./checkinApi";
import {
  enqueueOfflineEvent,
  getPendingOfflineEvents,
  listQueuedEvents,
  updateOfflineEvent,
  type OfflineCheckinEvent,
} from "./checkinQueue";

export async function getCheckinSessions(): Promise<CheckinSession[]> {
  return apiRequest<CheckinSession[]>("/api/checkin/sessions");
}

export async function verifyCheckin(
  sessionId: string,
  qrToken: string,
): Promise<CheckinResult> {
  if (!sessionId) {
    throw new Error("Select a workshop session before verifying check-in.");
  }
  if (!qrToken.trim()) {
    throw new Error("Enter a QR token before verifying check-in.");
  }

  const response = await apiRequest<CheckinValidateResponse>("/api/checkin/validate", {
    method: "POST",
    body: {
      sessionId,
      qrToken: qrToken.trim(),
      scannedAt: toBackendTimestamp(new Date()),
    },
  });

  return mapValidateResponse(response);
}

export async function queueOfflineCheckin(
  sessionId: string,
  qrToken: string,
): Promise<OfflineQueueItem[]> {
  if (!sessionId) {
    throw new Error("Select a workshop session before queueing an offline scan.");
  }
  if (!qrToken.trim()) {
    throw new Error("Enter a QR token before queueing an offline scan.");
  }

  await enqueueOfflineEvent({
    syncEventId: createSyncEventId(),
    sessionId,
    qrToken: qrToken.trim(),
    scannedAt: toBackendTimestamp(new Date()),
    deviceId: "mobile-app",
    createdAt: new Date().toISOString(),
    localStatus: "PENDING_SYNC",
  });
  return getOfflineQueue();
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const events = await listQueuedEvents();
  return events.map(mapOfflineEvent);
}

export async function syncOfflineQueue(): Promise<OfflineQueueItem[]> {
  const pendingEvents = await getPendingOfflineEvents();
  if (pendingEvents.length === 0) {
    return getOfflineQueue();
  }

  for (const event of pendingEvents) {
    await updateOfflineEvent(event.syncEventId, { localStatus: "SYNCING" });
  }

  try {
    const response = await apiRequest<{ results: CheckinSyncItemResponse[] }>(
      "/api/checkin/sync",
      {
        method: "POST",
        body: {
          events: pendingEvents.map(
            ({ localStatus, createdAt, backendErrorCode, backendResult, ...event }) =>
              event,
          ),
        },
      },
    );

    for (const item of response.results) {
      await updateOfflineEvent(item.syncEventId, {
        localStatus:
          item.result === "ACCEPTED" || item.result === "DUPLICATE"
            ? "SYNCED"
            : item.result === "ALREADY_SYNCED"
              ? "CONFLICT"
              : "FAILED",
        backendResult: item.result,
        backendErrorCode: item.errorCode,
      });
    }
  } catch (error) {
    for (const event of pendingEvents) {
      await updateOfflineEvent(event.syncEventId, { localStatus: "FAILED" });
    }
    throw error;
  }

  return getOfflineQueue();
}

export async function getCheckinHistory(): Promise<CheckinHistoryItem[]> {
  return apiRequest<CheckinHistoryItem[]>("/api/checkin/history");
}

function mapValidateResponse(response: CheckinValidateResponse): CheckinResult {
  if (response.result === "ACCEPTED") {
    return {
      kind: "VALID",
      title: "Accepted",
      detail: `${response.studentName} checked in successfully.`,
      studentName: response.studentName,
      studentId: response.studentId,
    };
  }

  return {
    kind: "ALREADY_USED",
    title: "Duplicate check-in",
    detail: `This QR was already used at ${response.previousCheckedInAt ?? "an earlier time"}.`,
    studentName: response.studentName,
    studentId: response.studentId,
  };
}

function mapOfflineEvent(event: OfflineCheckinEvent): OfflineQueueItem {
  return {
    id: event.syncEventId,
    studentName: event.backendResult || "Pending attendee",
    workshopTitle: event.sessionId,
    scannedAt: event.scannedAt,
    status:
      event.localStatus === "SYNCED"
        ? "SYNCED"
        : event.localStatus === "CONFLICT"
          ? "NEEDS_REVIEW"
          : "PENDING_SYNC",
  };
}

function createSyncEventId() {
  return `mobile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toBackendTimestamp(date: Date) {
  return date.toISOString().slice(0, 19);
}
