import {
  CheckinHistoryItem,
  CheckinResult,
  OfflineQueueItem,
} from "../models/types";
import {
  sampleCheckinHistory,
  sampleOfflineQueue,
} from "../sampleData/mockData";

export async function verifyCheckin(token: string): Promise<CheckinResult> {
  // TODO: Replace mock scan verification with:
  // POST /api/checkins/verify
  // Body: { qrToken, staffId, deviceId, checkedInAt }
  // Expected response: { status: "VALID" | "ALREADY_USED" | "INVALID", ticket }
  // Handle session mismatch, expired/revoked QR, duplicate check-in, and 401/403.
  await delay(350);
  const normalized = token.trim().toLowerCase();

  if (normalized.includes("used")) {
    return {
      kind: "ALREADY_USED",
      title: "Already used ticket",
      detail: "This QR was checked in at 08:42 on another device.",
      studentName: "Pham Quang Huy",
      studentId: "23101088",
    };
  }

  if (normalized.includes("invalid")) {
    return {
      kind: "INVALID",
      title: "Invalid ticket",
      detail: "QR token is unknown, expired, revoked, or not for this session.",
    };
  }

  if (normalized.includes("offline")) {
    return {
      kind: "OFFLINE_SAVED",
      title: "Saved offline",
      detail:
        "Network is unavailable. The check-in was saved locally for later sync.",
      studentName: "Do Minh Chau",
      studentId: "23104444",
    };
  }

  return {
    kind: "VALID",
    title: "Valid ticket",
    detail: "Registration confirmed for this session. Attendance recorded.",
    studentName: "Nguyen Van An",
    studentId: "23100421",
  };
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  // TODO: Offline check-ins should later be persisted using AsyncStorage,
  // SQLite, SecureStore, or Room depending on the stack. The blueprint
  // currently recommends SQLite for React Native.
  return sampleOfflineQueue;
}

export async function syncOfflineQueue(
  queue: OfflineQueueItem[],
): Promise<OfflineQueueItem[]> {
  // TODO: Replace mock offline sync with:
  // POST /api/checkins/offline-sync
  // Body: { deviceId, staffId, checkins: [...] }
  // Expected response: { syncedCount, failedItems }
  // Keep network failures pending and mark rejected events for staff review.
  await delay(500);
  return queue.map((item) => ({ ...item, status: "SYNCED" }));
}

export async function getCheckinHistory(): Promise<CheckinHistoryItem[]> {
  // TODO: Replace with GET /api/checkins/history?staffId={staffId}
  return sampleCheckinHistory;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
