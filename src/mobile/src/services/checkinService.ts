import {
  CheckinHistoryItem,
  CheckinResult,
  OfflineQueueItem,
} from "../models/types";
import { extractQrToken, getQrPreview } from "../utils/qr";
import { apiRequest } from "./apiClient";
import {
  CheckinSession,
  CheckinSyncEventPayload,
  CheckinSyncItemResponse,
  CheckinValidateResponse,
} from "./checkinApi";
import { ApiError, getAccessToken } from "./apiClient";
import {
  archiveOfflineEvent,
  clearOldOfflineEvents,
  enqueueOfflineEvent,
  getPendingOfflineEvents,
  listArchivedEvents,
  listQueuedEvents,
  removeOfflineEvent,
  updateOfflineEvent,
  type OfflineCheckinEvent,
} from "./checkinQueue";

export type OfflineSyncSummary = {
  queue: OfflineQueueItem[];
  processed: number;
  accepted: number;
  duplicate: number;
  rejected: number;
  alreadySynced: number;
  retryableFailed: number;
  rejectedReasons: string[];
  message: string;
};

let syncInFlight: Promise<OfflineSyncSummary> | null = null;

export async function getCheckinSessions(): Promise<CheckinSession[]> {
  return apiRequest<CheckinSession[]>("/api/checkin/sessions");
}

export async function verifyCheckin(
  sessionId: string | null | undefined,
  rawQrToken: string,
  scannedAt = toBackendTimestamp(new Date()),
): Promise<CheckinResult> {
  const qrToken = extractQrToken(rawQrToken);
  if (!qrToken) {
    throw new Error("Enter a QR token before verifying check-in.");
  }
  if (!isSignedQrToken(qrToken)) {
    throw new Error("Invalid QR code. This QR code could not be read.");
  }

  const payload = {
    ...toOptionalSessionPayload(sessionId),
    qrToken: qrToken.trim(),
    scannedAt: normalizeBackendTimestamp(scannedAt),
  };
  console.debug("[checkin] online validate request", {
    endpoint: "/api/checkin/validate",
    method: "POST",
    hasAuthorization: Boolean(getAccessToken()),
    rawQrPreview: getRawPreview(rawQrToken),
    extractedQrPreview: getQrPreview(qrToken),
    payload,
  });

  const response = await apiRequest<CheckinValidateResponse>("/api/checkin/validate", {
    method: "POST",
    body: payload,
  });

  return mapValidateResponse(response);
}

export async function queueOfflineCheckin(
  sessionId: string | null | undefined,
  rawQrToken: string,
  scannedAt = toBackendTimestamp(new Date()),
): Promise<OfflineQueueItem[]> {
  const qrToken = extractQrToken(rawQrToken);
  if (!qrToken) {
    throw new Error("Enter a QR token before queueing an offline scan.");
  }
  if (!isSignedQrToken(qrToken)) {
    throw new Error("Invalid QR code. This QR code could not be read.");
  }

  console.debug("[offline-checkin] queue normalized QR", {
    rawQrPreview: getRawPreview(rawQrToken),
    extractedQrPreview: getQrPreview(qrToken),
    changed: rawQrToken.trim() !== qrToken,
  });

  await enqueueOfflineEvent({
    syncEventId: createSyncEventId(),
    sessionId: normalizeSessionIdForStorage(sessionId),
    qrToken: qrToken.trim(),
    scannedAt: normalizeBackendTimestamp(scannedAt),
    deviceId: "mobile-app",
    createdAt: new Date().toISOString(),
    localStatus: "PENDING_SYNC",
    retryCount: 0,
  });
  return getOfflineQueue();
}

export async function clearOldOfflineQueueItems() {
  await clearOldOfflineEvents();
  return {
    queue: await getOfflineQueue(),
    rejectedQueue: await getRejectedOfflineQueue(),
  };
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const events = await listQueuedEvents();
  return events.map(mapOfflineEvent);
}

