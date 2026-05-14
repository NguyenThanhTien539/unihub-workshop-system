import { syncOfflineEvents } from "../api/checkinApi";
import { OfflineCheckinEvent, SyncResult } from "../api/types";
import {
  getPendingEvents,
  markDuplicate,
  markRejected,
  markSyncFailed,
  markSynced,
  markSyncing,
} from "../db/offlineEventDao";
import { addScanHistory } from "../db/scanHistoryDao";
import { useNetworkStore } from "../network/networkStore";
import { nowIso } from "../utils/date";
import { getQrPreview } from "../utils/qr";
import { createId } from "../utils/uuid";
import { toAppError } from "../utils/errors";

export type SyncSummary = {
  status: "SYNCED" | "NO_PENDING" | "SKIPPED_OFFLINE" | "FAILED";
  processed: number;
  accepted: number;
  duplicate: number;
  rejected: number;
  alreadySynced: number;
  failed: number;
  message?: string;
};

type SyncPendingOptions = {
  batchSize?: number;
  manual?: boolean;
};

let syncInFlight: Promise<SyncSummary> | null = null;

export function syncPendingEvents(options?: SyncPendingOptions) {
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = runSync(options).finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

async function runSync(options?: SyncPendingOptions): Promise<SyncSummary> {
  if (!useNetworkStore.getState().isOnline) {
    return emptySummary("SKIPPED_OFFLINE", "Dang offline.");
  }

  const events = await getPendingEvents(options?.batchSize ?? 20);
  if (events.length === 0) {
    return emptySummary("NO_PENDING", "Khong co ban ghi cho dong bo.");
  }

  await markSyncing(events.map((event) => event.syncEventId));

  try {
    const response = await syncOfflineEvents({
      events: events.map((event) => ({
        syncEventId: event.syncEventId,
        sessionId: event.sessionId,
        qrToken: event.qrToken,
        scannedAt: event.scannedAt,
        deviceId: event.deviceId,
      })),
    });

    return applySyncResults(events, response.results);
  } catch (error) {
    const appError = toAppError(error);
    await Promise.all(
      events.map((event) => markSyncFailed(event.syncEventId, appError.code, appError.message)),
    );

    return {
      status: "FAILED",
      processed: events.length,
      accepted: 0,
      duplicate: 0,
      rejected: 0,
      alreadySynced: 0,
      failed: events.length,
      message: appError.message,
    };
  }
}

async function applySyncResults(events: OfflineCheckinEvent[], results: SyncResult[]) {
  const summary: SyncSummary = {
    status: "SYNCED",
    processed: events.length,
    accepted: 0,
    duplicate: 0,
    rejected: 0,
    alreadySynced: 0,
    failed: 0,
  };
  const eventsById = new Map(events.map((event) => [event.syncEventId, event]));
  const resultById = new Map(results.map((result) => [result.syncEventId, result]));

  for (const event of events) {
    const result = resultById.get(event.syncEventId);
    if (!result) {
      summary.failed += 1;
      await markSyncFailed(event.syncEventId, "SYNC_RESULT_MISSING", "Backend khong tra ket qua cho event nay.");
      continue;
    }

    if (result.result === "ACCEPTED") {
      summary.accepted += 1;
      await markSynced(event.syncEventId, result);
    } else if (result.result === "ALREADY_SYNCED") {
      summary.alreadySynced += 1;
      await markSynced(event.syncEventId, result);
    } else if (result.result === "DUPLICATE") {
      summary.duplicate += 1;
      await markDuplicate(event.syncEventId, result);
    } else {
      summary.rejected += 1;
      await markRejected(event.syncEventId, result);
    }

    await addSyncHistory(eventsById.get(event.syncEventId) ?? event, result);
  }

  return summary;
}

async function addSyncHistory(event: OfflineCheckinEvent, result: SyncResult) {
  await addScanHistory({
    id: createId("scan"),
    sessionId: event.sessionId,
    qrTokenPreview: getQrPreview(event.qrToken),
    result: result.result === "ALREADY_SYNCED" ? "SYNCED" : result.result,
    sourceMode: "SYNC",
    studentName: result.studentName ?? null,
    studentCode: result.studentCode ?? result.studentId ?? null,
    registrationId: result.registrationId ?? null,
    message: result.message ?? null,
    scannedAt: event.scannedAt,
    createdAt: nowIso(),
  });
}

function emptySummary(status: SyncSummary["status"], message: string): SyncSummary {
  return {
    status,
    processed: 0,
    accepted: 0,
    duplicate: 0,
    rejected: 0,
    alreadySynced: 0,
    failed: 0,
    message,
  };
}
