import { ScanHistoryEntry } from "../api/types";
import { getDatabase } from "./database";

type ScanHistoryRow = {
  id: string;
  session_id: string;
  qr_token_preview: string | null;
  result: ScanHistoryEntry["result"];
  source_mode: ScanHistoryEntry["sourceMode"];
  student_name: string | null;
  student_code: string | null;
  registration_id: string | null;
  message: string | null;
  scanned_at: string;
  created_at: string;
};

function toEntry(row: ScanHistoryRow): ScanHistoryEntry {
  return {
    id: row.id,
    sessionId: row.session_id,
    qrTokenPreview: row.qr_token_preview,
    result: row.result,
    sourceMode: row.source_mode,
    studentName: row.student_name,
    studentCode: row.student_code,
    registrationId: row.registration_id,
    message: row.message,
    scannedAt: row.scanned_at,
    createdAt: row.created_at,
  };
}

export async function addScanHistory(entry: ScanHistoryEntry) {
  const db = await getDatabase();
  await db.runAsync(
    `
      INSERT INTO scan_history (
        id,
        session_id,
        qr_token_preview,
        result,
        source_mode,
        student_name,
        student_code,
        registration_id,
        message,
        scanned_at,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    entry.id,
    entry.sessionId,
    entry.qrTokenPreview ?? null,
    entry.result,
    entry.sourceMode,
    entry.studentName ?? null,
    entry.studentCode ?? null,
    entry.registrationId ?? null,
    entry.message ?? null,
    entry.scannedAt,
    entry.createdAt,
  );
}

export async function getRecentScanHistory(limit = 20) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ScanHistoryRow>(
    `
      SELECT *
      FROM scan_history
      ORDER BY created_at DESC
      LIMIT ?
    `,
    limit,
  );

  return rows.map(toEntry);
}

export async function clearOldHistory(beforeDate: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM scan_history WHERE created_at < ?", beforeDate);
}