export async function getRejectedOfflineQueue(): Promise<OfflineQueueItem[]> {
  const events = await listArchivedEvents();
  return events
    .filter(
      (event) =>
        event.localStatus === "REJECTED" || event.localStatus === "DUPLICATE",
    )
    .map(mapOfflineEvent);
}

export function syncOfflineQueue(): Promise<OfflineSyncSummary> {
  if (syncInFlight) {
    console.debug("[offline-checkin] sync skipped; already in flight");
    return syncInFlight;
  }

  syncInFlight = runOfflineQueueSync().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

async function runOfflineQueueSync(): Promise<OfflineSyncSummary> {
  const pendingEvents = await getPendingOfflineEvents();
  if (pendingEvents.length === 0) {
    return {
      queue: await getOfflineQueue(),
      processed: 0,
      accepted: 0,
      duplicate: 0,
      rejected: 0,
      alreadySynced: 0,
      retryableFailed: 0,
      rejectedReasons: [],
      message: "No offline check-ins are waiting to sync.",
    };
  }

  const validEvents: OfflineCheckinEvent[] = [];
  const invalidReasons: string[] = [];
  for (const event of pendingEvents) {
    const validationError = validateQueuedEvent(event);
    if (validationError) {
      invalidReasons.push(validationError);
      await archiveOfflineEvent(event.syncEventId, {
        localStatus: "REJECTED",
        backendErrorCode: "OFFLINE_QUEUE_INVALID",
        backendErrorMessage: validationError,
        syncedAt: new Date().toISOString(),
      });
      console.debug("[offline-checkin] invalid queued item archived", {
        syncEventId: event.syncEventId,
        reason: validationError,
      });
    } else {
      validEvents.push(event);
    }
  }

  if (validEvents.length === 0) {
    return {
      queue: await getOfflineQueue(),
      processed: pendingEvents.length,
      accepted: 0,
      duplicate: 0,
      rejected: invalidReasons.length,
      alreadySynced: 0,
      retryableFailed: 0,
      rejectedReasons: invalidReasons,
      message: invalidReasons.length
        ? `${invalidReasons.length} invalid queued check-in${invalidReasons.length === 1 ? "" : "s"} rejected locally.`
        : "No valid offline check-ins are waiting to sync.",
    };
  }

  const syncPayload = buildSyncPayload(validEvents);
  console.debug("[offline-checkin] sync starting", {
    endpoint: "/api/checkin/sync",
    method: "POST",
    hasAuthorization: Boolean(getAccessToken()),
    count: validEvents.length,
    payload: syncPayload,
  });

  for (const event of validEvents) {
    await updateOfflineEvent(event.syncEventId, {
      localStatus: "SYNCING",
      lastAttemptAt: new Date().toISOString(),
    });
  }

  try {
    const response = await apiRequest<{ results: CheckinSyncItemResponse[] }>(
      "/api/checkin/sync",
      {
        method: "POST",
        body: syncPayload,
      },
    );

    console.debug("[offline-checkin] sync response", {
      status: 200,
      results: response.results,
    });
    const summary = await applySyncResults(validEvents, response.results);
    if (invalidReasons.length > 0) {
      summary.processed += invalidReasons.length;
      summary.rejected += invalidReasons.length;
      summary.rejectedReasons.push(...invalidReasons);
      summary.message = buildSyncSummaryMessage(summary);
    }
    return summary;
  } catch (error) {
    const retryable = isRetryableSyncError(error);
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Unable to sync offline check-ins.";
    for (const event of validEvents) {
      const retryCount = (event.retryCount ?? 0) + 1;
      if (retryable) {
        await updateOfflineEvent(event.syncEventId, {
          localStatus: "SYNC_FAILED",
          backendErrorCode: error instanceof ApiError ? error.code : "SYNC_FAILED",
          backendErrorMessage: message,
          retryCount,
        });
      } else {
        await archiveOfflineEvent(event.syncEventId, {
          localStatus: "REJECTED",
          backendErrorCode: error instanceof ApiError ? error.code : "SYNC_REJECTED",
          backendErrorMessage: message,
          retryCount,
          syncedAt: new Date().toISOString(),
        });
      }
    }
    console.debug("[offline-checkin] sync request failed", {
      endpoint: "/api/checkin/sync",
      method: "POST",
      retryable,
      message,
      status: error instanceof ApiError ? error.status : undefined,
      code: error instanceof ApiError ? error.code : undefined,
      response: error instanceof ApiError ? error.details : undefined,
      payload: syncPayload,
    });

    if (!retryable) {
      return {
        queue: await getOfflineQueue(),
        processed: validEvents.length + invalidReasons.length,
        accepted: 0,
        duplicate: 0,
        rejected: validEvents.length + invalidReasons.length,
        alreadySynced: 0,
        retryableFailed: 0,
        rejectedReasons: [message, ...invalidReasons],
        message,
      };
    }

    throw error;
  }
}

function buildSyncPayload(events: OfflineCheckinEvent[]): {
  events: CheckinSyncEventPayload[];
} {
  return {
    events: events.map((event) => ({
      syncEventId: event.syncEventId,
      ...toOptionalSessionPayload(event.sessionId),
      qrToken: extractQrToken(event.qrToken),
      scannedAt: normalizeBackendTimestamp(event.scannedAt),
      deviceId: event.deviceId,
    })),
  };
}

async function applySyncResults(
  events: OfflineCheckinEvent[],
  results: CheckinSyncItemResponse[],
): Promise<OfflineSyncSummary> {
  const summary: OfflineSyncSummary = {
    queue: [],
    processed: events.length,
    accepted: 0,
    duplicate: 0,
    rejected: 0,
    alreadySynced: 0,
    retryableFailed: 0,
    rejectedReasons: [],
    message: "",
  };
  const resultsById = new Map(results.map((result) => [result.syncEventId, result]));

  for (const event of events) {
    const result = resultsById.get(event.syncEventId);
    if (!result) {
      summary.retryableFailed += 1;
      await updateOfflineEvent(event.syncEventId, {
        localStatus: "SYNC_FAILED",
        backendErrorCode: "SYNC_RESULT_MISSING",
        backendErrorMessage: "Backend did not return a result for this check-in.",
        retryCount: (event.retryCount ?? 0) + 1,
      });
      console.debug("[offline-checkin] sync result missing", {
        syncEventId: event.syncEventId,
      });
      continue;
    }

    console.debug("[offline-checkin] sync item result", {
      syncEventId: result.syncEventId,
      result: result.result,
      errorCode: result.errorCode,
    });

    if (result.result === "ACCEPTED") {
      summary.accepted += 1;
      await removeOfflineEvent(event.syncEventId);
      continue;
    }

    if (result.result === "ALREADY_SYNCED") {
      summary.alreadySynced += 1;
      await removeOfflineEvent(event.syncEventId);
      continue;
    }

    const reason = getCheckinErrorMessage(result.errorCode) ?? "Check-in was rejected by the backend.";
    summary.rejectedReasons.push(reason);
    await archiveOfflineEvent(event.syncEventId, {
      localStatus: result.result === "DUPLICATE" ? "DUPLICATE" : "REJECTED",
      backendResult: result.result,
      backendErrorCode: result.errorCode,
      backendErrorMessage: reason,
      syncedAt: new Date().toISOString(),
    });

    if (result.result === "DUPLICATE") {
      summary.duplicate += 1;
    } else {
      summary.rejected += 1;
    }
  }

  summary.queue = await getOfflineQueue();
  summary.message = buildSyncSummaryMessage(summary);
  return summary;
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
    workshopTitle: event.sessionId && !isPlaceholderSessionId(event.sessionId)
      ? event.sessionId
      : "Resolved from QR",
    scannedAt: event.scannedAt,
    status:
      event.localStatus === "REJECTED" || event.localStatus === "DUPLICATE"
        ? "REJECTED"
        : event.localStatus === "SYNCING"
          ? "SYNCING"
          : event.localStatus === "SYNC_FAILED"
            ? "SYNC_FAILED"
            : "PENDING_SYNC",
    reason: event.backendErrorMessage ?? getCheckinErrorMessage(event.backendErrorCode),
    retryCount: event.retryCount,
  };
}

