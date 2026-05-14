import type { CheckinSyncEventPayload, CheckinSyncItemResponse } from "./checkinApi";
import { getDatabase, initDatabase } from "../db/database";

export type OfflineCheckinStatus =
  | "PENDING_SYNC"
  | "SYNCING"
  | "SYNC_FAILED"
  | "SYNCED"
  | "DUPLICATE"
  | "REJECTED"
  | "ALREADY_SYNCED";

export type OfflineCheckinEvent = CheckinSyncEventPayload & {
  localStatus: OfflineCheckinStatus;
  createdAt: string;
  backendResult?: CheckinSyncItemResponse["result"];
  backendErrorCode?: string | null;
  backendErrorMessage?: string | null;
  retryCount: number;
  lastAttemptAt?: string | null;
  syncedAt?: string | null;
};

type OfflineEventRow = {
  sync_event_id: string;
  session_id: string;
  qr_token: string;
  scanned_at: string;
  device_id: string | null;
  local_status: OfflineCheckinStatus;
  server_result: CheckinSyncItemResponse["result"] | null;
  synced_at: string | null;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  last_attempt_at: string | null;
  created_at: string;
};

let databaseReady: Promise<void> | null = null;

export async function listQueuedEvents() {
  const db = await openQueueDatabase();
  const rows = await db.getAllAsync<OfflineEventRow>(`
    SELECT *
    FROM offline_checkin_events
    WHERE local_status IN ('PENDING_SYNC', 'SYNCING', 'SYNC_FAILED')
    ORDER BY created_at DESC
  `);
  return rows.map(toEvent);
}

export async function listArchivedEvents() {
  const db = await openQueueDatabase();
  const rows = await db.getAllAsync<OfflineEventRow>(`
    SELECT *
    FROM offline_checkin_events
    WHERE local_status IN ('REJECTED', 'DUPLICATE')
    ORDER BY synced_at DESC, created_at DESC
    LIMIT 50
  `);
  return rows.map(toEvent);
}

export async function enqueueOfflineEvent(event: OfflineCheckinEvent) {
  console.debug("[offline-checkin] queued", {
    syncEventId: event.syncEventId,
    sessionId: event.sessionId,
    scannedAt: event.scannedAt,
  });
  const db = await openQueueDatabase();
  await db.runAsync(
    `
      INSERT OR REPLACE INTO offline_checkin_events (
        sync_event_id,
        session_id,
        qr_token,
        scanned_at,
        device_id,
        local_status,
        server_result,
        synced_at,
        error_code,
        error_message,
        retry_count,
        last_attempt_at,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    event.syncEventId,
    event.sessionId ?? "QR_RESOLVED",
    event.qrToken,
    event.scannedAt,
    event.deviceId ?? null,
    event.localStatus,
    event.backendResult ?? null,
    event.syncedAt ?? null,
    event.backendErrorCode ?? null,
    event.backendErrorMessage ?? null,
    event.retryCount,
    event.lastAttemptAt ?? null,
    event.createdAt,
  );
  return event;
}

export async function updateOfflineEvent(
  syncEventId: string,
  patch: Partial<OfflineCheckinEvent>,
) {
  const db = await openQueueDatabase();
  const current = await findEvent(syncEventId);
  if (!current) {
    return;
  }
  const updated = { ...current, ...patch };
  await db.runAsync(
    `
      UPDATE offline_checkin_events
      SET local_status = ?,
          server_result = ?,
          synced_at = ?,
          error_code = ?,
          error_message = ?,
          retry_count = ?,
          last_attempt_at = ?
      WHERE sync_event_id = ?
    `,
    updated.localStatus,
    updated.backendResult ?? null,
    updated.syncedAt ?? null,
    updated.backendErrorCode ?? null,
    updated.backendErrorMessage ?? null,
    updated.retryCount,
    updated.lastAttemptAt ?? null,
    syncEventId,
  );
}

export async function removeOfflineEvent(syncEventId: string) {
  const db = await openQueueDatabase();
  await db.runAsync(
    "DELETE FROM offline_checkin_events WHERE sync_event_id = ?",
    syncEventId,
  );
}

export async function clearOldOfflineEvents() {
  const db = await openQueueDatabase();
  await db.runAsync(`
    DELETE FROM offline_checkin_events
    WHERE local_status IN ('SYNC_FAILED', 'REJECTED', 'DUPLICATE', 'SYNCED', 'ALREADY_SYNCED')
  `);
}

export async function archiveOfflineEvent(
  syncEventId: string,
  patch: Partial<OfflineCheckinEvent>,
) {
  const event = await findEvent(syncEventId);
  if (!event) {
    return;
  }

  await updateOfflineEvent(syncEventId, {
    ...patch,
    localStatus: patch.localStatus ?? event.localStatus,
  });
}

export async function getPendingOfflineEvents() {
  const db = await openQueueDatabase();
  const rows = await db.getAllAsync<OfflineEventRow>(
    `
      SELECT *
      FROM offline_checkin_events
      WHERE local_status IN ('PENDING_SYNC', 'SYNC_FAILED')
      ORDER BY created_at ASC
    `,
  );
  return rows.map(toEvent);
}

async function findEvent(syncEventId: string) {
  const db = await openQueueDatabase();
  const row = await db.getFirstAsync<OfflineEventRow>(
    "SELECT * FROM offline_checkin_events WHERE sync_event_id = ?",
    syncEventId,
  );
  return row ? toEvent(row) : null;
}

async function openQueueDatabase() {
  if (!databaseReady) {
    databaseReady = initDatabase();
  }
  await databaseReady;
  return getDatabase();
}

function toEvent(row: OfflineEventRow): OfflineCheckinEvent {
  return {
    syncEventId: row.sync_event_id,
    sessionId: row.session_id,
    qrToken: row.qr_token,
    scannedAt: row.scanned_at,
    deviceId: row.device_id ?? undefined,
    localStatus: row.local_status,
    backendResult: row.server_result ?? undefined,
    backendErrorCode: row.error_code,
    backendErrorMessage: row.error_message,
    retryCount: row.retry_count,
    lastAttemptAt: row.last_attempt_at,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
  };
}
