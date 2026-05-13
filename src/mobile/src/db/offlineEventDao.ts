import * as SQLite from "expo-sqlite";
import { OfflineCheckinEvent, SyncResult } from "../api/types";
import { nowIso, startOfTodayIso } from "../utils/date";
import { getDatabase } from "./database";

type OfflineEventRow = {
  sync_event_id: string;
  session_id: string;
  qr_token: string;
  scanned_at: string;
  device_id: string | null;
  local_status: OfflineCheckinEvent["localStatus"];
  server_result: OfflineCheckinEvent["serverResult"];
  synced_at: string | null;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  last_attempt_at: string | null;
  created_at: string;
};

type CountRow = {
  count: number;
};

export type OfflineEventCounts = {
  pending: number;
  failed: number;
  syncedToday: number;
};

function toEvent(row: OfflineEventRow): OfflineCheckinEvent {
  return {
    syncEventId: row.sync_event_id,
    sessionId: row.session_id,
    qrToken: row.qr_token,
    scannedAt: row.scanned_at,
    deviceId: row.device_id,
    localStatus: row.local_status,
    serverResult: row.server_result,
    syncedAt: row.synced_at,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    retryCount: row.retry_count,
    lastAttemptAt: row.last_attempt_at,
    createdAt: row.created_at,
  };
}

async function countWhere(where: string, ...params: SQLite.SQLiteBindValue[]) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CountRow>(
    `SELECT COUNT(*) AS count FROM offline_checkin_events WHERE ${where}`,
    ...params,
  );
  return row?.count ?? 0;
}

export async function createPendingEvent(event: OfflineCheckinEvent) {
  const db = await getDatabase();
  await db.runAsync(
    `
      INSERT INTO offline_checkin_events (
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
    event.sessionId,
    event.qrToken,
    event.scannedAt,
    event.deviceId ?? null,
    event.localStatus,
    event.serverResult ?? null,
    event.syncedAt ?? null,
    event.errorCode ?? null,
    event.errorMessage ?? null,
    event.retryCount,
    event.lastAttemptAt ?? null,
    event.createdAt,
  );
}

export async function findActiveEventBySessionAndQr(sessionId: string, qrToken: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<OfflineEventRow>(
    `
      SELECT *
      FROM offline_checkin_events
      WHERE session_id = ?
        AND qr_token = ?
        AND local_status IN ('PENDING_SYNC', 'SYNCING', 'SYNC_FAILED')
      ORDER BY created_at DESC
      LIMIT 1
    `,
    sessionId,
    qrToken,
  );

  return row ? toEvent(row) : null;
}

export async function getPendingEvents(limit: number) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OfflineEventRow>(
    `
      SELECT *
      FROM offline_checkin_events
      WHERE local_status IN ('PENDING_SYNC', 'SYNC_FAILED')
      ORDER BY created_at ASC
      LIMIT ?
    `,
    limit,
  );

  return rows.map(toEvent);
}

export async function markSyncing(syncEventIds: string[]) {
  if (syncEventIds.length === 0) {
    return;
  }

  const db = await getDatabase();
  const placeholders = syncEventIds.map(() => "?").join(",");
  await db.runAsync(
    `
      UPDATE offline_checkin_events
      SET local_status = 'SYNCING',
          last_attempt_at = ?
      WHERE sync_event_id IN (${placeholders})
    `,
    nowIso(),
    ...syncEventIds,
  );
}

export async function markSynced(syncEventId: string, result: SyncResult) {
  await markFinalResult(syncEventId, "SYNCED", result);
}

export async function markRejected(syncEventId: string, result: SyncResult) {
  await markFinalResult(syncEventId, "REJECTED", result);
}

export async function markDuplicate(syncEventId: string, result: SyncResult) {
  await markFinalResult(syncEventId, "DUPLICATE", result);
}

async function markFinalResult(
  syncEventId: string,
  localStatus: OfflineCheckinEvent["localStatus"],
  result: SyncResult,
) {
  const db = await getDatabase();
  await db.runAsync(
    `
      UPDATE offline_checkin_events
      SET local_status = ?,
          server_result = ?,
          synced_at = ?,
          error_code = ?,
          error_message = ?,
          last_attempt_at = ?
      WHERE sync_event_id = ?
    `,
    localStatus,
    result.result,
    nowIso(),
    result.errorCode ?? null,
    result.message ?? null,
    nowIso(),
    syncEventId,
  );
}

export async function markSyncFailed(syncEventId: string, errorCode: string, message: string) {
  const db = await getDatabase();
  await db.runAsync(
    `
      UPDATE offline_checkin_events
      SET local_status = 'SYNC_FAILED',
          error_code = ?,
          error_message = ?,
          retry_count = retry_count + 1,
          last_attempt_at = ?
      WHERE sync_event_id = ?
    `,
    errorCode,
    message,
    nowIso(),
    syncEventId,
  );
}

export async function countPendingEvents() {
  return countWhere("local_status IN ('PENDING_SYNC', 'SYNC_FAILED')");
}

export async function getOfflineEventCounts(): Promise<OfflineEventCounts> {
  const [pending, failed, syncedToday] = await Promise.all([
    countWhere("local_status = 'PENDING_SYNC'"),
    countWhere("local_status = 'SYNC_FAILED'"),
    countWhere("local_status IN ('SYNCED', 'DUPLICATE', 'REJECTED') AND synced_at >= ?", startOfTodayIso()),
  ]);

  return { pending, failed, syncedToday };
}

export async function getRecentEvents(limit = 20) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OfflineEventRow>(
    `
      SELECT *
      FROM offline_checkin_events
      ORDER BY created_at DESC
      LIMIT ?
    `,
    limit,
  );

  return rows.map(toEvent);
}

export async function clearOldFinalEvents(beforeDate: string) {
  const db = await getDatabase();
  await db.runAsync(
    `
      DELETE FROM offline_checkin_events
      WHERE local_status IN ('SYNCED', 'DUPLICATE', 'REJECTED')
        AND synced_at < ?
    `,
    beforeDate,
  );
}