function createSyncEventId() {
  return `mobile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toBackendTimestamp(date: Date) {
  return date.toISOString().slice(0, 19);
}

function normalizeBackendTimestamp(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.replace(/Z$/, "").slice(0, 19);
}

function validateQueuedEvent(event: OfflineCheckinEvent) {
  const qrToken = extractQrToken(event.qrToken);
  if (!event.syncEventId.trim()) {
    return "Queued check-in is missing sync event id.";
  }
  if (event.sessionId && !isPlaceholderSessionId(event.sessionId) && !isUuid(event.sessionId)) {
    return "Queued check-in has an invalid session id.";
  }
  if (!qrToken) {
    return "Queued check-in is missing QR token.";
  }
  if (!isSignedQrToken(qrToken)) {
    return "Queued check-in QR token format is invalid.";
  }
  if (!isBackendLocalDateTime(event.scannedAt)) {
    return "Queued check-in has an invalid scanned time.";
  }
  return null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isBackendLocalDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(
    normalizeBackendTimestamp(value),
  );
}

function isSignedQrToken(value: string) {
  const parts = value.split(".");
  return parts.length === 2 && parts.every((part) => part.trim().length > 0);
}

function normalizeSessionIdForStorage(sessionId: string | null | undefined) {
  const normalized = sessionId?.trim();
  return normalized || "QR_RESOLVED";
}

function toOptionalSessionPayload(sessionId: string | null | undefined) {
  const normalized = sessionId?.trim();
  if (!normalized || isPlaceholderSessionId(normalized)) {
    return {};
  }
  return { sessionId: normalized };
}

function isPlaceholderSessionId(sessionId: string) {
  return sessionId === "QR_RESOLVED" || sessionId === "UNSELECTED";
}

function isRetryableSyncError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return true;
  }
  return error.status === 0 || error.status >= 500;
}

function buildSyncSummaryMessage(summary: OfflineSyncSummary) {
  const parts: string[] = [];
  if (summary.accepted > 0) {
    parts.push(`${summary.accepted} synced`);
  }
  if (summary.alreadySynced > 0) {
    parts.push(`${summary.alreadySynced} already synced`);
  }
  if (summary.duplicate > 0) {
    parts.push(`${summary.duplicate} duplicate`);
  }
  if (summary.rejected > 0) {
    parts.push(`${summary.rejected} rejected`);
  }
  if (summary.retryableFailed > 0) {
    parts.push(`${summary.retryableFailed} kept for retry`);
  }
  return parts.length ? parts.join(", ") + "." : "Offline queue synced.";
}

function getCheckinErrorMessage(errorCode?: string | null) {
  if (!errorCode) {
    return null;
  }

  const messages: Record<string, string> = {
    CHECKIN_INVALID_QR: "QR token is malformed.",
    CHECKIN_QR_NOT_FOUND: "QR ticket was not found.",
    CHECKIN_QR_REVOKED: "QR ticket has been revoked.",
    CHECKIN_QR_EXPIRED: "QR ticket has expired.",
    CHECKIN_REGISTRATION_NOT_FOUND: "Registration was not found.",
    CHECKIN_REGISTRATION_NOT_CONFIRMED: "Registration is not confirmed.",
    CHECKIN_SESSION_MISMATCH: "QR ticket belongs to another session.",
    CHECKIN_SESSION_NOT_OPEN: "Session is not open for check-in.",
    CHECKIN_DUPLICATE: "Registration is already checked in.",
    CHECKIN_EVENT_ALREADY_SYNCED: "Sync event was already processed.",
    CHECKIN_RECORD_FAILED: "Failed to record check-in.",
    SYNC_RESULT_MISSING: "Backend did not return a result for this check-in.",
  };

  return messages[errorCode] ?? errorCode.replaceAll("_", " ").toLowerCase();
}

function getRawPreview(raw: string) {
  const value = raw.trim();
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
