import * as SQLite from "expo-sqlite";
import { applyMigrations } from "./migrations";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("unihub_checkin.db");
  }

  return databasePromise;
}

export async function initDatabase() {
  const db = await getDatabase();
  await applyMigrations(db);
}

export async function resetLocalDatabaseForDev() {
  const db = await getDatabase();
  await db.execAsync(`
    DROP TABLE IF EXISTS scan_history;
    DROP TABLE IF EXISTS offline_checkin_events;
    DROP TABLE IF EXISTS cached_sessions;
    DROP TABLE IF EXISTS schema_migrations;
  `);
  await applyMigrations(db);
}
