import * as SQLite from "expo-sqlite";
import { nowIso } from "../utils/date";

type Migration = {
  version: number;
  name: string;
  sql: string;
};

const migrations: Migration[] = [
  {
    version: 1,
    name: "create_cached_sessions",
    sql: `
      CREATE TABLE IF NOT EXISTS cached_sessions (
        session_id TEXT PRIMARY KEY,
        workshop_title TEXT NOT NULL,
        room_name TEXT,
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        checkin_open INTEGER NOT NULL,
        cached_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    name: "create_offline_checkin_events",
    sql: `
      CREATE TABLE IF NOT EXISTS offline_checkin_events (
        sync_event_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        qr_token TEXT NOT NULL,
        scanned_at TEXT NOT NULL,
        device_id TEXT,
        local_status TEXT NOT NULL,
        server_result TEXT,
        synced_at TEXT,
        error_code TEXT,
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_offline_events_status
        ON offline_checkin_events(local_status, created_at);

      CREATE INDEX IF NOT EXISTS idx_offline_events_session_qr
        ON offline_checkin_events(session_id, qr_token, local_status);
    `,
  },
  {
    version: 3,
    name: "create_scan_history",
    sql: `
      CREATE TABLE IF NOT EXISTS scan_history (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        qr_token_preview TEXT,
        result TEXT NOT NULL,
        source_mode TEXT NOT NULL,
        student_name TEXT,
        student_code TEXT,
        registration_id TEXT,
        message TEXT,
        scanned_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_scan_history_created_at
        ON scan_history(created_at DESC);
    `,
  },
];

export async function applyMigrations(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = await db.getAllAsync<{ version: number }>(
    "SELECT version FROM schema_migrations",
  );
  const applied = new Set(appliedRows.map((row) => row.version));

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      continue;
    }

    await db.execAsync(migration.sql);
    await db.runAsync(
      "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
      migration.version,
      nowIso(),
    );
  }
}
