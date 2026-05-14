import { CheckinSession } from "../api/types";
import { nowIso } from "../utils/date";
import { getDatabase } from "./database";

type SessionRow = {
  session_id: string;
  workshop_title: string;
  room_name: string | null;
  start_at: string;
  end_at: string;
  checkin_open: number;
  cached_at: string;
};

function toSession(row: SessionRow): CheckinSession {
  return {
    sessionId: row.session_id,
    workshopTitle: row.workshop_title,
    roomName: row.room_name,
    startAt: row.start_at,
    endAt: row.end_at,
    checkinOpen: row.checkin_open === 1,
    cachedAt: row.cached_at,
    source: "CACHE",
  };
}

export async function upsertSessions(sessions: CheckinSession[]) {
  const db = await getDatabase();
  const cachedAt = nowIso();

  for (const session of sessions) {
    await db.runAsync(
      `
        INSERT INTO cached_sessions (
          session_id,
          workshop_title,
          room_name,
          start_at,
          end_at,
          checkin_open,
          cached_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
          workshop_title = excluded.workshop_title,
          room_name = excluded.room_name,
          start_at = excluded.start_at,
          end_at = excluded.end_at,
          checkin_open = excluded.checkin_open,
          cached_at = excluded.cached_at
      `,
      session.sessionId,
      session.workshopTitle,
      session.roomName ?? null,
      session.startAt,
      session.endAt,
      session.checkinOpen ? 1 : 0,
      cachedAt,
    );
  }
}

export async function getCachedSessions() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SessionRow>(`
    SELECT *
    FROM cached_sessions
    ORDER BY start_at ASC
  `);
  return rows.map(toSession);
}

export async function getSessionById(sessionId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SessionRow>(
    "SELECT * FROM cached_sessions WHERE session_id = ?",
    sessionId,
  );

  return row ? toSession(row) : null;
}

export async function deleteOldSessions(beforeDate: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM cached_sessions WHERE end_at < ?", beforeDate);
}
